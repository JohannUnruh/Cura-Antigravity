# ARCHITECTURE: Vertrags- und Mitarbeiter-Archiv statt Löschen (W4)

**SPEC:** `SPEC.md` (abgenommen 12.09.2026) · **Branch:** `feature/employee-contract-archive` · **Basis:** `main` = 1d2e18e2 (Tests 133/133)

Grundprinzip: **Archivieren ist ein Flag, kein Datenumbau.** Alle Archiv-Felder sind optional;
fehlende Felder bedeuten „aktiv" (AC9 Lazy Migration, keine Datenmigration). Alle Filter laufen
über reine, testbare Helpers – aktive Views kopieren die Filterlogik niemals inline.

---

## 1. Datenmodell (Verfeinerung der SPEC-Skizze §5)

Die SPEC erlaubt ausdrücklich „Skizze — Verfeinerung in ARCHITECTURE.md". Zwei Verfeinerungen:

1. **`archivedAt` als ISO-8601-String statt Firestore-Timestamp.**
   Begründung: Die verschachtelten `contractDocuments`-Subdokumente nutzen bereits ISO-Strings
   (`createdAt`, `effectiveDate`). Timestamps erfordern beim Lesen überall eine
   `toFirestoreDate`-Normalisierung (RangeError-Bugfix 12.09., `firestoreValues.ts`).
   ISO-Strings sind lese-robust, rein vergleichbar und ohne Emulator testbar.
2. **`archivedContractTypes` als Objektliste statt `ContractType[]`.**
   Begründung: D3 verlangt je Archiv-Eintrag Datum + Urheber. Ein reines Typ-Array kann das
   nicht tragen. Die Objektliste liefert Metadaten pro Verhältnis, ohne eine neue Collection
   zu benötigen (DSGVO-Vorgabe: Daten bleiben im selben Dokument).

```ts
// src/types/index.ts
export type UserStatus = 'aktiv' | 'archiviert';

export interface ArchivedContractTypeEntry {
    contractType: ContractType;
    archivedAt: string;   // ISO 8601
    archivedBy: string;   // Admin-UID
}

// UserProfile (optional, fehlend = aktiv):
status?: UserStatus;
archivedAt?: string | null;                    // Mitarbeiter-Ebene (D2)
archivedBy?: string | null;
archivedContractTypes?: ArchivedContractTypeEntry[]; // Verhältnis-Ebene (D4)

// UserContractDocument (optional, fehlend = aktiv):
archivedAt?: string | null;                    // Dokument-Ebene (D4)
archivedBy?: string | null;
```

**Restore-Semantik (AC5):**
- **Dokument-Ebene:** `contractDocuments` wird als gesamtes Array neu geschrieben
  (ersetzt das Array in Firestore vollständig) → der Restore entfernt
  `archivedAt`/`archivedBy` komplett: **bit-exakter Vorzustand**.
- **Verhältnis-Ebene:** Restore = `archivedContractTypes` ohne den Eintrag. War das
  Feld vorher nicht vorhanden, bleibt ein leeres Array zurück (semantisch identisch:
  fehlend ≡ leer ≡ aktiv). `contractTypes`/`contractType` werden nie angefasst.
- **Mitarbeiter-Ebene:** `status: 'aktiv'` + `archivedAt: null`, `archivedBy: null`.
  Bewusst **kein** `deleteField()`: AC1 verbietet Lösch-Sentinels an users/Verträgen,
  und die Prädikate behandeln null/'aktiv' exakt wie fehlende Felder — der Vorzustand
  ist semantisch hergestellt (Login wieder aktiv, in allen Listen sichtbar).

## 2. Helpers — `src/lib/contracts/archive.ts` (neu, rein)

Muster: `dataScope.ts` / `relationships.ts` — keine Firebase-Importe, direkt testbar.

