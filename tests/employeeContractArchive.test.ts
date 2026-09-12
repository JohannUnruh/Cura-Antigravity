import { describe, it, expect } from "./test-framework";
import {
    buildArchiveContractEntries,
    buildArchiveDocumentPatch,
    buildArchiveRelationshipPatch,
    buildArchiveUserPatch,
    buildRestoreDocumentPatch,
    buildRestoreRelationshipPatch,
    buildRestoreUserPatch,
    canManageUserArchive,
    filterActiveContracts,
    filterActiveUsers,
    isDocumentActive,
    isRelationshipActive,
    isUserArchived
} from "@/lib/contracts/archive";
import {
    buildContractOverviewRows,
    getActiveContractRelationships,
    getContractCoverage,
    getContractRelationships,
    suggestContractType
} from "@/lib/contracts/relationships";
import { UserContractDocument, UserProfile } from "@/types";

/* Archiv statt Löschen (SPEC employee-contract-archive, W4):
   Alle Archiv-Felder sind optional — fehlende Felder bedeuten „aktiv" (AC9
   Lazy Migration). Archivieren schreibt ausschließlich Flag-Felder und darf
   die Abrechnungs-Schutzzone (contractType, contractTypes, contractDocumentUrl,
   entryDate, Stunden, Sätze) niemals berühren. Feste Daten stehen hier nur als
   Test-Fixtures (im Produktcode verboten). */

const ARCHIVE_TIME = new Date("2026-09-12T10:00:00.000Z"); // Fixture-Referenzzeit
const ADMIN_UID = "admin_uid_1";
const OTHER_UID = "user_uid_2";

const contractDoc = (over: Partial<UserContractDocument> = {}): UserContractDocument => ({
    id: "doc_minijob",
    documentKind: "Vertrag",
    contractType: "Minijob",
    title: "Vertrag (01.03.2025)",
    url: "https://example.test/minijob.pdf",
    createdAt: "2025-03-01T00:00:00.000Z",
    effectiveDate: "2025-03-01",
    primary: true,
    ...over
});

const baseProfile = (over: Partial<UserProfile> = {}): UserProfile => ({
    id: "user_mm",
    firstName: "Max",
    lastName: "Mustermann",
    role: "Mitarbeiter",
    contractType: "Minijob",
    contractTypes: ["Minijob", "Übungsleiterpauschale"],
    entryDate: "2025-03-01",
    hourlyRate: 16.75,
    monthlyHours: 36,
    address: { street: "Musterweg 1", zipCode: "58553", city: "Halver" },
    bankDetails: { iban: "DE00", bic: "BIC", accountHolder: "Max Mustermann" },
    createdAt: new Date("2025-03-01T00:00:00.000Z"),
    contractDocuments: [
        contractDoc(),
        contractDoc({
            id: "doc_uebel",
            documentKind: "Vertrag",
            contractType: "Übungsleiterpauschale",
            title: "Vertrag (01.09.2025)",
            url: "https://example.test/uebel.pdf",
            createdAt: "2025-09-01T00:00:00.000Z",
            effectiveDate: "2025-09-01",
            primary: false
        })
    ],
    ...over
});

const applyPatch = (profile: UserProfile, patch: Partial<UserProfile>): UserProfile => ({ ...profile, ...patch });

/** Profil ohne Archiv-Metadaten — für den Vergleich „Restore = Vorzustand". */
const withoutArchiveFields = (profile: UserProfile): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...profile };
    delete copy.status;
    delete copy.archivedAt;
    delete copy.archivedBy;
    delete copy.archivedContractTypes;
    return copy;
};

const BILLING_FIELDS = [
    'contractType', 'contractTypes', 'contractDocumentUrl', 'entryDate',
    'hourlyRate', 'weeklyHours', 'monthlyHours', 'vacationDaysPerYear'
] as const;

