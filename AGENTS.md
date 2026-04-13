# Cura-Antigravity

Next.js-App (App Router) mit Firebase App Hosting für das Cura-Beratungsmanagement – Authentifizierung, Firestore/BigQuery, Push-Benachrichtigungen, PDF-Export.

## Befehle

```bash
npm run dev       # Dev-Server (localhost:3000)
npm run build     # Production Build
npm run start     # Server starten
npm run lint      # ESLint
```

## Deployment (Firebase App Hosting)

```bash
firebase apphosting:deploy --project cura-ant
```

Siehe @docs/deployment.md

## Wichtige Konventionen

- **Tailwind v4** mit `@tailwindcss/postcss` – keine `tailwind.config.js` nötig
- **TypeScript strict** – keine `any` ohne zwingenden Grund
- **Firebase Admin SDK** nur in Server-Komponenten/API Routes, **niemals** client-seitig
- **Umgebungsvariablen**: `NEXT_PUBLIC_`-Prefix nur für Client-seitige Keys
- ** ESLint** läuft über `eslint.config.mjs` (flat config)

## Projektstruktur

```
src/
  app/          # Next.js App Router (Pages, Layouts, API Routes)
  components/   # UI-Komponenten
  contexts/     # React Context Provider
  lib/          # Services, Utilities, Firebase-Konfiguration
  types/        # TypeScript Interfaces & Types
public/         # Statische Assets, Service Worker
functions/      # Firebase Cloud Functions (separates npm-Paket)
```

Siehe @docs/architecture.md

## Sicherheit & Authentifizierung

- Firebase Auth (Email/Password)
- Firestore Security Rules in `firestore.rules`
- Siehe @docs/security.md

## Verwandte Dokumentation

- [Push-Benachrichtigungen](./PUSH_NOTIFICATIONS.md)
- [Firebase Skills](./.agents/skills/)
- [Backlog](./BACKLOG.md) – Aufgaben für den Night Agent

---

## Night Agent

Der Night Agent arbeitet autonom Aufgaben aus der [BACKLOG.md](./BACKLOG.md) ab – ohne menschliches Zutun, über mehrere Zyklen hinweg.

### Arbeitsweise

1. **Backlog lesen** → `BACKLOG.md` öffnen, Einträge nach Priorität sortieren (P0 → P3)
2. **Aufgabe wählen** → Höchste Priorität mit `Status: pending`
3. **Kontext sammeln** → Betroffene Dateien lesen, relevante Docs konsultieren
4. **Implementieren** → Code schreiben, Tests schreiben, Konventionen einhalten
5. **Verifizieren** → `npm run build` und `npm run lint` müssen passieren
6. **Backlog aktualisieren** → Status auf `done` setzen, Datum eintragen, in "Abgeschlossene Aufgaben" verschieben
7. **Nächste Aufgabe** → Zurück zu Schritt 1, solange Zeit/Zyklen übrig sind

### Regeln

- **Keine Rückfragen** – bei Unklarheiten: triff eine sinnvolle Entscheidung und dokumentiere sie
- **Build muss passieren** – `npm run build` und `npm run lint` immer ausführen
- **Commit-Nachrichten** – klar, präzise, im Stil bestehender Commits
- **Keine destruktiven Änderungen** – niemals Dateien löschen ohne Ersatz
- **Backlog ist Wahrheit** → jeder Schritt wird dort dokumentiert
- **Blockierte Aufgaben** → wenn etwas nicht lösbar ist: Status auf `blocked` setzen, Grund notieren

### Interaktion mit anderen Agenten

Der Night Agent kann spezialisierte Agenten delegieren:
- **Explore** → für Codebase-Recherche ("Wo wird ClientCard verwendet?")
- **general-purpose** → für komplexe Multi-Schritt-Aufgaben

### Loop-Integration

Der Night Agent wird über den `/loop`-Skill zyklisch gestartet:

```
/loop 30m arbeite die BACKLOG.md ab
/loop list   → aktive Jobs anzeigen
/loop clear  → alle Jobs stoppen
```

### Night Agent starten (manuelles Beispiel)

```
Night Agent: Lies die BACKLOG.md. Arbeite den höchstpriorisierten pending Eintrag ab.
             Verifiziere mit build + lint. Aktualisiere das Backlog.
             Fahre mit dem nächsten Eintrag fort, solange du Zyklen hast.
```
