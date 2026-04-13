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

## Best Practices

- **Keine sensiblen Daten** (Passwörter, Tokens) client-seitig speichern
- **FCM Tokens** nur für den eigenen User in Firestore speichern
- **Admin-Operationen** nur über Cloud Functions oder API Routes
- **Security Rules regelmäßig auditieren**
