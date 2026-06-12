import { FamilyCase, FamilyJournalEntry, HazardAssessment8a, FundingCommitment } from "@/types/familyHelper";

export interface ValidationError {
    field: string;
    message: string;
}

export function validateFamilyCase(caseData: Partial<FamilyCase>, allowedRelations?: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!caseData.familyName || caseData.familyName.trim() === "") {
        errors.push({ field: "familyName", message: "Nachname der Familie darf nicht leer sein" });
    }

    if (!caseData.caseNumber || caseData.caseNumber.trim() === "") {
        errors.push({ field: "caseNumber", message: "Fallnummer darf nicht leer sein" });
    }

    if (!caseData.assignedWorkerId || caseData.assignedWorkerId.trim() === "") {
        errors.push({ field: "assignedWorkerId", message: "Zugewiesener Mitarbeiter darf nicht leer sein" });
    }

    if (!caseData.status || !["aktiv", "inaktiv", "beendet"].includes(caseData.status)) {
        errors.push({ field: "status", message: "Status muss 'aktiv', 'inaktiv' oder 'beendet' sein" });
    }

    if (!caseData.members || !Array.isArray(caseData.members) || caseData.members.length === 0) {
        errors.push({ field: "members", message: "Mindestens ein Familienmitglied muss angegeben werden" });
    } else {
        caseData.members.forEach((m, idx) => {
            if (!m.firstName || m.firstName.trim() === "") {
                errors.push({ field: `members[${idx}].firstName`, message: "Vorname darf nicht leer sein" });
            }
            if (!m.lastName || m.lastName.trim() === "") {
                errors.push({ field: `members[${idx}].lastName`, message: "Nachname darf nicht leer sein" });
            }
            if (!m.relation || m.relation.trim() === "") {
                errors.push({ field: `members[${idx}].relation`, message: "Beziehung darf nicht leer sein" });
            } else if (allowedRelations && !allowedRelations.includes(m.relation)) {
                errors.push({ field: `members[${idx}].relation`, message: `Beziehung '${m.relation}' ist laut Einstellungen nicht erlaubt` });
            }
        });
    }

    if (caseData.fundingCommitment) {
        const funding = caseData.fundingCommitment;
        if (typeof funding.hoursGranted !== "number" || funding.hoursGranted < 0) {
            errors.push({ field: "fundingCommitment.hoursGranted", message: "Bewilligte Stunden müssen eine positive Zahl sein" });
        }
        if (!funding.startDate || funding.startDate.trim() === "") {
            errors.push({ field: "fundingCommitment.startDate", message: "Startdatum darf nicht leer sein" });
        }
        if (!funding.endDate || funding.endDate.trim() === "") {
            errors.push({ field: "fundingCommitment.endDate", message: "Enddatum darf nicht leer sein" });
        }
        if (funding.startDate && funding.endDate) {
            const start = new Date(funding.startDate);
            const end = new Date(funding.endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                errors.push({ field: "fundingCommitment", message: "Ungültige Datumsangaben in Bewilligung" });
            } else if (end < start) {
                errors.push({ field: "fundingCommitment.endDate", message: "Enddatum darf nicht vor dem Startdatum liegen" });
            }
        }
    }

    return errors;
}

export function validateFamilyJournalEntry(
    entry: Partial<FamilyJournalEntry>,
    allowedTypes?: string[],
    fundingCommitment?: FundingCommitment
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof entry.durationInHours !== "number" || entry.durationInHours <= 0) {
        errors.push({ field: "durationInHours", message: "Dauer muss eine positive Zahl größer als 0 sein" });
    } else if (entry.durationInHours > 24) {
        errors.push({ field: "durationInHours", message: "Dauer darf 24 Stunden nicht überschreiten" });
    }

    if (!entry.type || entry.type.trim() === "") {
        errors.push({ field: "type", message: "Typ darf nicht leer sein" });
    } else if (allowedTypes && !allowedTypes.includes(entry.type)) {
        errors.push({ field: "type", message: `Typ '${entry.type}' ist laut Einstellungen nicht erlaubt` });
    }

    if (!entry.notes || entry.notes.trim() === "") {
        errors.push({ field: "notes", message: "Notizen dürfen nicht leer sein" });
    }

    if (!entry.date) {
        errors.push({ field: "date", message: "Datum muss angegeben werden" });
    } else if (fundingCommitment) {
        const journalDate = new Date(entry.date);
        const start = new Date(fundingCommitment.startDate);
        const end = new Date(fundingCommitment.endDate);
        if (!isNaN(journalDate.getTime()) && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const jTime = new Date(journalDate.getFullYear(), journalDate.getMonth(), journalDate.getDate()).getTime();
            const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

            if (jTime < startTime || jTime > endTime) {
                errors.push({
                    field: "date",
                    message: "Datum des Journaleintrags liegt außerhalb des Leistungszeitraums"
                });
            }
        }
    }

    return errors;
}

export function validateHazardAssessment8a(assessment: Partial<HazardAssessment8a>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!assessment.assessorName || assessment.assessorName.trim() === "") {
        errors.push({ field: "assessorName", message: "Name des Prüfers darf nicht leer sein" });
    }

    if (!assessment.result || !["akut", "latent", "keine"].includes(assessment.result)) {
        errors.push({ field: "result", message: "Ergebnis muss 'akut', 'latent' oder 'keine' sein" });
    }

    if (!assessment.indicators || typeof assessment.indicators !== "object" || Object.keys(assessment.indicators).length === 0) {
        errors.push({ field: "indicators", message: "Mindestens ein Risikoindikator muss bewertet werden" });
    } else {
        Object.entries(assessment.indicators).forEach(([key, val]) => {
            if (!["ja", "nein", "unklar"].includes(val)) {
                errors.push({ field: `indicators.${key}`, message: "Indikator-Bewertung muss 'ja', 'nein' oder 'unklar' sein" });
            }
        });
    }

    return errors;
}
