# 🚀 Google Calendar Integration - Deploy Guide

## ✅ Abgeschlossene Implementierung

### Cloud Functions
- ✅ `createCalendarEvent` - Erstellt Kalendereinträge per HTTPS Call
- ✅ `onClientCreated` - Firestore Trigger für neue Klienten
- ✅ `checkCalendarConfig` - Health Check für die Konfiguration

### Security
- ✅ Service Account Credentials über Environment Variables
- ✅ Nur authentifizierte Benutzer können Functions aufrufen
- ✅ Input-Validation mit Zod
- ✅ Fehler-Logging ohne sensible Daten

### Client-Integration
- ✅ `calendarService.ts` aktualisiert
- ✅ Automatische Kalendereinträge bei neuen Klienten
- ✅ Manuelle Kalendereinträge aus UI

---

## 📋 deployment steps

### Schritt 1: Secrets in Firebase hochladen

**WICHTIG:** Verwende NIEMALS `.env` Dateien für die Cloud Functions!

```bash
# Zum Projektverzeichnis navigieren
cd C:\web-apps\Cura-Antigravity

# Firebase Login (falls noch nicht geschehen)
firebase login

# Projekt auswählen
firebase use cura-ant
```

#### Secret 1: Service Account Key

Öffne deine Google Service Account JSON-Datei und kopiere den **gesamten Inhalt**.

```bash
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
```

**Eingabe:** Gesamten JSON-Inhalt einfügen (als eine Zeile oder Multi-Line)

#### Secret 2: Service Account E-Mail

Aus der JSON-Datei: Das `client_email` Feld kopieren.

```bash
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
```

**Beispiel:** `cura-calendar-service@cura-ant.iam.gserviceaccount.com`

#### Secret 3: Google Calendar ID

```bash
firebase functions:secrets:set GOOGLE_CALENDAR_ID
```

**Beispiel:** `xxxxxx@group.calendar.google.com`

---

### Schritt 2: Cloud Functions deployen

```bash
# Functions bauen
cd functions
npm run build

# Functions deployen
firebase deploy --only functions
```

**Erwartete Ausgabe:**
```
✔  functions[createCalendarEvent(europe-west3)] Successful create operation.
✔  functions[onClientCreated(europe-west3)] Successful create operation.
✔  functions[checkCalendarConfig(europe-west3)] Successful create operation.
```

---

### Schritt 3: Konfiguration testen

Nach dem Deploy kannst du die Konfiguration testen:

