import { ContractType, DocumentKind, UserContractDocument, UserProfile } from "@/types";
import { filterActiveContracts, isRelationshipActive } from "@/lib/contracts/archive";

/**
 * Reine Logik für die Rechtsverhältnisse eines Mitglieds.
 *
 * Ein Mitglied kann gleichzeitig in mehreren Verhältnissen zum Verein stehen
 * (z. B. Minijob als Bürokraft UND Übungsleiterpauschale für eine Gruppe).
 * § 3 Nr. 26 EStG und § 3 Nr. 26a EStG sind unabhängig voneinander anwendbar,
 * ein Minijob ist ein eigenes (sozialversicherungspflichtiges) Rechtsverhältnis.
 *
 * Deshalb wird unterschieden zwischen:
 *  - `contractType`  → das PRIMÄRE, abrechnungsrelevante Verhältnis. Es treibt
 *                      die Kontingentlogik (`timeTrackingService.isMinijobber()`)
 *                      und den Abrechnungsbeleg (`contractDocumentUrl`).
 *  - `contractTypes` → ALLE aktiven Verhältnisse (Vereinigungsmenge).
 *
 * Alle Funktionen sind rein und damit ohne React testbar (`tests/contracts.test.ts`).
 * Bestehende Profile ohne `contractTypes` werden beim Lesen lazy abgeleitet –
 * es findet keine Datenmigration statt.
 */

/** Feste Reihenfolge der Vertragsarten für Auswahllisten. */
export const CONTRACT_TYPE_ORDER: ContractType[] = [
    'Ehrenamtlich',
    'Ehrenamtspauschale',
    'Übungsleiterpauschale',
    'Minijob'
];

/** Kurz-Badge je Vertragsart für die Benutzerkarten. */
export const CONTRACT_TYPE_BADGE: Record<ContractType, string> = {
    'Ehrenamtlich': 'EH',
    'Ehrenamtspauschale': 'EP',
    'Übungsleiterpauschale': 'ÜL',
    'Minijob': 'MJ'
};

export const DEFAULT_CONTRACT_TYPE: ContractType = 'Ehrenamtlich';

type RelationshipProfile = Pick<UserProfile, 'contractType' | 'contractTypes'>;

/** Wandelt "JJJJ-MM-TT" in "TT.MM.JJJJ" (für Vertragstitel und PDF-Kopf). */
export function formatIsoToGermanDate(isoDate?: string): string {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
        return `${parts[2].padStart(2, "0")}.${parts[1].padStart(2, "0")}.${parts[0]}`;
    }
    return isoDate;
}

/** Primäres (abrechnungsrelevantes) Verhältnis – fällt für Altprofile auf 'Ehrenamtlich'. */
export function getPrimaryContractType(profile?: RelationshipProfile | null): ContractType {
    return profile?.contractType ?? DEFAULT_CONTRACT_TYPE;
}

/**
 * Alle aktiven Rechtsverhältnisse eines Profils.
 * Lazy-Ableitung für Profile ohne `contractTypes`: `[contractType ?? 'Ehrenamtlich']`.
 * Das primäre Verhältnis steht immer an erster Stelle, Duplikate entfallen.
 */
export function getContractRelationships(profile?: RelationshipProfile | null): ContractType[] {
    const primary = getPrimaryContractType(profile);
    const stored = profile?.contractTypes ?? [];
    const relationships: ContractType[] = [primary];
    (stored.length > 0 ? stored : [primary]).forEach(type => {
        if (type && !relationships.includes(type)) {
            relationships.push(type);
        }
    });
    return relationships;
}

/** Vertragsarten, für die bereits mindestens ein Dokument existiert. */
export function getCoveredContractTypes(documents?: UserContractDocument[] | null): ContractType[] {
    const covered: ContractType[] = [];
    (documents ?? []).forEach(document => {
        if (document.contractType && !covered.includes(document.contractType)) {
            covered.push(document.contractType);
        }
    });
    return covered;
}

