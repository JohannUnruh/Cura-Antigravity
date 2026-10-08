"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/Card";
import { HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/Card";

interface FaqEntry {
    question: string;
    answer: React.ReactNode;
}

// Inhalte 1:1 aus dem Usability-Bericht 08.10.2026 (F-1 … F-8).
// Fachliche Freigabe der Texte liegt bei Johann/Irene (N-3).
const FAQ_ENTRIES: FaqEntry[] = [
    {
        question: "Wie lege ich einen neuen Klienten an?",
        answer: (
            <>
                Klienten → „Neuer Klient&quot;. Name (bei Paaren/Familien der Haushaltsname), Personengruppe und
                Geschlecht wählen, speichern. Direkt danach kannst du ein Erstgespräch als Kalendereintrag planen.
                Die Akte erscheint in deiner Liste und in den Favoriten, wenn du den Stern setzt.
            </>
        ),
    },
    {
        question: "Wie erfasse ich ein Beratungsgespräch?",
        answer: (
            <>
                Klient öffnen → „Gesprächsnotiz&quot; → frei schreiben oder diktieren → „Daten verwerten&quot;.
                Die KI füllt das Formular vor; du prüfst und korrigierst alles, bevor du speicherst. Stunden gehen
                automatisch in die Zeiterfassung.
            </>
        ),
    },
    {
        question: "Wie diktiere ich eine gute Notiz?",
        answer: (
            <>
                Nenne zuerst die Dauer („2 Stunden Gespräch, 30 Minuten Vorbereitung&quot;), dann Problemherkunft
                und Lebensabschnitt („Glaubenskrise aus der Kindheit&quot;), dann Folgen, dann Ziel. Sag „neuer
                Absatz&quot; für eine Leerzeile — die Aufnahme läuft weiter.
            </>
        ),
    },
    {
        question: "Was ist eine SKB und wann nutze ich sie?",
        answer: (
            <>
                SKB = Schwangerschaftskonfliktberatung. Du erreichst sie über die Gesprächsnotiz einer{" "}
                <strong>weiblichen</strong> Klientin (Button „SKB-Beratung&quot;). Erfasst werden SSW,
                Begleitperson, Konfliktpunkte und Beratungsschein-Status.
            </>
        ),
    },
    {
        question: "Kurzgespräch oder Beratung — was ist der Unterschied?",
        answer: (
            <>
                Kurzgespräche („Kurzgespräche&quot; in der Navigation) sind Spontan- und Stehcafé-Gespräche{" "}
                <strong>ohne</strong> Akte, z. B. nach dem Gottesdienst. Sobald ein Fall daraus wird: über das
                Personen-Icon „In Akte überführen&quot; — die Stunden werden dabei nicht doppelt gezählt.
            </>
        ),
    },
    {
        question: "Wie funktioniert die Zeiterfassung und mein Monatskontingent?",
        answer: (
            <>
                Jede Beratung, jedes Kurzgespräch und jeder manuelle Eintrag („Zeiterfassung&quot; → „Neue Zeit
                erfassen&quot;) zählt in dein Monatskonto. Als Minijobber siehst du oben dein Restkontingent; was
                darüber liegt, wandert in den Überstundenpool und kann später verteilt werden.
            </>
        ),
    },
    {
        question: "Mein Passwort funktioniert nicht.",
        answer: (
            <>
                Login-Seite → „Passwort vergessen?&quot; → E-Mail eingeben → Link im Postfach öffnen (auch Spam
                prüfen). Klappt es nach mehreren Versuchen gar nicht, warte einige Minuten (Sperrschutz) oder
                melde dich bei Johann.
            </>
        ),
    },
    {
        question: "Was passiert beim Archivieren einer Akte?",
        answer: (
            <>
                Die Akte verschwindet aus der aktiven Liste und den Kennzahlen, bleibt aber über den Filter
                „Archiviert&quot; auffindbar und wiederherstellbar. Löschen solltest du nur leere Test-Akten.
            </>
        ),
    },
];

export default function FaqPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full max-w-3xl mx-auto w-full pb-10 space-y-6">
                <div className="flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2.5 rounded-xl">
                        <HelpCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hilfe &amp; FAQ</h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">
                            Die häufigsten Fragen zur Cura-App — kurz beantwortet.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {FAQ_ENTRIES.map((entry, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <Card
                                key={entry.question}
                                className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                                        {entry.question}
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "w-5 h-5 shrink-0 text-gray-400 dark:text-slate-500 transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </button>
                                {isOpen && (
                                    <CardContent className="px-5 pb-5 pt-0">
                                        <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                                            {entry.answer}
                                        </p>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
                    Frage nicht dabei? Sprich Johann oder Irene an — die Antworten kommen hier mit rein.
                </p>
            </div>
        </ProtectedRoute>
    );
}
