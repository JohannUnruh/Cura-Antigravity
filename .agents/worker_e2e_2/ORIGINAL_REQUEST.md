## 2026-06-11T08:28:28Z

Du bist teamwork_preview_worker. Dein Arbeitsverzeichnis ist C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_e2e_2.
Deine Aufgabe ist es, die E2E- und Integrationstest-Infrastruktur sowie die zugehörigen Service-Stubs/Mocks für das SPFH-Modul (Familienhilfe) basierend auf den Ergebnissen des ersten Durchlaufs und den Review-Findings zu überarbeiten.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Kontext & Vorarbeiten:
- Der vorherige Worker hat die Testsuite unter `tests/spfh/` und die Service-Stubs unter `src/lib/firebase/services/familyHelperService.ts` implementiert. Sein Handoff-Report liegt unter `.agents/worker_e2e/handoff.md`.
- Die Reviewer haben schwerwiegende Mängel in der Kopplung und Kaskadierung gefunden. Du musst diese beheben.

Zu lösende Findings:
1. [Kritisch] Kaskadierende Löschung in `familyHelperService.deleteCase`:
   - Aktuell löscht `deleteCase` im Live-Modus nur den Fall selbst. Subkollektionen (`journal`, `hazard_assessments`) und gekoppelte Zeiteinträge (über `timeTrackingService.deleteTimeEntry`) bleiben verwaist in Firestore zurück.
   - Der E2E-Test `Tier 3 - Test 6` in `tests/spfh/scenarios.test.ts` simuliert diese kaskadierung manuell, was ein Testing-Anti-Pattern ist.
   - **Lösung**: Implementiere die kaskadierende Löschung direkt in `familyHelperService.deleteCase` (sowohl im Mock-Modus als auch im Live-Modus). Lösche alle Dokumente in den Subkollektionen `journal` und `hazard_assessments` und lösche alle mit den Journaleinträgen gekoppelten Zeiteinträge.
   - Passe den Test `Tier 3 - Test 6` in `tests/spfh/scenarios.test.ts` so an, dass er nur noch `deleteCase` aufruft und anschließend verifiziert, dass der Fall, alle Journale und alle verknüpften Zeiteinträge gelöscht wurden (keine manuelle Löschung im Testcode!).
2. [Major] Konsistentes Fehlerverhalten in `timeTrackingService.updateTimeEntry`:
   - Im Live-Modus wird `setDoc(..., { merge: true })` verwendet, was ein neues Dokument anlegt, wenn es fehlt. Im Mock-Modus wird ein Fehler geworfen.
   - **Lösung**: Verwende im Live-Modus von `timeTrackingService.updateTimeEntry` stattdessen `updateDoc` (oder prüfe vorher die Existenz des Dokuments), damit bei einem nicht existierenden Eintrag ein Fehler geworfen wird, genau wie im Mock-Modus und in den Tests vorausgesetzt.
3. [Medium] Leistungszeitraum-Validierung im Service integrieren:
   - Der Test für den Leistungszeitraum (Tier 3 - Test 5) prüft die Logik manuell im Testcode.
   - **Lösung**: Integriere die Validierung des Leistungszeitraums (dass ein Journal-Eintrag nicht außerhalb des `fundingCommitment` des Falls liegen darf) in die Validierungsfunktion `validateFamilyJournalEntry` (in `tests/spfh/validation.ts` oder `familyHelperService.ts`), so dass der Service diese Regel bei `addJournalEntry` und `updateJournalEntry` automatisch prüft und einen Fehler/Warnung zurückgibt.
4. [Minor] Validierung bei der Datumskonvertierung in `parseDate`:
   - `parseDate` in `familyHelperService.ts` konvertiert ungeprüft mit `new Date(val)`.
   - **Lösung**: Füge eine Prüfung hinzu, ob das Datum valide ist (`!isNaN(date.getTime())`). Wenn nicht, wirf einen klaren Fehler oder verwende ein sicheres Fallback.

Qualitätssicherungs-Schritte:
1. Führe den Test-Runner aus (`npx tsx tests/run-tests.ts`) und stelle sicher, dass alle 72 Tests (oder mehr, falls du weitere hinzufügst) erfolgreich durchlaufen.
2. Führe `npm run lint` und `npm run build` aus, um sicherzustellen, dass keine Fehler in der Build- und Lint-Pipeline auftreten.
3. Aktualisiere `TEST_READY.md` im Projekt-Root, falls sich Details geändert haben.
4. Schreibe deinen Handoff-Report (handoff.md) in deinem Arbeitsverzeichnis `.agents/worker_e2e_2/handoff.md`.
