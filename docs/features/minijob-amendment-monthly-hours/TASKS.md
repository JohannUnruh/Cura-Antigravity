# 📝 TASKS: Minijob-Änderungsvereinbarung & Monatliche Arbeitszeit

- [x] **Task 1: Typdefinitionen erweitern (`src/types/index.ts`)**
  - [x] 1.1 `DocumentKind` (`'Vertrag' | 'Änderungsvereinbarung'`) definieren
  - [x] 1.2 `UserContractDocument` Interface für Historie anlegen
  - [x] 1.3 `UserProfile` um `monthlyHours` und `contractDocuments?: UserContractDocument[]` erweitern

- [x] **Task 2: Vertragstemplates & Generator erweitern (`src/lib/contracts/`)**
  - [x] 2.1 `ContractData` um `documentKind`, `monthlyHours` erweitern (`templates.ts`)
  - [x] 2.2 Minijob-Vertragstemplate um monatliche Arbeitszeit in § 3 & § 4 anpassen (`templates.ts`)
  - [x] 2.3 Rechtssicheres Template für `Änderungsvereinbarung` (Minijob) implementieren (`templates.ts`)
  - [x] 2.4 `generateAndUploadContract` für `documentKind`, dynamische Titel & saubere PDF-Dateinamen anpassen (`generator.ts`)

- [x] **Task 3: Settings-UI & Berechnungs-Engine anpassen (`src/app/settings/page.tsx`)**
  - [x] 3.1 State um `documentKind` und `monthlyHours` erweitern
  - [x] 3.2 Bidirektionale Berechnungs-Engine implementieren (603 € / 16,75 € = 36 h/Monat)
  - [x] 3.3 Segmented Switcher im Modal (`Arbeitsvertrag` vs. `Änderungsvereinbarung`) einbauen
  - [x] 3.4 Modal-Felder dynamisch beschriften (Inkrafttreten vs. Beginn)
  - [x] 3.5 Quick-Action-Buttons (`Vertrag` & `Änderung`) in der Benutzerkarte bereitstellen
  - [x] 3.6 Dokumentenliste / Dropdown für alle Verträge & Änderungsvereinbarungen eines Nutzers anzeigen
  - [x] 3.7 Persistenz: Dokumenten-Historie in `contractDocuments` und `contractDocumentUrl` speichern
  - [x] 3.8 App-Settings Fallback für `monthlyEarningsLimit` auf 603 € aktualisieren

- [x] **Task 4: QA-Gate & Verifikation**
  - [x] 4.1 Automatisierter Linter-Lauf (`npm run lint`) ohne Fehler
  - [x] 4.2 TypeScript & Production Build (`npm run build`) erfolgreich
  - [x] 4.3 Datums-Hardcoding-Audit (Grep-Check auf statische Daten im Produktcode)
  - [x] 4.4 Git Diff Review
