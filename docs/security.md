# Sicherheit & Authentifizierung

## Firebase Auth

- Authentifizierung über **Email/Password**
- Auth State wird über React Context bereitgestellt
- Geschützte Routen prüfen Auth State client-seitig
- Server-seitige Validierung in API Routes über `firebase-admin`

## Firestore Security Rules

Definiert in `firestore.rules`:

- **Authentifizierte Nutzer** lesen/schreiben nur eigene Dokumente
- **Admin-Rollen** haben erweiterte Zugriffsrechte
- **Absicherung gegen Berechtigungs-Eskalation (`users/{userId}`)**: Normale Benutzer können ihre Profil-Rolle (`role`) sowie vertragliche Felder (`contractType`, `vacationDaysPerYear`, `contractDocumentUrl`, `entryDate`) nicht selbst erstellen oder ändern. Dies schützt das System davor, dass normale Benutzer sich selbst Admin-Rechte zuweisen.
- **Absicherung der Fahrtkosten (`travel_expenses/{expenseId}`)**: Normale Benutzer müssen Abrechnungen standardmäßig im Status `'pending'` einreichen. Normale Benutzer können den Status nicht manipulieren (nur Admins und Kassenwarte dürfen den Status ändern). Sobald eine Abrechnung genehmigt (`'approved'`) oder ausgezahlt (`'paid'`) wurde, ist sie für normale Benutzer komplett gesperrt und kann weder bearbeitet noch gelöscht werden.
- Rules müssen vor Deployment geprüft werden:
  ```bash
  firebase deploy --only firestore:rules --project cura-ant
  ```

## Cloud Storage Security Rules

Definiert in `storage.rules`:

- Zugriff nur für authentifizierte Nutzer
- Datei-Uploads auf erlaubte Typen beschränken

## Umgebungsvariablen

`.env.local` (niemals committen):

| Variable | Zweck |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client-seitiger API Key |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Push Notification Public Key |
| `FIREBASE_ADMIN_CREDENTIALS` | Admin SDK (server-seitig) |

> ⚠️ **API Keys im Client-Code sind beabsichtigt** – Firebase nutzt diese nur zur Projekt-Identifikation. Zugriff wird über Security Rules kontrolliert, nicht über den API Key.

## Geheimnisse & Credentials

### Regeln

- **Keine Secrets im Git-Repository** – keine Service Account Keys, OAuth Tokens, Passwörter
- **`.gitignore`** schützt vor versehentlichem Commit von `*.service-account-key.json`, `.env*`, `node_modules/`, `.firebase/`, `.next/`
- **Cloud Functions Secrets** über Firebase Secret Manager verwalten (`firebase functions:secrets:set`)
- **Lokale Service Account Keys** (`functions/service-account-key.json`) werden von `.gitignore` ignoriert – niemals committen

### Key-Rotation

Wenn ein Key kompromittiert wurde oder regelmäßig (empfohlen: alle 90 Tage):

1. Neuen Key in [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) erstellen
2. Alten Key löschen
3. Neuen Key als `functions/service-account-key.json` speichern
4. Firebase Functions neu deployen: `firebase deploy --only functions --project cura-ant`

## Cloud Functions

- Functions laufen server-seitig (Firebase Cloud Functions)
- `firebase-admin` hat vollen Zugriff – daher nur in Functions/API Routes verwenden
- Callable Functions prüfen immer `context.auth` auf Authentifizierung

## Kalender-Abonnement (iCal-Feed) Sicherheit

- **Token-basierte Authentifizierung**: Da Kalender-Clients (Google Calendar, Outlook) keine HTTP-Header-Authentifizierung oder OAuth unterstützen, ist der Feed über ein Query-Parameter-Token (`?token=...`) geschützt.
- **Kryptografisch sichere Tokens**: Das Token wird mit `crypto.randomUUID()` generiert und in Firestore beim Benutzerdokument gespeichert.
- **Token-Rotation**: Benutzer können ihr Kalendertoken in den Einstellungen jederzeit zurücksetzen. Das alte Token wird sofort ungültig, wodurch der alte Feed-Link keinen Zugriff mehr bietet.
- **Minimale Daten-Exposition**: Die API-Route liest nur die Daten des verknüpften Autors (Beraters).

## Best Practices

- **Keine sensiblen Daten** (Passwörter, Tokens) client-seitig speichern
- **FCM Tokens** nur für den eigenen User in Firestore speichern
- **Admin-Operationen** nur über Cloud Functions oder API Routes
- **Security Rules regelmäßig auditieren**
