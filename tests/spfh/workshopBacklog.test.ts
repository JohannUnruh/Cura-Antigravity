import { describe, it, expect, beforeEach } from "../test-framework";
import {
    familyHelperService,
    setFamilyHelperMockMode,
    clearFamilyHelperMockDb,
    normalizeAsdContacts,
    filterEmptyAsdContacts
} from "@/lib/firebase/services/familyHelperService";
import { setTimeTrackingMockMode, clearMockTimeEntries } from "@/lib/firebase/services/timeTrackingService";
import { AsdContact, FamilyCase } from "@/types/familyHelper";

function makeCaseData(overrides: Partial<FamilyCase> = {}): Omit<FamilyCase, 'id'> {
    return {
        familyName: "Testfamilie",
        caseNumber: "SPFH-TEST-001",
        assignedWorkerId: "worker_1",
        status: "aktiv",
        members: [{ firstName: "Anna", lastName: "Testfamilie", relation: "Mutter" }],
        asdContacts: [],
        createdAt: new Date(),
        ...overrides
    };
}

describe("Workshop-Backlog P1-②③: External Case Number & Multi-ASD Contacts", () => {
    beforeEach(() => {
        setFamilyHelperMockMode(true);
        setTimeTrackingMockMode(true);
        clearFamilyHelperMockDb();
        clearMockTimeEntries();
    });

    // --- P1-② Externes Aktenzeichen ---

    it("should persist and load an external case number", async () => {
        const id = await familyHelperService.createCase(
            makeCaseData({ externalCaseNumber: "JA-2026/4711" })
        );

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.externalCaseNumber).toBe("JA-2026/4711");
    });

    it("should update an existing external case number", async () => {
        const id = await familyHelperService.createCase(
            makeCaseData({ externalCaseNumber: "JA-ALT" })
        );

        await familyHelperService.updateCase(id, { externalCaseNumber: "JA-NEU" });

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.externalCaseNumber).toBe("JA-NEU");
    });

    it("should leave external case number undefined when never set", async () => {
        const id = await familyHelperService.createCase(makeCaseData());

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.externalCaseNumber).toBe(undefined);
    });

    // --- P1-③ Mehrere ASD-Ansprechpartner ---

    it("should persist and load multiple ASD contacts as an array", async () => {
        const contacts: AsdContact[] = [
            { name: "Frau Sachbearbeiterin", email: "sb@jugendamt.de", phone: "0123-111", institution: "ASD Nord" },
            { name: "Herr Urlaubsvertretung", email: "uv@jugendamt.de", phone: "0123-222", institution: "ASD Nord" }
        ];
        const id = await familyHelperService.createCase(makeCaseData({ asdContacts: contacts }));

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.asdContacts.length).toBe(2);
        expect(retrieved!.asdContacts[0].name).toBe("Frau Sachbearbeiterin");
        expect(retrieved!.asdContacts[1].name).toBe("Herr Urlaubsvertretung");
    });

    it("should filter out ASD contacts with empty names", () => {
        const contacts: AsdContact[] = [
            { name: "Frau Sachbearbeiterin" },
            { name: "" },
            { name: "   " },
            { name: "Herr Vertretung" }
        ];
        const filtered = filterEmptyAsdContacts(contacts);
        expect(filtered.length).toBe(2);
        expect(filtered[0].name).toBe("Frau Sachbearbeiterin");
        expect(filtered[1].name).toBe("Herr Vertretung");
    });

    it("should persist the filtered contact list on update", async () => {
        const id = await familyHelperService.createCase(makeCaseData());

        const edited: AsdContact[] = [
            { name: "Frau Sachbearbeiterin" },
            { name: "" } // leeres Formular, wird vor dem Speichern gefiltert
        ];
        await familyHelperService.updateCase(id, { asdContacts: filterEmptyAsdContacts(edited) });

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.asdContacts.length).toBe(1);
    });

    // --- Abwärtskompatibilität: asdContact (Singular) → asdContacts (Array) ---

    it("should convert a legacy singular asdContact into an array on load", async () => {
        // Simuliert ein Altdokument, das vor der Umstellung auf asdContacts gespeichert wurde
        const legacyData = {
            ...makeCaseData(),
            asdContact: { name: "Frau Altbestand", institution: "ASD Mitte" }
        } as unknown as Omit<FamilyCase, 'id'>;
        delete (legacyData as unknown as { asdContacts?: unknown }).asdContacts;

        const id = await familyHelperService.createCase(legacyData);

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.asdContacts.length).toBe(1);
        expect(retrieved!.asdContacts[0].name).toBe("Frau Altbestand");
        expect(retrieved!.asdContacts[0].institution).toBe("ASD Mitte");
    });

    it("should convert legacy singular asdContact in getCases as well", async () => {
        const legacyData = {
            ...makeCaseData(),
            asdContact: { name: "Frau Altbestand" }
        } as unknown as Omit<FamilyCase, 'id'>;
        delete (legacyData as unknown as { asdContacts?: unknown }).asdContacts;

        await familyHelperService.createCase(legacyData);

        const cases = await familyHelperService.getCases("worker_1");
        expect(cases.length).toBe(1);
        expect(cases[0].asdContacts.length).toBe(1);
        expect(cases[0].asdContacts[0].name).toBe("Frau Altbestand");
    });

    it("should prefer the plural asdContacts array when both fields exist", () => {
        const normalized = normalizeAsdContacts({
            asdContacts: [{ name: "Neu" }],
            asdContact: { name: "Alt" }
        });
        expect(normalized.length).toBe(1);
        expect(normalized[0].name).toBe("Neu");
    });

    it("should return an empty array when neither field exists", () => {
        expect(normalizeAsdContacts({}).length).toBe(0);
        expect(normalizeAsdContacts({ asdContact: null }).length).toBe(0);
    });
});
