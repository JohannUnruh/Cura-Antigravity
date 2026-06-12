## Review Summary

**Verdict**: REQUEST_CHANGES

Obwohl die 72 Tests im Mock-Modus stabil und ohne Fehler durchlaufen, der Next.js-Build erfolgreich kompiliert und das Linting fehlerfrei ist, wurden bei der genaueren Untersuchung der Implementierung und der Tests kritische und mittelschwere Mängel bezüglich der Datenintegrität und der Kaskadierung in den realen (Live) Firebase-Services identifiziert. Ein Test täuscht das Löschen gekoppelter Daten vor, indem er es manuell im Test-Code durchführt, statt dass der Service selbst dies kapselt.

---

## Findings

### [Critical] Finding 1: Unvollständige kaskadierende Löschung & verwaiste Firestore-Subkollektionen

- **What**: In `familyHelperService.deleteCase` wird im Live-Modus nur das übergeordnete Dokument `/cases/{caseId}` gelöscht. Firestore löscht Subkollektionen (`journal`, `hazard_assessments`, `templates`) nicht automatisch kaskadierend mit, wodurch verwaiste (orphaned) Dokumente in der Live-Datenbank zurückbleiben. Zudem werden die gekoppelten Zeiteinträge in `/time_entries` nicht vom Service gelöscht. In `Tier 3 - Test 6` wird diese kaskadierende Bereinigung manuell im Test-Runner simuliert (Zeile 114–119), anstatt dies im Service selbst auszuführen.
- **Where**: `src/lib/firebase/services/familyHelperService.ts` (Zeilen 155–171) & `tests/spfh/scenarios.test.ts` (Zeilen 114–119)
- **Why**: 
  1. **Datenleck / DSGVO**: Sensible Fallnotizen (Journal) und 8a-Gefährdungseinschätzungen verbleiben nach dem Löschen eines Falls als verwaiste Daten in Firestore.
  2. **Inkonsistenter Test**: Der Test "sichert" die Funktionalität der kaskadierenden Bereinigung des Falls ab, führt diese Löschung aber manuell im Test selbst aus. Im echten Betrieb würde ein Löschen des Falls über den Service die Zeiteinträge und Subkollektionen intakt und verwaist lassen.
- **Suggestion**: 
  - Die Löschlogik für Subkollektionen und gekoppelte Zeiteinträge muss direkt in `familyHelperService.deleteCase` implementiert werden.
  - Im Live-Modus sollten entweder alle Dokumente der Subkollektionen vor dem Löschen des Falls gelöscht werden (z. B. via Batch-Delete oder eine Cloud Function, die auf `onDelete` von `cases` reagiert) und die gekoppelten Zeiteinträge über den `timeTrackingService` entfernt werden.
  - Der Test in `scenarios.test.ts` sollte nur `deleteCase` aufrufen und anschließend prüfen, ob alles gelöscht wurde (ohne es manuell im Test-Code zu löschen).

### [Major] Finding 2: Abweichendes Fehlerverhalten in `timeTrackingService.updateTimeEntry` zwischen Mock- und Live-Modus

- **What**: Im Mock-Modus wirft `updateTimeEntry` einen Fehler, wenn der Eintrag nicht existiert (`throw new Error("Time entry not found")`). Im Live-Modus wird stattdessen `setDoc(docRef, cleanData, { merge: true })` verwendet, was geräuschlos ein neues, unvollständiges Dokument erzeugt.
- **Where**: `src/lib/firebase/services/timeTrackingService.ts` (Zeilen 354–376)
- **Why**: Wenn ein gekoppelter Zeiteintrag in der Live-Datenbank fehlt (z. B. durch manuelle Löschung) und ein Journal-Update stattfindet, wird ein korruptes Dokument in `/time_entries` angelegt, dem essenzielle Felder wie `authorId` oder `description` fehlen. Im Mock-Test würde dies fehlschlagen, im Live-Betrieb läuft es unbemerkt weiter und erzeugt inkonsistente Zustände.
- **Suggestion**: Verwende im Live-Modus `updateDoc` statt `setDoc(..., { merge: true })`, da `updateDoc` fehlschlägt, falls das Dokument nicht existiert. Alternativ sollte vor dem Update die Existenz geprüft werden.

### [Minor] Finding 3: Fehlende Validierung bei der Datumskonvertierung in `parseDate`

- **What**: Die Hilfsfunktion `parseDate` konvertiert Eingaben ungeprüft mit `new Date(val)`. 
- **Where**: `src/lib/firebase/services/familyHelperService.ts` (Zeilen 31–39)
- **Why**: Falls ein korrupter Datumsstring in der Datenbank landet oder übergeben wird, erzeugt `new Date` ein `Invalid Date` Objekt. Nachfolgende Operationen wie `.getTime()` in der Sortierung (`getCases`) liefern `NaN`, was zu einem unvorhersehbaren Sortierverhalten im Dashboard führt.
- **Suggestion**: Prüfe, ob das Datum valide ist (`!isNaN(date.getTime())`) und verwende andernfalls ein sicheres Fallback (z. B. das aktuelle Datum) oder wirf einen klaren Fehler.

---

## Verified Claims

- **Next.js Production Build** → verifiziert via `npm run build` → **PASS** (Kompiliert erfolgreich in 3.8s)
- **Code Linting** → verifiziert via `npm run lint` → **PASS** (Keine ESLint-Warnungen oder -Fehler)
- **E2E-Testabdeckung (72 Tests)** → verifiziert via `npx tsx tests/run-tests.ts` → **PASS** (Alle 72 Tests im Mock-Modus erfolgreich ausgeführt)
- **Mock-Modus Koppelung (Journal/Time Tracking)** → verifiziert via manuelle Überprüfung der Service-Mocks und Tests → **PASS** (In-Memory-Datenstrukturen verhalten sich wie in `TEST_READY.md` beschrieben)

---

## Coverage Gaps

- **Integrationstest mit Firebase Emulator (LIVE-Modus)** — Risikostufe: **Medium** — Empfehlung: Es sollten Integrationstests im `LIVE`-Modus gegen den Firebase Emulator durchgeführt werden, um sicherzustellen, dass die Firestore Security Rules (in `firestore.rules`) und die fehlende kaskadierende Löschung nicht zu Permission- oder Datenkonsistenzfehlern führen.
- **Fehlerbehandlung bei fehlenden Firebase-Verbindungen** — Risikostufe: **Low** — Empfehlung: Absicherung der Services gegen Timeouts und Offline-Zustände prüfen.

---

## Unverified Items

- **Sicherheit der Client-seitigen Firestore Rules für SPFH-Pfade** — Nicht verifiziert, da in der Test-Infrastruktur kein Emulator-Lauf konfiguriert ist.
