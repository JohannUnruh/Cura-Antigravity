import { Role } from "@/types";

/**
 * Datenschutz-Helfer für das Dashboard (Verteidigung in der Tiefe).
 *
 * Hintergrund: Die Firestore-Regeln erlauben einem Admin das vereinsweite Lesen
 * vieler Collections (`|| isAdmin()`). Das Dashboard soll diese Möglichkeit aber
 * bewusst NICHT personenbezogen ausnutzen: Seelsorgerliche Inhalte (Klientennamen,
 * Zielvereinbarungen, Notizen) sind besondere Kategorien personenbezogener Daten
 * (Art. 9 DSGVO) und gehören nicht in eine Verbandsansicht.
 *
 * Deshalb gelten zwei getrenne Ebenen:
 *  1. `scopeRecords(...)` filtert geladene Datensätze VOR dem Schreiben in den
 *     React-State auf den Eigentümer – fremde Datensätze gelangen gar nicht erst
 *     in die Oberfläche.
 *  2. `buildAnonymousAssociationStats(...)` verdichtet die Verbandsdaten zu reinen
 *     Kennzahlen. Der Eingabetyp enthält absichtlich keine Felder mit Personenbezug,
 *     damit die Funktion auch dann keine Namen oder IDs ausgeben kann, wenn ihr
 *     jemand vollständige Datensätze übergibt.
 *
 * Alle Funktionen sind rein (keine Seiteneffekte, kein React, kein Firestore) und
 * dadurch direkt in `tests/dataScope.test.ts` prüfbar.
 */

export type DashboardViewMode = 'own' | 'all';

/** Minimale Struktur aller Datensätze, die einem Ersteller zugeordnet sind. */
export interface Ownable {
    authorId?: string;
}

export interface DataScopeContext {
    uid: string;
    viewMode: DashboardViewMode;
    role?: Role;
}

/**
 * Filtert Datensätze hart auf den Eigentümer.
 * Datensätze ohne `authorId` werden verworfen (im Zweifel gegen die Anzeige).
 */
export function scopeToOwner<T extends Ownable>(records: T[], uid: string): T[] {
    if (!uid) return [];
    return records.filter(record => record.authorId === uid);
}

/**
 * Die Verbandsansicht ist ausschließlich für Admins freigeschaltet.
 * Alle anderen Rollen bleiben immer auf den eigenen Daten.
 */
export function isAssociationViewAllowed(context: DataScopeContext): boolean {
    return context.viewMode === 'all' && context.role === 'Admin';
}

/**
 * Entscheidet, welche Datensätze in den State dürfen.
 * Nur bei aktivierter Verbandsansicht UND Rolle Admin werden fremde Datensätze
 * durchgelassen – sonst wird auf `uid` gefiltert.
 */
export function scopeRecords<T extends Ownable>(records: T[], context: DataScopeContext): T[] {
    if (isAssociationViewAllowed(context)) {
        return records;
    }
    return scopeToOwner(records, context.uid);
}

/**
 * Eingabe für die anonymisierte Verbandsstatistik.
 *
 * Bewusst eng typisiert: Es gibt hier keine Felder für Namen, IDs von Klienten,
 * Notizen, Zielvereinbarungen oder Freitext-Themen. Was nicht im Typ steht,
 * kann die Funktion nicht lesen und damit auch nicht ausgeben.
 */
export interface AssociationStatsInput {
    consultations: Array<{
        dateFrom?: Date | string | number;
        unitsInHours?: number;
        prepTimeInHours?: number;
        problemOriginId?: string;
    }>;
    legacyConsultations: Array<{
        dateFrom?: Date | string | number;
        durationInHours?: number;
        prepTimeInHours?: number;
        consultationType?: string;
    }>;
    lectures: Array<{
        dateFrom?: Date | string | number;
        durationInHours?: number;
        prepTimeInHours?: number;
        participantCount?: number;
        lectureType?: string;
    }>;
    retreats: Array<{
        dateFrom?: Date | string | number;
        durationInHours?: number;
        prepTimeInHours?: number;
        participantCount?: number;
        retreatType?: string;
    }>;
}

export interface CategoryCount {
    name: string;
    value: number;
}

export interface AnonymousAssociationStats {
    /** Beratungsstunden inkl. Vorbereitung (Standard + Legacy). */
    consultationHours: number;
    /** Anzahl erfasster Beratungsfälle (Standard + Legacy). */
    consultationCount: number;
    lectureHours: number;
    lectureCount: number;
    lectureParticipants: number;
    lectureTypeData: CategoryCount[];
    retreatHours: number;
    retreatCount: number;
    retreatParticipants: number;
    retreatTypeData: CategoryCount[];
    /** Top-Problemkategorien, aufgelöst über die globalen Dropdown-Listen. */
    problemData: CategoryCount[];
    /** Summe aller erfassten Aktivitäten. */
    activityCount: number;
}

