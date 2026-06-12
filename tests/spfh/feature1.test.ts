import { describe, it, expect } from "../test-framework";
import { validateFamilyCase, validateFamilyJournalEntry, validateHazardAssessment8a } from "./validation";
import { FamilyCase, FamilyJournalEntry, HazardAssessment8a } from "@/types/familyHelper";
import { AppSettings } from "@/types";

describe("Feature 1: Datatypes & AppSettings", () => {
    // --- TIER 1: FEATURE COVERAGE (>= 5 Tests) ---

    it("should successfully validate a complete valid FamilyCase", () => {
        const validCase: FamilyCase = {
            familyName: "Müller",
            caseNumber: "SPFH-2026-001",
            assignedWorkerId: "user_worker_1",
            status: "aktiv",
            members: [
                { firstName: "Sabine", lastName: "Müller", relation: "Mutter" },
                { firstName: "Lukas", lastName: "Müller", relation: "Kind" }
            ],
            createdAt: new Date()
        };
        const errors = validateFamilyCase(validCase);
        expect(errors.length).toBe(0);
    });

    it("should successfully validate a complete valid FamilyJournalEntry", () => {
        const validJournal: FamilyJournalEntry = {
            id: "j_1",
            date: new Date(),
            durationInHours: 2.5,
            type: "Hausbesuch",
            notes: "Gespräch über Alltagsstrukturierung geführt.",
            hasTimeEntry: false
        };
        const errors = validateFamilyJournalEntry(validJournal);
        expect(errors.length).toBe(0);
    });

    it("should successfully validate a complete valid HazardAssessment8a", () => {
        const validAssessment: HazardAssessment8a = {
            id: "h_1",
            date: new Date(),
            assessorName: "Herr Schmidt",
            indicators: {
                "Vernachlässigung": "nein",
                "Körperliche Gewalt": "nein",
                "Aufsichtspflichtverletzung": "unklar"
            },
            actionsTaken: "Beratungsgespräch intensiviert.",
            result: "latent"
        };
        const errors = validateHazardAssessment8a(validAssessment);
        expect(errors.length).toBe(0);
    });

    it("should verify AppSettings interface compliance for SPFH fields", () => {
        const settings: AppSettings = {
            travelExpenseRate: 0.30,
            consultationTypes: [],
            lifeStages: [],
            personGroups: [],
            problemOrigins: [],
            subProblems: [],
            goalTypes: [],
            familyMemberRelations: ["Mutter", "Vater", "Kind", "Pflegeeltern"],
            familyJournalTypes: ["Hausbesuch", "Telefonat", "ASD-Kontakt"],
            familyGoalCategories: ["Erziehung", "Alltag", "Schule"]
        };

        expect(settings.familyMemberRelations).toBeDefined();
        expect(settings.familyJournalTypes).toBeDefined();
        expect(settings.familyGoalCategories).toBeDefined();
        expect(settings.familyMemberRelations!.length).toBe(4);
    });

    it("should validate a FamilyCase containing optional fields like fundingCommitment and asdContact", () => {
        const complexCase: FamilyCase = {
            familyName: "Schmidt",
            caseNumber: "SPFH-2026-002",
            assignedWorkerId: "user_worker_2",
            status: "aktiv",
            members: [{ firstName: "Max", lastName: "Schmidt", relation: "Vater" }],
            asdContact: {
                name: "Frau Jugendamt",
                email: "jugendamt@stadt.de",
                phone: "0123-45678",
                institution: "ASD Stadt Mitte"
            },
            fundingCommitment: {
                hoursGranted: 80,
                startDate: "2026-01-01",
                endDate: "2026-06-30",
                hourlyRate: 75.0
            },
            createdAt: new Date()
        };
        const errors = validateFamilyCase(complexCase);
        expect(errors.length).toBe(0);
    });

    // --- TIER 2: BOUNDARY & CORNER CASES (>= 5 Tests) ---

    it("should fail validation if familyName is empty or only whitespace", () => {
        const invalidCase: Partial<FamilyCase> = {
            familyName: "   ",
            caseNumber: "SPFH-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "A", lastName: "B", relation: "Mutter" }]
        };
        const errors = validateFamilyCase(invalidCase);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].field).toBe("familyName");
    });

    it("should fail validation if members list is empty", () => {
        const invalidCase: Partial<FamilyCase> = {
            familyName: "Müller",
            caseNumber: "SPFH-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: []
        };
        const errors = validateFamilyCase(invalidCase);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].field).toBe("members");
    });

    it("should fail validation if journal duration is negative, zero or exceeds 24 hours", () => {
        const journalZero: Partial<FamilyJournalEntry> = {
            date: new Date(),
            durationInHours: 0,
            type: "Hausbesuch",
            notes: "Test note"
        };
        const errorsZero = validateFamilyJournalEntry(journalZero);
        expect(errorsZero.length).toBeGreaterThan(0);

        const journalNegative: Partial<FamilyJournalEntry> = {
            date: new Date(),
            durationInHours: -1.5,
            type: "Hausbesuch",
            notes: "Test note"
        };
        const errorsNegative = validateFamilyJournalEntry(journalNegative);
        expect(errorsNegative.length).toBeGreaterThan(0);

        const journalOverLimit: Partial<FamilyJournalEntry> = {
            date: new Date(),
            durationInHours: 24.5,
            type: "Hausbesuch",
            notes: "Test note"
        };
        const errorsOverLimit = validateFamilyJournalEntry(journalOverLimit);
        expect(errorsOverLimit.length).toBeGreaterThan(0);
    });

    it("should fail validation if fundingCommitment dates are inverted", () => {
        const invalidCase: Partial<FamilyCase> = {
            familyName: "Müller",
            caseNumber: "SPFH-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "A", lastName: "B", relation: "Mutter" }],
            fundingCommitment: {
                hoursGranted: 40,
                startDate: "2026-12-31",
                endDate: "2026-01-01" // inverted
            }
        };
        const errors = validateFamilyCase(invalidCase);
        expect(errors.length).toBeGreaterThan(0);
        const err = errors.find(e => e.field.includes("fundingCommitment.endDate"));
        expect(err).toBeDefined();
    });

    it("should fail validation if 8a assessorName is missing or result is invalid", () => {
        const invalid8a: Partial<HazardAssessment8a> = {
            date: new Date(),
            assessorName: "",
            result: "invalid_status" as unknown as "akut",
            indicators: { "Vernachlässigung": "ja" }
        };
        const errors = validateHazardAssessment8a(invalid8a);
        expect(errors.length).toBeGreaterThan(1);
        expect(errors.some(e => e.field === "assessorName")).toBeTruthy();
        expect(errors.some(e => e.field === "result")).toBeTruthy();
    });

    it("should fail validation if fundingCommitment has negative hoursGranted", () => {
        const invalidCase: Partial<FamilyCase> = {
            familyName: "Müller",
            caseNumber: "SPFH-001",
            assignedWorkerId: "worker_1",
            status: "aktiv",
            members: [{ firstName: "A", lastName: "B", relation: "Mutter" }],
            fundingCommitment: {
                hoursGranted: -5,
                startDate: "2026-01-01",
                endDate: "2026-06-30"
            }
        };
        const errors = validateFamilyCase(invalidCase);
        expect(errors.some(e => e.field === "fundingCommitment.hoursGranted")).toBeTruthy();
    });
});
