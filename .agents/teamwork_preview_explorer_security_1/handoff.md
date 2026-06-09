# Security Audit Report & Handoff — Cura-App

This report contains the findings, evidence chains, and proposals from the security audit of the Cura-Beratungsmanagement Next.js application.

---

## 1. Observation
We examined the security posture of the application by reviewing key authentication, authorization, and data access files. The exact observations are detailed below:

### A. Privilege Escalation via User Role Modification
- **Location**: `firestore.rules` (lines 30-35) & `src/app/settings/page.tsx` (lines 198-208)
- **Verbatim Code in Rules**:
  ```javascript
  // 1. users Collection
  match /users/{userId} {
    // Jeder sieht sein eigenes Profil, Kassenwart und Admin sehen alle
    allow read: if isOwner(userId) || isKassenwart() || isAdmin();
    allow update, delete: if isOwner(userId) || isAdmin();
    // Admin darf neue User anlegen
    allow create: if isOwner(userId) || isAdmin();
  ```
- **Verbatim Code in Settings Submission**:
  ```typescript
  const profileToSave: UserProfile = {
      ...(userProfile || {}),
      id: user.uid,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
      contractType: form.contractType,
      address: form.address,
      bankDetails: form.bankDetails,
      createdAt: userProfile?.createdAt || new Date(),
  } as UserProfile;
  
  await userService.saveUserProfile(profileToSave);
  ```

### B. Travel Expense Status Manipulation
- **Location**: `firestore.rules` (lines 83-88)
- **Verbatim Code**:
  ```javascript
  // 5. travel_expenses (Fahrtkostenabrechnungen)
  match /travel_expenses/{expenseId} {
    allow create: if isOwner(request.resource.data.authorId) || isAdmin();
    allow read: if isOwner(resource.data.authorId) || isKassenwart() || isAdmin();
    allow update: if isOwner(resource.data.authorId) || isKassenwart() || isAdmin();
    allow delete: if isOwner(resource.data.authorId) || isAdmin();
  }
  ```

### C. Calendar Feed Exposing Deleted/Disabled Users
- **Location**: `src/app/api/calendar/feed/route.ts` (lines 26-47) & `src/app/settings/page.tsx` (line 53)
- **Verbatim Code in Route**:
  ```typescript
  export async function GET(request: Request) {
      try {
          const { searchParams } = new URL(request.url);
          const token = searchParams.get("token");

          if (!token) {
              return new NextResponse("Token is required", { status: 400 });
          }

          // Query Firestore for user matching this calendarToken using admin SDK
          const usersRef = adminDb.collection("users");
          const querySnapshot = await usersRef.where("calendarToken", "==", token).limit(1).get();

          if (querySnapshot.empty) {
              return new NextResponse("Invalid calendar token", { status: 401 });
          }

          const userDoc = querySnapshot.docs[0];
          const userId = userDoc.id;
          const userData = userDoc.data();
          const advisorName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Berater";
  ```
- **Verbatim Code in Settings (Unsecure Fallback)**:
  ```typescript
  const token = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)).replace(/-/g, "");
  ```

### D. Service Account Credential Exposure Risk
- **Location**: `src/lib/firebase/firebaseAdmin.ts` (lines 5-21) & `functions/.gitignore`
- **Verbatim Code in firebaseAdmin.ts**:
  ```typescript
  if (!admin.apps.length) {
      const keyPath = path.join(process.cwd(), "functions", "service-account-key.json");
      if (fs.existsSync(keyPath)) {
          let projectId = "cura-ant";
          try {
              const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
              projectId = serviceAccount.project_id || projectId;
              admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
              });
              console.log("Firebase Admin initialized via service-account-key.json");
  ```
- **Verbatim Code in functions/.gitignore**:
  ```
  # Service Account Keys - NIEMALS committen!
  *-service-account-key.json
  service-account.json
  ```

### E. App Check Disabled for Vertex AI in Client config
- **Location**: `src/lib/firebase/config.ts` (lines 27-41)
- **Verbatim Code**:
  ```typescript
  // App Check暂时 deaktiviert für Development (reCAPTCHA 403 Fehler)
  // Kann später wieder aktiviert werden, wenn reCAPTCHA korrekt konfiguriert ist
  /*
  if (typeof window !== "undefined") {
      ...
  }
  */
  ```

---

## 2. Logic Chain

### A. Privilege Escalation
1. The Firestore rule `allow update: if isOwner(userId) || isAdmin();` permits users to write updates to their own user document `/users/{userId}`.
2. The rule contains no restrictions on fields.
3. Therefore, an authenticated user can perform a client-side update writing `role: 'Admin'` to their user document.
4. The helper function `isAdmin()` in Firestore rules checks `getUserData().role == 'Admin'`. Once the role is updated, the user is recognized as an Admin by all other rules, giving them global read/write access.
5. In the UI, `settings/page.tsx` disables the role dropdown if the user is not an Admin, but it submits whatever role is currently in the React state without verifying it. A user can easily bypass the UI restriction (e.g., via browser DevTools or direct SDK call) and escalate their role.

