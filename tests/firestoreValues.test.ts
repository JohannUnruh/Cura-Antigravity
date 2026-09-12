import { describe, it, expect } from "./test-framework";
import { cleanFirestoreData, isDateLike, toFirestoreDate } from "@/lib/firebase/firestoreValues";

/* Regression 12.09.2026: "Error saving user profile: RangeError: Invalid time value"
   Ursache: ein Firestore-Timestamp wurde von cleanFirestoreData als
   {seconds,nanoseconds}-Map geschrieben; beim nächsten Lesen entstand daraus
   via new Date(map) ein Invalid Date, das setDoc beim Serialisieren
   (Date.toISOString) zum Absturz brachte – Speichern von Verträgen und
   Benutzeränderungen war für betroffene Accounts unmöglich. */
describe("Firestore-Werte: Datums-Normalisierung (Bug 12.09.2026)", () => {
    const timestampLike = (ms: number) => ({
        seconds: Math.floor(ms / 1000),
        nanoseconds: (ms % 1000) * 1_000_000
    });
    const fakeTimestamp = (ms: number) => ({
        toDate: () => new Date(ms)
    });

    it("erkennt Date, Timestamp und Legacy-Map als datumartige Werte", () => {
        expect(isDateLike(new Date())).toBeTruthy();
        expect(isDateLike(fakeTimestamp(1772903144925))).toBeTruthy();
        expect(isDateLike(timestampLike(1772903144925))).toBeTruthy();
        expect(isDateLike({ street: "Musterweg 1", zipCode: "58553" })).toBeFalsy();
        expect(isDateLike({ seconds: 1, nanoseconds: 2, extra: 3 })).toBeFalsy();
        expect(isDateLike("2026-03-18")).toBeFalsy();
    });

    it("wandelt alle vier Speicherformen in dasselbe Datum", () => {
        const ms = 1772903144925;
        expect(toFirestoreDate(new Date(ms))?.getTime()).toBe(ms);
        expect(toFirestoreDate(fakeTimestamp(ms))?.getTime()).toBe(ms);
        expect(toFirestoreDate(timestampLike(ms))?.getTime()).toBe(ms);
        // Die Map kann auch als Strings ankommen (REST/Import-Fälle).
        expect(toFirestoreDate({ seconds: String(Math.floor(ms / 1000)), nanoseconds: "925000000" })?.getTime()).toBe(ms);
        expect(toFirestoreDate(new Date(ms).toISOString())?.getTime()).toBe(ms);
        expect(toFirestoreDate(ms)?.getTime()).toBe(ms);
    });

    it("liefert niemals ein Invalid Date zurück", () => {
        expect(toFirestoreDate(new Date("unsinn"))).toBeNull();
        expect(toFirestoreDate(undefined)).toBeNull();
        expect(toFirestoreDate(null)).toBeNull();
        expect(toFirestoreDate({})).toBeNull();
        expect(toFirestoreDate({ seconds: "abc", nanoseconds: "def" })).toBeNull();
        expect(toFirestoreDate({ toDate: () => new Date("unsinn") })).toBeNull();
        expect(toFirestoreDate("18.03.2026")).toBeNull();
    });

    it("reinigt ein Profil so, dass setDoc keine Invalid Dates mehr sieht", () => {
        const corrupted = {
            id: "u1",
            firstName: "Max",
            createdAt: new Date("unsinn"),
            updatedAt: new Date("unsinn"),
            address: { street: "", zipCode: "", city: "" },
            contractDocuments: [
                { id: "doc1", createdAt: "2026-09-12T10:20:32.502Z", effectiveDate: "2026-09-12" }
            ],
            vacationDaysPerYear: undefined
        };

        const cleaned = cleanFirestoreData(corrupted) as Record<string, unknown>;

        expect(cleaned.createdAt).toBeNull();
        expect(cleaned.updatedAt).toBeNull();
        expect(cleaned.vacationDaysPerYear).not.toBeDefined();
        expect((cleaned.address as Record<string, string>).street).toBe("");
        expect((cleaned.contractDocuments as Array<Record<string, string>>)[0].effectiveDate).toBe("2026-09-12");
        // Der Kern des Absturzes: kein Datumsfeld darf ein Invalid Date sein.
        expect(() => new Date((cleaned.createdAt as Date | null) ?? 0).toISOString()).not.toThrow();
    });

    it("heilt ein korrumpiertes createdAt bei der nächsten Speicherung", () => {
        const profile = {
            id: "u1",
            createdAt: timestampLike(1772903144925)
        };

        const cleaned = cleanFirestoreData(profile) as Record<string, unknown>;
        const createdAt = cleaned.createdAt as Date;

        expect(createdAt instanceof Date).toBeTruthy();
        expect(createdAt.getTime()).toBe(1772903144925);
        // Genau dieser Aufruf warf zuvor RangeError: Invalid time value.
        expect(() => createdAt.toISOString()).not.toThrow();
        // Und er ist kein Map mehr – das Dokument heilt zu nativem Timestamp.
        expect((createdAt as unknown as { seconds?: number }).seconds).not.toBeDefined();
    });

    it("lässt einen echten Timestamp als Date vorbei, nicht als Map", () => {
        const ms = 1772903144925;
        const cleaned = cleanFirestoreData({ createdAt: fakeTimestamp(ms) }) as Record<string, unknown>;
        const createdAt = cleaned.createdAt as Date;
        expect(createdAt instanceof Date).toBeTruthy();
        expect(createdAt.getTime()).toBe(ms);
    });
});