#### Option A: Über Firebase Console
1. Gehe zu [Firebase Console](https://console.firebase.google.com/project/cura-ant/functions)
2. Wähle die Function `checkCalendarConfig`
3. Klicke auf "Test Function"
4. Erwarte: `{ success: true, configured: true, ... }`

#### Option B: Über die App (sobald integriert)
```typescript
import { calendarService } from "@/lib/firebase/services/calendarService";

const result = await calendarService.checkCalendarConfig();
console.log(result);
// { success: true, configured: true, calendarSummary: "Zefabiko-Belegnungsplan" }
```

---

### Schritt 4: Next.js App bauen

```bash
# Zurück zum Projektroot
cd ..

# Build erstellen
npm run build

# Lokal testen
npm start
```

---

## 🔧 Nutzung

### Automatisch: Neuer Klient mit Kalendereintrag

Wenn du einen neuen Klienten im UI anlegst und "Kalendereintrag für Erstgespräch erstellen" aktivierst:

1. Klient wird in Firestore angelegt
2. `onClientCreated` Trigger wird automatisch ausgeführt
3. Kalendereintrag wird erstellt
4. Firestore-Dokument wird mit `calendarEventId` und `calendarEventLink` aktualisiert

**Fehlerfall:** Wenn Kalender fehlschlägt → Klient wird trotzdem angelegt, Fehler wird in `calendarError` dokumentiert.

### Manuell: Kalendereintrag aus UI

1. Klienten-Übersicht: Kalender-Symbol (📅) klicken
2. ODER Klienten-Detailansicht: "Kalendereintrag erstellen" Button
3. Datum, Uhrzeit, Ort eingeben
4. Speichern → `createCalendarEvent` Cloud Function wird aufgerufen

---

## 🛡️ Security Checklist

### ✅ Richtig umgesetzt
- [x] Credentials in Firebase Secret Manager
- [x] Nur authentifizierte Benutzer (via `context.auth`)
- [x] Input-Validation mit Zod
- [x] Keine Credentials im Client-Code
- [x] Keine Credentials in `.env` Dateien
- [x] Service Account Key nicht im Git-Repository (`.gitignore`)

### ⚠️ Wichtig: Service Account Key lokal

Der Service Account Key liegt lokal als `functions/service-account-key.json`.
Diese Datei wird **niemals committet** (`.gitignore`).

Bei Key-Rotation: Neuen Key in Google Cloud Console erstellen, herunterladen,
als `service-account-key.json` im `functions/`-Ordner speichern.

### 🔒 Additional Recommendations

#### 1. Service Account Key Rotation (alle 90 Tage)
```bash
# Neuen Key in Google Cloud Console erstellen
# Alten Key löschen
# Neuen Key hochladen:
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
```

#### 2. Zugriff beschränken
In Google Cloud Console:
- IAM & Admin → IAM
- Service Account auswählen
- Berechtigungen prüfen (nur Calendar API nötig)

#### 3. Logs überwachen
```bash
# Function Logs ansehen
firebase functions:log

# Nur bestimmte Function
firebase functions:log --only createCalendarEvent
```

---

## 🐛 Troubleshooting

### Fehler: "GOOGLE_SERVICE_ACCOUNT_KEY nicht konfiguriert"

**Ursache:** Secret wurde nicht hochgeladen.

**Lösung:**
```bash
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
firebase deploy --only functions
```

---

### Fehler: "Calendar not found"

**Ursachen:**
1. Calendar ID falsch
2. Kalender nicht für Service Account freigegeben

**Lösung:**
1. Calendar ID prüfen (endet auf `@group.calendar.google.com`)
2. In Google Kalender: Drei Punkte → Einstellungen → Für bestimmte Personen freigeben
3. Service Account E-Mail hinzufügen mit "Alle Änderungen vornehmen"

---

### Fehler: "Permission denied" beim Function Call

**Ursache:** Benutzer ist nicht authentifiziert.

**Lösung:**
- Stelle sicher, dass der Benutzer eingeloggt ist
- Firebase Auth Context prüfen

---

### Function wird nicht ausgelöst (onClientCreated)

**Ursache:** `createCalendarEvent` oder `calendarData` Feld fehlt.

**Lösung:**
- ClientForm prüft: `createCalendarEvent` muss `true` sein
- `calendarData` muss Datum, startTime, endTime enthalten

---

## 📊 Monitoring

### Function Invocations ansehen
```bash
firebase functions:log --severity INFO
```

### Calendar Events nachverfolgen
Jedes Event hat `extendedProperties.private`:
- `clientId`: Firestore Client ID
- `clientName`: Name des Klienten
- `createdBy`: Firebase UID des Erstellers
- `autoCreated`: "true" wenn automatisch erstellt

---

## 🔄 Updates

### Function Code ändern
```bash
# Code ändern
# Dann:
cd functions
npm run build
firebase deploy --only functions
```

### Secrets aktualisieren
```bash
firebase functions:secrets:set SECRET_NAME
firebase deploy --only functions
```

---

## 📝 Nächste Schritte

1. ✅ Deploy durchführen (siehe oben)
2. ✅ Testen mit `checkCalendarConfig`
3. ✅ Ersten Klienten mit Kalender anlegen
4. ✅ Logs überwachen (`firebase functions:log`)

---

## 🆘 Support

Bei Problemen:
1. Logs prüfen: `firebase functions:log`
2. Secrets prüfen: `firebase functions:secrets:access`
3. Function Status: Firebase Console → Functions
