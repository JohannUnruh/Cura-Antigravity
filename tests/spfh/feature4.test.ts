import { describe, it, expect } from "../test-framework";
import { filterCases, FilterOptions } from "./dashboard";
import { FamilyCase } from "@/types/familyHelper";

describe("Feature 4: Case Dashboard", () => {
    const mockCases: FamilyCase[] = [
        {
            id: "1",
            familyName: "Müller",
            caseNumber: "SPFH-2026-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [],
            createdAt: new Date("2026-01-01T12:00:00Z")
        },
        {
            id: "2",
            familyName: "Schmidt",
            caseNumber: "SPFH-2026-002",
            assignedWorkerId: "worker_2",
            status: "inaktiv",
            members: [],
            createdAt: new Date("2026-02-15T12:00:00Z")
        },
        {
            id: "3",
            familyName: "Fischer",
            caseNumber: "SPFH-2026-003",
            assignedWorkerId: "worker_1",
            status: "beendet",
            members: [],
            createdAt: new Date("2026-03-10T12:00:00Z")
        },
        {
            id: "4",
            familyName: "Müller-Lüdenscheidt",
            caseNumber: "SPFH-2026-004",
            assignedWorkerId: "worker_3",
            status: "aktiv",
            members: [],
            createdAt: new Date("2026-04-01T12:00:00Z")
        }
    ];

    // --- TIER 1: FEATURE COVERAGE (>= 5 Tests) ---

    it("should filter cases by status 'aktiv'", () => {
        const result = filterCases(mockCases, { status: "aktiv" });
        expect(result.length).toBe(2);
        expect(result.every(c => c.status === "aktiv")).toBeTruthy();
    });

    it("should filter cases by status 'beendet'", () => {
        const result = filterCases(mockCases, { status: "beendet" });
        expect(result.length).toBe(1);
        expect(result[0].familyName).toBe("Fischer");
    });

    it("should search cases by familyName case-insensitively", () => {
        const result = filterCases(mockCases, { search: "MÜLL" });
        expect(result.length).toBe(2);
        expect(result.some(c => c.id === "1")).toBeTruthy();
        expect(result.some(c => c.id === "4")).toBeTruthy();
    });

    it("should search cases by caseNumber", () => {
        const result = filterCases(mockCases, { search: "-002" });
        expect(result.length).toBe(1);
        expect(result[0].familyName).toBe("Schmidt");
    });

    it("should filter cases by assigned worker ID", () => {
        const result = filterCases(mockCases, { assignedWorkerId: "worker_1" });
        expect(result.length).toBe(2);
        expect(result.some(c => c.id === "1")).toBeTruthy();
        expect(result.some(c => c.id === "3")).toBeTruthy();
    });

    // --- TIER 2: BOUNDARY & CORNER CASES (>= 5 Tests) ---

    it("should return empty list when searching for a non-existent name", () => {
        const result = filterCases(mockCases, { search: "NonExistentFamilyName" });
        expect(result.length).toBe(0);
    });

    it("should sort cases by familyName A-Z and Z-A", () => {
        const asc = filterCases(mockCases, { sortBy: "familyNameAsc" });
        expect(asc[0].familyName).toBe("Fischer");
        expect(asc[3].familyName).toBe("Schmidt");

        const desc = filterCases(mockCases, { sortBy: "familyNameDesc" });
        expect(desc[0].familyName).toBe("Schmidt");
        expect(desc[3].familyName).toBe("Fischer");
    });

    it("should sort cases by createdAt Ascending and Descending", () => {
        const asc = filterCases(mockCases, { sortBy: "createdAtAsc" });
        expect(asc[0].id).toBe("1"); // Jan
        expect(asc[3].id).toBe("4"); // Apr

        const desc = filterCases(mockCases, { sortBy: "createdAtDesc" });
        expect(desc[0].id).toBe("4"); // Apr
        expect(desc[3].id).toBe("1"); // Jan
    });

    it("should return empty list without throwing errors when input list is empty", () => {
        const result = filterCases([], { search: "test", status: "aktiv" });
        expect(result.length).toBe(0);
    });

    it("should combine multiple filters (search, status, worker, sorting) correctly", () => {
        const options: FilterOptions = {
            status: "aktiv",
            assignedWorkerId: "worker_1",
            search: "Müller",
            sortBy: "createdAtDesc"
        };
        const result = filterCases(mockCases, options);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe("1");
    });
});
