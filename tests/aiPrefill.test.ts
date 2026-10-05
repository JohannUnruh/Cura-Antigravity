import { describe, it, expect } from "./test-framework";
import { sanitizeAiPrefill } from "../src/lib/utils/aiPrefill";

/**
 * Regression: KI-Prefill-Crash vom 05.10.2026 (Produktiv-App, Workshop).
 *
 * Gemini liefert fehlende Felder als explizites `null` (Prompt-Vorgabe in
 * /api/ai/analyze). Über die URL landeten diese nulls als `initialData` in
 * ConsultationForm/SkbConsultationForm; die Sync-Effekte der Stunden-Inputs
 * prüften nur `!== undefined` und crashten mit
 * `TypeError: Cannot read properties of null (reading 'toString')`.
 *
 * Abdeckung: (1) Ursprünglicher Crash-Mechanismus, (2) sanitizeAiPrefill als
 * einzige Einspeisestelle, (3) gehärtete Effekt-Garde (`!= null`).
 */

// Exakte Nachbildung der alten (ungesicherten) Effekt-Garde aus ConsultationForm
// (Typ aus Partial<Consultation> – zur Laufzeit kam dort null aus dem KI-Prefill an)
function oldEffectGuard(value: number | undefined, currentStr: string): string {
    if (value !== undefined && parseFloat(currentStr) !== value) {
        return value.toString();
    }
    return currentStr;
}

// Exakte Nachbildung der neuen (gehärteten) Effekt-Garde
function hardenedEffectGuard(value: number | null | undefined, currentStr: string): string {
    if (value != null && parseFloat(currentStr) !== value) {
        return value.toString();
    }
    return currentStr;
}

