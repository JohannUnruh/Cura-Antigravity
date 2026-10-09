import { describe, it, expect, beforeEach } from "../test-framework";
import { formatEuro, calculateTotalBudget, calculateSpentBudget } from "@/lib/utils/format";
import {
    familyHelperService,
    setFamilyHelperMockMode,
    clearFamilyHelperMockDb,
} from "@/lib/firebase/services/familyHelperService";
import type { FamilyCase } from "@/types/familyHelper";

describe("SPFH: Budget- und Euro-Berechnungen (Workshop 05.10.2026)", () => {

    beforeEach(() => {
        setFamilyHelperMockMode(true);
        clearFamilyHelperMockDb();
    });

    describe("formatEuro Helper", () => {
        it("formatiert Beträge sauber in deutsches Währungsformat", () => {
            const formatted = formatEuro(1250.5);
            // Enthält 1.250,50 und Eurozeichen (evtl. mit geschütztem Leerzeichen)
            expect(formatted.includes("1.250,50")).toBe(true);
            expect(formatted.includes("€")).toBe(true);
        });

        it("gibt 0,00 € bei 0, undefined, null oder NaN zurück", () => {
            expect(formatEuro(0).includes("0,00")).toBe(true);
            expect(formatEuro(undefined).includes("0,00")).toBe(true);
            expect(formatEuro(null).includes("0,00")).toBe(true);
            expect(formatEuro(NaN).includes("0,00")).toBe(true);
        });
    });

    describe("calculateTotalBudget", () => {
        it("berechnet Stunden * Stundensatz korrekt gerundet", () => {
            expect(calculateTotalBudget(50, 110)).toBe(5500);
            expect(calculateTotalBudget(33.5, 95.5)).toBe(3199.25);
        });

        it("gibt null zurück, wenn Stunden oder Stundensatz 0 oder ungültig sind", () => {
            expect(calculateTotalBudget(0, 100)).toBeNull();
            expect(calculateTotalBudget(50, 0)).toBeNull();
            expect(calculateTotalBudget(undefined, 100)).toBeNull();
            expect(calculateTotalBudget(50, null)).toBeNull();
            expect(calculateTotalBudget(-10, 100)).toBeNull();
        });
    });

    describe("calculateSpentBudget", () => {
        it("berechnet Ist-Stunden * Stundensatz", () => {
            expect(calculateSpentBudget(12.5, 100)).toBe(1250);
            expect(calculateSpentBudget(0, 100)).toBe(0);
        });

        it("liefert 0 bei fehlendem Stundensatz oder Ist-Stunden", () => {
            expect(calculateSpentBudget(10, 0)).toBe(0);
            expect(calculateSpentBudget(undefined, 100)).toBe(0);
            expect(calculateSpentBudget(10, null)).toBe(0);
        });
    });

    describe("Persistenz mit Stundensatz in FamilyCase", () => {
        it("erstellt und liest Fall mit Stundensatz im fundingCommitment", async () => {
            const casePayload: Omit<FamilyCase, "id"> = {
                familyName: "Musterfamilie",
                caseNumber: "SPFH-2026-101",
                assignedWorkerId: "worker_1",
                status: "aktiv",
                members: [{ firstName: "Maria", lastName: "Muster", relation: "Mutter" }],
                asdContacts: [],
                fundingCommitment: {
                    hoursGranted: 60,
                    hourlyRate: 115,
                    startDate: new Date(),
                    endDate: new Date(),
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const id = await familyHelperService.createCase(casePayload);
            expect(id).toBeDefined();

            const saved = await familyHelperService.getCaseById(id);
            expect(saved).not.toBeNull();
            expect(saved?.fundingCommitment?.hoursGranted).toBe(60);
            expect(saved?.fundingCommitment?.hourlyRate).toBe(115);

            // Gesamtbudget-Prüfung
            const totalBudget = calculateTotalBudget(
                saved?.fundingCommitment?.hoursGranted,
                saved?.fundingCommitment?.hourlyRate
            );
            expect(totalBudget).toBe(6900);
        });
    });
});