describe("Archiv: Lazy Migration — fehlende Felder bedeuten aktiv (AC9)", () => {
    it("behandelt Profile ohne status als aktiv", () => {
        expect(isUserArchived(baseProfile())).toBe(false);
        expect(isUserArchived(baseProfile({ status: 'aktiv' }))).toBe(false);
        expect(isUserArchived(baseProfile({ status: 'archiviert' }))).toBe(true);
        expect(isUserArchived(null)).toBe(false);
        expect(isUserArchived(undefined)).toBe(false);
    });

    it("behandelt Profile ohne archivedContractTypes als vollständig aktiv", () => {
        const profile = baseProfile();
        expect(isRelationshipActive(profile, 'Minijob')).toBe(true);
        expect(isRelationshipActive(profile, 'Übungsleiterpauschale')).toBe(true);
        expect(getActiveContractRelationships(profile)).toEqual(['Minijob', 'Übungsleiterpauschale']);
        expect(filterActiveContracts(profile, profile.contractDocuments).length).toBe(2);
    });

    it("behandelt Dokumente ohne archivedAt (und mit null) als aktiv", () => {
        expect(isDocumentActive(contractDoc())).toBe(true);
        expect(isDocumentActive(contractDoc({ archivedAt: null }))).toBe(true);
        expect(isDocumentActive(contractDoc({ archivedAt: "2026-09-12T10:00:00.000Z" }))).toBe(false);
    });

    it("lässt Coverage und Übersichtszeilen für Altprofile unverändert", () => {
        const profile = baseProfile();
        const coverage = getContractCoverage(profile);
        // Reihenfolge: erkannte Verhältnisse zuerst, dann feste Reihenfolge
        expect(coverage.map(e => e.contractType)).toEqual(
            ['Minijob', 'Übungsleiterpauschale', 'Ehrenamtlich', 'Ehrenamtspauschale']
        );
        expect(coverage[0].total).toBe(1);
        expect(coverage[0].isPrimary).toBe(true);
        expect(coverage[1].isKnownRelationship).toBe(true);

        const rows = buildContractOverviewRows(profile);
        expect(rows.length).toBe(2);
        expect(rows[0].contractType).toBe('Minijob');
        expect(rows[1].contractType).toBe('Übungsleiterpauschale');
    });
});

describe("Archiv: Mitarbeiter-Ebene (D2)", () => {
    it("filtert archivierte Benutzer aus aktiven Listen", () => {
        const active = baseProfile({ id: "u_active" });
        const archived = applyPatch(baseProfile({ id: "u_archived" }), buildArchiveUserPatch(ADMIN_UID, ARCHIVE_TIME));
        const visible = filterActiveUsers([active, archived]);
        expect(visible.length).toBe(1);
        expect(visible[0].id).toBe("u_active");
    });

    it("Archiv-Patch setzt nur status/archivedAt/archivedBy — keine Abrechnungsfelder", () => {
        const patch = buildArchiveUserPatch(ADMIN_UID, ARCHIVE_TIME);
        expect(patch.status).toBe('archiviert');
        expect(patch.archivedAt).toBe("2026-09-12T10:00:00.000Z");
        expect(patch.archivedBy).toBe(ADMIN_UID);
        expect(Object.keys(patch).length).toBe(3);
        BILLING_FIELDS.forEach(field => expect(patch[field]).toBe(undefined));
    });

    it("Restore stellt den Vorzustand wieder her (AC5)", () => {
        const before = baseProfile();
        const archived = applyPatch(before, buildArchiveUserPatch(ADMIN_UID, ARCHIVE_TIME));
        expect(isUserArchived(archived)).toBe(true);

        const restored = applyPatch(archived, buildRestoreUserPatch());
        expect(isUserArchived(restored)).toBe(false);
        expect(restored.status).toBe('aktiv');
        expect(restored.archivedAt).toBe(null);
        // Alle fachlichen Felder sind bit-identisch zum Vorzustand
        expect(withoutArchiveFields(restored)).toEqual(withoutArchiveFields(before));
        expect(filterActiveUsers([restored]).length).toBe(1);
    });
});

