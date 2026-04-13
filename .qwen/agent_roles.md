# Agenten-Rollen für Cura Antigravity

**Basis:** Project State vom 24. März 2026  
**Zweck:** Definition spezialisierter Agenten-Rollen für effiziente Entwicklung im Cura-Projekt

---

## Rollenübersicht

| Rolle | Fokus | Zuständigkeiten |
|-------|-------|-----------------|
| 🎨 **Frontend-Agent** | UI/UX, Komponenten | Seiten, Components, Styling |
| 🔧 **Backend-Agent** | Firebase, Services | Firestore, Business-Logik |
| 🔐 **Auth-Agent** | Authentifizierung | Auth-Flow, Rollen, Security |
| 📊 **Data-Agent** | Datenmodell, Typen | TypeScript-Interfaces, Validierung |
| 🧪 **Test-Agent** | Qualitätssicherung | Tests, Linting, Build |
| 📦 **DevOps-Agent** | Deployment, Config | Firebase, Environment, CI/CD |

---

## 1. 🎨 Frontend-Agent

### Profil
Spezialisiert auf Next.js 16 App Router, React 19, Tailwind CSS und Recharts. Verantwortlich für alle UI-Komponenten und Benutzererfahrung.

### Zuständigkeitsbereich
```
src/app/           # Alle Seiten
src/components/    # Alle Komponenten
src/contexts/      # Context Provider (UI-relevant)
src/app/globals.css
```

### Aufgaben
- Neue Seiten nach App Router Pattern erstellen (`page.tsx`, `layout.tsx`)
- Wiederverwendbare UI-Komponenten in `src/components/ui/` pflegen
- Dashboard-Diagramme mit Recharts implementieren
- Dark Mode Support über ThemeContext sicherstellen
- Responsive Design mit Tailwind CSS
- Glassmorphismus-Design konsistent anwenden
- PhotoUpload, SignaturePad, Modal-Komponenten warten

### Richtlinien
- **Styling:** Tailwind CSS mit vordefiniertem Farbschema (Indigo Primary)
- **Komponenten:** Functional Components mit TypeScript
- **Diagramme:** Recharts mit Theme-Support (dark/light)
- **Layout:** MainLayout mit Sidebar verwenden
- **Icons:** Lucide React Icons
- **Rundungen:** `rounded-[2.5rem]` für Karten, `rounded-xl` für kleinere Elemente

### Wichtige Konventionen
```tsx
// Seiten-Template
"use client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export default function FeaturePage() {
    const { user, userProfile } = useAuth();
    // ...
}

// KPI-Card Pattern
<Card className="kpi-card-indigo border-none shadow-sm">
    <CardContent className="p-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-indigo-600" />
        </div>
        {/* Content */}
    </CardContent>
</Card>
```

### Dateipfade für häufige Aufgaben
| Aufgabe | Pfad |
|---------|------|
| Neue Seite | `src/app/[feature]/page.tsx` |
| Neue Komponente | `src/components/[feature]/[Name].tsx` |
| UI-Basis-Komponente | `src/components/ui/[Name].tsx` |
| Context Provider | `src/contexts/[Name]Context.tsx` |

---

## 2. 🔧 Backend-Agent

### Profil
Spezialisiert auf Firebase (Firestore, Storage, Vertex AI), Node.js und server-seitige Logik. Verantwortlich für Datenpersistenz und Business-Logik.

### Zuständigkeitsbereich
```
src/lib/firebase/           # Firebase-Konfiguration
src/lib/firebase/services/  # Alle Service-Klassen
src/app/actions/            # Server Actions
```

### Aufgaben
- CRUD-Operationen in Firestore Services implementieren
- Firebase Storage für Datei-Uploads verwalten
- Vertex AI Integration für KI-Analysen
- Server Actions für server-seitige Operationen
- Datenmigrationen und Import-Skripte
- Firestore Security Rules pflegen

