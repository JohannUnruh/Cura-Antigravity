## 2026-06-11T08:21:34Z
Du bist teamwork_preview_worker. Dein Arbeitsverzeichnis ist C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_e2e.
Deine Aufgabe ist es, die E2E- und Integrationstests für das SPFH-Modul (Familienhilfe) zu erstellen und auszuführen.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Kontext:
- Wir testen das SPFH-Modul in einer Headless-Umgebung ohne Browser-Fenster.
- Die echten Implementierungen der Typen (src/types/familyHelper.ts) und des Services (src/lib/firebase/services/familyHelperService.ts) existieren in PROJECT.md als Entwurf, sind aber im Codebase noch nicht angelegt (sie stehen in PROJECT.md auf PLANNED).
- Um den Next.js Build (npm run build) und das Linting (npm run lint) nicht zu gefährden, musst du:
  1. Die Typen-Stubs in `src/types/familyHelper.ts` und `src/types/index.ts` (Erweiterung AppSettings) exakt laut Contract in PROJECT.md erstellen.
  2. Die Service-Methoden-Stubs in `src/lib/firebase/services/familyHelperService.ts` erstellen (alle Methoden werfen standardmäßig `new Error("Not implemented")`), damit andere Komponenten gegen sie kompilieren können.
  3. Eine In-Memory-Mock-Implementierung oder eine Test-Umgebung erstellen, sodass die Tests unabhängig von einer Live-Datenbank im MOCK-Modus voll funktionsfähig laufen.

Aufgaben:
1. Erstelle die TypeScript-Stubs in `src/types/familyHelper.ts` und `src/lib/firebase/services/familyHelperService.ts`.
2. Erstelle einen Ordner `tests/spfh/` und implementiere dort die Testsuiten für alle 6 Features laut TEST_INFRA.md:
   - Feature 1: Datatypes & AppSettings (Verifizierung der Datenstrukturen und Validierungsregeln)
   - Feature 2: Administrative Settings (Dropdown-Konfigurationen, TagInput für Relationen, Journal-Typen, Zielkategorien)
   - Feature 3: familyHelperService CRUD & Time Coupling (Kopplung von Journal-Einträgen mit Arbeitszeitbuchungen, atomare Updates)
   - Feature 4: Case Dashboard (Filterlogik nach Status, Suche, Sortierung, Zuweisung)
   - Feature 5: Case Details Tabs (Navigationszustände, Berechtigungsprüfungen für 8a-Risikoanalyse)
   - Feature 6: PDF Export (Generierungslogik für Entwicklungsbericht und Leistungsnachweis; simuliere jsPDF/jspdf-autotable Aufrufe)
3. Stelle sicher, dass die Grenzwerte der Testfälle (Tiers 1-4) eingehalten werden:
   - Tier 1: Feature Coverage (>=5 Testfälle pro Feature) -> insgesamt mindestens 30 Testfälle
   - Tier 2: Boundary & Corner Cases (>=5 Testfälle pro Feature, z. B. leere Werte, negative Stunden, ungültige Daten) -> insgesamt mindestens 30 Testfälle
   - Tier 3: Cross-Feature combinations (z. B. automatisches Erstellen von Zeitbuchungen bei Journal-Erstellung und deren Konsistenz) -> mindestens 6 Testfälle
   - Tier 4: Real-world application scenarios (5 Szenarien: Fallerstellung, Dokumentationswoche, 8a-Intervention, Monatsbericht mit PDF-Export, Fallarchivierung)
4. Erstelle ein Test-Runner-Skript unter `tests/run-tests.ts`. Dieses Skript soll alle Tests ausführen und das Ergebnis im Terminal protokollieren. Stelle sicher, dass das Skript mittels `tsx` (oder direkt über Node/tsc falls anwendbar) ausgeführt werden kann. Falls `tsx` benötigt wird, kannst du es als devDependency installieren.
5. Führe den Test-Runner aus und verifiziere, dass alle Tests im Mock-Modus erfolgreich durchlaufen.
6. Führe `npm run build` und `npm run lint` aus, um sicherzustellen, dass deine Änderungen und neuen Testdateien den Next.js Produktions-Build nicht stören oder ESLint-Fehler erzeugen.
7. Erstelle das Dokument `TEST_READY.md` im Projekt-Root (C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\TEST_READY.md) gemäß der Vorlage aus dem Project Pattern.
8. Schreibe deinen Handoff-Report (handoff.md) in deinem Arbeitsverzeichnis `.agents/worker_e2e/handoff.md` mit den genauen Testergebnissen und Befehlen.