describe("Archiv: Verhältnis-Ebene — kompletter Vertragsstrang (D4)", () => {
    it("Archiv-Patch schreibt nur archivedContractTypes (Schutzzone Abrechnung)", () => {
        const profile = baseProfile();
        const patch = buildArchiveRelationshipPatch(profile, 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME);
        expect(Object.keys(patch)).toEqual(['archivedContractTypes']);
        expect(patch.archivedContractTypes?.length).toBe(1);
        expect(patch.archivedContractTypes?.[0]).toEqual({
            contractType: 'Übungsleiterpauschale',
            archivedAt: "2026-09-12T10:00:00.000Z",
            archivedBy: ADMIN_UID
        });
        BILLING_FIELDS.forEach(field => expect(patch[field]).toBe(undefined));
    });

    it("archiviertes Verhältnis verschwindet aus Coverage, Kacheln und Dokumentfilter", () => {
        const archived = applyPatch(
            baseProfile(),
            buildArchiveRelationshipPatch(baseProfile(), 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME)
        );
        expect(isRelationshipActive(archived, 'Übungsleiterpauschale')).toBe(false);
        expect(isRelationshipActive(archived, 'Minijob')).toBe(true);
        expect(getActiveContractRelationships(archived)).toEqual(['Minijob']);

        // Schutzzone: getContractRelationships (für buildContractProfileUpdate) bleibt ungefiltert
        expect(getContractRelationships(archived)).toEqual(['Minijob', 'Übungsleiterpauschale']);

        const activeDocs = filterActiveContracts(archived, archived.contractDocuments);
        expect(activeDocs.length).toBe(1);
        expect(activeDocs[0].id).toBe("doc_minijob");

        const coverage = getContractCoverage(archived);
        expect(coverage.map(e => e.contractType)).toEqual(['Minijob', 'Ehrenamtlich', 'Ehrenamtspauschale']);
        expect(coverage.some(e => e.contractType === 'Übungsleiterpauschale')).toBe(false);

        const rows = buildContractOverviewRows(archived);
        expect(rows.length).toBe(1);
        expect(rows[0].contractType).toBe('Minijob');
    });

    it("Wizard-Vorschlag ignoriert archivierte Verhältnisse", () => {
        const archived = applyPatch(
            baseProfile(),
            buildArchiveRelationshipPatch(baseProfile(), 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME)
        );
        // SUGGESTION_ORDER['Minijob'] startet mit Übungsleiterpauschale — die ist
        // archiviert, also rückt die nächste aktive Vertragsart nach.
        expect(suggestContractType(archived, 'Vertrag')).toBe('Ehrenamtspauschale');
    });

    it("primäres Verhältnis archivierbar, ohne contractType umzuschreiben (Harte Regel 3)", () => {
        const profile = baseProfile();
        const archived = applyPatch(
            profile,
            buildArchiveRelationshipPatch(profile, 'Minijob', ADMIN_UID, ARCHIVE_TIME)
        );
        // Abrechnungsbasis bleibt unangetastet — nur die Anzeige filtert
        expect(archived.contractType).toBe('Minijob');
        expect(archived.contractTypes).toEqual(['Minijob', 'Übungsleiterpauschale']);
        expect(archived.entryDate).toBe('2025-03-01');
        expect(archived.hourlyRate).toBe(16.75);

        const rows = buildContractOverviewRows(archived);
        expect(rows.map(r => r.contractType)).toEqual(['Übungsleiterpauschale']);

        const entries = buildArchiveContractEntries(archived);
        expect(entries.length).toBe(1);
        expect(entries[0].level).toBe('Verhältnis');
        expect(entries[0].isPrimary).toBe(true);
        expect(entries[0].documentCount).toBe(1);
    });

    it("Archivierung ist idempotent (kein Doppeleintrag)", () => {
        const once = applyPatch(baseProfile(), buildArchiveRelationshipPatch(baseProfile(), 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME));
        const twice = applyPatch(once, buildArchiveRelationshipPatch(once, 'Übungsleiterpauschale', ADMIN_UID, new Date("2026-09-13T10:00:00.000Z")));
        expect(twice.archivedContractTypes?.length).toBe(1);
        // Ursprünglicher Zeitstempel bleibt stehen
        expect(twice.archivedContractTypes?.[0].archivedAt).toBe("2026-09-12T10:00:00.000Z");
    });

    it("Restore = exakter Vorzustand (AC5)", () => {
        const before = baseProfile();
        const archived = applyPatch(before, buildArchiveRelationshipPatch(before, 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME));
        const restored = applyPatch(archived, buildRestoreRelationshipPatch(archived, 'Übungsleiterpauschale'));

        expect(isRelationshipActive(restored, 'Übungsleiterpauschale')).toBe(true);
        expect(getContractCoverage(restored)).toEqual(getContractCoverage(before));
        expect(buildContractOverviewRows(restored)).toEqual(buildContractOverviewRows(before));
        expect(withoutArchiveFields(restored)).toEqual(withoutArchiveFields(before));
    });
});

