# 🏗️ ARCHITECTURE: Mehrfachverträge & Verhältnis-Erkennung

## 1. Datenmodell (rückwärtskompatibel)

```
UserProfile
├── contractType?:  ContractType        → PRIMÄR, abrechnungsrelevant (unverändert genutzt
│                                        von timeTrackingService.isMinijobber(), Kontingenten,
│                                        contractDocumentUrl)
├── contractTypes?: ContractType[]      → NEU: alle aktiven Rechtsverhältnisse
└── contractDocuments: UserContractDocument[]
        └── contractType (je Dokument), primary?, tasksDescription?  → NEU
```

**Warum zwei Felder statt nur `contractTypes`?** `contractType` ist an mehreren Stellen
abrechnungstragend. Ein Ersatztyp hätte eine Migration aller Profile bedeutet – bei einer App, die
Mitglieder produktiv nutzen, nicht vertretbar. Die Dopplung ist explizit dokumentiert:
`contractTypes` enthält das primäre Verhältnis immer an erster Stelle.

**Migration:** ausschließlich lesend abgeleitet über `getContractRelationships()`
(`contractTypes ?? [contractType ?? 'Ehrenamtlich']`). Geschrieben wird nur an der bearbeiteten
Stelle.

## 2. Reine Logik: `src/lib/contracts/relationships.ts`

| Funktion | Aufgabe |
|---|---|
| `getPrimaryContractType(profile)` | Primäres Verhältnis, Fallback `'Ehrenamtlich'`. |
| `getContractRelationships(profile)` | Alle Verhältnisse; primär zuerst, dedupliziert, lazy für Altprofile. |
| `getCoveredContractTypes(docs)` / `getContractCoverage(profile)` | Deckungsgrad je Art: Verträge vs. Änderungsvereinbarungen, `isPrimary`, `isKnownRelationship`, Dokumente (neueste zuerst), Reihenfolge: erkannte Verhältnisse zuerst, dann `CONTRACT_TYPE_ORDER`. |
| `suggestContractType(profile, kind)` | Vorauswahl. Neu: erst erkanntes Verhältnis ohne Dokument, dann die zum Primärtyp passende Art (`SUGGESTION_ORDER`), sonst primär. Änderung: nur Arten mit Dokumenten, primär bevorzugt. **`Minijob` nie als Vorschlag.** |
| `mergeContractTypes(existing, added)` | Vereinigungsmenge ohne Duplikate – Primärtyp bleibt unangetastet. |
| `isPrimaryContractDocument(profile, type)` | `type === primärer Typ`. |
| `shouldUpdatePrimaryDocumentUrl(profile, type, kind)` | `true` nur für **primären Vertrag** (`Vertrag`, nicht `Änderungsvereinbarung`). |
| `buildContractDocument({selectedType,isPrimary,documentUrl,form}, now?)` | Historieneintrag; optionale Parameter nur wenn gesetzt (`monthlyHours`, `weeklyHours`, `hourlyRate`, `lumpSumAmount`, `activityDescription`, `tasksDescription`). Titel: `Vertrag (TT.MM.JJJJ)` / `Änderung (…)`. |
| `ensureContractHistory(profile)` | Altprofil mit nur `contractDocumentUrl` bekommt beim ersten neuen Dokument einen `primary: true`-Ursprungseintrag. |
| `buildContractProfileUpdate({profile,selectedType,documentUrl,form,document})` | **Der Abrechnungsschutz** – siehe 3. |

## 3. Der Abrechnungsschutz (Kern der Sache)

`buildContractProfileUpdate()` liefert das Patch-Objekt für `saveUserProfile`. Es gilt:

| Feld | Wann geschrieben |
|---|---|
| `contractDocuments`, `contractTypes` | immer (Anhängen bzw. Vereinigung) |
| `birthDate` | immer (gehört zur Person, nicht zum Verhältnis) |
| `contractDocumentUrl` | nur bei primärem `Vertrag` |
| `entryDate`, `hourlyRate`, `monthlyHours`, `weeklyHours`, `activityDescription`, `tasksDescription`, `vacationDaysPerYear` | **nur wenn das Dokument das primäre Verhältnis betrifft** |

Bei einer `Änderungsvereinbarung` auf das primäre Verhältnis wird `entryDate` bewusst **nicht**
auf das Änderungsdatum gesetzt (es bleibt der historische Eintritt; die Wirkung tritt über
`effectiveDate` des Dokuments ein), die vergütungsrelevanten Werte aber aktualisiert.

## 4. UI: Vertrags-Wizard in `src/app/settings/page.tsx`

- State: `contractWizardStep: 1 | 2`, `contractWizardType: ContractType`.
- **Schritt 1:** Kacheln je Vertragsart aus `getContractCoverage(selectedUser)` mit Häkchen auf der
  Vorauswahl, Badges `primär` / Kurzbadge (`EH`, `EP`, `ÜL`, `MJ`), Deckungshinweis
  („Verhältnis erfasst – noch kein Dokument", „Vorhanden – ergänzt als weiterer Vertrag", …) und den
  vorhandenen Dokumentlinks der gewählten Art.
- `selectContractType()` legt die Maske für die neue Art neu vor, **behält aber** Startdatum,
  Enddatum, Geburtsdatum und bereits geleistete Unterschriften.
- **Schritt 2:** bestehendes Formular, jetzt typgeführt; „Zurück" führt nach Schritt 1.
- Benutzerkarten: Rechtsverhältnisse als Badge-Zeile, Dokumente nach Art gruppiert; die
  Schnellaktionen „Vertrag" / „Änderung" öffnen den Wizard mit vorausgewählter Art.
- `handleGenerateContract()` berechnet URL, ruft `buildContractDocument()` +
  `buildContractProfileUpdate()` auf und speichert exakt dieses Patch – keine Feldzuweisung mehr in
  der Komponente.

## 5. Teststrategie

`tests/contracts.test.ts` → Suite „Multi-Contract: Rechtsverhältnisse & Abrechnungsschutz"
(11 Fälle): Lazy-Ableitung, Reihenfolge/Dedup, Vorschlagslogie inkl. Minijob-Ausschluss,
Deckungsgrad, Dokumentaufbau, **Nicht-Überschreiben der Minijob-Gehaltsbasis durch einen
Zusatzvertrag**, Primärvertrag, Änderungsvereinbarung (Eintritt + Beleg bleiben),
Ursprungsnachzug bei Altprofil, Vereinigungsmenge.