/**
 * Alle AKTIVEN Rechtsverhältnisse (archivierte Vertragsstränge ausgeblendet).
 * `getContractRelationships` selbst bleibt bewusst archiv-frei: Es wird von
 * `buildContractProfileUpdate` genutzt (Schutzzone Abrechnung) — `contractTypes`
 * darf durch Archivieren nie umgeschrieben werden (ARCHITECTURE.md §2/§3).
 */
export function getActiveContractRelationships(
    profile?: (RelationshipProfile & Pick<UserProfile, 'archivedContractTypes'>) | null
): ContractType[] {
    return getContractRelationships(profile).filter(type => isRelationshipActive(profile, type));
}

export interface ContractTypeCoverage {
    contractType: ContractType;
    /** Anzahl reiner Verträge (ohne Änderungsvereinbarungen). */
    contracts: number;
    /** Anzahl Änderungsvereinbarungen. */
    amendments: number;
    total: number;
    /** Handelt es sich um das abrechnungsrelevante Verhältnis? */
    isPrimary: boolean;
    /** Ist die Vertragsart als Rechtsverhältnis des Mitglieds hinterlegt? */
    isKnownRelationship: boolean;
    /** Vorhandene Dokumente, sortiert nach Wirksamkeitsdatum (neueste zuerst). */
    documents: UserContractDocument[];
}

/**
 * Deckungsgrad je Vertragsart: erkannte Verhältnisse zuerst, danach die übrigen
 * Vertragsarten in fester Reihenfolge (für die Auswahl im Vertrags-Wizard).
 *
 * Archive-aware (SPEC employee-contract-archive, AC2): Archivierte Verhältnisse
 * erscheinen gar nicht, archivierte Dokumente zählen nicht mit — alle aktiven
 * Views (Karten-Badges, Kacheln, Wizard Schritt 1) filtern zentral hier.
 * Für Profile ohne Archiv-Felder ist das Ergebnis unverändert (AC9).
 */
export function getContractCoverage(profile: RelationshipProfile & Pick<UserProfile, 'contractDocuments' | 'archivedContractTypes'>): ContractTypeCoverage[] {
    const relationships = getActiveContractRelationships(profile);
    const primary = getPrimaryContractType(profile);
    const documents = filterActiveContracts(profile, profile.contractDocuments);
    const ordered: ContractType[] = [
        ...relationships,
        ...CONTRACT_TYPE_ORDER.filter(type => !relationships.includes(type) && isRelationshipActive(profile, type))
    ];

    return ordered.map(contractType => {
        const forType = documents
            .filter(document => document.contractType === contractType)
            .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));
        const amendments = forType.filter(document => document.documentKind === 'Änderungsvereinbarung').length;

        return {
            contractType,
            contracts: forType.length - amendments,
            amendments,
            total: forType.length,
            isPrimary: contractType === primary,
            isKnownRelationship: relationships.includes(contractType),
            documents: forType
        };
    });
}

/**
 * Reihenfolge für die Vorauswahl im Wizard, abhängig vom primären Verhältnis.
 * 'Minijob' wird bewusst NIEMALS automatisch vorgeschlagen: Ein Minijob ist ein
 * sozialversicherungspflichtiges Beschäftigungsverhältnis und muss eine
 * ausdrückliche Entscheidung des Vorstands bleiben.
 */
const SUGGESTION_ORDER: Record<ContractType, ContractType[]> = {
    'Ehrenamtlich': ['Ehrenamtspauschale', 'Übungsleiterpauschale'],
    'Ehrenamtspauschale': ['Übungsleiterpauschale', 'Ehrenamtlich'],
    'Übungsleiterpauschale': ['Ehrenamtspauschale', 'Ehrenamtlich'],
    'Minijob': ['Übungsleiterpauschale', 'Ehrenamtspauschale', 'Ehrenamtlich']
};

