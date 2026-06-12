# Handoff Report: Review der E2E-Tests und Stubs des SPFH-Moduls

## 1. Observation

- **Test-Ausführung**: Der Befehl `npx tsx tests/run-tests.ts` wurde erfolgreich ausgeführt:
  ```
  === Summary ===
  Passed: 72
  Failed: 0
  Total: 72
  Test Run PASSED. All 72 tests passed successfully.
  ```
- **Build & Lint**: `npm run lint` lief fehlerfrei durch. `npm run build` kompilierte die Next.js-App erfolgreich:
  ```
  ▲ Next.js 16.1.6 (Turbopack)
  ✓ Compiled successfully in 3.8s
  ...
  ✓ Generating static pages using 11 workers (14/14)
  Finalizing page optimization ...
  Route (app) ...
  ```
- **Service-Implementierung für kaskadierende Löschung**:
  In `src/lib/firebase/services/familyHelperService.ts` sieht die Löschlogik in `deleteCase` wie folgt aus:
  ```typescript
  async deleteCase(id: string): Promise<void> {
      const caseObj = await this.getCaseById(id);
      if (!caseObj) {
          throw new Error("Case not found");
      }

      if (isMockMode) {
          mockCases.delete(id);
          mockJournals.delete(id);
          mockAssessments.delete(id);
          mockTemplates.delete(id);
          return;
      }

      const docRef = doc(db, "cases", id);
      await deleteDoc(docRef);
  }
  ```
- **Test-Code für rekursives Löschen**:
  In `tests/spfh/scenarios.test.ts` (Zeilen 114–119):
  ```typescript
  // Delete the case
  // In our mock service deleteCase deletes journals too.
  // Let's ensure coupled time entries are deleted as well.
  for (const j of journalsBefore) {
      if (j.hasTimeEntry && j.timeEntryId) {
          await timeTrackingService.deleteTimeEntry(j.timeEntryId);
      }
  }
  await familyHelperService.deleteCase(caseId);
  ```
- **Update-Verhalten im Live-Modus**:
  In `src/lib/firebase/services/timeTrackingService.ts` (Zeilen 366–375):
  ```typescript
  const docRef = doc(db, COLLECTION_NAME, id);
  const cleanData = Object.entries(entry).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
  }, {} as Record<string, unknown>);

  await setDoc(docRef, cleanData, { merge: true });
  ```

---

## 2. Logic Chain

1. **Beobachtung**: `familyHelperService.deleteCase` führt im Live-Modus nur ein `deleteDoc` auf dem Haupt-Pfad `/cases/{id}` aus.
2. **Schlussfolgerung**: Firestore löscht Subkollektionen wie `journal` und `hazard_assessments` nicht automatisch. Diese verbleiben als verwaiste Dokumente in der Live-Datenbank.
3. **Beobachtung**: Der Test `Tier 3 - Test 6` führt eine manuelle Schleife über alle Journal-Einträge durch, um deren Zeiteinträge über den `timeTrackingService` einzeln zu löschen, bevor er `deleteCase` aufruft.
4. **Schlussfolgerung**: Die Funktionalität einer automatischen, kaskadierenden Bereinigung durch das System existiert nicht in den echten Services. Der E2E-Test simuliert diese Kaskadierung künstlich, wodurch der Test zwar im Runner grün wird, das System im echten Betrieb jedoch Datenleichen hinterlässt.
5. **Beobachtung**: Im Live-Modus nutzt `timeTrackingService.updateTimeEntry` ein `setDoc` mit `merge: true` auf dem Dokumentpfad.
6. **Schlussfolgerung**: Wenn die TimeEntryId nicht existiert, wird ein neues Dokument erstellt. Da `setDoc` mit den übergebenen partiellen Daten arbeitet, fehlen Pflichtfelder wie `authorId` oder `description`. Im Mock-Modus wirft das System dagegen einen Fehler. Dies stellt ein abweichendes und potenziell datenkorrumpierendes Verhalten dar.

---

## 3. Caveats

- Die Analyse der Live-Firebase-Pfade basiert auf einer statischen Codeanalyse der importierten Firebase-SDK-Funktionen (`deleteDoc`, `setDoc` etc.) und den bekannten Verhaltensweisen von Firestore bezüglich Subkollektionen, da kein Live-Lauf auf einem realen Firebase-Emulator durchgeführt wurde.
- Es wird davon ausgegangen, dass die in `firestore.rules` definierten Sicherheitsregeln das Löschen von Subkollektionen nicht anderweitig einschränken oder beeinflussen.

---

## 4. Conclusion

Das Test-Framework und die 72 Tests sind strukturell vollständig und decken alle geforderten Tiers 1-4 sinnvoll ab. Sie laufen fehlerfrei durch und beeinträchtigen den Next.js-Build-Prozess nicht.
Jedoch liegt ein **Integrity-Mangel** vor: Der Test für das rekursive Löschen (`Tier 3 - Test 6`) zertifiziert ein Feature (kaskadierendes Löschen von gekoppelten Daten), das in den eigentlichen Services nicht implementiert ist, sondern manuell vom Test selbst ausgeführt wird. Zudem existieren funktionale Diskrepanzen zwischen dem Mock- und Live-Modus (z. B. beim Update nicht-existenter Time-Entries).
Daher lautet das Gesamturteil: **REQUEST_CHANGES** mit einem kritischen Mangel bezüglich der Kaskadierungslogik und der Datenintegrität.

---

## 5. Verification Method

1. **Test-Ausführung**:
   Führe den Test-Runner aus:
   ```bash
   npx tsx tests/run-tests.ts
   ```
   *Erwartetes Ergebnis*: Alle 72 Tests laufen erfolgreich durch.
2. **Inspektion der Löschlogik**:
   Prüfe die Datei `src/lib/firebase/services/familyHelperService.ts` in Zeile 155–171 und stelle sicher, dass bei `deleteCase` im Live-Modus keine Subkollektionen oder Time-Entries gelöscht werden.
3. **Ungültiges Verhalten erzwingen**:
   Wenn man die manuelle Löschschleife in `tests/spfh/scenarios.test.ts` (Zeilen 114–119) auskommentiert und nur `deleteCase` aufruft, scheitert der Test für das Löschen gekoppelter Daten, da der Service die verknüpften `time_entries` im Mock-Modus nicht bereinigt.
