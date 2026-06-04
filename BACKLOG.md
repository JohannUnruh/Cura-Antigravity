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

---

## Abgeschlossene Aufgaben

<!-- Der Night Agent verschiebt erledigte Aufgaben hierher mit Datum -->

### Push-Registrierung auf Mobilgeräten & Live-Listener-Fixes – ✅ 2026-06-04
- **Status:** done
- **Beschreibung:** 
  1. Fehler `Uncaught Error in snapshot listener` behoben, indem ein Error-Callback in `clientService.subscribeFavorites` und `Sidebar.tsx` integriert wurde.
  2. Memory Leak und `permission-denied` beim Logout in `AuthContext.tsx` behoben durch sauberes Aufrufen von `unsubscribeSnapshot()`.
  3. PWA-Support für iOS/Android durch Hinzufügen von `public/manifest.json` und Verlinkung in `src/app/layout.tsx` ermöglicht (zwingend erforderlich für iOS Push-Benachrichtigungen).
  4. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `apphosting.yaml` integriert, damit die Registrierung in der Produktion nicht an einem leeren Key scheitert.
- **Betroffene Dateien:** `src/lib/firebase/services/clientService.ts`, `src/contexts/AuthContext.tsx`, `src/components/layout/Sidebar.tsx`, `src/app/layout.tsx`, `public/manifest.json`, `apphosting.yaml`

### Lesezeichen-Funktion für Klienten – ✅ 2026-05-28
- **Status:** done
- **Beschreibung:** Nutzer sollen Klienten als Favorit markieren können
- **Akzeptanzkriterien:** Stern-Icon im Klienten-Profil, Favoriten-Liste in der Sidebar, Persistenz in Firestore
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/components/ui/ClientCard.tsx`, Firestore Collection `users/{uid}/favorites`
- **Hinweise:** Firestore Security Rules für die neue Collection nicht vergessen

### Datums-Validierung in Erstellungsformularen verbessern – ✅ 2026-05-28
- **Status:** done
- **Beschreibung:** In allen Formularen (`ConsultationForm`, `SkbConsultationForm`, Vorträge und Freizeiten) soll eine clientseitige Validierung sicherstellen, dass das Enddatum (`dateTo`) nicht vor dem Startdatum (`dateFrom`) liegen kann.
- **Akzeptanzkriterien:** Wenn ein Nutzer das Startdatum nach dem aktuellen Enddatum wählt, wird das Enddatum automatisch auf dasselbe Datum angehoben. Ein Absenden mit `dateTo < dateFrom` wird verhindert.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### Verwaiste Zeiterfassungseinträge beim Löschen entfernen – ✅ 2026-05-28
- **Status:** done
- **Beschreibung:** Wenn eine Beratung, eine SKB-Beratung, ein Vortrag oder eine Freizeit gelöscht wird, werden die zugehörigen Zeiterfassungseinträge (die über die `referenceId` verknüpft sind) automatisch gelöscht, um Datenmüll zu vermeiden.
- **Akzeptanzkriterien:** Beim Klick auf "Löschen" für eines der Module werden die verknüpften Zeiterfassungseinträge in der `time_tracking` Firestore Collection gesucht und mitgelöscht.
- **Betroffene Dateien:** `src/lib/firebase/services/consultationService.ts`, `src/lib/firebase/services/timeTrackingService.ts`, `src/app/clients/[id]/page.tsx`

### Benachrichtigungs-Reaktivierung & Fahrtkosten-Erweiterung – ✅ 2026-05-28
- **Status:** done
- **Beschreibung:** 
  1. Tab "Benachrichtigungen" in den Einstellungen wieder eingeblendet und so optimiert, dass sich alle Benutzer (inklusive Kassenwarte) für Push-Benachrichtigungen registrieren können. Wöchentliche Termin-Einstellungen und die Reminder-List wurden weggelassen, da sie durch den ICS-Export abgelöst wurden.
  2. Name des Antragstellers im Fahrtkosten-Modul für Kassenwarte/Admins als Badge in der Metadaten-Zeile eingeblendet, um Anträge sofort zuzuordnen.
  3. Option für Hin- und Rückfahrt (Checkbox) im Fahrtkosten-Modal integriert, welche die API-berechnete Entfernung verdoppelt und die Kilometerstände reaktiv im UI anpasst.
- **Betroffene Dateien:** `src/app/settings/page.tsx`, `src/app/travel/page.tsx`, `src/types/index.ts`

### Flexible Zeiterfassung & Datumsbereichs-Fixes – ✅ 2026-05-27
- **Status:** done
- **Beschreibung:** Steuerung für die automatische Zeiterfassung in allen relevanten Erstellungsformularen (Standard-Beratungsgespräche, SKB-Beratungen, Vorträge und Freizeiten) implementiert. Benutzerdefinierte Stundenverteilung per Wochentagsliste für mehrtägige Zeiträume integriert. Vorbereitungszeit bei Standardberatungen fließt in Zeiterfassung ein und wird als Badge visualisiert. Fehlerbehebung bei Template-Prefills bezüglich Edit-Status durchgeführt und Datumsanzeige robust über `parseFirebaseDate`/`formatDateRange` für korrekte Enddatum-Anzeige bei Zeiträumen umgesetzt.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`, `src/lib/firebase/services/timeTrackingService.ts`, `src/lib/firebase/services/consultationService.ts`, `src/app/clients/[id]/page.tsx`, `src/app/consultations/page.tsx`

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
