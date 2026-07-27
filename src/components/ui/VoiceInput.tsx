import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from './Card';
import { appendChunk, processVoiceCommands, capitalizeSentences } from '@/lib/utils/voiceCommands';

interface VoiceInputProps {
    onResult: (text: string) => void;
    value?: string;
    className?: string;
    onError?: (error: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

// Fehler, die echt fatal sind → Aufnahme muss stoppen.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed"]);

/**
 * Erkennung ob mobiles Gerät (Touchscreen-Smartphone).
 * Tablets mit Tastatur werden als Desktop behandelt.
 */
function detectIsMobile(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPod/i.test(navigator.userAgent);
}

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
    const isMobileRef = useRef(false);

    // Akkumulierter Gesamttext über die gesamte Aufnahmedauer
    const accumulatedTextRef = useRef<string>(value);

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

    // ── Hilfsfunktion: Recording starten ──
    const startRecording = useCallback(() => {
        if (!recognitionRef.current || isListeningRef.current) return;
        const id = instanceIdRef.current;
        console.warn(`[VoiceInput #${id}] ▶️ startRecording (mobile=${isMobileRef.current})`);

        accumulatedTextRef.current = value;
        hadFatalErrorRef.current = false;
        updateListeningState(true);
        try {
            recognitionRef.current.start();
        } catch (error) {
            console.error(`[VoiceInput #${id}] start() fehlgeschlagen:`, error);
            updateListeningState(false);
        }
    }, [value]);

    // ── Hilfsfunktion: Recording stoppen ──
    const stopRecording = useCallback(() => {
        if (!recognitionRef.current) return;
        const id = instanceIdRef.current;
        console.warn(`[VoiceInput #${id}] 🛑 stopRecording`);
        updateListeningState(false);
        try { recognitionRef.current.stop(); } catch { /* not running */ }
    }, []);

    // ── Build the SpeechRecognition instance exactly once ──
    useEffect(() => {
        const id = ++instanceCounter;
        instanceIdRef.current = id;
        const mobile = detectIsMobile();
        isMobileRef.current = mobile;

        console.warn(`[VoiceInput #${id}] 🟢 MOUNT – mobile=${mobile}`);

        if (typeof window === 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupportError(true);
            return;
        }

        const rec = new SpeechRecognition();
        // Entscheidend: Auf Mobilgeräten KEIN continuous-Modus!
        // Jeder Sprechvorgang = ein einzelnes Ergebnis, kein Auto-Restart-Chaos.
        rec.continuous = !mobile;
        rec.interimResults = true;
        rec.lang = 'de-DE';

        rec.onstart = () => {
            console.warn(`[VoiceInput #${id}] ✅ onstart`);
            hadFatalErrorRef.current = false;
            updateListeningState(true);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
            // Gesamten Session-Transkript aufbauen (final + interim getrennt)
            let finalText = '';
            let interimText = '';

            for (let i = 0; i < event.results.length; ++i) {
                const result = event.results[i];
                if (!result || !result[0]) continue;
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            // Finale Ergebnisse direkt in den Akkumulator übernehmen
            if (finalText.trim()) {
                const newAccumulated = appendChunk(accumulatedTextRef.current, finalText);
                accumulatedTextRef.current = newAccumulated;
            }

            // Interim-Text nur als flüchtige Live-Vorschau anhängen
            let textToEmit = accumulatedTextRef.current;
            if (interimText.trim()) {
                const { text: processedInterim } = processVoiceCommands(interimText.trim());
                const capitalizedInterim = capitalizeSentences(processedInterim, accumulatedTextRef.current);
                const isNewline = capitalizedInterim.startsWith("\n");
                const separator = accumulatedTextRef.current.endsWith("\n") || accumulatedTextRef.current.endsWith(" ") || isNewline ? "" : " ";
                textToEmit = accumulatedTextRef.current + separator + capitalizedInterim;
            }

            onResultRef.current(textToEmit);
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
            } else if (event.error === "no-speech") {
                // Auf Mobilgeräten kommt no-speech wenn man den Button hält
                // ohne zu sprechen – kein fataler Fehler.
                msg = "";
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

        rec.onend = () => {
            console.warn(`[VoiceInput #${id}] 🔚 onend – isListening=${isListeningRef.current}, mobile=${mobile}`);

            if (mobile) {
                // ── MOBIL: Kein Auto-Restart! ──
                // Die Aufnahme endet sauber wenn der Nutzer loslässt
                // oder wenn die Engine nach einer Äußerung stoppt.
                updateListeningState(false);
                // Finalen Stand nochmal ausgeben (ohne flüchtige Interim-Daten)
                onResultRef.current(accumulatedTextRef.current);
                return;
            }

            // ── DESKTOP: Auto-Restart bei Sprechpausen ──
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
                        console.warn(`[VoiceInput #${id}] 💀 Neustart nach ${maxAttempts} Versuchen fehlgeschlagen`);
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

    // ── Desktop: Toggle-Klick ──
    const handleClick = useCallback(() => {
        if (isMobileRef.current) return; // Auf Mobilgeräten ignorieren – dort regeln Pointer-Events
        if (isListeningRef.current) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [startRecording, stopRecording]);

    // ── Mobil: Push-to-Talk (Halten = Aufnehmen, Loslassen = Stoppen) ──
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!isMobileRef.current) return;
        // Context-Menü auf Long-Press verhindern
        e.preventDefault();
        startRecording();
    }, [startRecording]);

    const handlePointerUp = useCallback(() => {
        if (!isMobileRef.current) return;
        stopRecording();
    }, [stopRecording]);

    const handlePointerLeave = useCallback(() => {
        // Falls der Finger vom Button wegrutscht → Aufnahme stoppen
        if (!isMobileRef.current || !isListeningRef.current) return;
        stopRecording();
    }, [stopRecording]);

    // Context-Menü unterdrücken auf dem Mikrofon-Button (Long-Press auf mobil)
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        if (isMobileRef.current) {
            e.preventDefault();
        }
    }, []);

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
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerUp}
                onContextMenu={handleContextMenu}
                className={cn(
                    "p-2 rounded-full transition-all duration-300 relative group touch-none select-none",
                    isListening
                        ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105",
                    className
                )}
                title={isListening ? "Aufnahme stoppen" : "Spracheingabe starten (auf Mobilgeräten gedrückt halten)"}
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
