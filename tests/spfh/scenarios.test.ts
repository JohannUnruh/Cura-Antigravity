import { describe, it, expect, beforeEach } from "../test-framework";
import { familyHelperService, setFamilyHelperMockMode, clearFamilyHelperMockDb } from "@/lib/firebase/services/familyHelperService";
import { setTimeTrackingMockMode, clearMockTimeEntries, getMockTimeEntries } from "@/lib/firebase/services/timeTrackingService";
import { settingsService, setSettingsMockMode } from "@/lib/firebase/services/settingsService";
import { validateFamilyCase, validateFamilyJournalEntry } from "./validation";
import { canManage8a } from "./details";
import { generateEntwicklungsbericht, generateLeistungsnachweis } from "./pdfGenerator";
import { FamilyCase, FamilyJournalEntry } from "@/types/familyHelper";
import { UserProfile } from "@/types";

class MockDoc {
    calls: { method: string; args: unknown[] }[] = [];
    setFont(name: string, style?: string) { this.calls.push({ method: "setFont", args: [name, style] }); return this; }
    setFontSize(size: number) { this.calls.push({ method: "setFontSize", args: [size] }); return this; }
    text(txt: string, x: number, y: number, options?: unknown) { this.calls.push({ method: "text", args: [txt, x, y, options] }); return this; }
    save(filename: string) { this.calls.push({ method: "save", args: [filename] }); return this; }
}