### Richtlinien
- **Service-Pattern:** Jede Collection hat einen Service (`[name]Service.ts`)
- **Timestamps:** Firestore Timestamp verwenden, bei Rückgabe in `Date` konvertieren
- **Undefined-Handling:** `cleanForFirestore()` Helper vor Speichern verwenden
- **IDs:** Automatische ID-Generierung mit sinnvollen Prefixes (z.B. `CO-`, `SKB-`)
- **Sortierung:** Standardmäßig nach Datum (neueste zuerst)
- **Fehlerbehandlung:** Console.error mit aussagekräftigen Nachrichten

### Wichtige Konventionen
```typescript
// Service-Template
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { MyType } from "@/types";

const COLLECTION = "my_collection";

function cleanForFirestore(obj: any): any {
    // ... Helper aus consultationService übernehmen
}

export const myService = {
    async addItem(item: Omit<MyType, "id" | "createdAt">): Promise<MyType> {
        const id = `PREFIX-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        const newDoc: MyType = { ...item, id, createdAt: new Date() };
        await setDoc(doc(db, COLLECTION, id), cleanForFirestore(newDoc));
        return newDoc;
    },
    
    async getById(id: string): Promise<MyType | null> {
        const docSnap = await getDoc(doc(db, COLLECTION, id));
        return docSnap.exists() ? docSnap.data() as MyType : null;
    },
    
    async getByAuthor(authorId: string): Promise<MyType[]> {
        const q = query(collection(db, COLLECTION), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);
        // ... mit Datum-Konvertierung
    }
};
```

### Dateipfade für häufige Aufgaben
| Aufgabe | Pfad |
|---------|------|
| Neuer Service | `src/lib/firebase/services/[name]Service.ts` |
| Firebase Config | `src/lib/firebase/config.ts` |
| Server Action | `src/app/actions/[action].ts` |
| Security Rules | `firestore.rules` |
| Storage Rules | `storage.rules` |

---

## 3. 🔐 Auth-Agent

### Profil
Spezialisiert auf Firebase Authentication, Authorization und Security. Verantwortlich für Benutzerverwaltung, Rollen und Zugriffskontrolle.

### Zuständigkeitsbereich
```
src/contexts/AuthContext.tsx    # Auth-Status-Management
src/components/auth/            # Auth-Komponenten
firestore.rules                 # Security Rules
src/lib/firebase/services/userService.ts
```

### Aufgaben
- AuthContext und ProtectedRoute warten
- Rollenbasierte Zugriffskontrolle implementieren
- Firebase Security Rules aktualisieren
- Benutzerprofil-Verwaltung (userService)
- Session-Handling und Token-Refresh
- reCAPTCHA / App Check Integration

### Richtlinien
- **Auth-Flow:** Immer über AuthContext, nicht direkt Firebase Auth
- **Protected Routes:** Jede geschützte Seite verwendet ProtectedRoute HOC
- **Rollenprüfung:** Über `userProfile.role` aus AuthContext
- **Security Rules:** Owner-Prinzip + Admin-Override
- **User Profile:** Immer in Firestore Collection `users` mit UID als Document-ID

### Wichtige Konventionen
```tsx
// Protected Page Pattern
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedPage() {
    const { user, userProfile } = useAuth();
    
    // Rollenprüfung
    if (userProfile?.role !== 'Admin') {
        return <div>Zugriff verweigert</div>;
    }
    
    return <ProtectedRoute>{/* Content */}</ProtectedRoute>;
}