```ts
// Prädikate (Lazy: fehlende Felder = aktiv)
isUserArchived(profile): boolean                       // status === 'archiviert'
filterActiveUsers(users): UserProfile[]                // Benutzerlisten
isRelationshipActive(profile, contractType): boolean   // nicht in archivedContractTypes
isDocumentActive(document): boolean                    // !archivedAt
filterActiveContracts(profile, documents): UserContractDocument[]
    // beide Ebenen: Dokument nicht archiviert UND sein Verhältnis aktiv

// Patch-Builder (rein; Firestore-Write macht der Service)
buildArchiveUserPatch(adminUid, now?): Partial<UserProfile>
buildRestoreUserPatch(): Partial<UserProfile>
buildArchiveRelationshipPatch(profile, contractType, adminUid, now?): Partial<UserProfile>
buildRestoreRelationshipPatch(profile, contractType): Partial<UserProfile>
buildArchiveDocumentPatch(profile, documentId, adminUid, now?): Partial<UserProfile>
buildRestoreDocumentPatch(profile, documentId): Partial<UserProfile>

// Selbst-Sperr-Schutz (D5, rein)
canManageUserArchive(currentUid, targetUserId): boolean   // false bei gleichem/leerem uid

// Archiv-Tab-Daten (D3)
buildArchiveContractEntries(profile): ArchiveContractEntry[]
    // je archiviertes Verhältnis + je einzeln archiviertes Dokument ein Eintrag
    // mit archivedAt/archivedBy/isPrimary(Anzeige-Hinweis)/Dokumentenzahl
```

**Schutzzone Abrechnung (Harte Regel 3):** Kein Patch-Builder schreibt `contractType`,
`contractTypes`, `contractDocumentUrl`, `entryDate`, `hourlyRate`, `weeklyHours`,
`monthlyHours`, `vacationDaysPerYear`. `buildContractProfileUpdate` und
`shouldUpdatePrimaryDocumentUrl` bleiben unverändert.

**Fall „archiviertes Verhältnis war primär":** Wird z. B. der Minijob-Strang archiviert,
während `contractType = 'Minijob'` bleibt, wird `contractType` **nicht** umgeschrieben —
die Kontingentlogik (`timeTrackingService.isMinijobber()`) und der Abrechnungsbeleg bleiben
unberührt. Es filtert ausschließlich die Anzeige/Auswahl (Badges, Kacheln, Wizard).
Der Archiv-Tab kennzeichnet den Eintrag mit `isPrimary` und einem Hinweis, dass die
Abrechnungsbasis erst über die Benutzer-Bearbeitung geändert wird.

## 3. View-Filter-Punkte (Grep-Vollzug, 12.09.2026)

Alle Stellen, die `contractType(s)`/Benutzerlisten in aktiven Ansichten lesen:

| # | Ort | Filter |
|---|-----|--------|
| 1 | `settings/page.tsx` Benutzer-Tab: `users.map` (Karten) | `filterActiveUsers(users)` beim Rendern; State bleibt vollständig (Archiv-Tab nutzt dieselbe Liste) |
| 2 | `settings/page.tsx` Karten-Badges: `getContractCoverage(u).filter(isKnownRelationship)` | zentral über archive-aware `getContractCoverage` |
| 3 | `settings/page.tsx` Vertrags-Kacheln: `buildContractOverviewRows(u)` | zentral über archive-aware `buildContractOverviewRows` |
| 4 | `settings/page.tsx` Wizard Schritt 1: `getContractCoverage(selectedUser)` (3 Aufrufe) | zentral über archive-aware `getContractCoverage` — archivierte Verhältnisse fehlen als Kachel, archivierte Dokumente unter „Bereits vorhanden" |
| 5 | `settings/page.tsx` `openContractModal` → `suggestContractType(u, kind)` | erbt Filterung über `getContractCoverage` |
| 6 | `family-helper/page.tsx`: `setUsers(allUsers)` (Arbeiter-Zuordnung, Admin) | `filterActiveUsers(allUsers)` |
| 7 | `travel/page.tsx`: `usersMap` | **bewusst ungefiltert** — keine Auswahlliste, sondern Namensauflösung historischer Fahrtkosten (`creator`, PDF-Export). Archivierte müssen dort weiter benannt werden, sonst „Unbekannt" in GoBD-relevanten Belegen |
| 8 | `time-tracking/page.tsx`: `userProfile?.contractType` (Kontingent-Anzeige) | kein Filter nötig: archivierte Mitarbeiter kommen nicht mehr ins Login (Gate); Schutzzone Kontingentlogik bleibt unangetastet |