### B. Travel Expense Status Manipulation
1. The rule `allow update: if isOwner(resource.data.authorId) || isKassenwart() || isAdmin();` permits document owners to update their travel expenses.
2. There are no rules validating that the `status` field is unmodified by the owner, or that the status must be `'pending'` on creation.
3. Therefore, a normal user can create or update a travel expense with `status: 'approved'` or `status: 'paid'`, bypassing the Kassenwart's approval workflow.
4. Furthermore, because there is no lock on approved/paid documents, a user can modify the financial parameters (amount, mileage) of an expense after it has already been approved and paid out.

### C. Calendar Feed Security
1. The calendar iCal feed endpoint `/api/calendar/feed/route.ts` retrieves advisor and client consultation data based solely on the `token` parameter.
2. It does not check if the user is deleted (`isDeleted: true` in Firestore) or disabled in Firebase Auth.
3. Therefore, if a user profile is soft-deleted or disabled, their calendar link remains functional and continues to leak highly sensitive client information.
4. The generation fallback in settings uses `Math.random()`, which is not cryptographically secure and might expose the token to predictability attacks if the PRNG state is compromised.

### D. Service Account Key Leakage
1. The Admin SDK code loads `functions/service-account-key.json`.
2. The root `.gitignore` ignores `service-account-key.json`. However, `functions/.gitignore` only ignores `*-service-account-key.json` and `service-account.json` (meaning it does not match `service-account-key.json` exactly).
3. Without a `.gcloudignore` file, when the CLI runs `firebase deploy --only functions` or when Firebase App Hosting packages the build, the `service-account-key.json` will be included in the source payload uploaded to the cloud repository, exposing private credentials.

---

## 3. Caveats
- We did not perform dynamic penetration testing (e.g., executing actual exploits using test accounts) since we are in a read-only exploration mode.
- We assume that soft-deletion (`isDeleted: true`) is the standard pattern for user deactivation, as seen in `userService.ts` (line 63). If accounts are hard-deleted in Auth but not Firestore, the risk of data exposure via calendar token remains.
- We assume App Check is disabled in production as well, since it is commented out in `config.ts` without any environment check.

---

## 4. Conclusion
The Cura application has critical authorization flaws in its Firestore Security Rules that allow:
- **Privilege escalation**: Any logged-in user can elevate themselves to Admin.
- **Financial fraud**: Users can approve their own travel expenses and modify paid expenses.
- **Sensitive data disclosure**: Inactive/deleted users can access client counseling calendars, and service account keys can be leaked during deployment.

Fixing these vulnerabilities requires immediate updates to `firestore.rules`, endpoint validation logic, and deployment ignore files.

---

## 5. Verification Method
- **Linter & Build**: Run `npm run lint` and `npm run build` to verify that rule or config changes do not break the TypeScript compilation or Next.js packaging.
- **Rule Verification**:
  1. Use the Firebase Emulator Suite for Firestore rules to run unit tests.
  2. Verify that writing `role: 'Admin'` to `/users/{uid}` as an authenticated user `uid` throws a `PERMISSION_DENIED` error.
  3. Verify that updating `status` of `/travel_expenses/{id}` to `'approved'` by a non-kassenwart owner throws a `PERMISSION_DENIED` error.
  4. Verify that `/api/calendar/feed?token=DELETED_USER_TOKEN` returns a 403 status.
- **Deployment Payload Check**: Run `firebase deploy --only functions --dry-run` or examine the generated archive to confirm that `service-account-key.json` is excluded.

---

## 6. Concrete Proposals for BACKLOG.md

### [P0] Beheben der Berechtigungs-Eskalation in den Firestore-Regeln für Benutzerprofile
- **Status:** pending
- **Beschreibung:** Die aktuellen Firestore-Sicherheitsregeln erlauben es jedem angemeldeten Benutzer, sein eigenes Profildokument zu bearbeiten (`allow update: if isOwner(userId)`). Da es keine Prüfung auf geänderte Felder gibt, kann ein normaler Benutzer seine eigene Rolle direkt in Firestore auf `'Admin'` ändern. Dadurch erhält er sofort administrativen Zugriff auf die gesamte Anwendung und alle Datenbankdokumente.
- **Akzeptanzkriterien:**
  1. In `firestore.rules` wird beim Erstellen (`create`) eines Benutzerdokuments durch einen Nicht-Admin erzwungen, dass die Rolle standardmäßig auf `'Mitarbeiter'` gesetzt wird.
  2. Beim Aktualisieren (`update`) eines Benutzerdokuments durch einen Nicht-Admin darf sich die Rolle (`role`) sowie vertragliche Felder (`contractType`, `vacationDaysPerYear`, `contractDocumentUrl`, `entryDate`) nicht ändern.
  3. Lokale Verifikation mittels `npm run build` und Simulation von unberechtigten Firestore-Writes über Firebase Emulator/Rules Tests.
