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

---

## Abgeschlossene Aufgaben

<!-- Der Night Agent verschiebt erledigte Aufgaben hierher mit Datum -->

### Firebase-Berechtigungsfehler beim Laden der App-Einstellungen behoben – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Beim Laden der App (insb. auf der Login-Seite oder vor der Auth-Initialisierung) trat in der Konsole der Fehler `FirebaseError: Missing or insufficient permissions` beim Abruf der globalen Einstellungen auf. Der `SettingsProvider` fragt die Einstellungen nun nur ab, wenn tatsächlich ein Benutzer eingeloggt ist.
- **Akzeptanzkriterien:** Kein Berechtigungsfehler mehr in der Konsole beim Aufruf der Login-Seite oder vor der Authentifizierung.
- **Betroffene Dateien:** `src/contexts/SettingsContext.tsx`

### Notizen-Prefill bei Beratungsgesprächen deaktiviert – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Beim Anlegen eines neuen Beratungsgesprächs oder einer SKB-Beratung für einen bestehenden Klienten wurden die Notizen und Fotos aus dem vorherigen Gespräch mitgenommen. Dies wurde deaktiviert.
- **Akzeptanzkriterien:** Das Notizen-Feld und die Foto-Liste sind bei der Neuanlage standardmäßig leer.
- **Betroffene Dateien:** `src/app/clients/[id]/page.tsx`

### Dashboard-Schnellfilter für überfällige Zieltermine – ✅ 2026-06-08
- **Status:** done
- **Beschreibung:** Ein Widget oder Warn-Badge auf dem Dashboard, das dem Berater sofort anzeigt, welche Klienten vereinbarte Zieltermine überschritten haben, ohne dass ein neues Gespräch erfasst wurde.
- **Akzeptanzkriterien:** Rotes Badge/Liste auf dem Dashboard bei überfälligen Terminen.
- **Betroffene Dateien:** `src/app/page.tsx`

### Visuelle Monats- und Jahresstatistik in der Zeiterfassung – ✅ 2026-06-08
- **Status:** done
- **Beschreibung:** Einbindung einer grafischen Auswertung (Balken- und Kreisdiagramm mit Recharts) in der Zeiterfassung. Zeigt die Verteilung der Stunden nach Kategorien und den täglichen/monatlichen Arbeitszeitverlauf (inkl. Toggle zwischen Monats- und Jahresansicht).
- **Akzeptanzkriterien:** Responsive Recharts-Diagramme auf dem Zeiterfassungs-Dashboard integriert.
- **Betroffene Dateien:** `src/app/time-tracking/page.tsx`

### Einheitliches Dateinamens-Schema für PDF-Exporte – ✅ 2026-06-08
- **Status:** done
- **Beschreibung:** Automatisches Generieren von standardisierten und gut lesbaren Dateinamen beim PDF-Export von Fahrtkostenabrechnungen und Zeiterfassungs-Berichten (z.B. `Fahrtkosten_2_50_2026-06_Mustername.pdf` bzw. `Zeiterfassung_2026-06_Mustername.pdf`).
- **Akzeptanzkriterien:** PDFs werden beim Herunterladen automatisch mit dem formatierten Namen benannt. PDF-Export für Einzeleinträge der Fahrtkosten wurde neu implementiert.
- **Betroffene Dateien:** `src/app/travel/page.tsx`, `src/app/time-tracking/page.tsx`

### Kalender-Abonnement (ICS-Live-Feed) – ✅ 2026-06-08
- **Status:** done
- **Beschreibung:** Bereitstellung eines geschützten iCal-Live-Feeds (URL), den Nutzer in Google Kalender, Outlook oder Apple Kalender abonnieren können. Termine synchronisieren sich dadurch automatisch, wenn neue Beratungen/Zieltermine/Vorträge/Freizeiten angelegt werden.
- **Akzeptanzkriterien:** Einstellungsoption zum Kopieren des persönlichen Kalender-Abo-Links ist in den Benachrichtigungs-Einstellungen integriert.
- **Betroffene Dateien:** `src/app/settings/page.tsx`, `src/lib/firebase/firebaseAdmin.ts`, `src/app/api/calendar/feed/route.ts`

### Optimierungen aus Teambesprechung – ✅ 2026-06-08
- **Status:** done
- **Beschreibung:**
  1. Klienten in der Übersicht nach Datum absteigend sortiert (In-Memory in `clientService`).
  2. Dunkle Überschriften und Labels in den Erfassungsmasken im Darkmode korrigiert (verbesserter Farbkontrast).
  3. Nummern-Inputs (Dauer, Einheiten, Vorbereitung) in der Erfassungsmaske direkt überschreibbar gemacht (Einführung lokaler String-States zur Umgehung von React Number-Input-Bugs).
  4. ZeFabiKo-Logo (`zefabiko_logo.png`) kopiert und in Sidebar sowie auf der Login-Seite integriert.
  5. Nach dem Speichern der App-Einstellungen (Dropdowns) wird der Tab geschlossen (navigiert zum Profil-Tab) und eine Erfolgsmeldung ("Einstellungen wurden gespeichert.") angezeigt.
  6. Sektionen im Beratungsformular (Lebensabschnitt, Problemherkunft, Folgeprobleme, Zieltyp, Zielvereinbarung, Zieltermin) standardmäßig einklappbar gemacht (bei neuen Gesprächen eingeklappt, bei Vorliegen von Daten oder Bearbeitung ausgeklappt).
  7. Bekannten Next.js Fast Refresh-Bug im Firestore SDK behoben, indem IndexedDB-Caching durch `memoryLocalCache` ersetzt wurde (verhindert den Fehler `FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state` bei Modul-Reloads).
  8. Berechtigungsproblem (`Missing or insufficient permissions`) beim Laden der Favoriten-Liste in der Sidebar behoben durch Vereinfachung des Scopes in den Firestore Rules.
  9. Layout-Ausrichtung der Schwangerschaftsdaten-Labels in `SkbConsultationForm` korrigiert (durch min-h und flexbox fluchten die Inputs jetzt perfekt auf einer horizontalen Linie).
- **Betroffene Dateien:** `src/lib/firebase/services/clientService.ts`, `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/components/layout/Sidebar.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/settings/page.tsx`, `src/lib/firebase/config.ts`, `firestore.rules`


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