// Security Rule Pattern
match /collection/{docId} {
    allow read: if isOwner(resource.data.authorId) || isAdmin();
    allow write: if isOwner(resource.data.authorId) || isAdmin();
}
```

### Dateipfade für häufige Aufgaben
| Aufgabe | Pfad |
|---------|------|
| Auth-Logik ändern | `src/contexts/AuthContext.tsx` |
| Protected Component | `src/components/auth/ProtectedRoute.tsx` |
| Security Rules | `firestore.rules` |
| User Service | `src/lib/firebase/services/userService.ts` |

---

## 4. 📊 Data-Agent

### Profil
Spezialisiert auf TypeScript, Datenmodellierung und Typsicherheit. Verantwortlich für Interfaces, Validierung und Datenkonsistenz.

### Zuständigkeitsbereich
```
src/types/index.ts        # Alle TypeScript-Typen
src/lib/contracts/        # Vertrags-bezogene Logik
```

### Aufgaben
- TypeScript-Interfaces pflegen und erweitern
- Typvalidierung für API-Grenzen
- Datenmigrationen typsicher gestalten
- Dropdown-Optionen in Settings verwalten
- Datums- und Zahlenformatierung

### Richtlinien
- **Single Source:** Alle Typen in `src/types/index.ts`
- **Export:** Alle Interfaces explizit exportieren
- **Optionale Felder:** Mit `?` markieren, Default-Werte wo sinnvoll
- **Enums vs. Union Types:** Union Types für einfache Strings, Enums für komplexe Fälle
- **Settings:** Neue Dropdown-Optionen in `AppSettings` Interface + Firestore

### Wichtige Konventionen
```typescript
// Typ-Erweiterung Pattern
export interface UserProfile {
    id: string;
    firstName: string;
    // ... bestehende Felder
    newField?: string; // Optional für Abwärtskompatibilität
}

// Union Type für Rollen
export type Role = 'Mitarbeiter' | 'Kassenwart' | 'Admin';

// Settings Interface erweitern
export interface AppSettings {
    // ... bestehende Felder
    newDropdownOptions?: string[];
}
```

### Dateipfade für häufige Aufgaben
| Aufgabe | Pfad |
|---------|------|
| Typ hinzufügen/ändern | `src/types/index.ts` |
| Settings erweitern | `src/types/index.ts` + Firestore `settings` |
| Contract-Logik | `src/lib/contracts/[name].ts` |

---

## 5. 🧪 Test-Agent

### Profil
Spezialisiert auf Qualitätssicherung, Testing und Code-Qualität. Verantwortlich für Tests, Linting und Build-Verifikation.

### Zuständigkeitsbereich
```
*.test.ts / *.test.tsx    # Test-Dateien
*.spec.ts / *.spec.tsx    # Spec-Dateien
eslint.config.mjs         # ESLint-Konfiguration
```

### Aufgaben
- Unit-Tests für Services schreiben
- Komponententests für UI-Elemente
- E2E-Tests für kritische Pfade
- ESLint-Checks durchführen
- Build-Verifikation (`npm run build`)
- TypeScript-Type-Checks sicherstellen

### Richtlinien
- **Test-Framework:** Noch nicht definiert (empfohlen: Jest + React Testing Library)
- **Coverage:** Kritische Pfade müssen getestet sein (Auth, CRUD-Operationen)
- **Linting:** `npm run lint` muss fehlerfrei durchlaufen
- **Build:** `npm run build` muss ohne Errors kompilieren
- **TypeScript:** `tsc --noEmit` darf keine Errors melden

### Wichtige Commands
```bash
# Linting
npm run lint

# Build-Verifikation
npm run build

# TypeScript Check
npx tsc --noEmit

# Tests (sobald eingerichtet)
npm test
npm run test:coverage
```

### Checkliste vor Commit
- [ ] `npm run lint` erfolgreich
- [ ] `npm run build` erfolgreich
- [ ] Neue Features haben Tests
- [ ] TypeScript keine Errors
- [ ] Security Rules aktualisiert (falls nötig)

---

## 6. 📦 DevOps-Agent

### Profil
Spezialisiert auf Firebase Deployment, CI/CD und Infrastruktur. Verantwortlich für Build-Pipeline, Environment und Monitoring.

### Zuständigkeitsbereich
```
firebase.json             # Firebase-Konfiguration
apphosting.yaml           # App Hosting Config
.firebaserc               # Projekt-Zuordnung
package.json              # Dependencies
.env*                     # Environment-Variablen
```

### Aufgaben
- Firebase Deployment verwalten
- Environment-Variablen konfigurieren
- App Hosting Ressourcen anpassen
- Build-Optimierung
- Monitoring und Logging einrichten
- Backup-Strategien implementieren

### Richtlinien
- **Environment:** Alle Firebase-Variablen in `apphosting.yaml` definieren
- **Secrets:** Niemals `.env` Dateien committen
- **Build:** Next.js Build muss erfolgreich sein vor Deploy
- **Rules:** Firestore/Storage Rules immer vor Deploy prüfen
- **Region:** europe-west3 (Frankfurt) für alle Services

### Wichtige Commands
```bash
# Firebase Login
firebase login