describe("Tier 3 & 4: Cross-Feature Combinations & Real-World Scenarios", () => {
    beforeEach(() => {
        setFamilyHelperMockMode(true);
        setTimeTrackingMockMode(true);
        setSettingsMockMode(true);
        clearFamilyHelperMockDb();
        clearMockTimeEntries();
    });

    // =========================================================================
    // --- TIER 3: CROSS-FEATURE COMBINATIONS (6 Tests) ---
    // (Note: Tests 1-3 were implemented in feature3.test.ts, adding 4-6 here)
    // =========================================================================

    it("Tier 3 - Test 4: Dropdown configuration change affects case/journal validation", async () => {
        const settings = await settingsService.getSettings();
        settings.familyJournalTypes = ["Hausbesuch", "Telefonat"];
        await settingsService.saveSettings(settings);

        // This journal entry uses "Supervision" which is not allowed anymore
        const entry: Partial<FamilyJournalEntry> = {
            date: new Date(),
            durationInHours: 1.5,
            type: "Supervision",
            notes: "Meeting with supervisor."
        };

        const errors = validateFamilyJournalEntry(entry, settings.familyJournalTypes);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].field).toBe("type");
    });

    it("Tier 3 - Test 5: Validation check warning when writing journal entry beyond funding commitment end date", async () => {
        // Create case with expired funding commitment
        const caseId = await familyHelperService.createCase({
            familyName: "Hansen",
            caseNumber: "SPFH-HANS-01",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Karl", lastName: "Hansen", relation: "Kind" }],
            fundingCommitment: {
                hoursGranted: 50,
                startDate: "2026-01-01",
                endDate: "2026-05-30" // Expired
            },
            createdAt: new Date()
        });

        const caseObj = await familyHelperService.getCaseById(caseId);
        expect(caseObj).not.toBeNull();

        const journalEntry: Omit<FamilyJournalEntry, 'id'> = {
            date: new Date("2026-06-15T12:00:00Z"),
            durationInHours: 1.5,
            type: "Hausbesuch",
            notes: "Late visit",
            hasTimeEntry: false
        };

        // 1. Verify validateFamilyJournalEntry detects the error
        const errors = validateFamilyJournalEntry(journalEntry, undefined, caseObj!.fundingCommitment);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].field).toBe("date");
        expect(errors[0].message).toContain("Leistungszeitraums");

        // 2. Verify service automatically rejects it
        await expect(async () => {
            await familyHelperService.addJournalEntry(caseId, journalEntry);
        }).toThrowAsync("outside the funding commitment period");
    });

    it("Tier 3 - Test 6: Deleting a case recursively deletes all journals and coupled TimeEntries", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Hansen",
            caseNumber: "SPFH-HANS-01",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Karl", lastName: "Hansen", relation: "Kind" }],
            createdAt: new Date()
        });

        // Add 2 journals with time entries
        await familyHelperService.addJournalEntry(caseId, {
            date: new Date(),
            durationInHours: 2,
            type: "Hausbesuch",
            notes: "J1",
            hasTimeEntry: false
        }, true, "worker_1");

        await familyHelperService.addJournalEntry(caseId, {
            date: new Date(),
            durationInHours: 1,
            type: "Telefonat",
            notes: "J2",
            hasTimeEntry: false
        }, true, "worker_1");

        // Verify we have 2 journals and 2 time entries
        const journalsBefore = await familyHelperService.getJournalEntries(caseId);
        expect(journalsBefore.length).toBe(2);
        expect(getMockTimeEntries().length).toBe(2);

        // Delete the case (automatically handles cascading deletion of journals and coupled TimeEntries)
        await familyHelperService.deleteCase(caseId);

        // Verify clean up
        const caseAfter = await familyHelperService.getCaseById(caseId);
        expect(caseAfter).toBeNull();
        expect((await familyHelperService.getJournalEntries(caseId)).length).toBe(0);
        expect(getMockTimeEntries().length).toBe(0);
    });

    // =========================================================================
    // --- TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Scenarios) ---
    // =========================================================================

    it("Scenario 1: Fallerstellung & Erst-Konfiguration", async () => {
        // 1. Admin configures relations settings
        const settings = await settingsService.getSettings();
        settings.familyMemberRelations = ["Mutter", "Vater", "Kind", "Großmutter"];
        await settingsService.saveSettings(settings);

        // 2. Worker submits new case details
        const caseData: Omit<FamilyCase, 'id'> = {
            familyName: "Kruse",
            caseNumber: "SPFH-2026-KRUSE",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [
                { firstName: "Maria", lastName: "Kruse", relation: "Mutter" },
                { firstName: "Leon", lastName: "Kruse", relation: "Kind" }
            ],
            fundingCommitment: {
                hoursGranted: 100,
                startDate: "2026-06-01",
                endDate: "2026-12-31",
                hourlyRate: 80
            },
            createdAt: new Date()
        };

        // 3. Validation passes
        const validationErrors = validateFamilyCase(caseData, settings.familyMemberRelations);
        expect(validationErrors.length).toBe(0);

        // 4. Case is stored in DB
        const caseId = await familyHelperService.createCase(caseData);
        expect(caseId).toBeDefined();

        const storedCase = await familyHelperService.getCaseById(caseId);
        expect(storedCase).not.toBeNull();
        expect(storedCase!.familyName).toBe("Kruse");
        expect(storedCase!.members.length).toBe(2);
    });

    it("Scenario 2: Dokumentation einer Betreuungswoche", async () => {
        // 1. Load active case
        const caseId = await familyHelperService.createCase({
            familyName: "Kruse",
            caseNumber: "SPFH-2026-KRUSE",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [
                { firstName: "Maria", lastName: "Kruse", relation: "Mutter" }
            ],
            createdAt: new Date()
        });

        // 2. Document 3 journal entries representing a week
        const journal1 = {
            date: new Date("2026-06-08T10:00:00Z"),
            durationInHours: 3.0,
            type: "Hausbesuch",
            notes: "Gemeinsames Einkaufen und Budgetplan aufgestellt.",
            hasTimeEntry: false
        };

        const journal2 = {
            date: new Date("2026-06-10T14:00:00Z"),
            durationInHours: 1.5,
            type: "Telefonat",
            notes: "Krisentelefonat bzgl. Schulabmeldung.",
            hasTimeEntry: false
        };

        const journal3 = {
            date: new Date("2026-06-12T09:00:00Z"),
            durationInHours: 2.0,
            type: "Hausbesuch",
            notes: "Reflexion der Schulwoche mit Leon.",
            hasTimeEntry: false
        };

        await familyHelperService.addJournalEntry(caseId, journal1, true, "worker_1");
        await familyHelperService.addJournalEntry(caseId, journal2, true, "worker_1");
        await familyHelperService.addJournalEntry(caseId, journal3, true, "worker_1");

        // 3. Verify total documented journals
        const journals = await familyHelperService.getJournalEntries(caseId);
        expect(journals.length).toBe(3);

        // 4. Verify time coupling and overtime calculation integration
        const timeEntries = getMockTimeEntries();
        expect(timeEntries.length).toBe(3);
        const totalHours = timeEntries.reduce((sum, entry) => sum + entry.durationInHours, 0);
        expect(totalHours).toBe(6.5);
    });

    it("Scenario 3: Krisenintervention & 8a-Risikoanalyse", async () => {
        // 1. Create a case
        const caseId = await familyHelperService.createCase({
            familyName: "Münch",
            caseNumber: "SPFH-2026-MÜNCH",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Lea", lastName: "Münch", relation: "Kind" }],
            createdAt: new Date()
        });

        const worker: UserProfile = {
            id: "worker_1",
            firstName: "Susi",
            lastName: "Sonne",
            role: "Mitarbeiter",
            hasFamilyHelperAccess: true,
            address: { street: "", zipCode: "", city: "" },
            bankDetails: { iban: "", bic: "", accountHolder: "" },
            createdAt: new Date()
        };

        const caseObj = await familyHelperService.getCaseById(caseId);

        // 2. Perform 8a validation checks (permission verification)
        const hasAccess = canManage8a(worker, caseObj!);
        expect(hasAccess).toBeTruthy();

        // 3. Create crisis journal entry
        await familyHelperService.addJournalEntry(caseId, {
            date: new Date(),
            durationInHours: 4.0,
            type: "Krisenintervention",
            notes: "Akute Kindeswohlgefährdung gemeldet, Hausbesuch durchgeführt.",
            hasTimeEntry: false
        }, true, "worker_1");

        // 4. Create 8a Hazard Assessment
        await familyHelperService.addHazardAssessment(caseId, {
            date: new Date(),
            assessorName: "Susi Sonne",
            indicators: {
                "Unversorgtheit": "ja",
                "Häusliche Gewalt": "ja"
            },
            actionsTaken: "Jugendamt (ASD) sofort verständigt. Inobhutnahme eingeleitet.",
            result: "akut"
        });

        // 5. Update Case Status to reflect crisis
        await familyHelperService.updateCase(caseId, { status: "inaktiv" });

        // 6. Verify data consistency
        const journals = await familyHelperService.getJournalEntries(caseId);
        expect(journals.some(j => j.type === "Krisenintervention")).toBeTruthy();

        const assessments = await familyHelperService.getHazardAssessments(caseId);
        expect(assessments[0].result).toBe("akut");

        const updatedCase = await familyHelperService.getCaseById(caseId);
        expect(updatedCase!.status).toBe("inaktiv");
    });

    it("Scenario 4: Monatsbericht-Generierung & PDF-Export", async () => {
        // 1. Set up case and mock journals
        const caseId = await familyHelperService.createCase({
            familyName: "Sommer",
            caseNumber: "SPFH-2026-SOMMER",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [
                { firstName: "Helga", lastName: "Sommer", relation: "Mutter" },
                { firstName: "Nils", lastName: "Sommer", relation: "Kind" }
            ],
            createdAt: new Date()
        });

        await familyHelperService.addJournalEntry(caseId, {
            date: new Date("2026-06-01T10:00:00Z"),
            durationInHours: 2.5,
            type: "Hausbesuch",
            notes: "Gespräch über Finanzen.",
            hasTimeEntry: false
        });

        await familyHelperService.addJournalEntry(caseId, {
            date: new Date("2026-06-15T10:00:00Z"),
            durationInHours: 3.5,
            type: "Hausbesuch",
            notes: "Begleitung Schuldnerberatung.",
            hasTimeEntry: false
        });

        const caseObj = await familyHelperService.getCaseById(caseId);
        const journals = await familyHelperService.getJournalEntries(caseId);

        // 2. Simulate PDF Generation for Leistungsnachweis & Entwicklungsbericht
        const docObj = new MockDoc();
        let autoTableCalled = false;
        const mockAutoTable = () => {
            autoTableCalled = true;
        };

        generateLeistungsnachweis(caseObj!, journals, docObj, mockAutoTable);
        expect(autoTableCalled).toBeTruthy();
        expect(docObj.calls.some(c => c.method === "save" && c.args[0] === "leistungsnachweis_Sommer.pdf")).toBeTruthy();

        autoTableCalled = false;
        generateEntwicklungsbericht(caseObj!, docObj, mockAutoTable);
        expect(autoTableCalled).toBeTruthy();
        expect(docObj.calls.some(c => c.method === "save" && c.args[0] === "entwicklungsbericht_Sommer.pdf")).toBeTruthy();
    });

    it("Scenario 5: Fallabschluss & Archivierung", async () => {
        // 1. Load active case
        const caseId = await familyHelperService.createCase({
            familyName: "Winter",
            caseNumber: "SPFH-2026-WINTER",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Jan", lastName: "Winter", relation: "Kind" }],
            createdAt: new Date()
        });

        // 2. Perform final steps
        // Check final journal entries count
        const journals = await familyHelperService.getJournalEntries(caseId);
        expect(journals.length).toBe(0);

        // 3. Export final report (simulation)
        const docObj = new MockDoc();
        const mockAutoTable = () => {};
        const caseObj = await familyHelperService.getCaseById(caseId);

        generateEntwicklungsbericht(caseObj!, docObj, mockAutoTable);
        expect(docObj.calls.some(c => c.method === "save" && c.args[0] === "entwicklungsbericht_Winter.pdf")).toBeTruthy();

        // 4. Update case status to 'beendet' (archived)
        await familyHelperService.updateCase(caseId, { status: "beendet" });

        // 5. Verify case is locked (read-only checks or status checks)
        const finalCase = await familyHelperService.getCaseById(caseId);
        expect(finalCase!.status).toBe("beendet");
    });
});
