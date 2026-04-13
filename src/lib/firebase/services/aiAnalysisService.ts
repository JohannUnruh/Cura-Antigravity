import { ai } from "@/lib/firebase/config";
import { getGenerativeModel } from "@firebase/vertexai-preview";
import { settingsService } from "./settingsService";

// Initialize model with structured JSON output
function getModel() {
    return getGenerativeModel(ai, {
        model: "gemini-1.5-flash", // Nutze ein erprobtes Vertex AI Modell für Cloud Processing
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
        }
    });
}

export interface ConsultationAnalysisResult {
    dateFrom?: string;        // ISO date string
    dateTo?: string;          // ISO date string
    type?: string;            // from settings dropdown
    lifeStage?: string;       // from settings dropdown - the LIFE STAGE THE PROBLEM ORIGINATES FROM
    problemOriginId?: string; // from settings dropdown
    subProblemsIds?: string[];// from settings dropdown
    goalTypeId?: string;      // from settings dropdown
    goalAgreement?: string;   // free text
    causeFromCounselor?: string;// free text
    unitsInHours?: number;
    prepTimeInHours?: number;
    smartCheck?: {
        specific: boolean;
        measurable: boolean;
        achievable: boolean;
        relevant: number;     // 1-5
        timeBound?: string;   // ISO date string or null
    };
    notes?: string;           // everything that couldn't be categorized
}

export interface SkbAnalysisResult {
    dateFrom?: string;
    dateTo?: string;
    durationInHours?: number;
    companion?: string;
    pregnancyWeek?: number;
    expectedDeliveryDate?: string;
    certificateStatus?: string;
    conflictPointsIds?: string[];
    interventionsIds?: string[];
    goalAgreement?: string;
    notes?: string;
}

export const aiAnalysisService = {
    async analyzeConsultationNotes(freitext: string): Promise<ConsultationAnalysisResult> {
        const settings = await settingsService.getSettings();
        const model = getModel();

        const prompt = `Du bist ein Assistent für Seelsorge-Dokumentation. Analysiere die folgenden Gesprächsnotizen und extrahiere strukturierte Daten für ein Beratungsformular.

WICHTIG: Du darfst NUR die folgenden vorgegebenen Optionen verwenden. Erfinde KEINE neuen Werte!

Verfügbare Gesprächsarten: ${JSON.stringify(settings.consultationTypes)}
Verfügbare Lebensabschnitte (der Problemherkunft, NICHT des Klienten!): ${JSON.stringify(settings.lifeStages)}
Verfügbare Problemherkünfte: ${JSON.stringify(settings.problemOrigins)}
Verfügbare Folgeprobleme (Mehrfachauswahl möglich): ${JSON.stringify(settings.subProblems)}
Verfügbare Zieltypen: ${JSON.stringify(settings.goalTypes)}

REGELN:
- "lifeStage" beschreibt den Lebensabschnitt, AUS DEM DAS PROBLEM HERKOMMT, nicht das aktuelle Alter des Klienten.
- Wähle für type, lifeStage, problemOriginId, goalTypeId und subProblemsIds NUR aus den oben genannten Listen.
- Wenn keine passende Option gefunden wird, lasse das Feld leer (null).
- Formuliere eine konkrete Zielvereinbarung (goalAgreement), die SMART-Kriterien folgt.
- Bewerte im smartCheck-Objekt, ob die Zielvereinbarung spezifisch, messbar, erreichbar ist. "relevant" ist 1-5 (wie relevant das Ziel ist). "timeBound" ist ein ISO-Datum falls zeitlich gebunden, sonst null.
- Alles, was du nicht zuordnen kannst, kommt in "notes".
- Datumsangaben als ISO-Strings (YYYY-MM-DD). Heutiges Datum: ${new Date().toISOString().slice(0, 10)}.

Gesprächsnotizen:
---
${freitext}
---

Antworte mit einem JSON-Objekt mit folgenden Feldern:
{ "dateFrom", "dateTo", "type", "lifeStage", "problemOriginId", "subProblemsIds", "goalTypeId", "goalAgreement", "causeFromCounselor", "unitsInHours", "prepTimeInHours", "smartCheck": { "specific", "measurable", "achievable", "relevant", "timeBound" }, "notes" }`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text) as ConsultationAnalysisResult;
        } catch (error) {
            console.error("AI Analysis error:", error);
            throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.");
        }
    },

    async analyzeSkbNotes(freitext: string): Promise<SkbAnalysisResult> {
        const model = getModel();

        const CONFLICT_POINTS = [
            'Finanzielle Nöte', 'Fehlende Unterstützung durch Partner',
            'Druck zur Abtreibung (durch Partner/Umfeld)', 'Überforderung',
            'Wohnungsnot', 'Ausbildungs-/Berufsgefährdung', 'Medizinische Sorgen',
            'Psychische Belastung', 'Sozialer Druck', 'Minderjährigkeit'
        ];

        const INTERVENTIONS = [
            'Beratung / Information', 'Stärkung der Eigenverantwortung',
            'Beziehungsklärung', 'Psychosoziale Unterstützung',
            'Finanzielle Beratung', 'Vermittlung an externe Fachstellen'
        ];

        const COMPANIONS = ['Keine', 'Partner', 'Freundin', 'Elternteil', 'Sonstige'];
        const CERTIFICATE_OPTIONS = ['Ja', 'Nein', 'Unbekannt', 'In Planung'];

        const prompt = `Du bist ein Assistent für Schwangerschaftskonfliktberatung (SKB). Analysiere die folgenden Gesprächsnotizen und extrahiere strukturierte Daten.

WICHTIG: Du darfst NUR die folgenden vorgegebenen Optionen verwenden!

Verfügbare Konfliktpunkte (Mehrfachauswahl): ${JSON.stringify(CONFLICT_POINTS)}
Verfügbare Interventionen (Mehrfachauswahl): ${JSON.stringify(INTERVENTIONS)}
Verfügbare Begleitpersonen: ${JSON.stringify(COMPANIONS)}
Bescheinigungsstatus-Optionen: ${JSON.stringify(CERTIFICATE_OPTIONS)}

Heutiges Datum: ${new Date().toISOString().slice(0, 10)}.

Gesprächsnotizen:
---
${freitext}
---

Antworte mit einem JSON-Objekt:
{ "dateFrom", "dateTo", "durationInHours", "companion", "pregnancyWeek", "expectedDeliveryDate", "certificateStatus", "conflictPointsIds", "interventionsIds", "goalAgreement", "notes" }`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text) as SkbAnalysisResult;
        } catch (error) {
            console.error("AI SKB Analysis error:", error);
            throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.");
        }
    }
};
