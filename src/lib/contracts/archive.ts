import { ContractType, UserContractDocument, UserProfile } from "@/types";

/**
 * Reine Archiv-Logik für Mitarbeiter und Verträge (SPEC employee-contract-archive).
 *
 * Leitprinzip (D1): Archivieren ist ein umkehrbares Flag, niemals ein Datenumbau.
 * Alle Archiv-Felder sind optional; fehlende Felder bedeuten „aktiv" (AC9 Lazy
 * Migration – es findet keine Datenmigration an lebenden Profilen statt).
 *
 * Drei Archiv-Ebenen:
 *  - Mitarbeiter:  `UserProfile.status === 'archiviert'` (D2 – Login entzogen,
 *                  aus allen aktiven Listen gefiltert; Seelsorge-Daten bleiben
 *                  unangetastet, AC7)
 *  - Verhältnis:   Eintrag in `UserProfile.archivedContractTypes` (D4 – kompletter
 *                  Vertragsstrang einer Art; `contractType`/`contractTypes` und alle
 *                  Abrechnungsfelder werden dabei NIE umgeschrieben)
 *  - Dokument:     `UserContractDocument.archivedAt` (D4 – einzelne Änderungs-
 *                  vereinbarung bzw. einzelner Vertrag)
 *
 * Alle Funktionen sind rein (kein React, kein Firestore) und damit direkt testbar
 * (`tests/employeeContractArchive.test.ts`) — Muster: `dataScope.ts`, `relationships.ts`.
 */

/** Profil-Ausschnitt für die Verhältnis-Prüfung. */
type RelationshipArchiveProfile = Pick<UserProfile, 'archivedContractTypes'>;

/** Dokumenten-Ausschnitt für die Dokument-Prüfung. */
type DocumentArchiveFields = Pick<UserContractDocument, 'archivedAt'>;

// ─────────────────────────────────────────────────────────────────────────────
// Prädikate
// ─────────────────────────────────────────────────────────────────────────────

/** Ist das Benutzerkonto archiviert? Fehlender Status = aktiv (AC9). */
export function isUserArchived(profile?: Pick<UserProfile, 'status'> | null): boolean {
    return profile?.status === 'archiviert';
}

/** Aktive Benutzer für alle aktiven Ansichten (Benutzerliste, Zuordnungen). */
export function filterActiveUsers(users: UserProfile[] | null | undefined): UserProfile[] {
    return (users ?? []).filter(user => !isUserArchived(user));
}

/**
 * Ist ein Rechtsverhältnis (Vertragsstrang einer Art) aktiv?
 * Aktiv = nicht in `archivedContractTypes` enthalten (fehlendes Feld = aktiv).
 */
export function isRelationshipActive(
    profile: RelationshipArchiveProfile | null | undefined,
    contractType: ContractType
): boolean {
    return !(profile?.archivedContractTypes ?? []).some(entry => entry?.contractType === contractType);
}

/** Ist ein einzelnes Vertragsdokument aktiv? Fehlendes `archivedAt` = aktiv (AC9). */
export function isDocumentActive(document: DocumentArchiveFields | null | undefined): boolean {
    return !document?.archivedAt;
}

/**
 * Aktive Dokumente eines Profils über BEIDE Ebenen:
 * das Dokument selbst nicht archiviert UND sein Rechtsverhältnis aktiv.
 * (Verhältnis-Archivierung markiert die Dokumente nicht einzeln — Restore des
 * Verhältnisses stellt deshalb automatisch den exakten Vorzustand her, AC5.)
 */
