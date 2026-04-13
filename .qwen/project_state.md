# Cura - Vereins- und Seelsorgeverwaltung

## Projektübersicht

Cura ist eine moderne **Next.js 16** Webanwendung für die christliche Vereins- und Seelsorgeverwaltung. Die Anwendung ermöglicht die Erfassung und Verwaltung von:

- **Beratungsgesprächen** (Consultations) - Standard- und SKB-Beratungen (Schwangerschaftskonfliktberatung)
- **Klientenverwaltung** mit Personengruppen und Demografie
- **Vorträgen** (Lectures) mit Themen, Orten und Teilnehmerzahlen
- **Freizeiten** (Retreats) - Ehe-, Frauen-, Männer-, Jugendfreizeiten
- **Fahrtkostenabrechnungen** (Travel Expenses)
- **Zeiterfassung** (Time Tracking) mit Überstundenpool
- **Kurzgesprächen** (Short Consultations)
- **Google Kalender-Integration** für Kliententermine (Zefabiko-Belegnungsplan)

### Technologie-Stack

| Kategorie | Technologie |
|-----------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **Sprache** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, Lucide Icons |
| **Backend** | Firebase (Firestore, Auth, Storage, Vertex AI) + Cloud Functions |
| **Hosting** | Firebase App Hosting |
| **Charts** | Recharts |
| **PDF** | jsPDF, jspdf-autotable |
| **Excel** | xlsx |
| **Linting** | ESLint 9 |
| **Cloud Functions** | Firebase Functions v1 (Node.js 20) |
| **Google APIs** | googleapis (Calendar API v3) |
| **Validation** | Zod |
| **Push** | Firebase Cloud Messaging (FCM), Web Push API |

### Architektur

```
C:\web-apps\Cura-Antigravity\
├── src/
│   ├── app/                    # Next.js App Router Seiten
│   │   ├── (auth)/            # Authentifizierungsseiten
│   │   ├── clients/           # Klientenverwaltung (+ Kalender-Integration)
│   │   ├── consultations/     # Beratungsgespräche
│   │   ├── lectures/          # Vorträge
│   │   ├── retreats/          # Freizeiten
│   │   ├── travel/            # Fahrtkosten
│   │   ├── time-tracking/     # Zeiterfassung
│   │   ├── overtime-pool/     # Überstundenpool
│   │   ├── history/           # Verlauf/Historie
│   │   ├── settings/          # Einstellungen
│   │   └── actions/           # Server Actions
│   ├── components/
│   │   ├── auth/              # Auth-Komponenten (ProtectedRoute)
│   │   ├── clients/           # Klienten-Komponenten (ClientForm)
│   │   ├── consultations/     # Beratungs-Komponenten
│   │   ├── layout/            # Layout-Komponenten (MainLayout)
│   │   └── ui/                # UI-Basis-Komponenten
│   │       ├── CalendarEventModal.tsx  # Kalender-Modal
│   │       ├── ReminderModal.tsx       # NEU: Erinnerungen
│   │       ├── ReminderList.tsx        # NEU: Erinnerungsliste
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── ...
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Authentifizierungs-Context
│   │   ├── ThemeContext.tsx            # Dark/Light Mode
│   │   ├── SettingsContext.tsx         # App-Einstellungen
│   │   └── PushNotificationContext.tsx # NEU: Push-Benachrichtigungen
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts               # Firebase Initialisierung
│   │   │   └── services/               # Firestore Services
│   │   │       ├── calendarService.ts  # Google Calendar Integration
│   │   │       ├── reminderService.ts  # NEU: Erinnerungen
│   │   │       └── ...
│   │   └── contracts/                  # Vertragslogik
│   └── types/
│       └── index.ts                    # TypeScript Typ-Definitionen
├── functions/                          # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                    # Entry Point
│   │   ├── calendarFunctions.ts        # Calendar Functions
│   │   └── reminderFunctions.ts        # NEU: Reminder Functions
│   ├── package.json
│   ├── tsconfig.json
│   └── service-account-key.json        # ⚠️ NIEMALS committen!
├── public/
│   └── firebase-messaging-sw.js        # NEU: Service Worker für Push
├── firebase.json                       # Firebase Config
├── apphosting.yaml                     # App Hosting + Env Vars
├── firestore.rules                     # Security Rules
└── .firebaserc                         # Projekt: cura-ant
```

