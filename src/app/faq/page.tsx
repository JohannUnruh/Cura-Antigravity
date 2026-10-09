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
                Gehe im Menü auf <strong>Klienten</strong> und klicke auf <strong>„Neuer Klient“</strong>. Trage den Vornamen und Nachnamen ein (bei Paaren oder Familien den gemeinsamen Familiennamen), wähle die passende Personengruppe sowie das Geschlecht aus und speichere die Akte ab.
                <br /><br />
                <strong>Wichtiger Hinweis zum Erstgespräch:</strong> Direkt nach dem Anlegen kannst du optional ein Erstgespräch als Kalendereintrag planen. Erstelle diesen Kalendereintrag bitte <em>nur dann</em>, wenn das Gespräch über mehrere Tage geplant ist oder tatsächlich eine Buchung bzw. Übernachtung in der Seelsorgewohnung in Erwägung gezogen wird. Dieser Eintrag fließt nämlich direkt in den allgemeinen Belegungsplan der Seelsorgewohnung ein.
                <br /><br />
                Die neue Akte erscheint anschließend in deiner Klientenliste und über das Stern-Symbol auch in deinen persönlichen Favoriten.
            </>
        ),
    },
    {
        question: "Wie erfasse ich ein Beratungsgespräch?",
        answer: (
            <>
                Du hast zwei komfortable Möglichkeiten, ein Seelsorgegespräch zu erfassen:
                <br /><br />
                <strong>1. Direkt über das Seelsorge-Formular:</strong> Öffne die Klientenakte und klicke auf den Button <strong>„Neues Seelsorgegespräch“</strong>. Hier kannst du Datum (von/bis), Tagesabschnitt, Gesprächsart (persönlich, telefonisch, Video), Einheiten, Vorbereitungszeit, Lebensabschnitt, Problemherkunft, Folgeprobleme sowie Ziele und Notizen strukturiert eintragen und speichern.
                <br /><br />
                <strong>2. Per KI-Gesprächsnotiz (Diktat oder Freitext):</strong> Klicke in der Akte auf <strong>„Gesprächsnotiz starten“</strong>. Dort kannst du den Gesprächsverlauf frei notieren oder diktieren. Ein Klick auf <strong>„Daten verwerten“</strong> analysiert den Text automatisch und befüllt das Formular vor. Du kannst alle Angaben vor dem Speichern in Ruhe prüfen und anpassen.
                <br /><br />
                In beiden Fällen werden die geleisteten Stunden automatisch für deine Zeiterfassung übernommen.
            </>
        ),
    },
    {
        question: "Wie diktiere ich eine gute Notiz?",
        answer: (
            <>
                Damit die KI alle Felder der Beratung optimal vorbefüllen kann, empfiehlt sich folgende klare Reihenfolge beim Diktieren oder Notieren:
                <br /><br />
                1. <strong>Datum:</strong> Datum von und Datum bis (z.&nbsp;B. <em>„Gespräch vom 9. Oktober bis 9. Oktober“</em>)
                <br />
                2. <strong>Dauer:</strong> Dauer des Gesprächs in Einheiten sowie Vorbereitungszeit (z.&nbsp;B. <em>„2 Stunden Gespräch, 30 Minuten Vorbereitung“</em>)
                <br />
                3. <strong>Problemherkunft &amp; Lebensabschnitt:</strong> Ursprung des Anliegens und prägende Lebensphase (z.&nbsp;B. <em>„Problemherkunft familiäre Prägung, Lebensabschnitt Kindheit und Jugend“</em>)
                <br />
                4. <strong>Folgeproblem:</strong> Welche konkreten Auswirkungen oder Folgeprobleme zeigen sich daraus heute
                <br />
                5. <strong>Ziel:</strong> Welches Ziel wird gemeinsam verfolgt bzw. nachgestrebt
                <br />
                6. <strong>Zieltermin &amp; Notizen:</strong> Bis wann das Ziel angestrebt wird und welche geistlichen Gedanken, Vereinbarungen oder Notizen festgehalten werden sollen
                <br /><br />
                <em>Tipp:</em> Sag beim Diktieren einfach <strong>„neuer Absatz“</strong>, um eine Leerzeile zu erzeugen – die Aufnahme läuft dabei ununterbrochen weiter.
            </>
        ),
    },
    {
        question: "Was ist eine SKB und wann nutze ich sie?",
        answer: (
            <>
                <strong>SKB</strong> steht für <strong>Schwangerschaftskonfliktberatung</strong>. Dieser Bereich dient der seelsorgerlichen und psychosozialen Begleitung von Frauen in Schwangerschaftskonflikten und steht ausschließlich bei weiblichen Klientinnen zur Verfügung. Erfasst werden hier spezifische Parameter wie die aktuelle Schwangerschaftswoche (SSW), Begleitpersonen, Konfliktpunkte und der Status des Beratungsscheins bzw. der Beratungsbescheinigung.
            </>
        ),
    },
    {
        question: "Wie erfasse ich ein SKB-Gespräch?",
        answer: (
            <>
                Öffne die Akte einer weiblichen Klientin. Du hast auch hier zwei Wege:
                <br /><br />
                <strong>1. Direktes Formular:</strong> Klicke auf den Button <strong>„Neue SKB-Beratung“</strong> (türkis/grün). Dort trägst du alle spezifischen Angaben zur Schwangerschaftskonfliktberatung (SSW, Konfliktgründe, Beratungsnachweis) strukturiert ein und speicherst das Gespräch ab.
                <br /><br />
                <strong>2. Über die Gesprächsnotiz:</strong> Starte eine <strong>„Gesprächsnotiz“</strong> und wähle dort den Modus <strong>„SKB-Beratung“</strong>. Du kannst das Gespräch frei diktieren und die Daten anschließend per KI in das SKB-Formular übernehmen lassen.
            </>
        ),
    },
    {
        question: "Kurzgespräch oder Beratung — was ist der Unterschied?",
        answer: (
            <>
                <strong>Kurzgespräche</strong> (in der linken Navigation unter <em>Kurzgespräche</em>) sind für spontane Seelsorge- und Tür-und-Angel-Kontakte <strong>ohne</strong> bestehende Akte gedacht – beispielsweise nach dem Gottesdienst, im Stehcafé oder bei kurzen Telefonaten.
                <br /><br />
                Wird aus einem solchen Kontakt eine fortlaufende Begleitung, kannst du das Kurzgespräch über das Personen-Symbol <strong>„In Akte überführen“</strong> direkt einer bestehenden oder neuen Klientenakte zuweisen. Die erfassten Zeiten bleiben erhalten und werden nicht doppelt verbucht.
                <br /><br />
                <strong>Beratungen</strong> finden immer im Rahmen einer fest angelegten Klientenakte mit vollständiger Dokumentationshistorie statt.
            </>
        ),
    },
    {
        question: "Wie funktioniert die Zeiterfassung und mein Monatskontingent?",
        answer: (
            <>
                Jedes Seelsorgegespräch, jedes Kurzgespräch und jeder manuell eingetragene Zeiteintrag (unter <em>Zeiterfassung</em> → <em>„Neue Zeit erfassen“</em>) fließt automatisch in deine Monatsabrechnung ein.
                <br /><br />
                Als Minijobber siehst du oben auf der Zeiterfassungsseite jederzeit dein verbleibendes Restkontingent für den aktuellen Monat. Stunden, die darüber hinausgehen, wandern automatisch in den Überstundenpool und können in den Folgemonaten flexibel ausgeglichen werden.
            </>
        ),
    },
    {
        question: "Was kann ich tun, wenn mein Passwort nicht funktioniert?",
        answer: (
            <>
                Klicke auf der Anmeldeseite auf <strong>„Passwort vergessen?“</strong> und gib deine registrierte E-Mail-Adresse ein. Du erhältst umgehend einen Link zum Zurücksetzen deines Passworts per E-Mail (bitte prüfe auch deinen Spam-Ordner).
                <br /><br />
                Sollte die Anmeldung nach mehreren Versuchen gesperrt sein, warte bitte einige Minuten (automatischer Schutzmechanismus) oder wende dich direkt an den Administrator.
            </>
        ),
    },
    {
        question: "Was passiert beim Archivieren einer Akte?",
        answer: (
            <>
                Beim Archivieren verschwindet die Akte aus der aktiven Klientenliste und aus den aktuellen Kennzahlen des Dashboards. Alle Einträge, Notizen und Dokumente bleiben jedoch vollständig und sicher erhalten.
                <br /><br />
                Über den Filter <strong>„Archiviert“</strong> in der Klientenliste kannst du archivierte Akten jederzeit wieder aufrufen, einsehen und bei Bedarf reaktivieren. Ein endgültiges Löschen ist ausschließlich für leere Testakten vorgesehen.
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
                    Frage nicht dabei? Wende dich einfach an den Administrator — neue Antworten und Themen nehmen wir hier gerne auf.
                </p>
            </div>
        </ProtectedRoute>
    );
}
