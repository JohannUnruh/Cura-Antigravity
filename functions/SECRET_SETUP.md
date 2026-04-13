# 🔐 Firebase Secret Manager Setup für Google Calendar

## Security-Hinweis

**WICHTIG:** Speichere NIEMALS Google Service Account Credentials in:
- ❌ `.env` Dateien (werden committet)
- ❌ `firebase.json`
- ❌ Code-Dateien
- ❌ Client-seitigen Umgebungsvariablen
- ❌ Git-Repository

**Richtig:**
- **Produktion:** Firebase Secret Manager (`firebase functions:secrets:set`)
- **Lokal:** `functions/service-account-key.json` (wird von `.gitignore` ignoriert)

---

## Schritt 1: Secrets in Firebase hochladen

### 1.1 Service Account JSON-Key vorbereiten

Du hast die JSON-Schlüsseldatei von Google Cloud erhalten. Öffne sie und extrahiere:

```json
{
  "type": "service_account",
  "project_id": "dein-projekt",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "cura-calendar-service@...iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

### 1.2 Secrets mit Firebase CLI hochladen

```bash
# Firebase Login (falls noch nicht geschehen)
firebase login

# Projekt auswählen
firebase use cura-ant

# Secret 1: Service Account Key (gesamter JSON-Inhalt als String)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# → Füge den gesamten JSON-Inhalt ein (als eine Zeile oder Multi-Line)

# Secret 2: Service Account E-Mail (nur die client_email aus der JSON)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# → Beispiel: cura-calendar-service@cura-ant.iam.gserviceaccount.com

# Secret 3: Google Calendar ID
firebase functions:secrets:set GOOGLE_CALENDAR_ID
# → Beispiel: xxxxxx@group.calendar.google.com
```

### 1.3 Alternative: Secrets aus Datei

```bash
# Aus Datei (sicherer, keine manuelle Eingabe)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY --secret-file=./service-account-key.json
```

---

## Schritt 2: Secrets in firebase.json konfigurieren

Füge zu `firebase.json` hinzu:

```json
{
  "firestore": { ... },
  "storage": { ... },
  "apphosting": { ... },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ]
    }
  ]
}
```

---

## Schritt 3: Environment-Variablen für Cloud Functions

Die Cloud Functions greifen über `functions.secret()` auf die Secrets zu:

```typescript
// In functions/src/calendarFunctions.ts
const serviceAccountKey = functions.secret("GOOGLE_SERVICE_ACCOUNT_KEY");
const calendarId = functions.secret("GOOGLE_CALENDAR_ID");
```

---

## Schritt 4: Secrets verwalten

### Alle Secrets anzeigen
```bash
firebase functions:secrets:access
```

### Einzelnes Secret anzeigen
```bash
firebase functions:secrets:access GOOGLE_CALENDAR_ID
```

### Secret aktualisieren
```bash
firebase functions:secrets:set GOOGLE_CALENDAR_ID
```

### Secret löschen
```bash
firebase functions:secrets:delete GOOGLE_CALENDAR_ID
```

---

## Schritt 5: Deploy der Functions

```bash
# Functions bauen
cd functions
npm run build

# Deploy (nur Functions)
firebase deploy --only functions

# ODER: Alles deployen
firebase deploy
```

---

## Security Best Practices

### ✅ RICHTIG
- Secrets über Firebase Secret Manager verwalten
- Zugriff auf Functions mit `context.auth` prüfen
- Input-Validation mit Zod
- Fehler-Logging ohne sensible Daten
- Regelmäßige Key-Rotation (alle 90 Tage)

### ❌ FALSCH
- Service Account JSON im Git-Repository
- Private Keys in `.env.local` oder `.env`
- Credentials in Client-Code
- Hard-coded E-Mails im Code

---

## Zugriffsberechtigungen prüfen

### Welche Benutzer können Functions aufrufen?
- Nur authentifizierte Firebase-Benutzer
- Additional Checks: `context.auth.token.admin` für Admin-only Functions

### Welche Services können auf Secrets zugreifen?
- Nur die Cloud Functions im gleichen Firebase-Projekt
- Nicht: Client-Code, nicht: externe Services

---

## Troubleshooting

### Fehler: "Permission denied"
```bash
# Prüfe, ob du im richtigen Projekt bist
firebase use

# Prüfe, ob Secrets existieren
firebase functions:secrets:access

# Cloud Function Logs ansehen
firebase functions:log
```

### Fehler: "Invalid credentials"
- Prüfe, ob der Service Account noch aktiv ist
- Prüfe, ob der Kalender für den Service Account freigegeben ist
- Private Key korrekt formatiert? (`\\n` → `\n`)

### Fehler: "Calendar not found"
- Calendar ID korrekt? (endet auf `@group.calendar.google.com` oder `@group.calendar.google.com`)
- Ist der Kalender öffentlich oder freigegeben?

---

## Nächste Schritte

1. ✅ Secrets hochladen
2. ✅ Functions deployen
3. ✅ Client-Service aktualisieren (`calendarService.ts`)
4. ✅ Testen mit `checkCalendarConfig` Function