## Building und Running

### Entwicklung

```bash
# Installation
npm install

# Entwicklungsserver starten
npm run dev

# Build erstellen
npm run build

# Produktionsserver
npm run start

# Linting
npm run lint
```

### Cloud Functions

```bash
# Functions bauen
cd functions
npm run build

# ALLE Functions deployen (IMMER --project angeben!)
firebase deploy --only functions --project cura-ant

# Nur bestimmte Function deployen
firebase deploy --only functions:createCalendarEvent --project cura-ant

# Logs ansehen
firebase functions:log --project cura-ant

# Logs für bestimmte Function
firebase functions:log --only createCalendarEvent --project cura-ant

# Secrets prüfen
firebase functions:secrets:access GOOGLE_CALENDAR_ID --project cura-ant
firebase functions:secrets:access GOOGLE_SERVICE_ACCOUNT_EMAIL --project cura-ant
```

> **⚠️ WICHTIG**: Beim Setzen von Secrets über PowerShell NIEMALS `echo "wert" | firebase functions:secrets:set` verwenden! PowerShell fügt CRLF-Zeilenumbrüche (`\r\n`) an, die den Secret-Wert korrumpieren. Stattdessen `--data-file` mit einer Datei verwenden, die mit `-NoNewline` geschrieben wurde.

### Umgebungsvariablen

