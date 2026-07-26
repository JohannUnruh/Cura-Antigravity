import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from './Card';
import { processVoiceCommands } from '@/lib/utils/voiceCommands';

interface VoiceInputProps {
    onResult: (text: string) => void;
    className?: string;
    onError?: (error: string) => void;
}

// Fehler, die echt fatal sind → Aufnahme muss stoppen.
// Alles andere (no-speech, network, aborted, audio-capture etc.) ist
// temporär → Recognition via onend automatisch neustarten.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed"]);

// Eindeutige ID pro Instanz, um Unmount-Zyklen zu erkennen
let instanceCounter = 0;

export function VoiceInput({ onResult, className, onError }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [supportError, setSupportError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    // Tracks whether the last onerror was fatal, so onend knows not to restart.
    const hadFatalErrorRef = useRef(false);
    const instanceIdRef = useRef(0);
    const processedIndicesRef = useRef<Set<number>>(new Set());
    const lastTranscriptRef = useRef<string>("");

    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onResultRef.current = onResult;
        onErrorRef.current = onError;
    });

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
            setIsListening(true);
            processedIndicesRef.current.clear();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    if (processedIndicesRef.current.has(i)) {
                        continue;
                    }
                    processedIndicesRef.current.add(i);
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                console.warn(`[VoiceInput #${id}] 📝 onresult (final):`, finalTranscript);
                const { text } = processVoiceCommands(finalTranscript);
                if (finalTranscript.trim()) {
                    if (lastTranscriptRef.current === text) {
                        console.warn(`[VoiceInput #${id}] Ignoriere doppeltes Transkript:`, text);
                        return;
                    }
                    lastTranscriptRef.current = text;
                    onResultRef.current(text);
                }
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (event: any) => {
            console.warn(`[VoiceInput #${id}] ❌ onerror:`, event.error);
            if (onErrorRef.current) onErrorRef.current(event.error);

            // Benutzerfreundliche Fehlermeldung als Tooltip anzeigen
            let msg = "";
            if (event.error === "not-allowed") {
                msg = "Mikrofon blockiert – bitte Berechtigung prüfen.";
            } else if (event.error === "service-not-allowed") {
                msg = "Erkennungsdienst vom System blockiert.";
            } else if (event.error === "network") {
                msg = "Netzwerkfehler – Verbindung prüfen.";
            }
            // no-speech und aborted sind normal bei Pausen → kein Tooltip.

            if (msg) {
                setErrorMessage(msg);
                setTimeout(() => setErrorMessage(null), 5000);
            }

            if (FATAL_ERRORS.has(event.error)) {
                hadFatalErrorRef.current = true;
                isListeningRef.current = false;
                setIsListening(false);
            }
        };

        // ── Auto-Restart bei Sprechpausen ──
        // Chrome beendet die Erkennung bei Stille automatisch (auch mit
        // continuous=true). Wir starten DIESELBE Instanz einfach erneut.
        // Wichtig: Keine neue Instanz erzeugen, sonst verlangt Chrome
        // eine neue User-Gesture und blockiert den Start.
        rec.onend = () => {
            console.warn(`[VoiceInput #${id}] 🔚 onend – isListening=${isListeningRef.current}, hadFatal=${hadFatalErrorRef.current}`);

            if (!isListeningRef.current || hadFatalErrorRef.current) {
                console.warn(`[VoiceInput #${id}] ⛔ Kein Neustart (isListening=${isListeningRef.current}, hadFatal=${hadFatalErrorRef.current})`);
                setIsListening(false);
                return;
            }

            // Retry-Schleife: start() kann direkt nach onend noch fehlschlagen,
            // weil Chrome die interne Audio-Session noch nicht freigegeben hat.
            let attempts = 0;
            const maxAttempts = 8;
            const tryRestart = () => {
                if (!isListeningRef.current || !recognitionRef.current) {
                    console.warn(`[VoiceInput #${id}] ⛔ Retry abgebrochen (isListening=${isListeningRef.current}, ref=${!!recognitionRef.current})`);
                    return;
                }
                try {
                    recognitionRef.current.start();
                    console.warn(`[VoiceInput #${id}] 🔄 Restart OK nach Versuch ${attempts + 1}`);
                } catch (e) {
                    attempts++;
                    const errMsg = (e as Error)?.message || '';
                    console.warn(`[VoiceInput #${id}] ⚠️ Restart fehlgeschlagen, Versuch ${attempts}:`, errMsg);
                    if (attempts < maxAttempts && isListeningRef.current) {
                        // Exponentieller Backoff: 100, 200, 400, 800, …
                        setTimeout(tryRestart, Math.min(100 * Math.pow(2, attempts - 1), 2000));
                    } else {
                        // Alle Versuche erschöpft → sauber aufgeben
                        console.warn(`[VoiceInput #${id}] 💀 Konnte Erkennung nicht neu starten nach ${maxAttempts} Versuchen`);
                        isListeningRef.current = false;
                        setIsListening(false);
                        setErrorMessage("Neustart fehlgeschlagen – bitte erneut klicken.");
                        setTimeout(() => setErrorMessage(null), 5000);
                    }
                }
            };
            // Erster Versuch nach kurzer Pause
            setTimeout(tryRestart, 120);
        };

        recognitionRef.current = rec;

        return () => {
            console.warn(`[VoiceInput #${id}] 🔴 UNMOUNT – Cleanup, isListening war ${isListeningRef.current}`);
            isListeningRef.current = false;
            try { rec.stop(); } catch { /* not running */ }
        };
    }, []);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;
        const id = instanceIdRef.current;

        if (isListeningRef.current) {
            // ── Stoppen ──
            console.warn(`[VoiceInput #${id}] 🛑 toggleListening → STOP`);
            isListeningRef.current = false;
            setIsListening(false);
            try { recognitionRef.current.stop(); } catch { /* not running */ }
        } else {
            // ── Starten (hier gibt es eine echte User-Gesture) ──
            console.warn(`[VoiceInput #${id}] ▶️ toggleListening → START`);
            isListeningRef.current = true;
            hadFatalErrorRef.current = false;
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error(`[VoiceInput #${id}] start() fehlgeschlagen:`, error);
                isListeningRef.current = false;
                setIsListening(false);
            }
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
