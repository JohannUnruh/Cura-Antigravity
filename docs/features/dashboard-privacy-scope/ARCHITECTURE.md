# 🏗️ ARCHITECTURE: Privatsphären-Scope im Dashboard

## 1. Schichtmodell

```
Firestore (Rules: owner + isAdmin)
        │
        ▼
Services (getConsultations / getLectures / getRetreats / getAllClients)
        │
        ▼
dataScope.ts  ← EIZIGE Stelle, die entscheidet, was in den State darf
        │
        ▼
Dashboard (page.tsx)  ← rendert im Verbandsmodus nur Kennzahlen
```

Die Filterung liegt **nicht** in der UI, sondern in einer reinen Funktion zwischen Service und
State. Begründung: Nur so kann ein zu viel geladener Datensatz die Oberfläche strukturell nicht
erreichen, und nur so ist das Verhalten ohne React testbar.

## 2. `src/lib/utils/dataScope.ts`

| Export | Vertrag |
|---|---|
| `scopeToOwner(records, uid)` | Behält nur `authorId === uid`; Datensätze ohne `authorId` werden verworfen (im Zweifel gegen die Anzeige). Leere `uid` → leeres Ergebnis. |
| `isAssociationViewAllowed({uid, viewMode, role})` | `true` genau dann, wenn `viewMode === 'all'` **und** `role === 'Admin'`. |
| `scopeRecords(records, ctx)` | Tor zum State: bei erlaubter Verbandsansicht durchlässig, sonst Eigentümerfilter. |
| `buildAnonymousAssociationStats(input, opts)` | Verdichtet zu `AnonymousAssociationStats`. |

### Typparantie gegen Personenbezug
`AssociationStatsInput` deklariert **bewusst nur** die Felder, die zur Aggregation nötig sind
(`dateFrom`, Stunden, `participantCount`, Kategorie-IDs). Klientenname, Mitgliedername, Notizen,
`goalAgreement` und `topic` (Freitext) stehen nicht im Typ – die Funktion kann sie nicht lesen und
damit nicht ausgeben. Für Legacy-Beratungen wird `consultationType` (Kategorie) statt `topic`
(Freitext) verwendet.

### Jahresfilter
`matchesYear()` arbeitet auf demselben String-Jahr wie der bestehende eigene-Zweig
(`yearFilter` ist `string`, `'all'` deaktiviert den Filter) – kein Drift zwischen beiden Ansichten.

## 3. `src/app/page.tsx`

- `isAssociationView` einmal aus `dataScope` abgeleitet und **alle** Zweige (Laden, Memo-Blöcke,
  Beschriftung, Icons) entscheiden über dieses eine Flag – nicht über `viewMode === 'all'`.
- Ladezweig Verbandsansicht: 4 Services statt 5 (keine Klienten).
- `stats` bekommt für den Verbandszweig einen Early-Return auf die anonymen Kennzahlen;
  `groupData` ist dort leer, `clientCount` `null` (deshalb `?? 0` am Darstellungsort).
- `overdueClients`-Memo und Personengruppen-Card sind an `!isAssociationView` gebunden.
- Der KPI „Eigene Klienten" heißt im Verbandsmodus „Erfasste Beratungen" und zeigt Fallzahlen statt
  Personenzahlen – die Kachel bleibt ehrlich beschriftet, statt einen Client-Count zu zeigen, der
  nie geladen wurde.

## 4. Teststrategie (`tests/dataScope.test.ts`, registriert in `tests/run-tests.ts`)

Zwei Suiten: Eigentümer-Filter (7 Fälle inkl. „Nicht-Admin im Modus `all` sieht trotzdem nur
eigene") und anonyme Statistik (8 Fälle, darunter ein expliziter Negativtest: „enthält weder
Namen, IDs noch Freitexte aus den Quelldaten").

## 5. Bekannte Grenzen

- Die Daten wandern im Verbandsmodus weiterhin vom Server zum Browser des Admin (Admin-Lesezugriff
  bleibt bestehen). Der Schutz ist **Darstellungs- und State-Ebene**, nicht Netzwerkebene.
  Netzwerkebene würde `|| isAdmin()` in den Rules benötigen → siehe `DECISIONS.md`.
- `family_cases` und `foster_*` sind in den Rules bewusst teamweit lesbar (Sachgemeinschaft in der
  Familienhilfe/Pflegekinderdase) und bleiben hier unangetastet.
