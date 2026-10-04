import { settingsService } from "./settingsService";

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
        try {
            const settings = await settingsService.getSettings();
            const response = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mode: "consultation",
                    freitext,
                    settings,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("AI Analysis API returned error:", response.status, errData);
                throw new Error(errData.error || "KI-Analyse fehlgeschlagen.");
            }

            const json = await response.json();
            return json.data as ConsultationAnalysisResult;
        } catch (error) {
            console.error("AI Analysis error:", error);
            throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.");
        }
    },

    async analyzeSkbNotes(freitext: string): Promise<SkbAnalysisResult> {
        try {
            const settings = await settingsService.getSettings();
            const response = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mode: "skb",
                    freitext,
                    settings,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("AI SKB Analysis API returned error:", response.status, errData);
                throw new Error(errData.error || "KI-Analyse fehlgeschlagen.");
            }

            const json = await response.json();
            return json.data as SkbAnalysisResult;
        } catch (error) {
            console.error("AI SKB Analysis error:", error);
            throw new Error("KI-Analyse fehlgeschlagen. Bitte versuche es erneut.");
        }
    },
};
