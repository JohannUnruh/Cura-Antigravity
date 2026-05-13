# QWEN Context & Changelog

Diese Datei dient der Dokumentation von architektonischen Änderungen, Konfigurationsanpassungen und wichtigen Beschlüssen für den künftigen Entwicklungsverlauf (insbesondere für Qwen oder andere KI-Agenten).

## [13.05.2026] UI & ICS-Export Optimierungen, Linting Fixes
- **ICS-Exporte (Google Calendar/Apple Calendar):** 
  - Erweitert um wöchentliche Wiederholungen (`RRULE:FREQ=WEEKLY`).
  - Wenn ein Zieltermin in einer Beratung (`timeBound`) existiert, wird dieser als `UNTIL`-Datum in der ICS-Datei gesetzt.
  - Der Beratername (DisplayName) wird automatisch in die Event-Beschreibung eingefügt. Dazu greift die App nun auf `userProfile` im `AuthContext` zu (Vor- und Nachname).
- **UI Anpassungen:**
  - Zieltermine werden nun in den Übersichten korrekt dargestellt (Der Fehler `invalid Date` wurde durch saubere Firebase-Timestamp-zu-Date-Konvertierung behoben).
  - Unnötige Module entfernt: Die Historie wurde aus der `Sidebar` entfernt, um die Übersichtlichkeit zu verbessern.
- **Deployment & Build (Firebase App Hosting):**
  - **Linter-Fehler behoben:** Der Firebase App Hosting Build schlug aufgrund von TypeScript-Linting-Fehlern (`any`-Typisierungen und ungenutzte Imports) fehl. Die Fehler in `src/app/clients/[id]/page.tsx`, `src/app/consultations/page.tsx`, `Sidebar.tsx` und `AuthContext.tsx` wurden behoben.
  - Das Deployment via `git push` auf den `main`-Branch läuft nun wieder fehlerfrei durch.

## [Frühere Änderungen]
- Einrichtung der Firebase-Architektur (Auth, Firestore).
- Implementierung der PWA-Features und VAPID-Push-Benachrichtigungen.
- Zeiterfassungs-Ansichten optimiert (Klienten-Name statt ID in der Übersicht).
