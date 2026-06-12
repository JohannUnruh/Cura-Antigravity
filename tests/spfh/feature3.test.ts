import { describe, it, expect, beforeEach } from "../test-framework";
import { familyHelperService, setFamilyHelperMockMode, clearFamilyHelperMockDb } from "@/lib/firebase/services/familyHelperService";
import { timeTrackingService, setTimeTrackingMockMode, clearMockTimeEntries, getMockTimeEntries } from "@/lib/firebase/services/timeTrackingService";
import { FamilyCase, FamilyJournalEntry, HazardAssessment8a } from "@/types/familyHelper";

describe("Feature 3: familyHelperService CRUD & Time Coupling", () => {
    beforeEach(() => {
        setFamilyHelperMockMode(true);
        setTimeTrackingMockMode(true);
        clearFamilyHelperMockDb();
        clearMockTimeEntries();
    });

    // --- TIER 1: FEATURE COVERAGE (>= 5 Tests) ---

    it("should successfully create and retrieve a FamilyCase", async () => {
        const caseData: Omit<FamilyCase, 'id'> = {
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        };

        const id = await familyHelperService.createCase(caseData);
        expect(id).toBeDefined();

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.familyName).toBe("Fischer");
        expect(retrieved!.status).toBe("aktiv");
    });

    it("should successfully update an existing FamilyCase", async () => {
        const caseData: Omit<FamilyCase, 'id'> = {
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        };

        const id = await familyHelperService.createCase(caseData);
        await familyHelperService.updateCase(id, { status: "beendet" });

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.status).toBe("beendet");
    });

    it("should successfully delete a FamilyCase", async () => {
        const caseData: Omit<FamilyCase, 'id'> = {
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        };

        const id = await familyHelperService.createCase(caseData);
        await familyHelperService.deleteCase(id);

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved).toBeNull();
    });

    it("should successfully add and retrieve a FamilyJournalEntry without time coupling", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        const entry: Omit<FamilyJournalEntry, 'id'> = {
            date: new Date(),
            durationInHours: 2,
            type: "Hausbesuch",
            notes: "Regulärer Hausbesuch.",
            hasTimeEntry: false
        };

        const entryId = await familyHelperService.addJournalEntry(caseId, entry, false);
        expect(entryId).toBeDefined();

        const entries = await familyHelperService.getJournalEntries(caseId);
        expect(entries.length).toBe(1);
        expect(entries[0].notes).toBe("Regulärer Hausbesuch.");
        expect(entries[0].hasTimeEntry).toBeFalsy();
    });

    it("should successfully add, update, and retrieve HazardAssessments", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        const assessment: Omit<HazardAssessment8a, 'id'> = {
            date: new Date(),
            assessorName: "Gabi",
            indicators: { "körperlich": "nein" },
            actionsTaken: "Keine",
            result: "keine"
        };

        const assId = await familyHelperService.addHazardAssessment(caseId, assessment);
        expect(assId).toBeDefined();

        await familyHelperService.updateHazardAssessment(caseId, assId, { result: "latent" });
        const list = await familyHelperService.getHazardAssessments(caseId);
        expect(list.length).toBe(1);
        expect(list[0].result).toBe("latent");
    });

    // --- TIER 2: BOUNDARY & CORNER CASES (>= 5 Tests) ---

    it("should return null when retrieving a non-existent case", async () => {
        const retrieved = await familyHelperService.getCaseById("non_existent_id");
        expect(retrieved).toBeNull();
    });

    it("should throw an error when updating a non-existent case", async () => {
        await expect(async () => {
            await familyHelperService.updateCase("non_existent_id", { status: "beendet" });
        }).toThrowAsync("Case not found");
    });

    it("should throw an error when deleting a non-existent case", async () => {
        await expect(async () => {
            await familyHelperService.deleteCase("non_existent_id");
        }).toThrowAsync("Case not found");
    });

    it("should throw an error when adding a journal to a non-existent case", async () => {
        const entry: Omit<FamilyJournalEntry, 'id'> = {
            date: new Date(),
            durationInHours: 2,
            type: "Hausbesuch",
            notes: "Test notes",
            hasTimeEntry: false
        };
        await expect(async () => {
            await familyHelperService.addJournalEntry("non_existent_id", entry);
        }).toThrowAsync("Case not found");
    });

    it("should throw an error when updating a non-existent journal entry", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        await expect(async () => {
            await familyHelperService.updateJournalEntry(caseId, "non_existent_journal_id", { durationInHours: 5 });
        }).toThrowAsync("Journal entries not found");
    });

    // --- TIER 3: CROSS-FEATURE COMBINATIONS (Coupling) ---

    it("should automatically create a TimeEntry when journal is added with createTimeEntry=true", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        const journalDate = new Date();
        const entryId = await familyHelperService.addJournalEntry(caseId, {
            date: journalDate,
            durationInHours: 3.5,
            type: "Hausbesuch",
            notes: "Ausführlicher Hausbesuch zur Wohnraumpflege.",
            hasTimeEntry: false
        }, true, "worker_1");

        // Verify Journal Entry updated with time coupling info
        const journals = await familyHelperService.getJournalEntries(caseId);
        expect(journals[0].hasTimeEntry).toBeTruthy();
        expect(journals[0].timeEntryId).toBeDefined();

        // Verify TimeEntry actually created in timeTrackingService
        const timeEntries = getMockTimeEntries();
        expect(timeEntries.length).toBe(1);
        expect(timeEntries[0].id).toBe(journals[0].timeEntryId!);
        expect(timeEntries[0].durationInHours).toBe(3.5);
        expect(timeEntries[0].referenceId).toBe(entryId);
        expect(timeEntries[0].authorId).toBe("worker_1");
    });

    it("should automatically update the TimeEntry when the coupled journal entry is updated", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        const entryId = await familyHelperService.addJournalEntry(caseId, {
            date: new Date(),
            durationInHours: 2.0,
            type: "Hausbesuch",
            notes: "Test",
            hasTimeEntry: false
        }, true, "worker_1");

        const journalsBefore = await familyHelperService.getJournalEntries(caseId);
        const timeEntryId = journalsBefore[0].timeEntryId!;

        // Update Journal (duration change)
        const newDate = new Date("2026-06-20T10:00:00Z");
        await familyHelperService.updateJournalEntry(caseId, entryId, {
            durationInHours: 4.5,
            date: newDate,
            notes: "Updated notes"
        });

        // Verify TimeEntry updated
        const timeEntries = getMockTimeEntries();
        expect(timeEntries.length).toBe(1);
        expect(timeEntries[0].id).toBe(timeEntryId);
        expect(timeEntries[0].durationInHours).toBe(4.5);
        expect(new Date(timeEntries[0].date).getTime()).toBe(newDate.getTime());
    });

    it("should automatically delete the TimeEntry when the coupled journal entry is deleted", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        const entryId = await familyHelperService.addJournalEntry(caseId, {
            date: new Date(),
            durationInHours: 2.0,
            type: "Hausbesuch",
            notes: "Test note",
            hasTimeEntry: false
        }, true, "worker_1");

        // Verify we have 1 TimeEntry
        expect(getMockTimeEntries().length).toBe(1);

        // Delete journal entry
        await familyHelperService.deleteJournalEntry(caseId, entryId);

        // Verify journal entries empty
        const journals = await familyHelperService.getJournalEntries(caseId);
        expect(journals.length).toBe(0);

        // Verify TimeEntry deleted
        expect(getMockTimeEntries().length).toBe(0);
    });

    it("should throw an error when parsing an invalid date in parseDate", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Fischer",
            caseNumber: "SPFH-Fischer-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "Anna", lastName: "Fischer", relation: "Mutter" }],
            createdAt: new Date()
        });

        await expect(async () => {
            await familyHelperService.addJournalEntry(caseId, {
                date: "not-a-valid-date" as unknown as Date,
                durationInHours: 2.0,
                type: "Hausbesuch",
                notes: "Test note",
                hasTimeEntry: false
            });
        }).toThrowAsync("Invalid date format");
    });

    it("should throw an error when updating a non-existent time entry in updateTimeEntry", async () => {
        await expect(async () => {
            await timeTrackingService.updateTimeEntry("non_existent_id", {
                durationInHours: 3.0
            });
        }).toThrowAsync("Time entry not found");
    });
});