export interface AssociationStatsOptions {
    /** Kalenderjahr als Text; `'all'` oder `undefined` filtert nicht. */
    year?: string;
    /** Globale Liste der Problemfelder zur Auflösung von `problemOriginId`. */
    problemOriginLabels?: string[];
    /** Anzahl der Top-Kategorien, Standard 5. */
    topLimit?: number;
}

const roundHours = (value: number): number => Math.round(value * 10) / 10;

function matchesYear(date: Date | string | number | undefined, year?: string): boolean {
    if (!year || year === 'all') return true;
    if (!date) return false;
    const parsed = date instanceof Date ? date : new Date(date);
    if (isNaN(parsed.getTime())) return false;
    return parsed.getFullYear().toString() === year;
}

function toSortedCounts(counts: Record<string, number>, limit?: number): CategoryCount[] {
    const entries = Object.entries(counts).map(([name, value]) => ({ name, value }));
    entries.sort((a, b) => b.value - a.value);
    return limit ? entries.slice(0, limit) : entries;
}

/**
 * Verdichtet Verbandsdaten zu anonymen Kennzahlen.
 *
 * Die Rückgabe enthält ausschließlich Zahlen und Kategoriebezeichnungen aus den
 * globalen Dropdown-Listen bzw. den Typ-Feldern der Module. Für Legacy-Beratungen
 * wird bewusst `consultationType` (Kategorie) und nicht `topic` (Freitext)
 * verwendet, weil Freitext personenbezogene Angaben enthalten kann.
 */
export function buildAnonymousAssociationStats(
    input: AssociationStatsInput,
    options: AssociationStatsOptions = {}
): AnonymousAssociationStats {
    const { year, problemOriginLabels, topLimit = 5 } = options;

    const consultations = input.consultations.filter(c => matchesYear(c.dateFrom, year));
    const legacyConsultations = input.legacyConsultations.filter(c => matchesYear(c.dateFrom, year));
    const lectures = input.lectures.filter(l => matchesYear(l.dateFrom, year));
    const retreats = input.retreats.filter(r => matchesYear(r.dateFrom, year));

    const consultationHours =
        consultations.reduce((sum, c) => sum + (c.unitsInHours || 0) + (c.prepTimeInHours || 0), 0) +
        legacyConsultations.reduce((sum, c) => sum + (c.durationInHours || 0) + (c.prepTimeInHours || 0), 0);

    const problems: Record<string, number> = {};
    consultations.forEach(c => {
        const originId = c.problemOriginId;
        if (!originId) return;
        const label = problemOriginLabels?.find((_p, index) => index.toString() === originId) || originId;
        problems[label] = (problems[label] || 0) + 1;
    });
    legacyConsultations.forEach(c => {
        const label = c.consultationType || 'Unbekannt';
        problems[label] = (problems[label] || 0) + 1;
    });

    const lectureTypes: Record<string, number> = {};
    lectures.forEach(l => {
        const label = l.lectureType || 'Sonstige';
        lectureTypes[label] = (lectureTypes[label] || 0) + 1;
    });

    const retreatTypes: Record<string, number> = {};
    retreats.forEach(r => {
        const label = r.retreatType || 'Sonstige';
        retreatTypes[label] = (retreatTypes[label] || 0) + 1;
    });

    return {
        consultationHours: roundHours(consultationHours),
        consultationCount: consultations.length + legacyConsultations.length,
        lectureHours: roundHours(lectures.reduce((sum, l) => sum + (l.durationInHours || 0) + (l.prepTimeInHours || 0), 0)),
        lectureCount: lectures.length,
        lectureParticipants: lectures.reduce((sum, l) => sum + (l.participantCount || 0), 0),
        lectureTypeData: toSortedCounts(lectureTypes),
        retreatHours: roundHours(retreats.reduce((sum, r) => sum + (r.durationInHours || 0) + (r.prepTimeInHours || 0), 0)),
        retreatCount: retreats.length,
        retreatParticipants: retreats.reduce((sum, r) => sum + (r.participantCount || 0), 0),
        retreatTypeData: toSortedCounts(retreatTypes),
        problemData: toSortedCounts(problems, topLimit),
        activityCount: consultations.length + legacyConsultations.length + lectures.length + retreats.length
    };
}
