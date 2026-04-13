# Deployment

## Firebase App Hosting

Die App wird über **Firebase App Hosting** deployed (nicht Firebase Hosting Classic).

### Voraussetzungen

- Firebase CLI installiert: `npm install -g firebase-tools`
- Eingeloggt: `firebase login`
- Projekt gesetzt: `firebase use cura-ant`

### Deployment

```bash
# 1. Bauen
npm run build

# 2. Deployen
firebase apphosting:deploy --project cura-ant
```

Die Konfiguration liegt in `apphosting.yaml`.

### Umgebungsvariablen setzen

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project cura-ant
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_VAPID_KEY --project cura-ant
```

## Cloud Functions Deployen

```bash
# Functions bauen
cd functions
npm run build
cd ..

# Deployen
firebase deploy --only functions --project cura-ant
```

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

## CI/CD

Firebase App Hosting unterstützt **automatische Deployments** bei Git Push (wenn mit GitHub/GitLab verbunden).

### Manuelles Rollback

```bash
# Vorherige Version wiederherstellen
firebase apphosting:rollouts:list --project cura-ant
firebase apphosting:rollouts:cancel <rollout-id> --project cura-ant
```

## Logs

```bash
# Cloud Function Logs
firebase functions:log --project cura-ant

# App Hosting Logs
firebase apphosting:logs:read --project cura-ant
```

## Wichtige Hinweise

- `.env.local` wird **nicht** committen – Secrets über App Hosting Secrets verwalten
- `firebase.json` ignoriert Functions-Verzeichnis beim App Hosting
- Next.js `output: 'standalone'` wird von App Hosting automatisch genutzt