/**
 * Vorschlag für die Vorauswahl im Wizard.
 *
 * Bei einem neuen `Vertrag`:
 * 1. ein erkanntes Verhältnis, für das noch gar kein Dokument existiert,
 * 2. sonst eine zum primären Verhältnis passende Vertragsart ohne Vertrag,
 * 3. sonst das primäre Verhältnis selbst.
 *
 * Bei einer `Änderungsvereinbarung` kann nur ergänzt werden, was bereits existiert –
 * deshalb wird vorrangig das primäre Verhältnis mit Dokumenten vorgeschlagen.
 */
export function suggestContractType(
    profile: RelationshipProfile & Pick<UserProfile, 'contractDocuments' | 'archivedContractTypes'>,
    documentKind: DocumentKind = 'Vertrag'
): ContractType {
    const coverage = getContractCoverage(profile);
    const primary = getPrimaryContractType(profile);

    if (documentKind === 'Änderungsvereinbarung') {
        const primaryEntry = coverage.find(entry => entry.contractType === primary);
        if (primaryEntry && primaryEntry.total > 0) return primary;
        const anyCovered = coverage.find(entry => entry.total > 0);
        return anyCovered ? anyCovered.contractType : primary;
    }

    const openRelationship = coverage.find(entry => entry.isKnownRelationship && entry.total === 0);
    if (openRelationship) return openRelationship.contractType;

    const openSuggestion = SUGGESTION_ORDER[primary].find(type => {
        const entry = coverage.find(candidate => candidate.contractType === type);
        return !!entry && entry.contracts === 0;
    });
    if (openSuggestion) return openSuggestion;

    return primary;
}

/** Vereinigungsmenge der Verhältnisse – das primäre Verhältnis bleibt unangetastet. */
export function mergeContractTypes(existing: ContractType[] | undefined, added: ContractType): ContractType[] {
    const merged: ContractType[] = [...(existing ?? [])];
    if (added && !merged.includes(added)) {
        merged.push(added);
    }
    return merged;
}

/** Bezieht sich das Dokument auf das abrechnungsrelevante (primäre) Verhältnis? */
export function isPrimaryContractDocument(profile: RelationshipProfile | null | undefined, selectedType: ContractType): boolean {
    return selectedType === getPrimaryContractType(profile);
}

/**
 * Der Abrechnungsbeleg (`contractDocumentUrl`) darf nur aktualisiert werden, wenn
 * ein Vertrag des primären Verhältnisses neu erzeugt wurde. Bei Zusatzverträgen
 * und bei Änderungsvereinbarungen bleibt der bisherige Beleg stehen.
 */
export function shouldUpdatePrimaryDocumentUrl(
    profile: RelationshipProfile | null | undefined,
    selectedType: ContractType,
    documentKind: DocumentKind
): boolean {
    return isPrimaryContractDocument(profile, selectedType) && documentKind === 'Vertrag';
}

/** Formularwerte des Vertrags-Wizards (Schritt 2). */
export interface ContractFormValues {
    documentKind: DocumentKind;
    startDate: string; // ISO "JJJJ-MM-TT"
    weeklyHours: number;
    monthlyHours: number;
    hourlyRate: number;
    lumpSumAmount: number;
    activityDescription: string;
    tasksDescription: string;
    birthDate: string;
    /** Nur relevant, wenn die Maske Urlaubstage erfasst (aktuell im Benutzer-Formular). */
    vacationDaysPerYear?: number;
}

/**
 * Erzeugt den Historieneintrag für ein generiertes Dokument.
 * Die Parameter eines Nicht-Primär-Vertrags leben ausschließlich hier.
 */
