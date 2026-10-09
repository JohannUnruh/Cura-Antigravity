import { describe, it, expect, beforeEach } from "../test-framework";
import {
    stripUndefinedFields,
    familyHelperService,
    setFamilyHelperMockMode,
    clearFamilyHelperMockDb,
} from "@/lib/firebase/services/familyHelperService";
import type { FamilyCase, FamilyJournalEntry } from "@/types/familyHelper";

/* Regression 09.10.2026 (Live-Befund):
   FirebaseError: Function setDoc() called with invalid data.
   Unsupported field value: undefined (found in field mandate in document
   family_cases/case_...).
   Ursache: Beim Erstellen einer neuen Familie ohne sofortigen Jugendamtauftrag
   oder ohne Hilfebedarf/Bewilligung wurde mandate: undefined und
   fundingCommitment: undefined an setDoc() übergeben. */
describe("Familienhilfe: undefined-Felder vor setDoc entfernen (Bug 09.10.2026)", () => {

    beforeEach(() => {
        setFamilyHelperMockMode(true);
        clearFamilyHelperMockDb();
    });

    it("stripUndefinedFields entfernt undefined und behält definierte Werte inkl. falsy Werten", () => {
        const cleaned = stripUndefinedFields({
            familyName: "Müller",
            mandate: undefined,
            fundingCommitment: undefined,
            status: "aktiv",
            emptyText: "",
            zeroHours: 0,
            isArchived: false,
            nullValue: null,
        });
        expect("mandate" in cleaned).toBe(false);
        expect("fundingCommitment" in cleaned).toBe(false);
        expect(cleaned.familyName).toBe("Müller");
        expect(cleaned.status).toBe("aktiv");
        expect(cleaned.emptyText).toBe("");
        expect(cleaned.zeroHours).toBe(0);
        expect(cleaned.isArchived).toBe(false);
        expect(cleaned.nullValue).toBeNull();
    });

    it("createCase ohne mandate und ohne fundingCommitment speichert sauberes Dokument ohne undefined-Keys", async () => {
        const casePayload: Omit<FamilyCase, 'id'> = {
            familyName: "Schmidt",
            caseNumber: "SPFH-2026-099",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            mandate: undefined,
            members: [{ firstName: "Anna", lastName: "Schmidt", relation: "Mutter" }],
            asdContacts: [],
            fundingCommitment: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const id = await familyHelperService.createCase(casePayload);
        expect(id).toBeDefined();

        const loaded = await familyHelperService.getCaseById(id);
        expect(loaded).toBeDefined();
        expect(loaded?.familyName).toBe("Schmidt");
        // In Firestore/Mock darf der Key 'mandate' gar nicht existieren, wenn undefined übergeben wurde
        const rawLoaded = loaded as unknown as Record<string, unknown>;
        expect("mandate" in rawLoaded).toBe(false);
        expect("fundingCommitment" in rawLoaded).toBe(false);
    });

    it("addJournalEntry ohne timeEntryId speichert sauberes Dokument ohne undefined-Keys", async () => {
        const caseId = await familyHelperService.createCase({
            familyName: "Becker",
            caseNumber: "SPFH-2026-100",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [],
            asdContacts: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const entryPayload: Omit<FamilyJournalEntry, 'id'> = {
            date: new Date(),
            durationInHours: 1.5,
            type: "Hausbesuch",
            notes: "Erstgespräch mit Familie",
            hasTimeEntry: false,
            timeEntryId: undefined,
        };

        const journalId = await familyHelperService.addJournalEntry(caseId, entryPayload, false);
        expect(journalId).toBeDefined();

        const entries = await familyHelperService.getJournalEntries(caseId);
        expect(entries.length).toBe(1);
        const rawEntry = entries[0] as unknown as Record<string, unknown>;
        expect("timeEntryId" in rawEntry).toBe(false);
    });
});
