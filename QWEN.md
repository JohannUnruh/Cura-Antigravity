# QWEN Context & Changelog

Diese Datei dient der Dokumentation von architektonischen Änderungen, Konfigurationsanpassungen und wichtigen Beschlüssen für den künftigen Entwicklungsverlauf (insbesondere für Qwen oder andere KI-Agenten).

## [13.05.2026] UI & ICS-Export Optimierungen, Build-Fix

### ICS-Exporte (Google Calendar / Apple Calendar)
- Erweitert um wöchentliche Wiederholungen (`RRULE:FREQ=WEEKLY`).
- Wenn ein Zieltermin (`timeBound`) existiert, wird dieser als `UNTIL`-Datum gesetzt.
- Der Beratername (Vor- und Nachname) wird aus `userProfile` im `AuthContext` ausgelesen und in der Event-Beschreibung hinterlegt.
- **Betroffene Datei:** `src/lib/utils/icsExport.ts`

### UI-Anpassungen
- **Zieltermine in Übersichten:** Korrekte Anzeige in Beratungs- und Klientenansichten. Fix: Firebase Timestamp → Date Konvertierung (`as unknown as { toDate }` Pattern).
- **Sidebar:** Historie-Eintrag entfernt (redundant, da Übersichten pro Modul existieren).
- **Einstellungen:** Benachrichtigungs-Tab ausgeblendet (durch Kalenderexport ersetzt).
- **Zeiterfassung:** Klientenname statt ID in der Übersicht angezeigt (nur im PDF-Export bleibt die ID).

### Build & Deployment (Firebase App Hosting) – Kritische Fixes

#### Problem 1: ESLint-Fehler
TypeScript `any`-Typisierungen und ungenutzte Imports ließen den Build fehlschlagen.
- **Fix:** Typisierung auf `as unknown as { toDate: () => Date }` umgestellt, ungenutzte Imports (`HistoryIcon`, `getDoc`) entfernt.
- **Betroffene Dateien:** `src/app/clients/[id]/page.tsx`, `src/app/consultations/page.tsx`, `src/components/layout/Sidebar.tsx`, `src/contexts/AuthContext.tsx`

#### Problem 2: `tsconfig.json` inkludierte `functions/`
**Root Cause des wiederkehrenden Build-Fehlers (exit status 51):**
Die `tsconfig.json` hatte `"include": ["**/*.ts"]`, was das `functions/`-Verzeichnis einschloss. Cloud Functions haben eigene Dependencies (`firebase-functions`), die im Root-Projekt nicht installiert sind. Der Build-Server (Google Cloud Buildpacks) kompiliert mit `tsc` und scheiterte an fehlenden Typen.
- **Fix:** `"functions"` zum `"exclude"`-Array in `tsconfig.json` hinzugefügt.
- **Wichtig:** Cloud Functions haben eine eigene `tsconfig.json` unter `functions/tsconfig.json` und werden separat deployed (`firebase deploy --only functions`).

### CI/CD
- Firebase App Hosting ist mit dem GitHub-Repository verbunden (Branch: `main`).
- Jeder `git push` auf `main` löst automatisch einen Build und ein Deployment aus.
- **Backend:** `cura-app` in `europe-west4`, URL: `cura-app--cura-ant.europe-west4.hosted.app`

## Bekannte Gotchas

1. **`tsconfig.json` exclude:** `functions/` muss IMMER in `exclude` stehen, sonst schlägt der App Hosting Build fehl.
2. **Firebase Timestamps:** In Client-Code immer das `as unknown as { toDate }` Pattern verwenden, niemals `as any` (ESLint blockiert das im CI).
3. **`package-lock.json`:** Bei Dependency-Änderungen auf Windows immer `npm install --package-lock-only` ausführen, damit Linux-spezifische optionale Dependencies (z.B. LightningCSS) in der Lock-Datei landen.
4. **Lokaler Build ≠ CI Build:** Lokal kann `npm run build` durchlaufen, während der CI-Build fehlschlägt (strengere Typprüfung). Immer auch `npm run lint` ausführen.

## [Frühere Änderungen]
- Einrichtung der Firebase-Architektur (Auth, Firestore).
- Implementierung der PWA-Features und VAPID-Push-Benachrichtigungen.
- Zeiterfassungs-Ansichten optimiert (Klienten-Name statt ID in der Übersicht).
- Google Calendar Integration mit `displayName` aus Firebase Auth.
