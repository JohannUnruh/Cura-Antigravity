# Backlog

Hier werden Aufgaben gesammelt, die der **Night Agent** autonom abarbeitet.

## Format

Jeder Eintrag folgt diesem Schema:

```markdown
### [Priorität] Aufgaben-Titel
- **Status:** pending | in-progress | done | blocked
- **Beschreibung:** Kurze, klare Beschreibung der Aufgabe
- **Akzeptanzkriterien:** Woran erkennt man, dass die Aufgabe erledigt ist?
- **Betroffene Dateien:** Welche Dateien sind relevant?
- **Hinweise:** Zusätzliche Infos, Fallstricke, Kontext
```

### Prioritäten

| Priorität | Bedeutung |
|-----------|-----------|
| `P0` | Kritisch – sofort erledigen |
| `P1` | Hoch – wichtige Funktion, bald erledigen |
| `P2` | Mittel – kann in späteren Zyklen kommen |
| `P3` | Niedrig – wenn Zeit übrig ist |

---

## Backlog

<!-- Trage hier neue Aufgaben ein. Der Night Agent arbeitet sie der Priorität nach ab. -->

### Beispiel: P2 – Lesezeichen-Funktion für Klienten
- **Status:** pending
- **Beschreibung:** Nutzer sollen Klienten als Favorit markieren können
- **Akzeptanzkriterien:** Stern-Icon im Klienten-Profil, Favoriten-Liste in der Sidebar, Persistenz in Firestore
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/components/ui/ClientCard.tsx`, Firestore Collection `users/{uid}/favorites`
- **Hinweise:** Firestore Security Rules für die neue Collection nicht vergessen

---

## Abgeschlossene Aufgaben

<!-- Der Night Agent verschiebt erledigte Aufgaben hierher mit Datum -->

<!--
### [P1] Beispiel-Aufgabe – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** ...
-->

### Git-Repo bereinigen – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** `.firebase/`, `node_modules/`, Service Account Keys und andere Secrets aus Git entfernt. Sauberer initialer Commit mit nur Projektdateien (130 Dateien statt 49.000).
- **Betroffene Dateien:** `.gitignore`, `.firebase/`, `functions/service-account-key.json`, diverse Scripts

### Erinnerungsverwaltung verbessern – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** Modal-Form durch Inline-Form ersetzt. Neue Funktion "Aus Beratung erstellen" – zeigt terminierte Beratungen mit Checkboxen, automatische Erinnerungserstellung mit Titel, Datum und Notiz aus der Beratung.
- **Betroffene Dateien:** `src/components/ui/ReminderList.tsx`, `src/lib/firebase/services/reminderService.ts`

### Test-Benachrichtigung Fix – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** Pfad `/favicon.ico` nach `/favicon.png` korrigiert (verursachte 404-Fehler bei Test-Benachrichtigung).
- **Betroffene Dateien:** `src/contexts/PushNotificationContext.tsx`

### Einstellungen-Tabs verbessern – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** `overflow-x-auto` entfernt, Tabs liegen jetzt fest nebeneinander ohne Scroll-Bereich.
- **Betroffene Dateien:** `src/app/settings/page.tsx`

### UI & ICS-Export Optimierungen – ✅ 2026-05-13
- **Status:** done
- **Beschreibung:** 
  1. Zieltermine werden jetzt korrekt in den Beratungs- und Klientenübersichten angezeigt (Fehler "invalid Date" behoben).
  2. ICS-Exporte haben jetzt wöchentliche Erinnerungen (RRULE) bis zum Zieltermin.
  3. ICS-Exporte weisen nun korrekt den Beraternamen (Vor- und Nachname) zu.
  4. Sidebar und Einstellungen aufgeräumt (Historie und Benachrichtigungs-Tabs ausgeblendet).
  5. Deployment-Fehler durch TypeScript-Linter (any-Typen) behoben.
  6. **Kritischer Fix:** `tsconfig.json` excludiert jetzt `functions/` – behebt den persistenten Build-Fehler (exit status 51) auf Firebase App Hosting.
- **Betroffene Dateien:** `src/lib/utils/icsExport.ts`, `src/app/clients/[id]/page.tsx`, `src/app/consultations/page.tsx`, `src/components/layout/Sidebar.tsx`, `tsconfig.json`
