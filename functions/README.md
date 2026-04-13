# 🔐 Google Calendar Integration - Setup Anleitung

## Schnellstart

Du hast bereits:
- ✅ Google Service Account JSON erstellt
- ✅ Kalender "Zefabiko-Belegnungsplan" für Service Account freigegeben

**Jetzt musst du nur noch 3 Secrets hochladen:**

```bash
# 1. Firebase Login
firebase login

# 2. Projekt auswählen
firebase use cura-ant

# 3. Secrets hochladen
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
firebase functions:secrets:set GOOGLE_CALENDAR_ID

# 4. Functions deployen
cd functions
npm run build
firebase deploy --only functions
```

**Fertig!** 🎉

---

## Detaillierte Anleitung

### Secret 1: GOOGLE_SERVICE_ACCOUNT_KEY

1. Öffne deine Service Account JSON-Datei
2. Kopiere den **gesamten Inhalt**
3. Beim Befehl `firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY` einfügen

### Secret 2: GOOGLE_SERVICE_ACCOUNT_EMAIL

1. Aus der JSON-Datei das Feld `client_email` kopieren
2. Beim Befehl `firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL` eingeben

**Beispiel:** `cura-calendar-service@cura-ant.iam.gserviceaccount.com`

### Secret 3: GOOGLE_CALENDAR_ID

1. Google Kalender öffnen
2. "Zefabiko-Belegnungsplan" auswählen
3. Einstellungen → Kalender-ID kopieren

**Beispiel:** `xxxxxx@group.calendar.google.com`

---

## Test

Nach dem Deploy:

```bash
# Logs ansehen
firebase functions:log

# Test-Call (über Firebase Console)
# https://console.firebase.google.com/project/cura-ant/functions
```

---

## Security

- ✅ Credentials sicher im Secret Manager
- ✅ Nur für authentifizierte Benutzer
- ✅ Keine Credentials im Code
- ✅ Automatische Fehlerbehandlung

---

## Hilfe

Siehe [DEPLOY.md](./DEPLOY.md) für vollständige Dokumentation.