describe("AI-Prefill: sanitizeAiPrefill (Crash-Fix 05.10.2026)", () => {
    it("Baseline: null im Stunden-Feld crasht die alte Effekt-Garde mit toString-TypeError", () => {
        const rawAiResult = JSON.parse('{"unitsInHours": null, "prepTimeInHours": null}');
        expect(() => oldEffectGuard(rawAiResult.unitsInHours, "1")).toThrow(
            "Cannot read properties of null"
        );
    });

    it("gehärtete Effekt-Garde übersteht null und undefined ohne Crash", () => {
        expect(hardenedEffectGuard(null, "1")).toBe("1");
        expect(hardenedEffectGuard(undefined, "1")).toBe("1");
        expect(hardenedEffectGuard(2.5, "1")).toBe("2.5");
    });

    it("entfernt null-Felder aus einem realistischen Gemini-Consultation-Ergebnis", () => {
        const parsed = JSON.parse(JSON.stringify({
            dateFrom: "2026-10-05",
            dateTo: null,
            type: "Seelsorge Präsenz",
            lifeStage: null,
            problemOriginId: "Familie",
            subProblemsIds: ["Depression", null],
            goalTypeId: null,
            goalAgreement: "Regelmäßige Gespräche zur Stabilisierung.",
            causeFromCounselor: null,
            unitsInHours: null,
            prepTimeInHours: null,
            smartCheck: {
                specific: true,
                measurable: null,
                achievable: true,
                relevant: 4,
                timeBound: null
            },
            notes: "Klient wirkte entlastet.",
            _source: "ai_notes"
        }));

        const sanitized = sanitizeAiPrefill(parsed) as Record<string, unknown>;

        // null-Felder sind komplett weg → Formular-Defaults/`?? fallback` greifen
        expect("dateTo" in sanitized).toBe(false);
        expect("lifeStage" in sanitized).toBe(false);
        expect("goalTypeId" in sanitized).toBe(false);
        expect("causeFromCounselor" in sanitized).toBe(false);
        expect("unitsInHours" in sanitized).toBe(false);
        expect("prepTimeInHours" in sanitized).toBe(false);

        // echte Werte bleiben unverändert
        expect(sanitized.dateFrom).toBe("2026-10-05");
        expect(sanitized.type).toBe("Seelsorge Präsenz");
        expect(sanitized.problemOriginId).toBe("Familie");
        expect(sanitized.goalAgreement).toBe("Regelmäßige Gespräche zur Stabilisierung.");
        expect(sanitized.notes).toBe("Klient wirkte entlastet.");

        // null-Elemente in Arrays werden herausgefiltert
        expect(sanitized.subProblemsIds).toEqual(["Depression"]);

        // verschachteltes smartCheck: nulls entfernt, echte Werte behalten
        const sc = sanitized.smartCheck as Record<string, unknown>;
        expect(sc.specific).toBe(true);
        expect(sc.achievable).toBe(true);
        expect(sc.relevant).toBe(4);
        expect("measurable" in sc).toBe(false);
        expect("timeBound" in sc).toBe(false);
    });

    it("entfernt null-Felder aus einem SKB-Ergebnis (durationInHours-Crashpfad)", () => {
        const parsed = JSON.parse(JSON.stringify({
            dateFrom: "2026-10-05",
            dateTo: "2026-10-05",
            durationInHours: null,
            companion: null,
            pregnancyWeek: 12,
            expectedDeliveryDate: null,
            certificateStatus: "Unbekannt",
            conflictPointsIds: null,
            interventionsIds: ["Finanzielle Beratung"],
            goalAgreement: "Erstausstattung beantragen.",
            notes: null
        }));

        const sanitized = sanitizeAiPrefill(parsed) as Record<string, unknown>;

        expect("durationInHours" in sanitized).toBe(false);
        expect("companion" in sanitized).toBe(false);
        expect("expectedDeliveryDate" in sanitized).toBe(false);
        expect("conflictPointsIds" in sanitized).toBe(false);
        expect("notes" in sanitized).toBe(false);
        expect(sanitized.pregnancyWeek).toBe(12);
        expect(sanitized.certificateStatus).toBe("Unbekannt");
        expect(sanitized.interventionsIds).toEqual(["Finanzielle Beratung"]);
    });

    it("bewahrt falsy-Aber-Nicht-Null-Werte (0, false, leerer String)", () => {
        const sanitized = sanitizeAiPrefill({
            unitsInHours: 0,
            prepTimeInHours: 0,
            specific: false,
            goalAgreement: "",
            relevant: 0
        }) as Record<string, unknown>;

        expect(sanitized.unitsInHours).toBe(0);
        expect(sanitized.prepTimeInHours).toBe(0);
        expect(sanitized.specific).toBe(false);
        expect(sanitized.goalAgreement).toBe("");
        expect(sanitized.relevant).toBe(0);
    });

    it("nach sanitize läuft die Form-State-Initialisierung ohne Crash (End-to-End-Simulation)", () => {
        const parsed = JSON.parse('{"unitsInHours": null, "prepTimeInHours": null, "notes": "Text"}');
        const sanitized = sanitizeAiPrefill(parsed) as {
            unitsInHours?: number | null;
            prepTimeInHours?: number | null;
            notes?: string;
        };

        // useState-Initialisierungen der Form (optional chaining + Fallback)
        const unitsStr = sanitized.unitsInHours?.toString() ?? "1";
        const prepStr = sanitized.prepTimeInHours?.toString() ?? "0";

        expect(unitsStr).toBe("1");
        expect(prepStr).toBe("0");
        // gehärtete Effekte bleiben no-ops bei fehlenden Feldern
        expect(hardenedEffectGuard(sanitized.unitsInHours, unitsStr)).toBe("1");
        expect(hardenedEffectGuard(sanitized.prepTimeInHours, prepStr)).toBe("0");
    });

    it("lässt Nicht-Objekt-Eingaben unverändert", () => {
        expect(sanitizeAiPrefill("text")).toBe("text");
        expect(sanitizeAiPrefill(42)).toBe(42);
        expect(sanitizeAiPrefill(null)).toBe(null);
    });
});
