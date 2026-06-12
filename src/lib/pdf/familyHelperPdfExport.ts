import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FamilyCase, FamilyGoal, FamilyJournalEntry } from "@/types/familyHelper";

/**
 * Utility: Logo als Base64 laden
 */
async function getBase64Image(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Datum formatieren (deutsch)
 */
function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "–";
    return d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/**
 * PDF-Header mit Logo und Titel
 */
async function addPdfHeader(
    doc: jsPDF,
    title: string,
    subtitle: string
): Promise<number> {
    let startY = 35;
    try {
        const logoBase64 = await getBase64Image("/zefabiko_logo.png");
        doc.addImage(logoBase64, "PNG", 14, 10, 18, 18);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(title, 36, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, 36, 27);
        startY = 38;
    } catch {
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, 14, 27);
        startY = 35;
    }
    return startY;
}

/**
 * Fußzeile mit Seitennummer und Erstellungsdatum
 */
function addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128, 128, 128);
        doc.text(
            `Erstellt am ${formatDate(new Date())} | Seite ${i} von ${pageCount}`,
            14,
            doc.internal.pageSize.height - 10
        );
    }
    // Reset text color
    doc.setTextColor(0, 0, 0);
}

/**
 * Entwicklungsbericht-PDF
 * 
 * Enthält: Falldaten, Familienmitglieder, ASD-Kontakt, Kostenzusage,
 * Bedarfsanalyse (Vorlagen), Ziele mit aktuellem Skalenwert, Zusammenfassung.
 */
