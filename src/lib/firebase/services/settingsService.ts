import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AppSettings } from "@/types";

const defaultSettings: AppSettings = {
    travelExpenseRate: 0.30,
    consultationTypes: [
        'Ausbildung', 'Beratung', 'Ehe Vorbereitung',
        'Gebetshilfe (Stehcafé)', 'Gebetszeit für Frauen',
        'Glaubensstärkung (Stehcafé)', 'Glaubensstärkung',
        'Seelsorge Präsenz', 'Seelsorge telefonisch'
    ],
    lifeStages: ['Erwachsener', 'junge Erwachsene/r', 'Kindheit', 'Teenager'],
    personGroups: [
        'Ehepaar', 'Erwachsene', 'Familie', 'Jugendliche',
        'Teeny', 'Kind', 'Paar', 'Senior', 'Verwitwet'
    ],
    problemOrigins: ['Familie', 'Arbeit', 'Gesundheit', 'Gemeinde', 'Vergangenheit'],
    subProblems: ['Sucht', 'Ehekrise', 'Glaubenskrise', 'Depression', 'Finanzen'],
    goalTypes: ['Wiederherstellung', 'Erkenntnis', 'Verhaltensänderung', 'Entlastung'],
    skbConflictPoints: [
        'Finanzielle Nöte', 'Fehlende Unterstützung durch Partner', 'Druck zur Abtreibung (durch Partner/Umfeld)',
        'Überforderung', 'Wohnungsnot', 'Ausbildungs-/Berufsgefährdung', 'Medizinische Sorgen',
        'Ethische/Biblische Konflikte', 'Innere Zerrissenheit/Angst'
    ],
    skbInterventions: [
        'Emotionale Stabilisierung', 'Praktische Lebenshilfe (Wohnraum/Finanzen/Erstausstattung)',
        'Aufklärung über gesetzliche Hilfen', 'Ermutigung aus biblischer Perspektive (Wert des Lebens)',
        'Gebetsunterstützung', 'Begleitung bei Arzt-/Ämtergängen', 'Vermittlung an externe Fachstellen'
    ],
    skbCompanions: ['Keine', 'Partner', 'Freundin', 'Elternteil', 'Sonstige'],
    skbCertificateOptions: ['Ja', 'Nein', 'Unbekannt', 'In Planung'],
    lectureTypes: [
        'Seelsorge Vortrag',
        'Frauenfrühstück',
        'Frauenabend',
        'Frauenadvent',
        'Thementag',
        'interne Schulung',
        'Ehe-Seminar',
        'Eheabend'
    ],
    retreatTypes: [
        'Ehefreizeit',
        'Teeniefreizeit',
        'Jungschaffreizeit',
        'Jugendfreizeit',
        'Frauenfreizeit',
        'Männerfreizeit',
        'KjE'
    ],
};

export const settingsService = {
    async getSettings(): Promise<AppSettings> {
        try {
            const docRef = doc(db, "settings", "global");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    ...defaultSettings,
                    ...data,
                } as AppSettings;
            }
            // If not exists, save defaults and return
            await this.saveSettings(defaultSettings);
            return defaultSettings;
        } catch (error) {
            console.error("Error getting settings:", error);
            return defaultSettings;
        }
    },

    async saveSettings(settings: AppSettings): Promise<void> {
        try {
            const docRef = doc(db, "settings", "global");
            await setDoc(docRef, { ...settings, updatedAt: new Date() }, { merge: true });
        } catch (error) {
            console.error("Error saving settings:", error);
            throw error;
        }
    }
};
