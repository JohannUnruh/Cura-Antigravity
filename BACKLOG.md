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

### [P1] Behebung von Farbkontrast- und Darkmode-Mängeln (Ghost-Buttons & Modals) – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Behebung kritischer Kontrastprobleme im Lightmode und Darkmode. Ghost-Buttons ("Abbrechen") müssen im Darkmode lesbar sein (Farbe anpassen). Das allgemeine Modal-Fenster benötigt Unterstützung für das dunkle Farbschema, um blendende weiße Overlays im Darkmode zu vermeiden. Sekundäre Labels im Dashboard müssen kontraststärker dargestellt werden.
- **Akzeptanzkriterien:**
  1. Der Ghost-Button-Variant in `Button.tsx` erhält ein `dark:text-slate-300` (und passende Hover-Klassen), sodass der Kontrast im Darkmode mindestens 4.5:1 beträgt.
  2. Das `Modal`-Element (`Modal.tsx`) erhält Darkmode-Klassen (`dark:bg-slate-900 dark:text-white`), um sich nahtlos in das dunkle Farbschema einzufügen.
  3. Form-Labels, Status-Banner und Buttons, die innerhalb von Modals verwendet werden, erhalten entsprechende `dark:` Kontrast-Klassen.
  4. Die sekundären Labels auf den KPI-Cards im Dashboard und die "Nein"-Labels im Tabellenlayout erhalten kontraststärkere Farben im Lightmode (mindestens `text-gray-600` statt `text-gray-400`).
- **Betroffene Dateien:** `src/components/ui/Button.tsx`, `src/components/ui/Modal.tsx`, `src/app/page.tsx`, `src/app/clients/page.tsx`, `src/app/travel/page.tsx`, `src/app/settings/page.tsx`

### [P2] Beseitigung der React-Eingabebugs für Dezimal- und Zahlenfelder – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Die Stunden- und Vorbereitungsfelder in den Vortrags-, Freizeit- und Beratungsformularen (insbesondere in der individuellen Stundenverteilung per Wochentagsliste) leiden unter dem React-Eingabebug, bei dem der Dezimalpunkt bei der Eingabe (z. B. "1.") gelöscht wird. Auch setzen sich leere Zahlenfelder sofort auf "0" zurück.
- **Akzeptanzkriterien:**
  1. Lokale temporäre String-States (wie bereits für die Hauptstundenfelder implementiert) werden auch für alle individuellen Stundenfelder in der Verteilungsliste und für die Zahleneingaben auf den Vortrags- und Freizeitseiten verwendet.
  2. Die Konvertierung in Float-Werte erfolgt erst beim Absenden oder bei `onBlur`, um das Eintippen von Dezimalwerten (z. B. "1.5") über die Tastatur uneingeschränkt zu ermöglichen.
  3. Leere Eingaben setzen sich während der Eingabe nicht sofort reaktiv auf "0" zurück.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### [P2] Verbesserung der Barrierefreiheit auf Mobilgeräten (Hover-Bedingungen & Fokus-Fallen) – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Optimierung der Benutzeroberfläche für mobile Geräte und Screenreader durch Behebung von Hover-Abhängigkeiten und fehlenden Fokus-Fallen. Aktionssymbole in Tabellenzeilen dürfen nicht ausschließlich bei Hover sichtbar sein, da dies auf Touchscreens nicht möglich ist. Modals und das mobile Menü müssen den Fokus einfangen (Focus Trap).
