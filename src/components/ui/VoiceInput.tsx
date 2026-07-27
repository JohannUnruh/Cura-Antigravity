import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from './Card';
import { appendChunk, normalizeForDeduplication, processVoiceCommands, capitalizeSentences } from '@/lib/utils/voiceCommands';

interface VoiceInputProps {
    onResult: (text: string) => void;
    value?: string;
    className?: string;
    onError?: (error: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

// Fehler, die echt fatal sind → Aufnahme muss stoppen.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed"]);

let instanceCounter = 0;

export function VoiceInput({ onResult, value = "", className, onError, onListeningChange }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [supportError, setSupportError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const hadFatalErrorRef = useRef(false);
    const instanceIdRef = useRef(0);

    // Verarbeitete Indizes der AKTUELLEN WebSpeech-Session
    const processedIndicesRef = useRef<Set<number>>(new Set());

    // Akkumulierter Gesamttext über die gesamte Aufnahmedauer
    const accumulatedTextRef = useRef<string>(value);

    // Verlauf der normalisierten finalen Phrasen (überlebt Auto-Restarts!)
    const recentHistoryRef = useRef<Array<{ norm: string; timestamp: number }>>([]);

    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);
    const onListeningChangeRef = useRef(onListeningChange);

    useEffect(() => {
        onResultRef.current = onResult;
        onErrorRef.current = onError;
        onListeningChangeRef.current = onListeningChange;
    });

    const updateListeningState = (listening: boolean) => {
        isListeningRef.current = listening;
        setIsListening(listening);
        if (onListeningChangeRef.current) {
            onListeningChangeRef.current(listening);
        }
    };

    // ── Build the SpeechRecognition instance exactly once ──
    useEffect(() => {
        const id = ++instanceCounter;
        instanceIdRef.current = id;
        console.warn(`[VoiceInput #${id}] 🟢 MOUNT – Instanz erstellt`);

        if (typeof window === 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupportError(true);
            return;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'de-DE';

        rec.onstart = () => {
            console.warn(`[VoiceInput #${id}] ✅ onstart – Erkennung läuft`);
            hadFatalErrorRef.current = false;
            updateListeningState(true);
            // Pro WebSpeech-Session setzen wir nur die Index-Registrierung zurück
            processedIndicesRef.current.clear();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
            let hasNewFinalChunk = false;
            let currentInterim = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (!result || !result[0]) continue;

                if (result.isFinal) {
                    if (processedIndicesRef.current.has(i)) {
                        continue;
                    }
                    processedIndicesRef.current.add(i);

                    const rawChunk = result[0].transcript.trim();
                    if (rawChunk) {
                        const norm = normalizeForDeduplication(rawChunk);
                        const now = Date.now();

                        // Veraltete Historieneinträge (> 15 Sekunden) löschen
                        recentHistoryRef.current = recentHistoryRef.current.filter(
                            item => now - item.timestamp < 15000
                        );

                        // Prüfen, ob norm im Verlauf oder im akkumulierten Text bereits vorhanden ist
                        const normAccumulated = normalizeForDeduplication(accumulatedTextRef.current);
                        const isDuplicate = 
                            normAccumulated.endsWith(norm) ||
                            recentHistoryRef.current.some(item => 
                                item.norm === norm || 
                                (norm.length > 5 && item.norm.endsWith(norm)) || 
                                (item.norm.length > 5 && norm.endsWith(item.norm))
                            );

                        if (isDuplicate) {
                            console.warn(`[VoiceInput #${id}] Ignoriere doppelte finale Phrase:`, rawChunk);
                            continue;
                        }

                        recentHistoryRef.current.push({ norm, timestamp: now });
                        accumulatedTextRef.current = appendChunk(accumulatedTextRef.current, rawChunk);
                        hasNewFinalChunk = true;
                    }
                } else {
                    // Interim Result für temporäre Vorschau
                    currentInterim += result[0].transcript;
                }
            }

            // Ausgeben des Textes an das Eltern-Element
            if (hasNewFinalChunk || currentInterim) {
                let textToEmit = accumulatedTextRef.current;
                if (currentInterim.trim()) {
                    const { text: processedInterim } = processVoiceCommands(currentInterim.trim());
                    const capitalizedInterim = capitalizeSentences(processedInterim, accumulatedTextRef.current);
                    const isNewline = capitalizedInterim.startsWith("\n");
                    const separator = accumulatedTextRef.current.endsWith("\n") || accumulatedTextRef.current.endsWith(" ") || isNewline ? "" : " ";
                    textToEmit = accumulatedTextRef.current + separator + capitalizedInterim;
                }
                onResultRef.current(textToEmit);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (event: any) => {
            console.warn(`[VoiceInput #${id}] ❌ onerror:`, event.error);
            if (onErrorRef.current) onErrorRef.current(event.error);

            let msg = "";
            if (event.error === "not-allowed") {
                msg = "Mikrofon blockiert – bitte Berechtigung prüfen.";
            } else if (event.error === "service-not-allowed") {
                msg = "Erkennungsdienst vom System blockiert.";
            } else if (event.error === "network") {
                msg = "Netzwerkfehler – Verbindung prüfen.";
            }

            if (msg) {
                setErrorMessage(msg);
                setTimeout(() => setErrorMessage(null), 5000);
            }

            if (FATAL_ERRORS.has(event.error)) {
                hadFatalErrorRef.current = true;
                updateListeningState(false);
            }
        };

        // ── Auto-Restart bei Sprechpausen ──
        rec.onend = () => {
            console.warn(`[VoiceInput #${id}] 🔚 onend – isListening=${isListeningRef.current}`);

            if (!isListeningRef.current || hadFatalErrorRef.current) {
                updateListeningState(false);
                return;
            }

            let attempts = 0;
            const maxAttempts = 8;
            const tryRestart = () => {
                if (!isListeningRef.current || !recognitionRef.current) return;
                try {
                    recognitionRef.current.start();
                    console.warn(`[VoiceInput #${id}] 🔄 Restart OK nach Versuch ${attempts + 1}`);
                } catch (e) {
                    attempts++;
                    const errMsg = (e as Error)?.message || '';
                    console.warn(`[VoiceInput #${id}] ⚠️ Restart fehlgeschlagen, Versuch ${attempts}:`, errMsg);
                    if (attempts < maxAttempts && isListeningRef.current) {
                        setTimeout(tryRestart, Math.min(100 * Math.pow(2, attempts - 1), 2000));
                    } else {
                        console.warn(`[VoiceInput #${id}] 💀 Konnte Erkennung nicht neu starten nach ${maxAttempts} Versuchen`);
                        updateListeningState(false);
                        setErrorMessage("Neustart fehlgeschlagen – bitte erneut klicken.");
                        setTimeout(() => setErrorMessage(null), 5000);
                    }
                }
            };
            setTimeout(tryRestart, 120);
        };

        recognitionRef.current = rec;

        return () => {
            console.warn(`[VoiceInput #${id}] 🔴 UNMOUNT – Cleanup`);
            updateListeningState(false);
            try { rec.stop(); } catch { /* not running */ }
        };
    }, []);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;
        const id = instanceIdRef.current;

        if (isListeningRef.current) {
            console.warn(`[VoiceInput #${id}] 🛑 toggleListening → STOP`);
            updateListeningState(false);
            try { recognitionRef.current.stop(); } catch { /* not running */ }
        } else {
            console.warn(`[VoiceInput #${id}] ▶️ toggleListening → START`);
            // Bei manuellem Start des Nutzers wird der aktuelle Wert des Feldes als Basis gesetzt
            accumulatedTextRef.current = value;
            const initialNorm = normalizeForDeduplication(value);
            recentHistoryRef.current = initialNorm ? [{ norm: initialNorm, timestamp: Date.now() }] : [];
            hadFatalErrorRef.current = false;
            updateListeningState(true);
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error(`[VoiceInput #${id}] start() fehlgeschlagen:`, error);
                updateListeningState(false);
            }
        }
    }, [value]);

    if (supportError) {
        return (
            <button
                type="button"
                disabled
                className={cn(
                    "p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed",
                    className
                )}
                title="Spracheingabe wird von diesem Browser nicht unterstützt"
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={toggleListening}
                className={cn(
                    "p-2 rounded-full transition-all duration-300 relative group",
                    isListening
                        ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105",
                    className
                )}
                title={isListening ? "Aufnahme stoppen" : "Spracheingabe starten"}
            >
                {isListening ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin absolute inset-0 m-auto opacity-20" />
                        <Mic className="w-5 h-5 relative z-10" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    </>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
            {errorMessage && (
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-red-600 text-white text-xs rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 text-center font-medium">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}