export function buildContractDocument(params: {
    selectedType: ContractType;
    isPrimary: boolean;
    documentUrl: string;
    form: ContractFormValues;
}, now: Date = new Date()): UserContractDocument {
    const { selectedType, isPrimary, documentUrl, form } = params;
    const germanDate = formatIsoToGermanDate(form.startDate);

    return {
        id: `doc_${now.getTime()}`,
        documentKind: form.documentKind,
        contractType: selectedType,
        title: form.documentKind === 'Änderungsvereinbarung' ? `Änderung (${germanDate})` : `Vertrag (${germanDate})`,
        url: documentUrl,
        createdAt: now.toISOString(),
        effectiveDate: form.startDate,
        primary: isPrimary,
        ...(form.monthlyHours ? { monthlyHours: form.monthlyHours } : {}),
        ...(form.weeklyHours ? { weeklyHours: form.weeklyHours } : {}),
        ...(form.hourlyRate ? { hourlyRate: form.hourlyRate } : {}),
        ...(form.lumpSumAmount ? { lumpSumAmount: form.lumpSumAmount } : {}),
        ...(form.activityDescription ? { activityDescription: form.activityDescription } : {}),
        ...(form.tasksDescription ? { tasksDescription: form.tasksDescription } : {})
    };
}

/**
 * Historie eines Profils: Altprofile, die nur `contractDocumentUrl` besitzen,
 * bekommen beim ersten Generieren einen Ursprungseintrag – sonst wäre die
 * Gruppe je Vertragsart unvollständig.
 */
export function ensureContractHistory(
    profile: Pick<UserProfile, 'id' | 'contractDocuments' | 'contractDocumentUrl' | 'contractType' | 'entryDate' | 'monthlyHours' | 'weeklyHours' | 'hourlyRate'>
): UserContractDocument[] {
    const history: UserContractDocument[] = [...(profile.contractDocuments ?? [])];
    if (history.length === 0 && profile.contractDocumentUrl) {
        history.push({
            id: `doc_initial_${profile.id}`,
            documentKind: 'Vertrag',
            contractType: getPrimaryContractType(profile),
            title: "Vertrag (Ursprung)",
            url: profile.contractDocumentUrl,
            createdAt: profile.entryDate || new Date().toISOString(),
            effectiveDate: profile.entryDate || "",
            primary: true,
            ...(profile.monthlyHours ? { monthlyHours: profile.monthlyHours } : {}),
            ...(profile.weeklyHours ? { weeklyHours: profile.weeklyHours } : {}),
            ...(profile.hourlyRate ? { hourlyRate: profile.hourlyRate } : {})
        });
    }
    return history;
}

/** Eine Zeile der Dokumentenliste je Rechtsverhältnis (read-only-Ansicht). */
export interface ContractDocumentRow {
    id: string;
    documentKind: DocumentKind;
    /** Wirksamkeitsdatum als "TT.MM.JJJJ"; leer, wenn keines bekannt ist. */
    effectiveDateLabel: string;
    url: string;
    title: string;
}

/** Eine Kachel je Rechtsverhältnis in der Benutzeransicht. */
export interface ContractOverviewRow {
    contractType: ContractType;
    isPrimary: boolean;
    documents: ContractDocumentRow[];
}

/**
 * Wirksamkeitsdatum eines Dokuments in deutscher Schreibweise.
 * Fehlt `effectiveDate`, fällt die Anzeige auf das Erstellungsdatum zurück;
 * ist beides unbekannt, bleibt das Label leer – die UI erfindet keine Daten.
 */
export function contractDocumentDateLabel(document: UserContractDocument): string {
    if (document.effectiveDate) return formatIsoToGermanDate(document.effectiveDate);
    return formatIsoToGermanDate(document.createdAt.slice(0, 10));
}