export async function exportDevelopmentReport(
    familyCase: FamilyCase,
    goals: FamilyGoal[],
    templates: Record<string, Record<string, string>>,
    workerName: string
): Promise<void> {
    const doc = new jsPDF();
    const title = `Entwicklungsbericht`;
    const subtitle = `Familie ${familyCase.familyName} | Az. ${familyCase.caseNumber}`;

    let y = await addPdfHeader(doc, title, subtitle);

    // Fallinformationen
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. Fallinformationen", 14, y);
    y += 7;

    autoTable(doc, {
        startY: y,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
        body: [
            ["Familienname", familyCase.familyName],
            ["Aktenzeichen", familyCase.caseNumber],
            ["Status", familyCase.status === "aktiv" ? "Aktiv" : familyCase.status === "inaktiv" ? "Inaktiv" : "Beendet"],
            ["Zuständige Fachkraft", workerName],
            ["Fallbeginn", formatDate(familyCase.createdAt)],
        ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 50;

    // Familienmitglieder
    if (familyCase.members && familyCase.members.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2. Familienmitglieder", 14, y);
        y += 7;

        autoTable(doc, {
            startY: y,
            head: [["Vorname", "Nachname", "Geburtsdatum", "Beziehung"]],
            body: familyCase.members.map((m) => [
                m.firstName,
                m.lastName,
                m.birthDate ? formatDate(m.birthDate) : "–",
                m.relation,
            ]),
            theme: "grid",
            headStyles: { fillColor: [99, 102, 241] }, // indigo-500
            styles: { fontSize: 10 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 8 || y + 40;
    }

    // ASD-Kontakt
    if (familyCase.asdContact) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("3. ASD-Kontakt", 14, y);
        y += 7;

        autoTable(doc, {
            startY: y,
            theme: "plain",
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
            body: [
                ["Name", familyCase.asdContact.name],
                ["Institution", familyCase.asdContact.institution || "–"],
                ["E-Mail", familyCase.asdContact.email || "–"],
                ["Telefon", familyCase.asdContact.phone || "–"],
            ],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 8 || y + 40;
    }

    // Kostenzusage
    if (familyCase.fundingCommitment) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("4. Kostenzusage", 14, y);
        y += 7;

        autoTable(doc, {
            startY: y,
            theme: "plain",
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
            body: [
                ["Bewilligte Stunden", `${familyCase.fundingCommitment.hoursGranted} Std.`],
                ["Zeitraum", `${formatDate(familyCase.fundingCommitment.startDate)} – ${formatDate(familyCase.fundingCommitment.endDate)}`],
                ["Stundensatz", familyCase.fundingCommitment.hourlyRate ? `${familyCase.fundingCommitment.hourlyRate.toFixed(2)} €` : "–"],
            ],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;
    }

    // Ziele mit Skalenwerten
    if (goals.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("5. Hilfeplanung – Ziele", 14, y);
        y += 7;

        autoTable(doc, {
            startY: y,
            head: [["Kategorie", "Beschreibung", "Skalenwert", "Zielwert"]],
            body: goals.map((g) => [
                g.category,
                g.description,
                `${g.currentValue}/10`,
                `${g.targetValue}/10`,
            ]),
            theme: "grid",
            headStyles: { fillColor: [99, 102, 241] },
            styles: { fontSize: 10 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 8 || y + 40;
    }

    // Vorlagen-Zusammenfassung
    const templateSections = [
        { key: "anamnese", title: "6. Anamnese", fields: ["familiensituation", "wohnsituation", "gesundheit", "sozialesUmfeld", "bisherigeHilfen"] },
        { key: "hypothesen", title: "7. Arbeitshypothesen", fields: ["hypothesen"] },
        { key: "interventionsplanung", title: "8. Interventionsplanung", fields: ["massnahmen", "methodik", "zeitrahmen"] },
        { key: "evaluation", title: "9. Evaluation", fields: ["zielerreichung", "reflexion", "empfehlungen"] },
    ];

    for (const section of templateSections) {
        const templateData = templates[section.key] as Record<string, string> | undefined;
        if (!templateData) continue;

        const hasContent = section.fields.some(
            (f) => templateData[f] && templateData[f].trim().length > 0
        );
        if (!hasContent) continue;

        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(section.title, 14, y);
        y += 7;

        for (const field of section.fields) {
            const value = templateData[field];
            if (!value || !value.trim()) continue;

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1");
            doc.text(fieldLabel + ":", 14, y);
            y += 5;

            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(value, 180);
            for (const line of lines) {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.text(line, 14, y);
                y += 5;
            }
            y += 3;
        }
        y += 5;
    }

    addFooter(doc);

    const safeName = familyCase.familyName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    doc.save(`Entwicklungsbericht_${safeName}_${familyCase.caseNumber}.pdf`);
}

/**
 * Leistungsnachweis-PDF (monatlich)
 * 
 * Enthält: Falldaten, Terminauflistung eines Monats, Stundenübersicht,
 * Unterschriftsfeld.
 */
export async function exportPerformanceRecord(
    familyCase: FamilyCase,
    journalEntries: FamilyJournalEntry[],
    workerName: string,
    month: number, // 0-indexed
    year: number
): Promise<void> {
    const doc = new jsPDF();
    const monthName = new Date(year, month, 1).toLocaleString("de-DE", {
        month: "long",
        year: "numeric",
    });
    const title = `Leistungsnachweis`;
    const subtitle = `Familie ${familyCase.familyName} | ${monthName}`;

    let y = await addPdfHeader(doc, title, subtitle);

    // Fallinformationen Kurzübersicht
    autoTable(doc, {
        startY: y,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
        body: [
            ["Aktenzeichen", familyCase.caseNumber],
            ["Zuständige Fachkraft", workerName],
            ["Berichtszeitraum", monthName],
        ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;

    // Termine filtern nach Monat
    const monthEntries = journalEntries
        .filter((e) => {
            const d = e.date instanceof Date ? e.date : new Date(e.date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .sort((a, b) => {
            const da = a.date instanceof Date ? a.date : new Date(a.date);
            const db = b.date instanceof Date ? b.date : new Date(b.date);
            return da.getTime() - db.getTime();
        });

    // Terminauflistung
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Terminauflistung", 14, y);
    y += 7;

    if (monthEntries.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [["Nr.", "Datum", "Art", "Dauer (Std.)", "Bemerkung"]],
            body: monthEntries.map((entry, idx) => [
                String(idx + 1),
                formatDate(entry.date),
                entry.type,
                entry.durationInHours.toFixed(1),
                entry.notes.length > 60 ? entry.notes.substring(0, 57) + "..." : entry.notes,
            ]),
            theme: "grid",
            headStyles: { fillColor: [99, 102, 241] },
            styles: { fontSize: 9 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 8 || y + 40;
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Keine Termine in diesem Zeitraum.", 14, y);
        y += 10;
    }

    // Stundenübersicht
    const totalHours = monthEntries.reduce((sum, e) => sum + e.durationInHours, 0);
    const budgetHours = familyCase.fundingCommitment?.hoursGranted || 0;

    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Stundenübersicht", 14, y);
    y += 7;

    autoTable(doc, {
        startY: y,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
        body: [
            ["Geleistete Stunden (Monat)", `${totalHours.toFixed(1)} Std.`],
            ["Anzahl Termine (Monat)", `${monthEntries.length}`],
            ...(budgetHours > 0
                ? [["Bewilligte Stunden (gesamt)", `${budgetHours} Std.`]]
                : []),
        ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 20 || y + 40;

    // Unterschriftsfelder
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Fachkraft Unterschrift
    doc.text("_________________________________", 14, y);
    y += 6;
    doc.text("Datum, Unterschrift Fachkraft", 14, y);
    y += 20;

    // Sorgeberechtigte Unterschrift
    doc.text("_________________________________", 14, y);
    y += 6;
    doc.text("Datum, Unterschrift Sorgeberechtigte/r", 14, y);

    addFooter(doc);

    const safeName = familyCase.familyName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
    doc.save(`Leistungsnachweis_${safeName}_${yearMonth}.pdf`);
}