describe("Archiv: Dokument-Ebene — Einzeldokument (D4/US2)", () => {
    const profileWithAmendment = (): UserProfile => baseProfile({
        contractDocuments: [
            contractDoc(),
            contractDoc({
                id: "doc_aenderung",
                documentKind: "Änderungsvereinbarung",
                contractType: "Minijob",
                title: "Änderung (01.06.2026)",
                url: "https://example.test/aenderung.pdf",
                createdAt: "2026-06-01T00:00:00.000Z",
                effectiveDate: "2026-06-01"
            }),
            contractDoc({
                id: "doc_uebel",
                documentKind: "Vertrag",
                contractType: "Übungsleiterpauschale",
                title: "Vertrag (01.09.2025)",
                url: "https://example.test/uebel.pdf",
                createdAt: "2025-09-01T00:00:00.000Z",
                effectiveDate: "2025-09-01",
                primary: false
            })
        ]
    });

    it("markiert genau ein Dokument und lässt die übrigen bit-identisch", () => {
        const before = profileWithAmendment();
        const patch = buildArchiveDocumentPatch(before, "doc_aenderung", ADMIN_UID, ARCHIVE_TIME);
        const docs = patch.contractDocuments ?? [];
        expect(docs.length).toBe(3);

        const target = docs.find(d => d.id === "doc_aenderung");
        expect(target?.archivedAt).toBe("2026-09-12T10:00:00.000Z");
        expect(target?.archivedBy).toBe(ADMIN_UID);

        const untouched = docs.filter(d => d.id !== "doc_aenderung");
        const originals = (before.contractDocuments ?? []).filter(d => d.id !== "doc_aenderung");
        expect(untouched).toEqual(originals);
        // Patch enthält ausschließlich contractDocuments — keine Abrechnungsfelder
        expect(Object.keys(patch)).toEqual(['contractDocuments']);
    });

    it("Rest des Verhältnisses bleibt aktiv (US2)", () => {
        const before = profileWithAmendment();
        const archived = applyPatch(before, buildArchiveDocumentPatch(before, "doc_aenderung", ADMIN_UID, ARCHIVE_TIME));

        expect(isRelationshipActive(archived, 'Minijob')).toBe(true);
        const activeDocs = filterActiveContracts(archived, archived.contractDocuments);
        expect(activeDocs.map(d => d.id)).toEqual(["doc_minijob", "doc_uebel"]);

        const coverage = getContractCoverage(archived);
        const minijob = coverage.find(e => e.contractType === 'Minijob');
        expect(minijob?.contracts).toBe(1);
        expect(minijob?.amendments).toBe(0);
        expect(minijob?.total).toBe(1);

        const rows = buildContractOverviewRows(archived);
        const minijobRow = rows.find(r => r.contractType === 'Minijob');
        expect(minijobRow?.documents.map(d => d.id)).toEqual(["doc_minijob"]);
    });

    it("Restore stellt das Dokument exakt wieder her (AC5)", () => {
        const before = profileWithAmendment();
        const archived = applyPatch(before, buildArchiveDocumentPatch(before, "doc_aenderung", ADMIN_UID, ARCHIVE_TIME));
        const restored = applyPatch(archived, buildRestoreDocumentPatch(archived, "doc_aenderung"));

        const doc = (restored.contractDocuments ?? []).find(d => d.id === "doc_aenderung");
        expect(isDocumentActive(doc)).toBe(true);
        // Bit-exakter Vorzustand: die Archiv-Keys werden komplett entfernt
        expect(doc).toEqual((before.contractDocuments ?? []).find(d => d.id === "doc_aenderung"));
        expect(getContractCoverage(restored)).toEqual(getContractCoverage(before));
        expect(buildContractOverviewRows(restored)).toEqual(buildContractOverviewRows(before));
    });

    it("Schichtung: einzeln archiviertes Dokument bleibt nach Verhältnis-Restore archiviert", () => {
        const before = profileWithAmendment();
        // 1. Dokument einzeln archivieren, 2. kompletten Strang archivieren
        const docArchived = applyPatch(before, buildArchiveDocumentPatch(before, "doc_aenderung", ADMIN_UID, ARCHIVE_TIME));
        const bothArchived = applyPatch(
            docArchived,
            buildArchiveRelationshipPatch(docArchived, 'Minijob', ADMIN_UID, ARCHIVE_TIME)
        );
        expect(filterActiveContracts(bothArchived, bothArchived.contractDocuments).map(d => d.id)).toEqual(["doc_uebel"]);

        const entries = buildArchiveContractEntries(bothArchived);
        expect(entries.length).toBe(2);
        expect(entries.some(e => e.level === 'Verhältnis' && e.contractType === 'Minijob')).toBe(true);
        expect(entries.some(e => e.level === 'Dokument' && e.documentId === 'doc_aenderung')).toBe(true);

        // Verhältnis wiederherstellen → das Einzeldokument bleibt archiviert
        const relRestored = applyPatch(bothArchived, buildRestoreRelationshipPatch(bothArchived, 'Minijob'));
        expect(filterActiveContracts(relRestored, relRestored.contractDocuments).map(d => d.id)).toEqual(["doc_minijob", "doc_uebel"]);

        // Dokument wiederherstellen → Vorzustand komplett erreicht
        const fullyRestored = applyPatch(relRestored, buildRestoreDocumentPatch(relRestored, "doc_aenderung"));
        expect(filterActiveContracts(fullyRestored, fullyRestored.contractDocuments).map(d => d.id))
            .toEqual(["doc_minijob", "doc_aenderung", "doc_uebel"]);
    });
});

