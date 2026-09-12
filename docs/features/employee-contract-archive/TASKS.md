# TASKS: Vertrags- und Mitarbeiter-Archiv (W4)

Pipeline: SPEC ✔ (abgenommen) → ARCHITECTURE ✔ → TASKS (diese Datei) → Implementation → QA-Gate.

## T1 Datenmodell
- [x] `src/types/index.ts`: `UserStatus`, `ArchivedContractTypeEntry`; optionale Felder an
      `UserProfile` (status/archivedAt/archivedBy/archivedContractTypes) und
      `UserContractDocument` (archivedAt/archivedBy)

## T2 Reine Helpers
- [x] `src/lib/contracts/archive.ts` neu: Prädikate (`isUserArchived`, `filterActiveUsers`,
      `isRelationshipActive`, `isDocumentActive`, `filterActiveContracts`),
      Patch-Builder (User/Verhältnis/Dokument, Archiv+Restore), `canManageUserArchive`,
      `buildArchiveContractEntries`
- [x] `src/lib/contracts/relationships.ts`: `getActiveContractRelationships`;
      `getContractCoverage` + `buildContractOverviewRows` archive-aware (ohne Verhaltens-
      änderung für Profile ohne Archiv-Felder); `getContractRelationships`,
      `buildContractProfileUpdate`, `shouldUpdatePrimaryDocumentUrl` UNVERÄNDERT (Schutzzone)

## T3 Service (D1: kein harter Delete)
- [x] `userService.deleteUserProfile` entfernen (inkl. dynamischem `deleteDoc`-Import)
- [x] `archiveUser/restoreUser`, `archiveContractRelationship/restoreContractRelationship`,
      `archiveContractDocument/restoreContractDocument` mit Read→Patch→`setDoc(merge)`
      und `canManageUserArchive`-Guard (throw bei Selbst-Archivierung)

## T4 Auth-Gate (AC4)
- [x] `ProtectedRoute`: `isUserArchived(userProfile)` → neutrale Meldung + Abmelden,
      keine App-Inhalte

## T5 Settings-UI (D2–D5)
- [x] Benutzer-Tab: Kartenliste über `filterActiveUsers`; Zähler = aktive Benutzer
- [x] Eigene Karte: Badge „Sie", Archiv-Buttons deaktiviert (Self-Lockout UI-Ebene)
- [x] Löschen-Modal → Archivieren-Bestätigungs-Modal (Benutzer-Ebene)
- [x] Vertrags-Kacheln: Archiv-Button je Verhältnis und je Dokument
- [x] Neuer Tab „Archiv" (nur Admin): Bereiche Mitarbeiter + Verträge mit
      Datum/Urheber + Wiederherstellen; Aktionen laden `getAllUsers()` neu
- [x] `family-helper/page.tsx`: Arbeiter-Zuordnung über `filterActiveUsers`
- [x] `travel/page.tsx`: usersMap bleibt ungefiltert (Namensauflösung Historie — ARCHITECTURE §3.7)

## T6 Rules (AC6, kein Deploy!)
- [x] `firestore.rules`: `touchesUserArchive()`, users-update: Owner darf Archiv-Felder
      nicht setzen, Admin nicht am eigenen Dokument; `allow delete` für users entfernen

## T7 Tests
- [x] `tests/employeeContractArchive.test.ts` (Lazy, aktiv/archiviert, Dokument vs.
      Verhältnis, Restore=Vorzustand, Schutzzone, Selbst-Sperre, Archive-Entries)
- [x] In `tests/run-tests.ts` registrieren; bestehende Tests unverändert

## T8 QA-Gate (AC8)
- [x] `npx tsx tests/run-tests.ts`: 133 + neue Tests, 0 failed
- [x] `npm run lint`: 0 Fehler/0 Warnungen
- [x] `npm run build`: Exit 0
- [x] Datums-Grep über den Diff: keine hartkodierten Referenzdaten im Produktcode
- [x] AC1-Grep: kein `deleteDoc`/`deleteField` auf users/Verträge in `src/`
- [x] AC7: Diff berührt keine Seelsorge-Services (clients/consultations/…)
- [x] Conventional Commits auf `feature/employee-contract-archive` — kein Merge, kein Push