- **Akzeptanzkriterien:**
  1. Aktionsbuttons in der Klientenliste (`page.tsx`) sind entweder immer sichtbar oder werden durch ein fokussierbares Aktionsmenü (z. B. Drei-Punkt-Menü) ersetzt, das per Klick/Tap aufgerufen werden kann und im Tastaturfokus sichtbar bleibt (`focus-within:opacity-100`).
  2. In Modals (`Modal.tsx`) wird der Fokus mithilfe einer Focus-Trap-Struktur (z. B. durch ein `useEffect`-Fokus-Handling) gefangen, damit der Tastatur-Fokus nicht auf den Hintergrund entweichen kann.
  3. Das mobile Sidebar-Menü fängt den Fokus ein und schließt sich sauber beim Drücken der `Escape`-Taste.
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/Sidebar.tsx`

### Behebung von Tastatursteuerungs- und ARIA-Mängeln bei Klick-Elementen und Formularen – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Behebung von Tastatursteuerungs- und Screenreader-Mängeln im gesamten Projekt. Klickbare `div`- und `tr`-Elemente (wie Tabellenzeilen in der Klientenliste und Bearbeiten/Löschen-Icons in Klienten-Details, Vorträgen, Freizeiten und Zeiterfassung) müssen durch barrierefreie `<button>`-Tags oder Fokus-Strukturen mit Tastatur-Listenern (Enter/Space) und Rollen (`role="button"`) ersetzt werden. Formular-Labels müssen über `htmlFor` korrekt mit den entsprechenden Eingabefeldern (über `id`) verknüpft werden.
- **Akzeptanzkriterien:**
  1. Alle Editier- und Lösch-Buttons in den Listen (Klienten-Historie, Vorträge, Freizeiten, Zeiterfassung) sind per `Tab`-Taste fokussierbar und reagieren auf Tastendruck (Enter/Space).
  2. Tabellenzeilen in der Klientenliste sind fokussierbar (`tabIndex={0}`, `role="link"`) und navigieren bei Tastendruck zur Detailseite.
  3. Alle `<label>`-Elemente in `ClientForm`, `ConsultationForm` und `SkbConsultationForm` haben ein `htmlFor`-Attribut, das auf die `id` des zugehörigen `<input>`- oder `<select>`-Feldes verweist.
  4. Die Dropzone in `PhotoUpload` ist fokussierbar und per Tastatur auslösbar.
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`, `src/app/time-tracking/page.tsx`, `src/components/clients/ClientForm.tsx`, `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/components/ui/PhotoUpload.tsx`

### Absicherung gegen Invalid Date, NaN und Fehlerbehandlung in Vorträgen, Freizeiten und Beratungen – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Wenn Datumsfelder oder Zahlenfelder (wie Schwangerschaftswoche) in den Formularen geleert werden, werden sie als `Invalid Date` oder `NaN` an Firestore übertragen. Zudem fehlen in den Formularen für Vorträge und Freizeiten catch-Blöcke bei Speicher- und Löschvorgängen.
- **Akzeptanzkriterien:**
  1. Datumsänderungen werden vor dem Schreiben in den State validiert (`!isNaN(date.getTime())`). Leere Datumsfelder werden beim Absenden abgefangen und führen nicht zu `Invalid Date` in der DB.
  2. In `SkbConsultationForm` führt das Leeren der Schwangerschaftswoche nicht zu `NaN` im State (Fallback auf `null` oder `0`).
  3. In `LecturesPage` and `RetreatsPage` fangen die Submit- und Delete-Funktionen Fehler ab und benachrichtigen den Benutzer im UI, falls ein Datenbank- oder Berechtigungsfehler auftritt.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### Beheben des Sicherheitsrisikos durch Hochladen des Service Account Keys – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Die Firebase Admin SDK-Initialisierung in `firebaseAdmin.ts` sucht nach `functions/service-account-key.json`. Dieses File liegt im lokalen Workspace. Obwohl es im Root-.gitignore steht, fehlt es in `functions/.gitignore` (dort steht nur `*-service-account-key.json` und `service-account.json`) und es gibt keine `.gcloudignore` Datei. Beim Deployment der Cloud Functions wird diese Datei unbemerkt zu Google Cloud hochgeladen.
- **Akzeptanzkriterien:**
  1. In `functions/.gitignore` wird die genaue Datei `service-account-key.json` eingetragen.
  2. Eine `.gcloudignore` Datei wird im Projekt-Root und im `functions/` Verzeichnis angelegt, um sicherzustellen, dass keine sensitiven JSON-Schlüsseldateien hochgeladen werden.
  3. Die Admin SDK Initialisierung wird so angepasst, dass sie primär Umgebungsvariablen (`process.env.FIREBASE_SERVICE_ACCOUNT`) nutzt, anstatt nach einer lokalen Datei zu suchen.
- **Betroffene Dateien:** `functions/.gitignore`, `src/lib/firebase/firebaseAdmin.ts`, `.gcloudignore` (neu), `functions/.gcloudignore` (neu)

### Absichern des Calendar Feed API-Endpunkts und der Token-Generierung – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Der iCal-Feed-Endpunkt (`/api/calendar/feed`) liest Kalendereinträge und Klientennotizen basierend auf einem `calendarToken` aus. Er prüft jedoch nicht, ob der zugehörige Benutzer gelöscht (`isDeleted: true`) oder deaktiviert ist. Zudem verwendet die Token-Generierung in den Einstellungen einen unsicheren Fallback (`Math.random()`), der potenziell vorhersagbar ist.
- **Akzeptanzkriterien:**
  1. Der API-Endpunkt `/api/calendar/feed/route.ts` prüft nach dem Abruf des Benutzers, ob `userData.isDeleted` oder `userData.deletedAt` vorhanden sind, und gibt in diesem Fall einen Fehler (z.B. 403 Forbidden) zurück.
  2. Die Generierung des Tokens in `src/app/settings/page.tsx` nutzt eine kryptografisch sichere Methode (z.B. `crypto.randomUUID()` oder ein sicheres clientseitiges/serverseitiges Äquivalent) und verzichtet auf den unsicheren `Math.random()` Fallback, bzw. delegiert die Token-Generierung an eine sichere serverseitige Funktion.
