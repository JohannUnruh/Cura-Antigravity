# Original User Request

## Initial Request — 2026-06-09T20:46:41Z

Das Multi-Agenten-Team soll die Cura-App autonom nach Verbesserungspotenzialen in den Bereichen Sicherheit (Firestore Rules, API-Sicherheit) und Benutzerfreundlichkeit (Usability, UI/UX, Formulare) durchsuchen und sinnvolle Vorschläge strukturiert in der BACKLOG.md dokumentieren.

Working directory: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity
Integrity mode: development

## Requirements

### R1. Komplettes Audit (Sicherheit & Usability)
Analysiere die Codebasis auf:
- Sicherheitsrelevante Risiken (z.B. Lücken in `firestore.rules`, API Routes in `src/app/api/`, Token-Handling).
- Usability-Engpässe (z.B. fehlende Validierungen, Barrierefreiheit/Kontraste im Darkmode, Fehlerbehandlung in Formularen).

### R2. Strukturierte Dokumentation im Backlog
Trage die gefundenen Optimierungspotenziale in die `BACKLOG.md` ein. 
Jeder Eintrag muss das folgende Format nutzen:
- **Priorität** (P0 bis P3)
- **Status** (zwingend `pending`)
- **Beschreibung** (Nutzen für den User / Sicherheitsgewinn)
- **Akzeptanzkriterien** (eindeutig prüfbar)
- **Betroffene Dateien** (Pfade relativ zum Projekt-Root)

## Acceptance Criteria

### Dokumentationsqualität
- [ ] Mindestens 3 eigenständige, sinnvolle Optimierungsvorschläge (mit Usability- oder Sicherheitsbezug) wurden in die `BACKLOG.md` aufgenommen.
- [ ] Jeder Vorschlag enthält eine klare Zuweisung einer Priorität (P0 bis P3).
- [ ] Jeder Vorschlag definiert eindeutige Akzeptanzkriterien und listet die betroffenen Dateien auf.
- [ ] Alle Einträge folgen exakt dem bestehenden Format der `BACKLOG.md`.

## Follow-up — 2026-06-11T09:48:12+02:00

Erweiterung der Cura-App um die Module Familienhilfe (SPFH) und Pflegefamilien/Pflegekinder. Die erste Phase beinhaltet die Implementierung des Berechtigungssystems, der Admin-UI in den Einstellungen, der dynamischen Sidebar-Navigation und der Absicherung über die Firestore-Sicherheitsregeln.

Working directory: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity
Integrity mode: development

## Requirements

### R1. Erweiterung des Benutzerprofils
Füge dem `UserProfile`-Typ in `src/types/index.ts` die optionalen Berechtigungsfelder `hasFamilyHelperAccess?: boolean` und `hasFosterCareAccess?: boolean` hinzu.

### R2. Admin-Benutzerverwaltung in den Einstellungen
Passe `src/app/settings/page.tsx` an, sodass ein administrator beim Anlegen neuer Benutzer und beim Bearbeiten bestehender Benutzer Checkboxen für den Zugriff auf "Familienhilfe" und "Pflegefamilien" hat. Diese Berechtigungen müssen korrekt in der Firestore-Collection `users` gespeichert und geladen werden.

### R3. Dynamische Sidebar-Navigation
Passe `src/components/layout/Sidebar.tsx` an, sodass die Menüpunkte für die Familienhilfe (`/family-helper`) und die Pflegefamilien (`/foster-care`) nur angezeigt werden, wenn der angemeltete Benutzer das jeweilige Berechtigungs-Flag besitzt.

### R4. Firestore Security Rules
Erweitere `firestore.rules` um Sicherheitsregeln, die den Zugriff auf `/family_cases` und die Unter-Collections nur erlauben, wenn der Benutzer `hasFamilyHelperAccess == true` oder Admin ist. Gleiches gilt für `/foster_families` und `/foster_children` mit dem Flag `hasFosterCareAccess == true`.

## Acceptance Criteria

### Funktionalität & Codequalität
- [ ] Der Code baut fehlerfrei mit `npm run build` und `npm run lint`.
- [ ] In der Admin-Benutzerverwaltung können die Zugriffsrechte gesetzt, gespeichert, geändert und geladen werden.
- [ ] Die Sidebar rendert die Links `/family-helper` und `/foster-care` nur für Benutzer mit den entsprechenden Flags.
- [ ] Firestore verweigert den Zugriff (Lesen und Schreiben) auf `/family_cases` für Benutzer ohne das Flag `hasFamilyHelperAccess` (außer Admins).

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