/**
 * Read-only-Übersicht "Verträge" für die Benutzerkarte: je Rechtsverhältnis
 * eine Zeile mit Art, Primär-Kennzeichnung und den hinterlegten Dokumenten
 * (Ursprungsvertrag und Änderungsvereinbarungen) inkl. Datum und PDF-Link.
 * Altprofile ohne Historie werden über `ensureContractHistory` einbezogen.
 * Verhältnisse ohne Dokument tauchen nicht auf – die Karte zeigt nur, was
 * wirklich hinterlegt ist; der leere Zustand ("Kein Vertrag hinterlegt")
 * bleibt der UI überlassen.
 *
 * Archive-aware (AC2): archivierte Verhältnisse und archivierte Dokumente
 * erscheinen nicht (auch der synthetische Ursprungseintrag aus
 * `contractDocumentUrl` wird bei archiviertem Primär-Verhältnis ausgeblendet).
 */
export function buildContractOverviewRows(
    profile: RelationshipProfile & Pick<UserProfile, 'id' | 'contractDocuments' | 'contractDocumentUrl' | 'entryDate' | 'monthlyHours' | 'weeklyHours' | 'hourlyRate' | 'archivedContractTypes'>
): ContractOverviewRow[] {
    const documents = filterActiveContracts(profile, ensureContractHistory(profile));
    return getContractCoverage(profile)
        .map(entry => ({
            contractType: entry.contractType,
            isPrimary: entry.isPrimary,
            documents: documents
                .filter(document => document.contractType === entry.contractType)
                .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''))
                .map(document => ({
                    id: document.id,
                    documentKind: document.documentKind,
                    effectiveDateLabel: contractDocumentDateLabel(document),
                    url: document.url,
                    title: document.title
                }))
        }))
        .filter(row => row.documents.length > 0);
}

/**
 * Berechnet, was nach dem Generieren auf das Benutzer-Profil geschrieben wird.
 *
 * Zentrale Schutzregel: Abrechnungsrelevante Profilfelder (`entryDate`,
 * `hourlyRate`, `weeklyHours`, `monthlyHours`, `vacationDaysPerYear`) sowie
 * `activityDescription`/`tasksDescription` werden NUR aktualisiert, wenn das
 * Dokument das primäre Verhältnis betrifft. Ein Zusatzvertrag (z. B. ein
 * Übungsleitervertrag für eine Minijobberin) darf die Gehaltsbasis des Minijobs
 * nicht überschreiben – das wäre ein Zahlungsfehler.
 */
export function buildContractProfileUpdate(params: {
    profile: UserProfile;
    selectedType: ContractType;
    documentUrl: string;
    form: ContractFormValues;
    document: UserContractDocument;
}): Partial<UserProfile> {
    const { profile, selectedType, documentUrl, form, document } = params;
    const isPrimary = isPrimaryContractDocument(profile, selectedType);

    const patch: Partial<UserProfile> = {
        contractDocuments: [...ensureContractHistory(profile), document],
        contractTypes: mergeContractTypes(getContractRelationships(profile), selectedType)
    };

    // Das Geburtsdatum gehört zur Person, nicht zu einem einzelnen Rechtsverhältnis.
    if (form.birthDate) {
        patch.birthDate = form.birthDate;
    }

    if (shouldUpdatePrimaryDocumentUrl(profile, selectedType, form.documentKind)) {
        patch.contractDocumentUrl = documentUrl;
    }

    if (isPrimary) {
        patch.entryDate = form.documentKind === 'Änderungsvereinbarung'
            ? (profile.entryDate || form.startDate)
            : form.startDate;
        if (form.hourlyRate) patch.hourlyRate = form.hourlyRate;
        if (form.monthlyHours) patch.monthlyHours = form.monthlyHours;
        if (form.weeklyHours) patch.weeklyHours = form.weeklyHours;
        if (form.activityDescription) patch.activityDescription = form.activityDescription;
        if (form.tasksDescription) patch.tasksDescription = form.tasksDescription;
        if (form.vacationDaysPerYear !== undefined) patch.vacationDaysPerYear = form.vacationDaysPerYear;
    }

    return patch;
}
