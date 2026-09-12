# 📐 SPEC: Vertrags- und Mitarbeiter-Archiv statt Löschen (Cura / ZeFabiKo)

**Status:** Abgenommen durch Johann (12.09.2026: „alle wie empfohlen") · **Datum:** 12.09.2026
**Repo:** `C:\USE-Dev\projects\active\zefabiko-cura` (Firebase-Projekt `cura-ant`, Region `europe-west3`)
**Vorgeschichte:** Cura-Gegencheck 12.09.2026 — Johann wollte einen Testvertrag nicht löschen können; Feature-Wunsch **W4**. Umsetzung nach Block 1+2 (W1–W3, Branch `feature/contract-pdf-header-user-details`). Wandert nach Merge-Vorbereitung ins Repo: `docs/features/employee-contract-archive/`.

---

## 1. Problemstellung

Verträge und Rechtsverhältnisse können in Cura angelegt, aber **nicht zurückgebaut** werden. Gelöschte Mitarbeiter gibt es im Datenmodell nicht — ein Austrag würde einen harten Delete bedeuten, was doppelt falsch ist: Arbeitsvertragsunterlagen unterliegen der **6-jährigen Aufbewahrungspflicht** (§ 257 HGB, § 147 AO), und die Seelsorge-Daten des Mitarbeiters dürfen von einer Personal-Aktion gar nicht berührt werden.

**Gewünschter Zustand:** Alles, was „weg" soll, wird **archiviert** — reversibel, admin-einsehbar, aus allen aktiven Ansichten gefiltert. **Hartes Löschen existiert nirgends.**

## 2. Fachentscheidungen (Johann, 12.09.2026)

| # | Entscheidung |
|---|---|
| **D1** | **Nur Archiv, kein harter Delete** — Aufbewahrungspflicht (6 Jahre) geht vor; Wiederherstellen ist der einzige Rückweg |
| **D2** | Archivierte Mitarbeiter: Login wird entzogen, verschwinden aus allen aktiven Auswahllisten; **Seelsorge-Daten (Klientenbezüge, Einträge) bleiben unangetastet** |
| **D3** | Archiv-UI: neuer Tab **„Archiv"** in den Einstellungen, **nur für Admin**, mit Bereichen *Mitarbeiter* und *Verträge*, je Eintrag Wiederherstellen |
| **D4** | Archivierbarkeit **pro Dokument** (einzelne Änderungsvereinbarung) **und pro Verhältnis** (kompletter Vertragsstrang einer Art, Sammel-Aktion) |
| **D5** | Archivieren/Wiederherstellen darf **nur der Admin** — mit Selbst-Sperr-Schutz: der eigene Account kann nicht archiviert werden (analog Rollen-Guard vom 04.09.) |

## 3. User Stories

- **US1** Als Admin archiviere ich ein Rechtsverhältnis (z. B. den Übungsleiter-Strang von Max Mustermann); es erscheint nicht mehr in Vertragskacheln, Wizard-Schritt 1, Abrechnungs- und Zeiterfassungs-Auswahlen.
- **US2** Als Admin archiviere ich ein einzelnes Dokument (z. B. eine fehlerhafte Änderungsvereinbarung); der Rest des Verhältnisses bleibt aktiv.
- **US3** Als Admin archiviere ich einen ausgetretenen Mitarbeiter; er kann sich nicht mehr einloggen, taucht in keinen Listen mehr auf, seine Seelsorge-Einträge bleiben aber erhalten.
- **US4** Als Admin sehe ich im Tab „Archiv" alle archivierten Mitarbeiter und Verträge mit Archivierungs-Datum und -Urheber und kann jedes Element mit einem Klick wiederherstellen.
- **US5** Als normaler Nutzer sehe ich vom Archiv **nichts** — weder UI noch Datenzugriff.

## 4. Akzeptanzkriterien (binär prüfbar)

- **AC1** Kein Code-Pfad und kein UI-Punkt führt zu `deleteDoc`/`deleteField` an `users`, Vertrags-Dokumenten oder Verhältnissen. *Nachweis: Grep über `src/` + Diff-Review.*
- **AC2** Archivierte Verhältnisse/Dokumente/Mitarbeiter erscheinen in **keiner** aktiven Ansicht mehr (Benutzerliste, Vertrags-Wizard, Kacheln, Abrechnungsauswahl, Zeiterfassungs-Zuordnung). *Nachweis: Tests gegen die Filter-Helper.*
- **AC3** Archiv-Tab ist nur für Admin renderbar; nicht-Admin-Anfragen an die Archiv-Daten werden durch die bestehenden Rules nicht ausgeweitet (archivierte Daten bleiben im selben Dokument — keine neue Collection nötig, siehe §5).
- **AC4** Archivierte Mitarbeiter: Login-Versuch wird abgewiesen mit klarer, neutraler Meldung; kein Datenverlust. *Nachweis: Gate im Auth-Onboarding-Pfad + Test.*
- **AC5** Wiederherstellen stellt den exakten Vorzustand her (Verhältnis wieder aktiv, Dokument wieder sichtbar, Mitarbeiter wieder login-fähig).
- **AC6** **Selbst-Sperr-Schutz:** Der eigene Admin-Account ist in der Archiv-Aktion deaktiviert/gekennzeichnet; serverseitig verboten (Rules-Check `uid != request.auth.uid`).
- **AC7** Seelsorge-Collections (`clients`, `consultations`, …) werden von keiner Archiv-Aktion geschrieben oder gelesen. *Nachweis: Diff zeigt keine Berührung.*
- **AC8** QA-Gate grün: `npx tsx tests/run-tests.ts` (Basis 112 + Block-1/2-Zuwachs), `npm run lint` 0/0, `npm run build` Exit 0, Datums-Grep im Diff leer. Bestehende Tests nicht abgeschwächt.
- **AC9** Lazy Migration wie am 08.09. bewährt: fehlende Archiv-Felder = „aktiv". **Keine Datenmigration** an lebenden Profilen.

## 5. Datenmodell (Skizze — Verfeinerung in ARCHITECTURE.md)

Bestehende Dokumente erhalten optionale Archiv-Felder (fehlend = aktiv):

```
UserProfile:
  status?:            'aktiv' | 'archiviert'      // D2
  archivedAt?:        Timestamp
  archivedBy?:        string                       // Admin-UID
  archivedContractTypes?: ContractType[]           // D4: Verhältnis-Sammelebene

UserContractDocument:
  archivedAt?:        Timestamp                    // D4: Dokumentezebene
  archivedBy?:        string
```

Rein abgeleitete Helpers (testbar, analog `dataScope.ts`): `isRelationshipActive()`, `isDocumentActive()`, `filterActiveContracts()`. Aktive Views nutzen ausschließlich diese Helpers — Filter-Logik wird **nicht** sechsmal inline kopiert.

## 6. Nicht-Ziele

- Hartes Löschen, Aufbewahrungs-Fristautomatik, DATEV-/Export-Anbindung.
- Änderungen an der anonymen Verbandsstatistik (`Cura_AnonymStatistik/SPEC.md` bleibt eigener Zug).
- Archivierung von Zeiteinträgen oder Seelsorge-Daten.

## 7. Reihenfolge & Abhängigkeiten

1. **Zuerst** Block 1+2 (W1–W3) mergen — die Benutzerkarte (W3) ist die Andockstelle für Archiv-Buttons und den Tab.
2. Dann dieser SPEC → `ARCHITECTURE.md` + `TASKS.md` im Repo, Umsetzung per use-coder, QA-Gate wie immer, Push nur bei verifiziertem Grün.
3. Rules-Eingriff (AC6 serverseitig) wird **nicht** mit dem `firebase deploy` der AnonymStatistik vermischt — getrennte, bewusst freigegebene Deploys.