Die App benötigt folgende Environment-Variablen (in `.env.local`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cura-ant
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...  # NEU: Für Push-Benachrichtigungen (Firebase Console → Cloud Messaging)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...   # Optional (App Check)
```

### Firebase Secret Manager (für Cloud Functions)

```bash
# Secrets hochladen
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY --secret-file=./functions/service-account-key.json
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
firebase functions:secrets:set GOOGLE_CALENDAR_ID
```

### Firebase Setup

- **Projekt-ID**: `cura-ant`
- **Firestore Rules**: `firestore.rules` definiert Zugriff nach Rollen (Mitarbeiter, Kassenwart, Admin)
- **App Hosting**: Konfiguriert in `apphosting.yaml` mit CPU/Memory-Limits
- **Cloud Functions Region**: europe-west3 (Frankfurt) für Calendar API
- **Google Calendar ID**: `vla7p60her8983bnumsu6kjqck@group.calendar.google.com` (Zefabiko-Belegnungsplan)

## Entwicklungskonventionen

### TypeScript

- **Strict Mode** aktiviert (`tsconfig.json`)
- **Pfad-Aliase**: `@/*` zeigt auf `./src/*`
- **Module**: ESNext mit Bundler-Resolution
- **JSX**: react-jsx (Next.js App Router)

### Code-Struktur

- **Server Components** als Default (ohne `"use client"`)
- **Client Components** explizit mit `"use client"` kennzeichnen
- **Server Actions** im `app/actions/` Verzeichnis
- **Firebase Services** als Singleton-Module in `lib/firebase/services/`
- **Cloud Functions** in `functions/src/` mit separatem Build

### Styling

- **Tailwind CSS 4** für alle Styles
- **Design-System**: Abgerundete Ecken (`rounded-2xl`, `rounded-[2.5rem]`), Glassmorphismus-Effekte (`backdrop-blur-md`, `bg-white/40`)
- **Farbpalette**: Indigo (Primär), Blau (Vorträge), Türkis (Freizeiten), Orange (Klienten), Grün (Kalender)
- **Dark Mode** unterstützt über `ThemeContext`

### Testing

Keine Test-Frameworks im Projekt konfiguriert. Bei Bedarf hinzufügen.

### Wichtige Typen (aus `src/types/index.ts`)

| Interface | Beschreibung |
|-----------|--------------|
| `UserProfile` | Benutzer mit Rolle (Mitarbeiter/Kassenwart/Admin) |
| `Client` | Klient mit Personengruppe (mit calendarData für Auto-Kalender) |
| `Consultation` | Beratungsgespräch mit SMART-Check |
| `SkbConsultation` | Schwangerschaftskonfliktberatung |
| `Lecture` | Vortrag mit Typ und Teilnehmern |
| `Retreat` | Freizeit mit Typ und Location |
| `TravelExpense` | Fahrtkostenabrechnung |
| `TimeEntry` | Zeiterfassung mit Überstundenpool-Support |
| `Reminder` | **NEU**: Erinnerung mit Titel, Nachricht, Wiederholung (once/weekly/monthly) |
| `FcmToken` | **NEU**: FCM Token für Push-Benachrichtigungen |
| `ReminderFrequency` | **NEU**: 'once' | 'weekly' | 'monthly' |
| `ReminderType` | **NEU**: 'consultation-goal' | 'client-birthday' | 'custom' |

### Rollen & Berechtigungen

Firestore Security Rules definieren:

- **Mitarbeiter**: Eigene Daten lesen/schreiben
- **Kassenwart**: Eigene Daten + Fahrtkosten aller lesen
- **Admin**: Alle Daten lesen/schreiben, User verwalten, Settings bearbeiten

### Neue Collections (seit 31. März 2026)

| Collection | Zweck | Security Rules |
|------------|-------|----------------|
| `reminders` | Erinnerungen für Push-Benachrichtigungen | Owner + Admin |
| `fcmTokens` | FCM Tokens für Push-Zustellung | Owner + Admin |

## Firebase Services

Die wichtigsten Services in `src/lib/firebase/services/`:

| Service | Funktion |
|---------|----------|
| `clientService.ts` | CRUD für Klienten |
| `consultationService.ts` | CRUD für Beratungen (inkl. Legacy & SKB) |
| `lectureService.ts` | CRUD für Vorträge |
| `retreatService.ts` | CRUD für Freizeiten |
| `travelService.ts` | Fahrtkosten mit Status-Workflow |
| `timeTrackingService.ts` | Zeiterfassung mit Überstundenpool |
| `settingsService.ts` | Globale App-Einstellungen (Dropdown-Optionen) |
| `userService.ts` | User-Profile Verwaltung |
| `aiAnalysisService.ts` | Vertex AI Integration für Analysen |
| `calendarService.ts` | Google Calendar Integration (ruft Cloud Functions auf) |
| `reminderService.ts` | **NEU**: CRUD für Erinnerungen + FCM Token Verwaltung |

## Cloud Functions

### `createCalendarEvent` (HTTPS Callable)

- Erstellt Kalendereintrag im "Zefabiko-Belegnungsplan"
- Auth-Pflichtig (nur eingeloggte Benutzer)
- **Holt automatisch den `displayName` des erstellenden Users aus Firebase Auth** und hängt ihn in Klammern an den Titel an (z.B. "Gespräch: Max Mustermann (Johann Unruh)")
- Fallback: Wenn kein `displayName` vorhanden, wird die E-Mail-Adresse verwendet
- Input-Validation mit Zod
- Region: `europe-west3` (Frankfurt)
- Secrets: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- Konfiguriert via `runWith({ secrets: [...], region: 'europe-west3' })`
- Returns: `{ success, eventId, htmlLink }`

### `onClientCreated` (Firestore Trigger)

- Trigger: `clients/{clientId}` onCreate
- Erstellt automatisch Kalender-Eintrag wenn `createCalendarEvent=true`
- Aktualisiert Firestore mit `calendarEventId` und `calendarEventLink`
- Fehler werden in `calendarError` dokumentiert (blockiert Klienten-Anlage nicht)

### `checkCalendarConfig` (HTTPS Callable)

- Health Check für Calendar-Integration
- Prüft Credentials und Kalender-Zugriff
- Returns: `{ success, configured, calendarId, calendarSummary }`

### `sendScheduledReminders` (Scheduled Function)

- **Zeitplan**: Jeden Montag um 09:00 Uhr (Europe/Berlin)
- Sendet Push-Benachrichtigungen für alle fälligen Erinnerungen
- Unterstützt: Einmalig, Wöchentlich, Monatlich
- Region: `europe-west3` (Frankfurt)
- Logs: `firebase functions:log --only sendScheduledReminders --project cura-ant`

### `sendImmediateReminder` (HTTPS Callable)

- Sendet sofortige Push-Benachrichtigung (für Tests/On-Demand)
- Auth-Pflichtig (nur eingeloggte Benutzer)
- Returns: `{ success, sent, failed }`

### `cleanupInvalidTokens` (Scheduled Function)

- **Zeitplan**: Jeden 1. des Monats um 03:00 Uhr
- Entfernt ungültige FCM Tokens aus der Datenbank
- Verhindert Senden an nicht mehr existierende Geräte

## Google Kalender-Integration

### Features

1. **Beim Klienten anlegen**: Checkbox "Kalendereintrag für Erstgespräch erstellen"
   - Datum, Uhrzeit (von/bis), Ort optional
   - Automatische Erstellung via Firestore Trigger

2. **In Klienten-Übersicht**: Kalender-Symbol (📅) in Aktionen-Spalte
   - Öffnet Modal für Terminerstellung

3. **In Klienten-Detailansicht**: Button "Kalendereintrag erstellen"
   - Unter "Neues Seelsorgegespräch" und "Neue SKB-Beratung"

4. **Benutzername im Titel**: Der Name des erstellenden Users wird automatisch in Klammern angehängt
   - Quelle: `displayName` aus Firebase Auth (serverseitig via `admin.auth().getUser(uid)`)

### Security

- Service Account Credentials im Firebase Secret Manager (nicht im Code!)
- Nur authentifizierte Benutzer können Einträge erstellen
- Input-Validation mit Zod (`.nullish()` für optionale Felder)
- App Check temporär deaktiviert für Development

## Benutzerverwaltung & displayName

### Zwei Speicherorte für User-Daten

| Speicherort | Felder | Zugriff | Genutzt für |
|-------------|--------|---------|-------------|
| **Firebase Auth** | `displayName`, `email`, `uid` | `admin.auth().getUser(uid)` | Kalendereinträge (Cloud Function), Authentifizierung |
| **Firestore** `users/{uid}` | `firstName`, `lastName`, `role`, `contractType`, `address`, `bankDetails`, ... | Firestore SDK | App-interne Darstellung (UI), Verträge, Rollen |

### displayName-Synchronisation

- **Beim User anlegen** (Settings → Benutzer → "Benutzer anlegen"):
  - `updateProfile(user, { displayName: "Vorname Nachname" })` wird automatisch aufgerufen
  - Datei: `src/app/settings/page.tsx` → `handleCreateUser()`
- **Bestehende User**: Alle 9 aktuellen User haben bereits manuell einen `displayName` in Firebase Auth erhalten
- **Wenn ein User seinen Namen ändert**: Der `displayName` in Firebase Auth wird aktuell **NICHT** automatisch synchronisiert. Bei Bedarf muss das manuell nachgezogen werden (Admin SDK oder Script)

### Bekannte Probleme / TODOs

- ⚠️ **App Check**: reCAPTCHA 403 Fehler im Development (deaktiviert)
- ⚠️ **displayName-Sync**: Wenn ein User seinen Vor-/Nachnamen im Profil ändert, wird der `displayName` in Firebase Auth nicht aktualisiert. Lösung: `updateProfile()` auch in `handleProfileSubmit()` einbauen
- ⚠️ **apphosting.yaml**: Leere Strings (`value: ""`) sind NICHT erlaubt und verursachen einen `invalid-apphosting-yaml` Build-Fehler! Env-Variablen ohne Wert einfach weglassen oder über die Firebase Console setzen
- 🔧 **Production**: App Check wieder aktivieren wenn reCAPTCHA konfiguriert
- 🔧 **Gelöschte Functions**: `analyzeReceipt` und `sendReceiptEmail` wurden beim letzten Deploy entfernt. Falls sie wieder benötigt werden, müssen sie in `functions/src/index.ts` neu exportiert werden

## Datenimport

Das Projekt enthält Excel-Import-Skripte für bestehende Daten:

- `MappeSeelsorge.xlsx` → Beratungen/Klienten
- `MappeVorträge.xlsx` → Vorträge
- `MappeFreizeiten.xlsx` → Freizeiten

Import-Skripte: `run_import.js`, `run_import_v2.js`, `run_import_v3.js`

## Besondere Features

1. **Überstundenpool**: Zeiterfassung kann zwischen "aktiv" und "Überstundenpool" verschoben werden
2. **Dashboard**: Visuelle Auswertungen mit Recharts (Problemthemen, Personengruppen, Vortrags-/Freizeit-Typen)
3. **PDF-Generierung**: Beratungsdokumentation als PDF exportierbar
4. **Unterschriften**: React Signature Canvas für digitale Unterschriften
5. **AI-Analyse**: Vertex AI Integration für Beratungsanalysen
6. **Google Kalender**: Automatische Terminerstellung für Klienten mit User-Name im Titel
7. **Push-Benachrichtigungen**: **NEU** - Wöchentliche Erinnerungen für Gebetsanliegen (jeden Montag 09:00)

## Aktueller Stand (31. März 2026)

### ✅ Abgeschlossen

- Cloud Functions für Google Calendar implementiert und deployed (europe-west3)
- CalendarEventModal Komponente erstellt
- ClientForm um Kalender-Option erweitert
- Klienten-Übersicht mit Kalender-Symbol
- Klienten-Detailansicht mit Kalender-Button
- Firestore Trigger für automatische Kalendereinträge
- Zod Validation für Input-Daten
- **Secrets korrekt konfiguriert** (GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL)
- **Kalender-Integration funktioniert vollständig** (getestet am 31.03.2026)
- **displayName für alle 9 User in Firebase Auth gesetzt**
- **Automatische displayName-Setzung beim Anlegen neuer User** via `updateProfile()`
- **User-Name wird im Kalendereintrag-Titel angezeigt** (z.B. "Gespräch: Max Mustermann (Johann Unruh)")
- **App Hosting Build-Fehler behoben**: Leerer `value: ""` in `apphosting.yaml` entfernt
- **Alles erfolgreich deployed** (Functions, Firestore Rules, Storage Rules, App Hosting)
- **Push-Benachrichtigungen implementiert** (31.03.2026)
  - reminderService.ts für CRUD-Operationen
  - reminderFunctions.ts mit 3 Cloud Functions (sendScheduledReminders, sendImmediateReminder, cleanupInvalidTokens)
  - PushNotificationContext.tsx für FCM Client-Integration
  - firebase-messaging-sw.js Service Worker
  - ReminderModal und ReminderList Komponenten
  - Settings Tab "Benachrichtigungen" für Admins
  - Firestore Rules für reminders und fcmTokens Collections
  - Build erfolgreich (npm run build + functions/npm run build)

### ⚠️ Offene Punkte

- **App Check**: Temporär deaktiviert für Development
- **displayName-Sync bei Profiländerung**: Noch nicht implementiert
- **Alte Functions** (`analyzeReceipt`, `sendReceiptEmail`): Bei Bedarf neu registrieren
- **VAPID Key**: Muss noch in Firebase Console generiert und in .env.local eingetragen werden

### 📋 Nächste Schritte

1. **Deployment Push**: 
   - VAPID Key in Firebase Console generieren (Project Settings → Cloud Messaging)
   - In `.env.local` eintragen: `NEXT_PUBLIC_FIREBASE_VAPID_KEY=...`
   - Functions deployen: `firebase deploy --only functions --project cura-ant`
   - Firestore Rules deployen: `firebase deploy --only firestore:rules --project cura-ant`
   - App Hosting deployen: `firebase apphosting:deploy --project cura-ant`
2. Optional: `displayName`-Sync auch für Profil-Updates einbauen
3. App Check für Production mit reCAPTCHA konfigurieren
4. Prüfen ob `analyzeReceipt`/`sendReceiptEmail` noch benötigt werden

## Dokumentation

- `functions/README.md` - Schnellstart für Calendar Integration
- `functions/DEPLOY.md` - Vollständige Deploy-Anleitung
- `functions/SECRET_SETUP.md` - Secret Manager Guide
- `PUSH_NOTIFICATIONS.md` - **NEU**: Push-Benachrichtigungen Setup & Verwendung
- `.qwen/team_lead.md` - Teamleiter-Agent (Koordination)
- `.qwen/agent_roles.md` - Agenten-Rollen Definition
- `.qwen/project_state.md` - Projektstand
- `QWEN.md` - Gesamtübersicht
