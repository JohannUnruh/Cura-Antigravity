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
│   └── firebase-messaging-sw.js  # Push Notification Service Worker
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
