# Deployment

## Firebase App Hosting

Die App wird über **Firebase App Hosting** deployed (nicht Firebase Hosting Classic).

### Automatisches Deployment (CI/CD)

Firebase App Hosting ist mit dem **GitHub-Repository** (`JohannUnruh/Cura-Antigravity`) verbunden.

- **Branch:** `main`
- **Region:** `europe-west4`
- **Backend-ID:** `cura-app`
- **URL:** `cura-app--cura-ant.europe-west4.hosted.app`

Jeder `git push` auf den `main`-Branch löst automatisch einen Build und Deployment aus:

```bash
# 1. Lokal testen (PFLICHT vor jedem Push!)
npm run lint
npm run build

# 2. Pushen (löst automatisches Deployment aus)
git add .
git commit -m "Beschreibung"
git push
```

### Build-Logs prüfen

Wenn der Build fehlschlägt:

1. **Firebase Console:** App Hosting → Backend → Rollouts
2. **Google Cloud Console:** Cloud Build → Verlauf → Fehlgeschlagene Builds → Step #3 "build" Logs
3. **MCP Tool:** `apphosting_fetch_logs` mit `buildLogs: true`

### Häufige Build-Fehler

| Fehler | Ursache | Fix |
|--------|---------|-----|
| `exit status 51` | TypeScript Kompilierfehler auf dem CI-Server | `npm run build` lokal testen |
| `Type error: ... any` | ESLint/TypeScript strict mode | `as unknown as { ... }` statt `as any` |
| `functions/` Typen fehlen | `tsconfig.json` inkludiert `functions/` | `"exclude": ["node_modules", "functions"]` |
| WASI-Module fehlen | `package-lock.json` fehlen Linux-Dependencies | `npm install --package-lock-only` |

### Voraussetzungen (Manuelles Deployment)

- Firebase CLI installiert: `npm install -g firebase-tools`
- Eingeloggt: `firebase login`
- Projekt gesetzt: `firebase use cura-ant`

```bash
# Manuelles Deployment (nur falls nötig)
npx firebase deploy --only apphosting --project cura-ant
```

Die Konfiguration liegt in `apphosting.yaml`.

### Umgebungsvariablen setzen

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project cura-ant
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_VAPID_KEY --project cura-ant
```

## Cloud Functions Deployen

Cloud Functions werden **separat** deployed (eigenes npm-Paket in `functions/`):

```bash
# Functions bauen
cd functions
npm run build
cd ..

# Deployen
firebase deploy --only functions --project cura-ant
```

> ⚠️ **Wichtig:** `functions/` hat eine eigene `tsconfig.json` und eigene Dependencies. Die Root-`tsconfig.json` muss `"functions"` in `"exclude"` haben, damit der App Hosting Build nicht scheitert.

## Firestore Rules Deployen

```bash
firebase deploy --only firestore:rules --project cura-ant
```

## Storage Rules Deployen

```bash
firebase deploy --only storage --project cura-ant
```

## Alles auf einmal

```bash
firebase deploy --project cura-ant
```

## Manuelles Rollback

```bash
# Vorherige Version wiederherstellen
firebase apphosting:rollouts:list --project cura-ant
firebase apphosting:rollouts:cancel <rollout-id> --project cura-ant
```

## Logs

```bash
# Cloud Function Logs
firebase functions:log --project cura-ant

# App Hosting Build-Logs (über MCP oder Google Cloud Console)
# Google Cloud Console: Cloud Build → Verlauf → Region: europe-west4
```

## Wichtige Hinweise

- `.env.local` wird **nicht** committet – Secrets über App Hosting Secrets verwalten
- `firebase.json` ignoriert Functions-Verzeichnis beim App Hosting
- Next.js `output: 'standalone'` wird von App Hosting automatisch genutzt
- **Vor jedem Push:** `npm run lint` und `npm run build` lokal ausführen
- **`tsconfig.json`:** `functions/` muss in `exclude` stehen (Build-Fehler sonst!)