- **Betroffene Dateien:** `src/app/api/calendar/feed/route.ts`, `src/app/settings/page.tsx`

### Fehlerbehebung bei Odometer-Eingabe und Fehlerbehandlung im Fahrtkosten-Modul – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Im Fahrtkosten-Modul blockiert eine Fehlfunktion der automatischen Distanzberechnung den gesamten Erfassungsprozess, da der Kilometerstand Ende (`kmEnd`) schreibgeschützt ist. Zudem fehlen clientseitige Plausibilitätsprüfungen (z. B. `kmEnd > kmStart`) und Fehlerbehandlungen bei Datenbankfehlern.
- **Akzeptanzkriterien:**
  1. Es gibt ein Kontrollkästchen "Kilometerstand manuell eingeben". Wenn aktiviert, wird der Schreibschutz (`readOnly`) von `kmEnd` aufgehoben und der Benutzer kann den Kilometerstand manuell eingeben.
  2. Beim Absenden wird validiert, dass `kmEnd > kmStart` ist. Liegt `kmEnd <= kmStart` vor, wird das Absenden verhindert und eine Fehlermeldung im UI angezeigt (statt stillschweigend 0 km einzureichen).
  3. `handleSubmit` and `handleStatusChange` fangen Fehler in einem `try-catch`-Block ab und zeigen dem Benutzer eine Fehlermeldung (z. B. per Toast/Notification) statt unhandled promise rejections auszulösen.
- **Betroffene Dateien:** `src/app/travel/page.tsx`

### Absichern der Fahrtkostenabrechnungen (Travel Expenses) gegen Statusmanipulation – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Die Firestore-Sicherheitsregeln für `travel_expenses` erlauben dem Ersteller (`authorId`), Dokumente beliebig zu erstellen und zu aktualisieren. Es gibt keine Einschränkung bezüglich des Status-Felds, wodurch Benutzer Abrechnungen direkt als `'approved'` oder `'paid'` markieren und genehmigte/ausgezahlte Abrechnungen nachträglich weitreichend manipulieren können.
- **Akzeptanzkriterien:**
  1. Beim Erstellen (`create`) einer Fahrtkostenabrechnung durch einen Nicht-Admin/Nicht-Kassenwart muss der Status zwingend `'pending'` sein.
  2. Beim Aktualisieren (`update`) darf ein normaler Benutzer den Status nicht ändern (nur Kassenwart und Admin dürfen den Status ändern).
  3. Sobald eine Abrechnung den Status `'approved'` oder `'paid'` hat, darf sie von normalen Benutzern weder geändert (`update`) noch gelöscht (`delete`) werden.
- **Betroffene Dateien:** `firestore.rules`

### Beheben der Berechtigungs-Eskalation in den Firestore-Regeln für Benutzerprofile – ✅ 2026-06-09
- **Status:** done
- **Beschreibung:** Die aktuellen Firestore-Sicherheitsregeln erlauben es jedem angemeldeten Benutzer, sein eigenes Profildokument zu bearbeiten (`allow update: if isOwner(userId)`). Da es keine Prüfung auf geänderte Felder gibt, kann ein normaler Benutzer seine eigene Rolle direkt in Firestore auf `'Admin'` ändern. Dadurch erhält er sofort administrativen Zugriff auf die gesamte Anwendung und alle Datenbankdokumente.
- **Akzeptanzkriterien:**
  1. In `firestore.rules` wird beim Erstellen (`create`) eines Benutzerdokuments durch einen Nicht-Admin erzwungen, dass die Rolle standardmäßig auf `'Mitarbeiter'` gesetzt wird.
  2. Beim Aktualisieren (`update`) eines Benutzerdokuments durch einen Nicht-Admin darf sich die Rolle (`role`) sowie vertragliche Felder (`contractType`, `vacationDaysPerYear`, `contractDocumentUrl`, `entryDate`) nicht ändern.
  3. Lokale Verifikation mittels `npm run build` und Simulation von unberechtigten Firestore-Writes über Firebase Emulator/Rules Tests.
- **Betroffene Dateien:** `firestore.rules`

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