Zentrale Archive-Awareness in `relationships.ts` (ein Ort statt sechs Inline-Kopien):
- `getActiveContractRelationships(profile)` = `getContractRelationships` ∘ `isRelationshipActive`
- `getContractCoverage`: Beziehungen = aktive; Reihenfolge = aktive Beziehungen +
  `CONTRACT_TYPE_ORDER` ohne archivierte Typen; Dokumente = `filterActiveContracts`.
- `buildContractOverviewRows`: filtert `ensureContractHistory`-Ausgabe zusätzlich über
  `isDocumentActive` + `isRelationshipActive` (auch der synthetische Ursprungs-Eintrag
  aus `contractDocumentUrl` wird bei archiviertem Primär-Verhältnis ausgeblendet).
- `getContractRelationships` selbst bleibt **unverändert** (wird von
  `buildContractProfileUpdate` genutzt → Schutzzone; `contractTypes` darf durch
  Archivieren nie umgeschrieben werden).

Für Altprofile ohne Archiv-Felder sind alle Ausgaben bit-identisch zum heutigen Verhalten
(Lazy Migration, bestehende Tests bleiben grün).

## 4. Service — `userService.ts`

`deleteUserProfile` (setDoc + **deleteDoc**) wird ersatzlos entfernt (D1/AC1 — danach existiert
in `src/` kein `deleteDoc`-Pfad mehr, der `users` oder Vertragsdokumente betrifft; die
`deleteDoc`-Nutzungen in Seelsorge-/Fachservices bleiben als eigener Zug außen vor, AC7).

Neu (alle mit Read → reinem Patch-Builder → `setDoc(merge)`):
```
archiveUser(userId, adminUid)                    restoreUser(userId)
archiveContractRelationship(userId, type, adminUid)   restoreContractRelationship(userId, type)
archiveContractDocument(userId, docId, adminUid)      restoreContractDocument(userId, docId)
```
Jede Funktion prüft vor dem Write `canManageUserArchive(adminUid, userId)` und wirft sonst
(`CANNOT_ARCHIVE_OWN_ACCOUNT`) — Store-Guard-Ebene des Selbst-Sperr-Schutzes.
`getAllUsers()` liefert weiterhin **alle** Profile (inkl. archivierter) — das Filtern ist
Aufgabe der Views (Punkt 7 der Tabelle braucht die vollständige Liste).

## 5. Auth-Gate (AC4) — `ProtectedRoute.tsx`

