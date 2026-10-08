import { describe, it, expect, beforeEach } from "./test-framework";
import {
    stripUndefinedFields,
    setTimeTrackingMockMode,
    setMockUser,
    addTimeEntryWithCheck,
    getMockTimeEntries,
    clearMockTimeEntries,
} from "@/lib/firebase/services/timeTrackingService";
import type { NewTimeEntry } from "@/lib/firebase/services/timeTrackingService";

/* Regression 08.10.2026 (P0 live):
   FirebaseError: Function setDoc() called with invalid data.
   Unsupported field value: undefined (found in field endDate in document
   time_entries/...). Ursache: time-tracking/page.tsx setzt endDate nur bei
   Urlaub; _createTimeEntry spreadete den Entry inklusive expliziter
   undefined-Felder direkt in setDoc(). */
describe("Zeiterfassung: undefined-Felder vor setDoc entfernen (Bug 08.10.2026)", () => {

    beforeEach(() => {
        setTimeTrackingMockMode(true);
        clearMockTimeEntries();
        setMockUser("user1", { contractType: "Ehrenamtlich" });
    });

    it("stripUndefinedFields entfernt undefined und behält alle definierten Werte", () => {
        const cleaned = stripUndefinedFields({
            authorId: "user1",
            endDate: undefined,
            description: "",
            durationInHours: 0,
            referenceId: null,
        });
        expect("endDate" in cleaned).toBe(false);
        expect(cleaned.authorId).toBe("user1");
        expect(cleaned.description).toBe("");
        expect(cleaned.durationInHours).toBe(0);
        expect(cleaned.referenceId).toBeNull();
    });

    it("Eintrag ohne endDate crasht nicht und liefert Firestore-saubere Daten", async () => {
        const entry: NewTimeEntry = {
            authorId: "user1",
            date: new Date(2026, 9, 8, 9, 0),
            endDate: undefined, // wie von time-tracking/page.tsx für Nicht-Urlaub übergeben
            description: "Beratungsgespräch",
            durationInHours: 2,
            type: "Beratung",
        };

        const result = await addTimeEntryWithCheck(entry, 2026, 9);
        expect(result.status).toBe("non-minijob");
        expect(result.activeEntry).toBeDefined();

        // Simuliert die Firestore-Grenze: der Payload, den setDoc sehen würde,
        // darf keinen einzigen undefined-Wert enthalten.
        const stored = getMockTimeEntries()[0] as unknown as Record<string, unknown>;
        const firestorePayload = stripUndefinedFields(stored);
        expect(Object.values(firestorePayload).some((v) => v === undefined)).toBe(false);
        expect("endDate" in firestorePayload).toBe(false);
        expect(firestorePayload.description).toBe("Beratungsgespräch");
        expect(firestorePayload.durationInHours).toBe(2);
    });

    it("Urlaubs-Eintrag behält endDate im Firestore-Payload", async () => {
        const endDate = new Date(2026, 9, 8, 17, 0);
        const entry: NewTimeEntry = {
            authorId: "user1",
            date: new Date(2026, 9, 8, 9, 0),
            endDate,
            description: "Urlaub",
            durationInHours: 8,
            type: "Urlaub",
        };

        await addTimeEntryWithCheck(entry, 2026, 9);
        const stored = getMockTimeEntries()[0] as unknown as Record<string, unknown>;
        const firestorePayload = stripUndefinedFields(stored);
        expect(firestorePayload.endDate).toBe(endDate);
    });
});
