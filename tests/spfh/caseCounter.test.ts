import { describe, it, expect, beforeEach } from "../test-framework";
import {
    familyHelperService,
    setFamilyHelperMockMode,
    clearFamilyHelperMockDb,
    parseCaseNumberSerial,
    computeInitialCounterFromCases,
    formatSpfhCaseNumber
} from "@/lib/firebase/services/familyHelperService";
import { setTimeTrackingMockMode, clearMockTimeEntries } from "@/lib/firebase/services/timeTrackingService";
import { FamilyCase } from "@/types/familyHelper";

function makeCaseData(overrides: Partial<FamilyCase> = {}): Omit<FamilyCase, 'id'> {
    return {
        familyName: "Testfamilie",
        caseNumber: "SPFH-TEST-001",
        assignedWorkerId: "worker_1",
        status: "aktiv",
        members: [],
        asdContacts: [],
        createdAt: new Date(),
        ...overrides
    };
}

const currentYear = new Date().getFullYear();

describe("SPFH Case Counter: atomic sequential case numbers (no recycling)", () => {
    beforeEach(() => {
        setFamilyHelperMockMode(true);
        setTimeTrackingMockMode(true);
        clearFamilyHelperMockDb();
        clearMockTimeEntries();
    });

    // --- Parsing-Helfer ---

    it("parses serial numbers from well-formed case numbers", () => {
        expect(parseCaseNumberSerial("SPFH-2026-004")).toBe(4);
        expect(parseCaseNumberSerial("SPFH-2026-123")).toBe(123);
        expect(parseCaseNumberSerial(" SPFH-2026-007 ")).toBe(7);
    });

    it("returns null for malformed case numbers", () => {
        expect(parseCaseNumberSerial("SPFH-TEST-001")).toBe(null);
        expect(parseCaseNumberSerial("SPFH-26-001")).toBe(null);
        expect(parseCaseNumberSerial("SPFH-2026-004x")).toBe(null);
        expect(parseCaseNumberSerial("FREITEXT-1")).toBe(null);
        expect(parseCaseNumberSerial(undefined)).toBe(null);
        expect(parseCaseNumberSerial(42)).toBe(null);
    });

    it("computes the initial counter as the highest serial across all cases", () => {
        expect(computeInitialCounterFromCases([])).toBe(0);
        expect(computeInitialCounterFromCases(["SPFH-2024-007", "SPFH-2026-003"])).toBe(7);
        expect(computeInitialCounterFromCases(["SPFH-TEST-001", "kaputt", "SPFH-2026-012"])).toBe(12);
    });

    it("formats case numbers with zero-padded 3-digit serials", () => {
        expect(formatSpfhCaseNumber(2026, 4)).toBe("SPFH-2026-004");
        expect(formatSpfhCaseNumber(2026, 123)).toBe("SPFH-2026-123");
    });

    // --- Fortlaufende Vergabe ---

    it("assigns sequential numbers starting at 001 on an empty database", async () => {
        const first = await familyHelperService.getNextCaseNumber();
        const second = await familyHelperService.getNextCaseNumber();
        expect(first).toBe(`SPFH-${currentYear}-001`);
        expect(second).toBe(`SPFH-${currentYear}-002`);
    });

    it("accepts an explicit date for the year component (test fixture)", async () => {
        const n = await familyHelperService.getNextCaseNumber(new Date(2030, 0, 15));
        expect(n).toBe("SPFH-2030-001");
    });

    // --- Migration / Seeding aus Altdaten ---

    it("seeds the counter from existing cases when uninitialized", async () => {
        await familyHelperService.createCase(makeCaseData({ caseNumber: "SPFH-2024-007" }));
        await familyHelperService.createCase(makeCaseData({ caseNumber: `SPFH-${currentYear}-003` }));
        await familyHelperService.createCase(makeCaseData({ caseNumber: "FREITEXT-ALT" }));

        const next = await familyHelperService.getNextCaseNumber();
        expect(next).toBe(`SPFH-${currentYear}-008`);
    });

    it("counts finished and inactive cases toward the counter (no recycling of closed cases)", async () => {
        await familyHelperService.createCase(makeCaseData({ caseNumber: "SPFH-2025-010", status: "beendet" }));
        await familyHelperService.createCase(makeCaseData({ caseNumber: "SPFH-2025-004", status: "inaktiv" }));

        const next = await familyHelperService.getNextCaseNumber();
        expect(next).toBe(`SPFH-${currentYear}-011`);
    });

    it("initializeCaseCounter seeds once and is idempotent without consuming numbers", async () => {
        await familyHelperService.createCase(makeCaseData({ caseNumber: "SPFH-2026-005" }));

        const seeded = await familyHelperService.initializeCaseCounter();
        const again = await familyHelperService.initializeCaseCounter();
        expect(seeded).toBe(5);
        expect(again).toBe(5);

        const next = await familyHelperService.getNextCaseNumber();
        expect(next).toBe(`SPFH-${currentYear}-006`);
    });

    // --- Kein Recycling ---

    it("never reuses a number after the case was deleted", async () => {
        const n1 = await familyHelperService.getNextCaseNumber();
        const id = await familyHelperService.createCase(makeCaseData({ caseNumber: n1 }));
        await familyHelperService.deleteCase(id);

        const n2 = await familyHelperService.getNextCaseNumber();
        expect(n1).toBe(`SPFH-${currentYear}-001`);
        expect(n2).toBe(`SPFH-${currentYear}-002`);
    });

    it("keeps counting monotonically across many assignments", async () => {
        const numbers: string[] = [];
        for (let i = 0; i < 5; i++) {
            numbers.push(await familyHelperService.getNextCaseNumber());
        }
        for (let i = 1; i < numbers.length; i++) {
            const prev = parseCaseNumberSerial(numbers[i - 1])!;
            const curr = parseCaseNumberSerial(numbers[i])!;
            expect(curr).toBe(prev + 1);
        }
    });

    // --- Zusammenspiel mit createCase (Dashboard-Flow) ---

    it("persists the assigned number on the created case", async () => {
        const assigned = await familyHelperService.getNextCaseNumber();
        const id = await familyHelperService.createCase(makeCaseData({ caseNumber: assigned, familyName: "Neu" }));

        const retrieved = await familyHelperService.getCaseById(id);
        expect(retrieved!.caseNumber).toBe(`SPFH-${currentYear}-001`);
    });
});