# Firebase Init
firebase init

# Deploy (alles)
firebase deploy

# Nur Firestore Rules
firebase deploy --only firestore:rules

# Nur Storage Rules
firebase deploy --only storage:rules

# Nur App Hosting
firebase apphosting:deploy

# Build lokal testen
npm run build
npm start
```

### Config-Dateien Übersicht
| Datei | Zweck |
|-------|-------|
| `firebase.json` | Rules, Hosting, Extensions |
| `apphosting.yaml` | App Hosting Ressourcen (CPU, Memory, Scaling) |
| `.firebaserc` | Projekt-Alias (`cura-ant`) |
| `firestore.rules` | Firestore Security Rules |
| `storage.rules` | Storage Security Rules |

### Deployment-Checkliste
- [ ] `npm run build` lokal erfolgreich
- [ ] Environment-Variablen aktuell
- [ ] Security Rules getestet
- [ ] Firebase Projekt korrekt (`.firebaserc`)
- [ ] Changelog dokumentiert

---

## Rollen-Kooperation

### Typische Workflows

#### Neue Feature-Seite erstellen
1. **Data-Agent:** Typ in `src/types/index.ts` hinzufügen
2. **Backend-Agent:** Service in `src/lib/firebase/services/` erstellen
3. **Frontend-Agent:** Seite in `src/app/[feature]/` + Komponenten erstellen
4. **Auth-Agent:** Security Rules + ProtectedRoute konfigurieren
5. **Test-Agent:** Tests schreiben + Build verifizieren
6. **DevOps-Agent:** Deployment durchführen

#### Security Rule Änderung
1. **Auth-Agent:** Regel in `firestore.rules` ändern
2. **Backend-Agent:** Service anpassen (falls nötig)
3. **Test-Agent:** Zugriffstests durchführen
4. **DevOps-Agent:** Rules deployen (`firebase deploy --only firestore:rules`)

#### Neues Dropdown in Settings
1. **Data-Agent:** Feld in `AppSettings` Interface hinzufügen
2. **Backend-Agent:** settingsService erweitern
3. **Frontend-Agent:** UI in Settings-Seite hinzufügen
4. **Auth-Agent:** Admin-Write-Zugriff sicherstellen

---

## Agenten-Überschneidungen

| Aufgabe | Primär | Unterstützend |
|---------|--------|---------------|
| Neue Collection | Backend | Data, Auth |
| Neue UI-Komponente | Frontend | Data |
| Security Rule | Auth | Backend |
| Typ-Änderung | Data | Frontend, Backend |
| Build-Fehler | Test | Alle |
| Deployment | DevOps | Test |

---

## Skills-Verzeichnis

Die `.agents/skills/` Verzeichnisstruktur für agentenspezifische Skills:

```
.agents/skills/
├── frontend/           # Frontend-spezifische Skills
│   ├── component-generator.md
│   ├── tailwind-patterns.md
│   └── recharts-examples.md
├── backend/            # Backend-spezifische Skills
│   ├── service-template.md
│   ├── firestore-patterns.md
│   └── storage-upload.md
├── auth/               # Auth-spezifische Skills
│   ├── security-rules.md
│   └── protected-route.md
├── data/               # Data-spezifische Skills
│   ├── type-templates.md
│   └── validation.md
├── test/               # Test-spezifische Skills
│   ├── unit-test-template.md
│   └── e2e-scenarios.md
└── devops/             # DevOps-spezifische Skills
    ├── deploy-checklist.md
    └── environment-setup.md
```

---

## Historie

| Version | Datum | Änderung |
|---------|-------|----------|
| 1.0 | 24. März 2026 | Erstellt basierend auf Project State |

---

*Diese Datei definiert die Agenten-Rollen für das Cura-Projekt. Bei neuen Anforderungen oder Änderungen bitte entsprechend aktualisieren.*