export function filterActiveContracts(
    profile: RelationshipArchiveProfile | null | undefined,
    documents: UserContractDocument[] | null | undefined
): UserContractDocument[] {
    return (documents ?? []).filter(document =>
        isDocumentActive(document) && isRelationshipActive(profile, document.contractType)
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patch-Builder (rein — der Firestore-Write passiert im Service)
//
// Schutzzone Abrechnung: KEIN Patch schreibt contractType, contractTypes,
// contractDocumentUrl, entryDate, hourlyRate, weeklyHours, monthlyHours oder
// vacationDaysPerYear. Archivieren filtert nur die Anzeige (ARCHITECTURE.md §2).
// ─────────────────────────────────────────────────────────────────────────────

/** Archiv-Patch für ein Benutzerkonto (D2). */
export function buildArchiveUserPatch(adminUid: string, now: Date = new Date()): Partial<UserProfile> {
    return {
        status: 'archiviert',
        archivedAt: now.toISOString(),
        archivedBy: adminUid
    };
}

/**
 * Restore-Patch für ein Benutzerkonto (AC5).
 * Bewusst `status: 'aktiv'` + `null` statt `deleteField()`: AC1 verbietet
 * Lösch-Sentinels an users, und die Prädikate behandeln null/'aktiv' als Vorzustand.
 */
export function buildRestoreUserPatch(): Partial<UserProfile> {
    return {
        status: 'aktiv',
        archivedAt: null,
        archivedBy: null
    };
}

/** Archiv-Patch für ein komplettes Rechtsverhältnis (D4, Sammel-Ebene). */
export function buildArchiveRelationshipPatch(
    profile: RelationshipArchiveProfile | null | undefined,
    contractType: ContractType,
    adminUid: string,
    now: Date = new Date()
): Partial<UserProfile> {
    const existing = profile?.archivedContractTypes ?? [];
    if (existing.some(entry => entry?.contractType === contractType)) {
        return { archivedContractTypes: [...existing] }; // idempotent: bereits archiviert
    }
    return {
        archivedContractTypes: [
            ...existing,
            { contractType, archivedAt: now.toISOString(), archivedBy: adminUid }
        ]
    };
}

/** Restore-Patch für ein Rechtsverhältnis: exakter Vorzustand = Eintrag entfernt (AC5). */
export function buildRestoreRelationshipPatch(
    profile: RelationshipArchiveProfile | null | undefined,
    contractType: ContractType
): Partial<UserProfile> {
    return {
        archivedContractTypes: (profile?.archivedContractTypes ?? [])
            .filter(entry => entry?.contractType !== contractType)
    };
}

/**
 * Archiv-Patch für ein einzelnes Dokument (D4, Dokument-Ebene).
 * Firestore kann Array-Elemente nicht einzeln mergen — das komplette
 * `contractDocuments`-Array wird mit dem markierten Dokument neu geschrieben.
 * Alle anderen Dokumente (und alle übrigen Profilfelder) bleiben unberührt.
 */
export function buildArchiveDocumentPatch(
    profile: Pick<UserProfile, 'contractDocuments'> | null | undefined,
    documentId: string,
    adminUid: string,
    now: Date = new Date()
): Partial<UserProfile> {
    const documents = profile?.contractDocuments ?? [];
    return {
        contractDocuments: documents.map(document =>
            document.id === documentId
                ? { ...document, archivedAt: now.toISOString(), archivedBy: adminUid }
                : document
        )
    };
}

/**
 * Restore-Patch für ein einzelnes Dokument (AC5: bit-exakter Vorzustand).
 * Da das komplette `contractDocuments`-Array neu geschrieben wird (ersetzt das
 * Array in Firestore vollständig), werden die Archiv-Keys hier entfernt statt
 * auf null gesetzt — das Dokument ist danach byte-identisch zum Vorzustand.
 * (`deleteField()` bleibt tabu, AC1; auf Top-Level-Feldern des Benutzerdokuments
 * wäre Key-Entfernen nicht möglich — dort gilt die null/'aktiv'-Semantik.)
 */
export function buildRestoreDocumentPatch(
    profile: Pick<UserProfile, 'contractDocuments'> | null | undefined,
    documentId: string
): Partial<UserProfile> {
    const documents = profile?.contractDocuments ?? [];
    return {
        contractDocuments: documents.map(document => {
            if (document.id !== documentId) return document;
            const restored: UserContractDocument = { ...document };
            delete restored.archivedAt;
            delete restored.archivedBy;
            return restored;
        })
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Selbst-Sperr-Schutz (D5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Darf `currentUid` den Account `targetUserId` archivieren/wiederherstellen?
 * Der eigene Account ist gesperrt (Self-Lockout, Muster Rollen-Guard 04.09.);
 * ohne gültige UIDs wird im Zweifel abgelehnt. Admin-Prüfung erfolgt zusätzlich
 * in UI (Tab nur für Admin) und Rules (`isAdmin() && uid != request.auth.uid`).
 */
export function canManageUserArchive(currentUid: string | undefined | null, targetUserId: string | undefined | null): boolean {
    if (!currentUid || !targetUserId) return false;
    return currentUid !== targetUserId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Archiv-Tab-Daten (D3)
// ─────────────────────────────────────────────────────────────────────────────

/** Ein Eintrag im Archiv-Tab, Bereich „Verträge". */
export interface ArchiveContractEntry {
    userId: string;
    contractType: ContractType;
    /** Archiv-Ebene: kompletter Vertragsstrang oder Einzeldokument. */
    level: 'Verhältnis' | 'Dokument';
    /** Anzeigetext: Vertragsart bzw. Dokumenttitel. */
    label: string;
    /** Nur bei level 'Dokument': ID des archivierten Dokuments. */
    documentId?: string;
    archivedAt?: string; // ISO 8601
    archivedBy?: string; // Admin-UID
    /**
     * Nur Anzeige-Hinweis (Schutzzone Abrechnung): das Verhältnis ist/war das
     * primäre (`contractType` des Profils bleibt unverändert, bis der Admin es
     * in der Benutzer-Bearbeitung explizit ändert).
     */
    isPrimary: boolean;
    /** Bei level 'Verhältnis': Anzahl Dokumente im archivierten Strang. */
    documentCount: number;
}

/**
 * Alle archivierten Vertrags-Elemente eines Profils für den Archiv-Tab:
 * je archiviertes Verhältnis ein Eintrag (inkl. Dokumentenzahl) und je einzeln
 * archiviertes Dokument ein eigener Eintrag — unabhängig voneinander restore-bar.
 */
export function buildArchiveContractEntries(
    profile: Pick<UserProfile, 'id' | 'contractType' | 'contractDocuments' | 'archivedContractTypes'> | null | undefined
): ArchiveContractEntry[] {
    if (!profile) return [];
    const documents = profile.contractDocuments ?? [];
    const entries: ArchiveContractEntry[] = [];

    (profile.archivedContractTypes ?? []).forEach(archived => {
        if (!archived?.contractType) return;
        entries.push({
            userId: profile.id,
            contractType: archived.contractType,
            level: 'Verhältnis',
            label: archived.contractType,
            archivedAt: archived.archivedAt,
            archivedBy: archived.archivedBy,
            isPrimary: archived.contractType === profile.contractType,
            documentCount: documents.filter(document => document.contractType === archived.contractType).length
        });
    });

    documents.forEach(document => {
        if (!document.archivedAt) return;
        entries.push({
            userId: profile.id,
            contractType: document.contractType,
            level: 'Dokument',
            label: document.title,
            documentId: document.id,
            archivedAt: document.archivedAt,
            archivedBy: document.archivedBy ?? undefined,
            isPrimary: document.contractType === profile.contractType,
            documentCount: 1
        });
    });

    return entries;
}
