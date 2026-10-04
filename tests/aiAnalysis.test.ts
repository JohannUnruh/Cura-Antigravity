import { describe, it, expect } from "./test-framework";

describe("AI Analysis: Service & Response Parsing", () => {
    it("parses valid consultation JSON structure into ConsultationAnalysisResult", () => {
        const rawResponse = JSON.stringify({
            dateFrom: "2026-10-04",
            dateTo: "2026-10-05",
            type: "Seelsorge Präsenz",
            lifeStage: "Kindheit",
            problemOriginId: "Familie",
            subProblemsIds: ["Sucht", "Depression"],
            goalTypeId: "Entlastung",
            goalAgreement: "Regelmäßige Aufarbeitung der Kindheitstraumata.",
            causeFromCounselor: "Konflikte mit dem Vater.",
            unitsInHours: 5,
            prepTimeInHours: 2,
            smartCheck: {
                specific: true,
                measurable: true,
                achievable: true,
                relevant: 5,
                timeBound: "2026-11-04"
            },
            notes: "Vormittagsgespräche ab 8 Uhr."
        });

        const parsed = JSON.parse(rawResponse);
        expect(parsed.unitsInHours).toBe(5);
        expect(parsed.prepTimeInHours).toBe(2);
        expect(parsed.lifeStage).toBe("Kindheit");
        expect(parsed.problemOriginId).toBe("Familie");
        expect(parsed.subProblemsIds.length).toBe(2);
        expect(parsed.smartCheck.relevant).toBe(5);
        expect(parsed.smartCheck.specific).toBe(true);
    });

    it("parses valid SKB JSON structure into SkbAnalysisResult", () => {
        const rawResponse = JSON.stringify({
            dateFrom: "2026-10-04",
            dateTo: "2026-10-04",
            durationInHours: 1.5,
            companion: "Partner",
            pregnancyWeek: 12,
            expectedDeliveryDate: "2027-04-15",
            certificateStatus: "Ja",
            conflictPointsIds: ["Finanzielle Nöte", "Wohnungsnot"],
            interventionsIds: ["Emotionale Stabilisierung", "Finanzielle Beratung"],
            goalAgreement: "Antrag auf Erstausstattung stellen.",
            notes: "Klientin wirkt erleichtert."
        });

        const parsed = JSON.parse(rawResponse);
        expect(parsed.durationInHours).toBe(1.5);
        expect(parsed.companion).toBe("Partner");
        expect(parsed.pregnancyWeek).toBe(12);
        expect(parsed.certificateStatus).toBe("Ja");
        expect(parsed.conflictPointsIds.length).toBe(2);
    });

    it("handles null or missing optional fields gracefully", () => {
        const rawResponse = JSON.stringify({
            type: null,
            lifeStage: "Kindheit",
            problemOriginId: "Familie",
            subProblemsIds: [],
            goalTypeId: null,
            goalAgreement: "",
            notes: "Keine weiteren Details."
        });

        const parsed = JSON.parse(rawResponse);
        expect(parsed.type).toBe(null);
        expect(parsed.lifeStage).toBe("Kindheit");
        expect(parsed.problemOriginId).toBe("Familie");
        expect(parsed.subProblemsIds.length).toBe(0);
        expect(parsed.goalTypeId).toBe(null);
    });
});