- **Betroffene Dateien:** `firestore.rules`
- **Hinweise:** Verwende `request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'contractType', 'vacationDaysPerYear', 'contractDocumentUrl', 'entryDate'])` in Firestore Rules, um die Änderung dieser Felder durch Nicht-Admins zu verbieten.

### [P0] Absichern der Fahrtkostenabrechnungen (Travel Expenses) gegen Statusmanipulation
- **Status:** pending
- **Beschreibung:** Die Firestore-Sicherheitsregeln für `travel_expenses` erlauben dem Ersteller (`authorId`), Dokumente beliebig zu erstellen und zu aktualisieren. Es gibt keine Einschränkung bezüglich des Status-Felds, wodurch Benutzer Abrechnungen direkt als `'approved'` oder `'paid'` markieren und genehmigte/ausgezahlte Abrechnungen nachträglich weitreichend manipulieren können.
- **Akzeptanzkriterien:**
  1. Beim Erstellen (`create`) einer Fahrtkostenabrechnung durch einen Nicht-Admin/Nicht-Kassenwart muss der Status zwingend `'pending'` sein.
  2. Beim Aktualisieren (`update`) darf ein normaler Benutzer den Status nicht ändern (nur Kassenwart und Admin dürfen den Status ändern).
  3. Sobald eine Abrechnung den Status `'approved'` oder `'paid'` hat, darf sie von normalen Benutzern weder geändert (`update`) noch gelöscht (`delete`) werden.
- **Betroffene Dateien:** `firestore.rules`
- **Hinweise:** Die Regeln müssen prüfen, ob `request.resource.data.status == 'pending'` (bei create) und unbefugtes Ändern des Status bei updates verhindern, sowie Schreibrechte entziehen, sobald der Alt-Status (`resource.data.status`) `'approved'` oder `'paid'` ist.

### [P1] Absichern des Calendar Feed API-Endpunkts und der Token-Generierung
- **Status:** pending
- **Beschreibung:** Der iCal-Feed-Endpunkt (`/api/calendar/feed`) liest Kalendereinträge und Klientennotizen basierend auf einem `calendarToken` aus. Er prüft jedoch nicht, ob der zugehörige Benutzer gelöscht (`isDeleted: true`) oder deaktiviert ist. Zudem verwendet die Token-Generierung in den Einstellungen einen unsicheren Fallback (`Math.random()`), der potenziell vorhersagbar ist.
- **Akzeptanzkriterien:**
  1. Der API-Endpunkt `/api/calendar/feed/route.ts` prüft nach dem Abruf des Benutzers, ob `userData.isDeleted` oder `userData.deletedAt` vorhanden sind, und gibt in diesem Fall einen Fehler (z.B. 403 Forbidden) zurück.
  2. Die Generierung des Tokens in `src/app/settings/page.tsx` nutzt eine kryptografisch sichere Methode (z.B. `crypto.randomUUID()` oder ein sicheres clientseitiges/serverseitiges Äquivalent) und verzichtet auf den unsicheren `Math.random()` Fallback, bzw. delegiert die Token-Generierung an eine sichere serverseitige Funktion.
- **Betroffene Dateien:** `src/app/api/calendar/feed/route.ts`, `src/app/settings/page.tsx`

### [P1] Beheben des Sicherheitsrisikos durch Hochladen des Service Account Keys
- **Status:** pending
- **Beschreibung:** Die Firebase Admin SDK-Initialisierung in `firebaseAdmin.ts` sucht nach `functions/service-account-key.json`. Dieses File liegt im lokalen Workspace. Obwohl es im Root-.gitignore steht, fehlt es in `functions/.gitignore` (dort steht nur `*-service-account-key.json` und `service-account.json`) und es gibt keine `.gcloudignore` Datei. Beim Deployment der Cloud Functions wird diese Datei unbemerkt zu Google Cloud hochgeladen.
- **Akzeptanzkriterien:**
  1. In `functions/.gitignore` wird die genaue Datei `service-account-key.json` eingetragen.
  2. Eine `.gcloudignore` Datei wird im Projekt-Root und im `functions/` Verzeichnis angelegt, um sicherzustellen, dass keine sensitiven JSON-Schlüsseldateien hochgeladen werden.
  3. Die Admin SDK Initialisierung wird so angepasst, dass sie primär Umgebungsvariablen (`process.env.FIREBASE_SERVICE_ACCOUNT`) nutzt, anstatt nach einer lokalen Datei zu suchen.
- **Betroffene Dateien:** `functions/.gitignore`, `src/lib/firebase/firebaseAdmin.ts`, `.gcloudignore` (neu), `functions/.gcloudignore` (neu)
