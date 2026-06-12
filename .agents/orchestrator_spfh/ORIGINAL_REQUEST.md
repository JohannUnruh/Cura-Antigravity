# Original User Request

## Follow-up — 2026-06-11T10:19:08+02:00

Vollständige Implementierung des Moduls **Familienhilfe (SPFH)** in der Cura-App, basierend auf dem bestehenden Berechtigungssystem. Dies umfasst das Datenmodell, Admin-Einstellungen für dynamische Dropdowns, den Firestore Service mit Zeiterfassungskopplung, die Benutzeroberfläche (Dashboard & Digitale Fallakte) und den jsPDF-Export.

Working directory: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity
Integrity mode: development

## Requirements

### R1. Datentypen & AppSettings-Erweiterung
- Erstelle die Datei `src/types/familyHelper.ts` mit den im Implementierungsplan definierten Interfaces für Familienmitglieder, ASD-Kontakt, Kostenzusage, Ziele, Journal und Krisenschutz.
- Erweitere `AppSettings` in `src/types/index.ts` um die drei optionalen Listen: `familyMemberRelations?: string[];`, `familyJournalTypes?: string[];` und `familyGoalCategories?: string[];`.

### R2. Einstellungen für administrative Dropdowns
- Modifiziere `src/app/settings/page.tsx`, um im Reiter "App-Einstellungen" die Konfiguration für die neuen Auswahllisten (Beziehungsrollen, Zielkategorien, Terminarten) über `TagInput` zu ermöglichen.
- Lade sinnvolle Standardwerte, falls die Listen in Firestore noch nicht existieren.

### R3. Firebase Firestore Service (`familyHelperService.ts`)
- Implementiere den Service `src/lib/firebase/services/familyHelperService.ts` with allen CRUD-Operationen für Fälle, Journal-Einträge, Vorlagen und Gefährdungseinschätzungen.
- **Kopplung Zeiterfassung**: Journal-Einträge müssen (falls gewünscht) einen korrespondierenden `TimeEntry` in der globalen Collection `time_entries` erstellen, damit FLS-Zeiten automatisch auf dem Stundenzettel des Mitarbeiters erscheinen.

### R4. Fallübersicht (Dashboard)
- Erstelle die Seite `src/app/family-helper/page.tsx` mit einer Übersicht aller dem Benutzer zugeordneten Familienfälle, Filteroptionen, Stunden-Soll/Ist-Vergleich und einem Modal für die schnelle Fallneuanlage.

### R5. Digitale Fallakte (Detailansicht)
- Erstelle `src/app/family-helper/[caseId]/page.tsx` mit Tab-Navigation:
  - **Stammdaten**: Familie & ASD-Kontakte (mit dynamischen Dropdowns aus AppSettings).
  - **Hilfeplanung**: Ziele-Tracker (dynamische Kategorien, Schieberegler 1-10 für die Skalierung).
  - **Verlauf & Zeiterfassung**: Kontaktjournal mit Stundeneintragung (Terminarten dynamisch) und Soll/Ist-Vergleich (Stunden-Burn-Down-Chart).
  - **Vorlagen**: Formulare für Anamnese, Hypothesen, Interventionsplanung, Evaluation.
  - **Krisenschutzraum**: Checkliste zur Gefährdungseinschätzung nach § 8a SGB VIII.

### R6. PDF-Export (jsPDF & jsPDF-Autotable)
- Implementiere den One-Click-Export für einen ansprechenden **Entwicklungsbericht** (Bedarf, Ziele mit aktuellem Skalenwert und Vorlagenzusammenfassung) sowie für den monatlichen **Leistungsnachweis** (Terminauflistung mit Unterschriftsfeld).

## Acceptance Criteria

### Funktionalität & Codequalität
- [ ] Der Code baut fehlerfrei mit `npm run build` und `npm run lint`.
- [ ] Admins können in den Einstellungen Dropdown-Listen bearbeiten und diese werden in der Fallakte und im Journal geladen.
- [ ] Beim Anlegen eines Journal-Eintrags wird auf Wunsch ein Eintrag in der Zeiterfassung generiert.
- [ ] Der PDF-Export für Entwicklungsbericht und Leistungsnachweis funktioniert fehlerfrei und lädt das Logo aus `zefabiko_logo.png` (Muster wie in der Zeiterfassung nutzen).
- [ ] Skalierungsänderungen im Ziele-Tracker werden sofort in der Datenbank persistiert.