describe("Archiv: Selbst-Sperr-Schutz (D5/AC6)", () => {
    it("verbietet Archiv-Aktionen am eigenen Account", () => {
        expect(canManageUserArchive(ADMIN_UID, ADMIN_UID)).toBe(false);
    });

    it("erlaubt Archiv-Aktionen an fremden Accounts", () => {
        expect(canManageUserArchive(ADMIN_UID, OTHER_UID)).toBe(true);
    });

    it("lehnt im Zweifel ab (fehlende/leere UIDs)", () => {
        expect(canManageUserArchive(undefined, OTHER_UID)).toBe(false);
        expect(canManageUserArchive(null, OTHER_UID)).toBe(false);
        expect(canManageUserArchive(ADMIN_UID, "")).toBe(false);
        expect(canManageUserArchive(ADMIN_UID, null)).toBe(false);
    });
});

describe("Archiv: Archiv-Tab-Daten (D3)", () => {
    it("liefert keine Einträge für ein nicht archiviertes Profil", () => {
        expect(buildArchiveContractEntries(baseProfile())).toEqual([]);
        expect(buildArchiveContractEntries(null)).toEqual([]);
        expect(buildArchiveContractEntries(undefined)).toEqual([]);
    });

    it("beschreibt Verhältnis- und Dokument-Einträge mit Datum, Urheber und Primär-Hinweis", () => {
        const before = baseProfile();
        const archived = applyPatch(before, buildArchiveRelationshipPatch(before, 'Übungsleiterpauschale', ADMIN_UID, ARCHIVE_TIME));
        const entries = buildArchiveContractEntries(archived);
        expect(entries.length).toBe(1);
        expect(entries[0]).toEqual({
            userId: "user_mm",
            contractType: "Übungsleiterpauschale",
            level: "Verhältnis",
            label: "Übungsleiterpauschale",
            archivedAt: "2026-09-12T10:00:00.000Z",
            archivedBy: ADMIN_UID,
            isPrimary: false,
            documentCount: 1
        });
    });
});
