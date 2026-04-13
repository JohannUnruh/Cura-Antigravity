"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { clientService } from "@/lib/firebase/services/clientService";
import { aiAnalysisService, ConsultationAnalysisResult, SkbAnalysisResult } from "@/lib/firebase/services/aiAnalysisService";
import { Client } from "@/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Sparkles, Loader2, FileText, HeartHandshake, Baby, Mic, MicOff, Info } from "lucide-react";

type NoteType = "seelsorge" | "skb";

export default function NotesPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params?.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState("");
    const [noteType, setNoteType] = useState<NoteType>("seelsorge");
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Voice-to-Text
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const notesRef = useRef(notes);

    // Keep ref in sync with state
    useEffect(() => { notesRef.current = notes; }, [notes]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;

        setSpeechSupported(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRecognitionAPI as any)();
        recognition.continuous = true;
        recognition.interimResults = false; // Only fire on final results for reliability
        recognition.lang = "de-DE";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const transcript = event.results[i][0].transcript.trim();
                    if (transcript) {
                        setNotes(prev => {
                            const separator = prev && !prev.endsWith("\n") && !prev.endsWith(" ") ? " " : "";
                            return prev + separator + transcript + " ";
                        });
                    }
                }
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            if (event.error !== "no-speech" && event.error !== "aborted") {
                isListeningRef.current = false;
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Use ref (not state) to avoid stale closure
            if (isListeningRef.current) {
                try { recognition.start(); } catch { /* already running */ }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            isListeningRef.current = false;
            try { recognition.stop(); } catch { /* not running */ }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListeningRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
            try { recognitionRef.current.stop(); } catch { /* */ }
        } else {
            isListeningRef.current = true;
            setIsListening(true);
            try { recognitionRef.current.start(); } catch { /* */ }
        }
    };

    const loadClient = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const data = await clientService.getClientById(clientId);
            setClient(data);
        } catch (err) {
            console.error("Error loading client:", err);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => { loadClient(); }, [loadClient]);

    const handleAnalyze = async () => {
        if (!notes.trim()) return;
        setAnalyzing(true);
        setError(null);

        try {
            if (noteType === "seelsorge") {
                const result: ConsultationAnalysisResult = await aiAnalysisService.analyzeConsultationNotes(notes);
                // Encode and redirect to client page with prefilled data
                const encoded = encodeURIComponent(JSON.stringify({ ...result, _source: "ai_notes" }));
                router.push(`/clients/${clientId}?aiPrefill=consultation&data=${encoded}`);
            } else {
                const result: SkbAnalysisResult = await aiAnalysisService.analyzeSkbNotes(notes);
                const encoded = encodeURIComponent(JSON.stringify({ ...result, _source: "ai_notes" }));
                router.push(`/clients/${clientId}?aiPrefill=skb&data=${encoded}`);
            }
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="flex h-full items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full max-w-4xl mx-auto w-full pb-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.push(`/clients/${clientId}`)}
                        className="p-2 rounded-full hover:bg-white/50 text-gray-500 transition-colors"
                        title="Zurück zum Klienten"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="bg-violet-100 p-2 rounded-xl">
                                <FileText className="w-6 h-6 text-violet-600" />
                            </div>
                            Gesprächsnotiz
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Klient: <strong>{client?.name || "Unbekannt"}</strong>
                        </p>
                    </div>
                </div>

                {/* Note Type Selector */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setNoteType("seelsorge")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${noteType === "seelsorge"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                            }`}
                    >
                        <HeartHandshake className="w-4 h-4" />
                        Seelsorge-Gespräch
                    </button>
                    {client?.gender === "Weiblich" && !["Kind", "Senior"].includes(client?.personGroup || "") && (
                        <button
                            onClick={() => setNoteType("skb")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${noteType === "skb"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                                }`}
                        >
                            <Baby className="w-4 h-4" />
                            SKB-Beratung
                        </button>
                    )}
                </div>

                {/* Workflow Guide */}
                <div className="mb-4 bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 rounded-xl p-4 flex gap-3 text-sm text-indigo-900 shadow-sm">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="block text-indigo-800 mb-1">Empfohlene Reihenfolge fürs Diktieren oder Tippen:</strong>
                        {noteType === "seelsorge" ? (
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Zeiten:</strong> Dauer des Gesprächs und eventuelle Vorbereitungszeit (z.B. &quot;2 Stunden Gespräch, 30 Min. Vorbereitung&quot;)</li>
                                <li><strong>Problemherkunft:</strong> Aus welchem Lebensabschnitt stammt das Ursprungsproblem und um welchen Bereich geht es (z.B. &quot;Vergangenheit / Familie&quot;)?</li>
                                <li><strong>Folgen:</strong> Welche Teil- oder Folgeprobleme (Sucht, Depression o.ä.) haben sich manifestiert?</li>
                                <li><strong>Ziel:</strong> Welchen Zieltyp (Entlastung, Veränderung...) strebt ihr an und welche Vereinbarungen wurden gemacht?</li>
                                <li><strong>Einschätzung:</strong> Deine Ansicht zur Ursache und weitere freie Notizen zum Gesprächsinhalt.</li>
                            </ul>
                        ) : (
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Zeiten:</strong> Dauer der SKB-Beratung (z.B. &quot;Das Gespräch dauerte 1,5 Stunden&quot;)</li>
                                <li><strong>Schwangerschaft:</strong> In welcher Schwangerschaftswoche (SSW) befindet sich die Klientin?</li>
                                <li><strong>Begleitung:</strong> War sie alleine oder in Begleitung (Partner, Familie, etc.)?</li>
                                <li><strong>Konflikte & Probleme:</strong> Welche ursächlichen Themen oder Teilprobleme bestehen (Finanzen, Überforderung, etc.)?</li>
                                <li><strong>Ziele:</strong> Ziel der Beratung und weitere Vereinbarungen.</li>
                                <li><strong>Notizen:</strong> Weitere freie Notizen für die Akte.</li>
                            </ul>
                        )}
                    </div>
                </div>

                {/* Notes Textarea */}
                <div className={`flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-2xl border shadow-sm overflow-hidden transition-colors ${isListening ? "border-red-300 shadow-red-100" : "border-white/60"
                    }`}>
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                                {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </span>
                            {isListening && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full animate-pulse">
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                    Aufnahme läuft...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {speechSupported && (
                                <button
                                    onClick={toggleListening}
                                    title={isListening ? "Aufnahme stoppen" : "Spracheingabe starten"}
                                    className={`p-2 rounded-xl transition-all ${isListening
                                        ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>
                            )}
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${noteType === "seelsorge"
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-emerald-50 text-emerald-600"
                                }`}>
                                {noteType === "seelsorge" ? "Seelsorge" : "SKB"}
                            </span>
                        </div>
                    </div>
                    <textarea
                        id="consultation-notes"
                        className="flex-1 w-full p-5 bg-transparent resize-none text-gray-800 text-base leading-relaxed focus:outline-none placeholder:text-gray-400 min-h-[400px]"
                        placeholder={noteType === "seelsorge"
                            ? "Schreibe hier deine Gesprächsnotizen...\n\nBeispiel:\nHeute hatte ich ein Seelsorgegespräch. Das Gespräch dauerte etwa 2 Stunden, Vorbereitung ca. 30 Minuten. Die Klientin kämpft mit einer Glaubenskrise aus der Kindheit. Als Folge zeigen sich Depressionen. Ziel ist die Entlastung und Stabilisierung..."
                            : "Schreibe hier deine SKB-Notizen...\n\nBeispiel:\nHeute fand eine Schwangerschaftskonfliktberatung statt. Die Klientin ist in der 12. SSW und kam alleine. Es bestehen finanzielle Nöte und Überforderung..."
                        }
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                        {error}
                    </div>
                )}

                {/* Info hint */}
                <div className="mt-4 p-3 bg-violet-50 text-violet-800 rounded-xl border border-violet-100 text-sm flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                    <p>
                        <strong>KI-Analyse:</strong> Wenn du auf &quot;Daten verwerten&quot; klickst, analysiert Gemini deine Notizen und füllt das Formular automatisch vor.
                        Du kannst alles überprüfen und korrigieren, bevor du speicherst. Die KI verwendet nur bestehende Dropdown-Optionen aus deinen Einstellungen.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-4 gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/clients/${clientId}`)}
                    >
                        Abbrechen
                    </Button>
                    <Button
                        variant="primary"
                        disabled={analyzing || !notes.trim()}
                        onClick={handleAnalyze}
                        className="gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 border-none shadow-lg hover:shadow-xl transition-all"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                KI analysiert...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Daten verwerten
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </ProtectedRoute>
    );
}
