import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from './Card';

interface VoiceInputProps {
    onResult: (text: string) => void;
    className?: string;
    onError?: (error: string) => void;
}

export function VoiceInput({ onResult, className, onError }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [supportError, setSupportError] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = false;
                rec.interimResults = true;
                rec.lang = 'de-DE'; // Default to German

                rec.onstart = () => setIsListening(true);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rec.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript) {
                        onResult(finalTranscript);
                    }
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rec.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    if (onError) onError(event.error);
                    setIsListening(false);
                };

                rec.onend = () => setIsListening(false);

                recognitionRef.current = rec;
            } else {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setSupportError(true);
            }
        }
    }, [onResult, onError]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Speech recognition start error", error);
            }
        }
    };

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
    );
}
