"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { clientService } from "@/lib/firebase/services/clientService";
import { aiAnalysisService, ConsultationAnalysisResult, SkbAnalysisResult } from "@/lib/firebase/services/aiAnalysisService";
import { Client } from "@/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { ArrowLeft, Sparkles, Loader2, FileText, HeartHandshake, Baby, Info, ChevronDown } from "lucide-react";

type NoteType = "seelsorge" | "skb";

/**
 * U-016 (Usability-Bericht 08.10.2026): Rohe Fehler-Strings (englische
 * Fetch-/Gemini-Meldungen) werden nicht mehr 1:1 angezeigt. Technische
 * Details gehören nur in console.error.
 */
const mapAnalysisError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const lower = raw.toLowerCase();
    if (
        lower.includes("fetch") ||
        lower.includes("network") ||
        lower.includes("connect") ||
        lower.includes("offline")
    ) {
        return "Die KI-Analyse ist gerade nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.";
    }
    if (
        lower.includes("timeout") ||
        lower.includes("deadline") ||
        lower.includes("quota") ||
        lower.includes("rate") ||
        lower.includes("429") ||
        lower.includes("503")
    ) {
        return "Die Analyse dauert gerade länger als gewohnt. Bitte warte einen Moment und versuche es dann erneut.";
    }
    return "Die KI-Analyse konnte nicht abgeschlossen werden. Bitte versuche es erneut — wenn es wiederholt nicht klappt, melde dich bei Johann.";
};

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

    // Voice-to-Text State
    const [isListening, setIsListening] = useState(false);

    // U-015: Workflow-Kasten nur beim ersten Besuch pro Nutzer offen zeigen
    const [workflowOpen, setWorkflowOpen] = useState(false);
    useEffect(() => {
        try {
            setWorkflowOpen(localStorage.getItem("cura-notes-workflow-seen") === null);
            localStorage.setItem("cura-notes-workflow-seen", "1");
        } catch {
            // localStorage nicht verfügbar (z. B. privater Modus) — Kasten bleibt zu
        }
    }, []);

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
            // U-016: Technische Meldung nur ins Log, Nutzer sieht deutschen Text mit Handlungsweg
            console.error("Analysis error:", err);
            setError(mapAnalysisError(err));
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute requiredPermission="hasClientAccess">
                <div className="flex h-full items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute requiredPermission="hasClientAccess">
            <div className="animate-in fade-in duration-500 flex flex-col h-full max-w-4xl mx-auto w-full pb-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.push(`/clients/${clientId}`)}
                        className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 transition-colors"
                        title="Zurück zum Klienten"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl">
                                <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            Gesprächsnotiz
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">
                            Klient: <strong>{client?.name || "Unbekannt"}</strong>
                        </p>
                    </div>
                </div>

                {/* Note Type Selector */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setNoteType("seelsorge")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${noteType === "seelsorge"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/40"
                            : "bg-white/60 dark:bg-slate-900/60 text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-900/80 border border-gray-200 dark:border-white/10"
                            }`}
                    >
                        <HeartHandshake className="w-4 h-4" />
                        Seelsorge-Gespräch
                    </button>
                    {client?.gender === "Weiblich" && !["Kind", "Senior"].includes(client?.personGroup || "") && (
                        <button
                            onClick={() => setNoteType("skb")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${noteType === "skb"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-950/40"
                                : "bg-white/60 dark:bg-slate-900/60 text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-900/80 border border-gray-200 dark:border-white/10"
                                }`}
                        >
                            <Baby className="w-4 h-4" />
                            SKB-Beratung
                        </button>
                    )}
                </div>

                {/* Workflow Guide — U-015: einklappbar, offen nur beim ersten Besuch */}
                <div className="mb-4 bg-indigo-50/80 dark:bg-indigo-950/30 backdrop-blur-sm border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setWorkflowOpen((prev) => !prev)}
                        aria-expanded={workflowOpen}
                        className="w-full flex items-center justify-between gap-2 p-4 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                        <span className="flex items-center gap-2.5">
                            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            So diktierst du gut — empfohlene Reihenfolge
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${workflowOpen ? "rotate-180" : ""}`} />
                    </button>
                    {workflowOpen && (
                    <div className="px-4 pb-4 flex gap-3 text-sm text-indigo-900 dark:text-indigo-200">
                    <div className="leading-relaxed">
                        <strong className="block text-indigo-800 dark:text-indigo-300 mb-1">Empfohlene Reihenfolge fürs Diktieren oder Tippen:</strong>
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
                        <p className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                            <strong>Sprachbefehle beim Diktieren:</strong> Sag &quot;<em>nächster Absatz</em>&quot; oder &quot;<em>neuer Absatz</em>&quot; für eine Leerzeile, &quot;<em>nächste Zeile</em>&quot; oder &quot;<em>neue Zeile</em>&quot; für einen einfachen Zeilenumbruch. Die Aufnahme läuft danach automatisch weiter.
                        </p>
                    </div>
                    </div>
                    )}
                </div>

                {/* Notes Textarea */}
                <div className={`flex-1 flex flex-col bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border shadow-sm overflow-hidden transition-colors ${isListening ? "border-red-300 dark:border-red-500/40 shadow-red-100 dark:shadow-red-950/30" : "border-white/60 dark:border-white/10"
                    }`}>
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-slate-400">
                                {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </span>
                            {isListening && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full animate-pulse">
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                    Aufnahme läuft...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <VoiceInput
                                value={notes}
                                onResult={(text) => setNotes(text)}
                                onListeningChange={(listening) => setIsListening(listening)}
                            />
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${noteType === "seelsorge"
                                ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
                                : "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300"
                                }`}>
                                {noteType === "seelsorge" ? "Seelsorge" : "SKB"}
                            </span>
                        </div>
                    </div>
                    <textarea
                        id="consultation-notes"
                        className="flex-1 w-full p-5 bg-transparent resize-none text-gray-800 dark:text-slate-200 text-base leading-relaxed focus:outline-none placeholder:text-gray-400 dark:placeholder:text-slate-500 min-h-[400px]"
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
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-500/30 text-sm">
                        {error}
                    </div>
                )}

                {/* Info hint — U-015: auf eine Zeile gekürzt (Details im FAQ, F-2/F-3) */}
                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-sm flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                        &quot;Daten verwerten&quot; füllt das Formular per KI vor — du prüfst alles vor dem Speichern.
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
                        className="gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 border-none shadow-lg hover:shadow-xl transition-all"
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
