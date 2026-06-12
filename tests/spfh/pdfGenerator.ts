import { FamilyCase, FamilyJournalEntry } from "@/types/familyHelper";

interface JsPdfDoc {
    setFont(name: string, style?: string): this;
    setFontSize(size: number): this;
    text(text: string, x: number, y: number): this;
    save(filename: string): this;
}

type AutoTableFn = (doc: JsPdfDoc, options: { head: string[][]; body: string[][]; startY?: number }) => void;

export function generateEntwicklungsbericht(
    caseObj: FamilyCase,
    injectedJsPdf: JsPdfDoc,
    injectedAutoTable: AutoTableFn
) {
    const doc = injectedJsPdf;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Entwicklungsbericht: Familie ${caseObj.familyName}`, 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Fallnummer: ${caseObj.caseNumber}`, 20, 30);

    const body = caseObj.members.map(m => [m.firstName, m.lastName, m.relation]);
    injectedAutoTable(doc, {
        head: [['Vorname', 'Nachname', 'Beziehung']],
        body,
        startY: 40
    });

    doc.save(`entwicklungsbericht_${caseObj.familyName}.pdf`);
}

export function generateLeistungsnachweis(
    caseObj: FamilyCase,
    journals: FamilyJournalEntry[],
    injectedJsPdf: JsPdfDoc,
    injectedAutoTable: AutoTableFn
) {
    const doc = injectedJsPdf;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Leistungsnachweis: Familie ${caseObj.familyName}`, 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Fallnummer: ${caseObj.caseNumber}`, 20, 30);

    const totalHours = journals.reduce((sum, j) => sum + j.durationInHours, 0);
    doc.text(`Gesamtstunden: ${totalHours} Std.`, 20, 40);

    const body = journals.map(j => [
        j.date instanceof Date ? j.date.toISOString().substring(0, 10) : String(j.date),
        j.type,
        String(j.durationInHours),
        j.notes
    ]);

    injectedAutoTable(doc, {
        head: [['Datum', 'Typ', 'Stunden', 'Notizen']],
        body,
        startY: 50
    });

    doc.save(`leistungsnachweis_${caseObj.familyName}.pdf`);
}
