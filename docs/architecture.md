# Architektur

## Systemübersicht

Cura ist eine **Next.js 16** Single-Page-Anwendung mit **Firebase App Hosting** als Backend-Infrastruktur.

### Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, lucide-react Icons |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx |
| Datum | date-fns |
| Kalender-Export | Eigene ICS-Generierung (`src/lib/utils/icsExport.ts`) |

## Wichtige UI-Komponenten

| Komponente | Zweck |
|------------|-------|
| `ReminderList.tsx` | Erinnerungsverwaltung mit Inline-Form + Beratungsliste |
| `ConsultationForm.tsx` | Inline-Formular für neue Beratung |
| `ClientForm.tsx` | Inline-Formular für neuen Klienten |
| `ReminderModal.tsx` | Nur noch zum Bearbeiten bestehender Erinnerungen |

## Verzeichnisstruktur

```
C:\web-apps\Cura-Antigravity\
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root Layout
│   │   ├── page.tsx            # Startseite
│   │   ├── settings/           # Einstellungsseiten
│   │   └── api/                # API Routes (Server-seitig)
│   │       └── calendar/feed/route.ts # iCal-Feed Generator (geschützt durch Token)
│   ├── components/
│   │   └── ui/                 # UI-Komponenten (Modals, Listen, etc.)
│   ├── contexts/               # React Context (Auth, Push Notifications, etc.)
│   ├── lib/
│   │   ├── firebase/           # Firebase Config & Services
│   │   │   └── services/       # Business-Logic Services
│   │   └── utils/              # Utilities (ICS-Export, etc.)
│   └── types/
│       └── index.ts            # Zentrale TypeScript Interfaces
├── public/
│   ├── firebase-messaging-sw.js  # Push Notification Service Worker
│   └── manifest.json             # Web App Manifest für PWA (wichtig für iOS-Push)
├── functions/                  # Firebase Cloud Functions (separates npm-Paket, eigene tsconfig!)
│   ├── src/                    # Functions Source (TypeScript)
│   └── lib/                    # Kompilierte Functions
├── docs/                       # Projektdokumentation
├── .agents/skills/             # Firebase Agent Skills (Referenzwissen)
├── firebase.json               # Firebase Konfiguration
├── apphosting.yaml             # App Hosting Konfiguration
├── tsconfig.json               # TypeScript Konfiguration (MUSS functions/ excluden!)
├── firestore.rules             # Firestore Security Rules
├── storage.rules               # Cloud Storage Security Rules
└── .env.local                  # Umgebungsvariablen (nicht committen)
```

## Datenfluss

```
Client (Browser)
    ↓
Firebase Auth ←→ React Context (Auth State)
    ↓
Firestore (Lesen/Schreiben)
    ↓
Cloud Functions (Scheduled/Callable)
    ↓
FCM Push Notifications → Service Worker → Browser Notification
```

## Wichtige Abhängigkeiten

- **firebase** (v12+) – Client SDK
- **firebase-admin** – Server-seitig (Cloud Functions, API Routes)
- **@google-cloud/bigquery** – BigQuery Integration
- **googleapis** – Google API (Kalender, Sheets, etc.)

## Kalender-Abonnement (iCal-Feed)

Die App bietet einen geschützten iCal-Live-Feed, den Berater in ihren persönlichen Kalendern (Google Calendar, Outlook, macOS/iOS) abonnieren können.

- **Endpunkt:** `/api/calendar/feed?token=XYZ`
- **Sicherheitskonzept:** Der Zugriff wird über ein kryptografisch starkes `calendarToken` geschützt, das im Benutzerprofil (`users/{uid}`) in Firestore gespeichert ist und vom Benutzer jederzeit in den Einstellungen zurückgesetzt werden kann.
- **Datenquellen:** Der Feed aggregiert automatisch alle anstehenden und vergangenen Termine aus:
  - Standard-Beratungsgesprächen (inkl. Zielterminen)
  - Schwangerschaftskonfliktberatungen
  - Vorträgen
  - Freizeiten

## Barrierefreiheit & Usability (A11y/UX)

Die Anwendung wurde umfassend nach modernen Web- und Barrierefreiheits-Standards optimiert:

- **Fokus-Steuerung (Focus Trap)**: 
  - Sowohl allgemeine Modals (`Modal.tsx`) als auch die mobile Navigations-Sidebar (`Sidebar.tsx`) sperren den Tastatur-Fokus (`Tab` / `Shift + Tab`) sauber innerhalb des Overlays ein, damit dieser nicht auf den Hintergrund entweichen kann.
  - Beim Schließen von Overlays wird der Fokus automatisch wieder auf das zuvor fokussierte Element zurückgesetzt.
  - Das mobile Menü und Modals schließen sich sauber bei Druck der `Escape`-Taste.
- **Touch-Bedienung auf Mobilgeräten**:
  - Aktionssymbole (Bearbeiten, Löschen, Kalender) in Tabellen wie der Klientenliste sind auf Mobilgeräten standardmäßig immer sichtbar, um eine bequeme Touch-Bedienung ohne Hover-Möglichkeit auf Touchscreens zu garantieren.
- **React Number-Input-Bugs behoben**:
  - Stundenverteilungen und Vorbereitungsstunden in Beratungs-, Vortrags- und Freizeit-Masken nutzen temporäre String-States, um das intuitive und fehlerfreie Eintippen von Dezimalzahlen (z. B. "1.5" bzw. "1,5") ohne reaktive State-Resets oder das Verschwinden des Kommas beim Tippen zu ermöglichen.
