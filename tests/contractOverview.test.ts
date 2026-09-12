import { describe, it, expect } from "./test-framework";
import { buildContractOverviewRows, contractDocumentDateLabel } from "@/lib/contracts/relationships";
import { UserContractDocument, UserProfile } from "@/types";

/* Read-only-Übersicht "Verträge" für die Benutzerkarte (Settings → Benutzer).
   Die Karte darf nur zeigen, was wirklich hinterlegt ist – kein Fake-UI. */
describe("Benutzeransicht: Vertrags-Übersicht (read-only)", () => {
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
        id: "user_jk",
        firstName: "Jessica",
        lastName: "Koslowsky",
        role: "Mitarbeiter",
        contractType: "Minijob",
        entryDate: "2025-03-01",
        address: { street: "Musterweg 1", zipCode: "58553", city: "Halver" },
        bankDetails: { iban: "", bic: "", accountHolder: "" },
        createdAt: new Date("2025-03-01T00:00:00.000Z"),
        ...over
    });

    it("listet je Verhältnis eine Zeile mit Primär-Kennzeichnung und Dokumenten", () => {
        const profile = baseProfile({
            contractTypes: ["Minijob", "Übungsleiterpauschale"],
            contractDocuments: [
                contractDoc(),
                contractDoc({
                    id: "doc_uebel",
                    documentKind: "Vertrag",
                    contractType: "Übungsleiterpauschale",
                    title: "Vertrag (01.09.2026)",
                    url: "https://example.test/uebel.pdf",
                    createdAt: "2026-09-01T00:00:00.000Z",
                    effectiveDate: "2026-09-01",
                    primary: false
                })
            ]
        });

        const rows = buildContractOverviewRows(profile);
        expect(rows.length).toBe(2);
        expect(rows[0].contractType).toBe("Minijob");
        expect(rows[0].isPrimary).toBe(true);
        expect(rows[0].documents.length).toBe(1);
        expect(rows[0].documents[0].url).toBe("https://example.test/minijob.pdf");
        expect(rows[1].contractType).toBe("Übungsleiterpauschale");
        expect(rows[1].isPrimary).toBe(false);
    });

    it("sortiert Änderungsvereinbarungen nach Wirksamkeitsdatum (neueste zuerst)", () => {
        const profile = baseProfile({
            contractDocuments: [
                contractDoc(),
                contractDoc({
                    id: "doc_aend_alt",
                    documentKind: "Änderungsvereinbarung",
                    title: "Änderung (01.01.2026)",
                    url: "https://example.test/a1.pdf",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    effectiveDate: "2026-01-01"
                }),
                contractDoc({
                    id: "doc_aend_neu",
                    documentKind: "Änderungsvereinbarung",
                    title: "Änderung (01.10.2026)",
                    url: "https://example.test/a2.pdf",
                    createdAt: "2026-10-01T00:00:00.000Z",
                    effectiveDate: "2026-10-01"
                })
            ]
        });

        const rows = buildContractOverviewRows(profile);
        expect(rows.length).toBe(1);
        expect(rows[0].documents.map(d => d.id)).toEqual(["doc_aend_neu", "doc_aend_alt", "doc_minijob"]);
        expect(rows[0].documents[0].effectiveDateLabel).toBe("01.10.2026");
    });

    it("zeigt Verhältnisse ohne hinterlegtes Dokument nicht an", () => {
        const profile = baseProfile({
            contractTypes: ["Minijob", "Ehrenamtspauschale"],
            contractDocuments: [contractDoc()]
        });

        const rows = buildContractOverviewRows(profile);
        expect(rows.length).toBe(1);
        expect(rows[0].contractType).toBe("Minijob");
    });

    it("liefert für ein Profil ohne Dokumente keine Zeilen (leerer Zustand der Karte)", () => {
        const rows = buildContractOverviewRows(baseProfile({
            contractDocumentUrl: undefined,
            contractDocuments: undefined
        }));
        expect(rows.length).toBe(0);
    });

    it("bezieht Altprofile ohne Historie über contractDocumentUrl ein", () => {
        const profile = baseProfile({
            contractDocuments: undefined,
            contractDocumentUrl: "https://example.test/legacy.pdf"
        });

        const rows = buildContractOverviewRows(profile);
        expect(rows.length).toBe(1);
        expect(rows[0].isPrimary).toBe(true);
        expect(rows[0].documents.length).toBe(1);
        expect(rows[0].documents[0].url).toBe("https://example.test/legacy.pdf");
        expect(rows[0].documents[0].documentKind).toBe("Vertrag");
    });

    it("zeigt das Wirksamkeitsdatum deutsch, sonst das Erstellungsdatum, sonst nichts", () => {
        expect(contractDocumentDateLabel(contractDoc({ effectiveDate: "2026-09-01" }))).toBe("01.09.2026");
        expect(contractDocumentDateLabel(contractDoc({
            effectiveDate: "",
            createdAt: "2026-08-15T08:30:00.000Z"
        }))).toBe("15.08.2026");
        expect(contractDocumentDateLabel(contractDoc({ effectiveDate: "", createdAt: "" }))).toBe("");
    });
});
