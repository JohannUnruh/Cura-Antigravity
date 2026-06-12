import { describe, it, expect, beforeEach } from "../test-framework";
import { generateEntwicklungsbericht, generateLeistungsnachweis } from "./pdfGenerator";
import { FamilyCase, FamilyJournalEntry } from "@/types/familyHelper";

interface AutoTableOptions {
    head: string[][];
    body: string[][];
    startY?: number;
}

class MockDoc {
    calls: { method: string; args: unknown[] }[] = [];

    setFont(name: string, style?: string) {
        this.calls.push({ method: "setFont", args: [name, style] });
        return this;
    }

    setFontSize(size: number) {
        this.calls.push({ method: "setFontSize", args: [size] });
        return this;
    }

    text(txt: string, x: number, y: number, options?: unknown) {
        this.calls.push({ method: "text", args: [txt, x, y, options] });
        return this;
    }

    save(filename: string) {
        this.calls.push({ method: "save", args: [filename] });
        return this;
    }
}

describe("Feature 6: PDF Export", () => {
    let doc: MockDoc;
    let autoTableCalls: { doc: unknown; options: AutoTableOptions }[];
    let mockAutoTable: (d: unknown, opt: AutoTableOptions) => void;

    beforeEach(() => {
        doc = new MockDoc();
        autoTableCalls = [];
        mockAutoTable = (d: unknown, opt: AutoTableOptions) => {
            autoTableCalls.push({ doc: d, options: opt });
        };
    });

    const mockCase: FamilyCase = {
        familyName: "Schumann",
        caseNumber: "SPFH-SCHU-123",
        assignedWorkerId: "worker_1",
        status: "aktiv",
        members: [
            { firstName: "Clara", lastName: "Schumann", relation: "Mutter" },
            { firstName: "Robert", lastName: "Schumann", relation: "Vater" }
        ],
        createdAt: new Date()
    };

    const mockJournals: FamilyJournalEntry[] = [
        {
            id: "j_1",
            date: new Date("2026-06-01T10:00:00Z"),
            durationInHours: 2.0,
            type: "Hausbesuch",
            notes: "Erstgespräch.",
            hasTimeEntry: false
        },
        {
            id: "j_2",
            date: new Date("2026-06-02T10:00:00Z"),
            durationInHours: 1.5,
            type: "Telefonat",
            notes: "Rücksprache ASD.",
            hasTimeEntry: false
        }
    ];

    // --- TIER 1: FEATURE COVERAGE (>= 5 Tests) ---

    it("should set title font size to 16 and body font size to 12 in Entwicklungsbericht", () => {
        generateEntwicklungsbericht(mockCase, doc, mockAutoTable);

        const fontSizes = doc.calls.filter(c => c.method === "setFontSize").map(c => c.args[0]);
        expect(fontSizes.includes(16)).toBeTruthy();
        expect(fontSizes.includes(12)).toBeTruthy();
    });

    it("should set font styles bold and normal in Entwicklungsbericht", () => {
        generateEntwicklungsbericht(mockCase, doc, mockAutoTable);

        const fonts = doc.calls.filter(c => c.method === "setFont");
        expect(fonts.some(c => c.args[1] === "bold")).toBeTruthy();
        expect(fonts.some(c => c.args[1] === "normal")).toBeTruthy();
    });

    it("should include correct title and caseNumber in Entwicklungsbericht texts", () => {
        generateEntwicklungsbericht(mockCase, doc, mockAutoTable);

        const texts = doc.calls.filter(c => c.method === "text").map(c => c.args[0] as string);
        expect(texts.some(t => t.includes("Entwicklungsbericht: Familie Schumann"))).toBeTruthy();
        expect(texts.some(t => t.includes("Fallnummer: SPFH-SCHU-123"))).toBeTruthy();
    });

    it("should call save with correct filename format for Entwicklungsbericht", () => {
        generateEntwicklungsbericht(mockCase, doc, mockAutoTable);

        const saveCall = doc.calls.find(c => c.method === "save");
        expect(saveCall).toBeDefined();
        expect(saveCall!.args[0]).toBe("entwicklungsbericht_Schumann.pdf");
    });

    it("should correctly compute total hours in Leistungsnachweis", () => {
        generateLeistungsnachweis(mockCase, mockJournals, doc, mockAutoTable);

        const texts = doc.calls.filter(c => c.method === "text").map(c => c.args[0] as string);
        expect(texts.some(t => t.includes("Gesamtstunden: 3.5 Std."))).toBeTruthy();
    });

    // --- TIER 2: BOUNDARY & CORNER CASES (>= 5 Tests) ---

    it("should handle empty journal entries list in Leistungsnachweis safely (0 hours)", () => {
        generateLeistungsnachweis(mockCase, [], doc, mockAutoTable);

        const texts = doc.calls.filter(c => c.method === "text").map(c => c.args[0] as string);
        expect(texts.some(t => t.includes("Gesamtstunden: 0 Std."))).toBeTruthy();
        expect(autoTableCalls[0].options.body.length).toBe(0);
    });

    it("should handle empty members list in Entwicklungsbericht safely", () => {
        const emptyMembersCase: FamilyCase = { ...mockCase, members: [] };
        generateEntwicklungsbericht(emptyMembersCase, doc, mockAutoTable);

        expect(autoTableCalls.length).toBe(1);
        expect(autoTableCalls[0].options.body.length).toBe(0);
    });

    it("should handle special characters in family name for saving file safely", () => {
        const specialCase: FamilyCase = { ...mockCase, familyName: "Müller-Özdemir" };
        generateEntwicklungsbericht(specialCase, doc, mockAutoTable);

        const saveCall = doc.calls.find(c => c.method === "save");
        expect(saveCall!.args[0]).toBe("entwicklungsbericht_Müller-Özdemir.pdf");
    });

    it("should pass correct column headers in Leistungsnachweis autoTable call", () => {
        generateLeistungsnachweis(mockCase, mockJournals, doc, mockAutoTable);

        expect(autoTableCalls.length).toBe(1);
        const headers = autoTableCalls[0].options.head[0];
        expect(headers).toEqual(['Datum', 'Typ', 'Stunden', 'Notizen']);
    });

    it("should render correct row values in Leistungsnachweis autoTable call", () => {
        generateLeistungsnachweis(mockCase, mockJournals, doc, mockAutoTable);

        expect(autoTableCalls.length).toBe(1);
        const rows = autoTableCalls[0].options.body;
        expect(rows.length).toBe(2);
        expect(rows[0][1]).toBe("Hausbesuch");
        expect(rows[0][2]).toBe("2");
        expect(rows[0][3]).toBe("Erstgespräch.");
    });
});