Jede Seite der App ist in `ProtectedRoute` gewrappt. Nach dem Profil-Snapshot gilt:
`isUserArchived(userProfile)` → App-Inhalte werden nicht gerendert; stattdessen neutrale
Meldung („Dieses Konto ist nicht aktiv. Bitte wende dich an den Verein.") + Abmelden-Button.
Neutral = keine Details über Archivierung/Daten; kein Redirect auf `/login` (kein Loop, da
`/login` nicht gewrappt ist, aber der Logout-Flow über `useAuth().logout()` läuft).

Restrisiko (dokumentiert, Out-of-Scope): Das Firebase-Auth-Konto selbst bleibt aktiv
(`signIn` technisch erfolgreich); echtes Sperren der Auth-Identität erfordert die Admin SDK
(Cloud Function). Datenzugriff einer archivierten Session bleibt über die bestehenden Rules
möglich — das Gate ist die von AC4 geforderte Ebene („Gate im Auth-Onboarding-Pfad").

## 6. Firestore-Rules (AC6, D5) — Diff-Skizze `firestore.rules`

```diff
+    // Archiv-Felder: Selbst-Archivierung des eigenen Kontos ist verboten (D5/AC6)
+    function touchesUserArchive() {
+      return request.resource.data.diff(resource.data).affectedKeys()
+        .hasAny(['status', 'archivedAt', 'archivedBy', 'archivedContractTypes']);
+    }

     match /users/{userId} {
       allow read: if isOwner(userId) || isKassenwart() || isAdmin();
-      allow delete: if isAdmin();
+      // D1: Hartes Löschen von Benutzern ist serverseitig verboten (Archiv statt Löschen).
       allow create: ...unverändert...
-      allow update: if (isOwner(userId) && !...affectedKeys().hasAny(['role', 'contractType', ...])) || isAdmin();
+      allow update: if
+        (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(
+            ['role', 'contractType', 'vacationDaysPerYear', 'contractDocumentUrl', 'entryDate',
+             'status', 'archivedAt', 'archivedBy', 'archivedContractTypes',
+             'hasFamilyHelperAccess', ... /* bestehende Berechtigungs-Keys */ ]))
+        || (isAdmin() && !(isOwner(userId) && touchesUserArchive()));
     }
```

Bekannte Grenze (dokumentiert): Dokument-Ebenen-Archive (`contractDocuments[].archivedAt`)
sind für Rules nicht elementweise prüfbar, ohne legitime Selbst-Schreibvorgänge
(eigener Vertrags-Wizard des Admins) zu blockieren. Selbst-Dokument-Archivierung wird
deshalb UI-seitig gesperrt (eigene Karte: Buttons deaktiviert, „Sie"-Kennzeichnung).
**Kein `firebase deploy`** — Rules-Deploy ist Chefsache (SPEC §7.3).

## 7. Archiv-Tab (D3) — `settings/page.tsx`

- Neuer `activeTab`-Wert `'archiv'`; Tab-Button nur innerhalb des bestehenden
  `userProfile?.role === 'Admin'`-Blocks (dasselbe Muster wie „Benutzer"/„Dropdowns & App").
- Reale Datenquellen: derselbe `users`-State (Admin lädt bereits `getAllUsers()`) —
  kein Fake-UI, kein zusätzlicher Fetch.
- Bereich **Mitarbeiter**: `users.filter(isUserArchived)` — Name, Rolle,
  „Archiviert am TT.MM.JJJJ von <Name>" (UID → Name über users-Liste), Wiederherstellen.
- Bereich **Verträge**: `users.flatMap(buildArchiveContractEntries)` — Nutzername,
  Ebene (Verhältnis/Dokument), Art/Titel, Datum/Urheber, Primär-Hinweis, Wiederherstellen.
- Archiv-Aktionen im Benutzer-Tab: Papierkorb-Button wird zu „Archivieren"
  (`ArchiveBox`-Icon) mit Bestätigungs-Modal; je Vertrags-Kachel ein Verhältnis-Button,
  je Dokument-Chip ein Dokument-Button. Eigener Account: Buttons deaktiviert +
  Badge „Sie" (Muster Self-Lockout 04.09.).
- Nach jeder Aktion: `userService.getAllUsers()` neu laden (Single Source of Truth)
  + Statusmeldung.

## 8. Teststrategie

`tests/employeeContractArchive.test.ts` (registriert in `tests/run-tests.ts`), rein ohne
Emulator: Lazy-Zustand (fehlende Felder = aktiv, Verhalten identisch zu heute),
Benutzer-Archiv/Restore, Verhältnis-Archiv/Restore (inkl. Filterwirkung auf Coverage/
Overview-Rows), Dokument-vs-Verhältnis (Schichtung: einzeln archiviertes Dokument in
archiviertem Verhältnis), Restore = Vorzustand, Schutzzone (Patches enthalten keine
Abrechnungsfelder; primäres Verhältnis archivierbar ohne `contractType`-Rewrite),
`canManageUserArchive` (Selbst-Sperre), `buildArchiveContractEntries`.
Feste Daten nur in Test-Fixtures (erlaubt), niemals im Produktcode.
