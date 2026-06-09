### [P0] Beheben der Berechtigungs-Eskalation in den Firestore-Regeln für Benutzerprofile
- **Status:** pending
- **Beschreibung:** Die aktuellen Firestore-Sicherheitsregeln erlauben es jedem angemeldeten Benutzer, sein eigenes Profildokument zu bearbeiten (`allow update: if isOwner(userId)`). Da es keine Prüfung auf geänderte Felder gibt, kann ein normaler Benutzer seine eigene Rolle direkt in Firestore auf `'Admin'` ändern. Dadurch erhält er sofort administrativen Zugriff auf die gesamte Anwendung und alle Datenbankdokumente.
- **Akzeptanzkriterien:**
  1. In `firestore.rules` wird beim Erstellen (`create`) eines Benutzerdokuments durch einen Nicht-Admin erzwungen, dass die Rolle standardmäßig auf `'Mitarbeiter'` gesetzt wird.
  2. Beim Aktualisieren (`update`) eines Benutzerdokuments durch einen Nicht-Admin darf sich die Rolle (`role`) sowie vertragliche Felder (`contractType`, `vacationDaysPerYear`, `contractDocumentUrl`, `entryDate`) nicht ändern.
  3. Lokale Verifikation mittels `npm run build` und Simulation von unberechtigten Firestore-Writes über Firebase Emulator/Rules Tests.
- **Betroffene Dateien:** `firestore.rules`
- **Hinweise:** Verwende `request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'contractType', 'vacationDaysPerYear', 'contractDocumentUrl', 'entryDate'])` in Firestore Rules, um die Änderung dieser Felder durch Nicht-Admins zu verbieten.

### [P0] Absichern der Fahrtkostenabrechnungen (Travel Expenses) gegen Statusmanipulation
- **Status:** pending
- **Beschreibung:** Die Firestore-Sicherheitsregeln für `travel_expenses` erlauben dem Ersteller (`authorId`), Dokumente beliebig zu erstellen und zu aktualisieren. Es gibt keine Einschränkung bezüglich des Status-Felds, wodurch Benutzer Abrechnungen direkt als `'approved'` oder `'paid'` markieren und genehmigte/ausgezahlte Abrechnungen nachträglich weitreichend manipulieren können.
- **Akzeptanzkriterien:**
  1. Beim Erstellen (`create`) einer Fahrtkostenabrechnung durch einen Nicht-Admin/Nicht-Kassenwart muss der Status zwingend `'pending'` sein.
  2. Beim Aktualisieren (`update`) darf ein normaler Benutzer den Status nicht ändern (nur Kassenwart und Admin dürfen den Status ändern).
  3. Sobald eine Abrechnung den Status `'approved'` oder `'paid'` hat, darf sie von normalen Benutzern weder geändert (`update`) noch gelöscht (`delete`) werden.
- **Betroffene Dateien:** `firestore.rules`
- **Hinweise:** Die Regeln müssen prüfen, ob `request.resource.data.status == 'pending'` (bei create) und unbefugtes Ändern des Status bei updates verhindern, sowie Schreibrechte entziehen, sobald der Alt-Status (`resource.data.status`) `'approved'` oder `'paid'` ist.

### [P0] Fehlerbehebung bei Odometer-Eingabe und Fehlerbehandlung im Fahrtkosten-Modul
- **Status:** pending
- **Beschreibung:** Im Fahrtkosten-Modul blockiert eine Fehlfunktion der automatischen Distanzberechnung den gesamten Erfassungsprozess, da der Kilometerstand Ende (`kmEnd`) schreibgeschützt ist. Zudem fehlen clientseitige Plausibilitätsprüfungen (z. B. `kmEnd > kmStart`) und Fehlerbehandlungen bei Datenbankfehlern.
- **Akzeptanzkriterien:**
  1. Es gibt ein Kontrollkästchen "Kilometerstand manuell eingeben". Wenn aktiviert, wird der Schreibschutz (`readOnly`) von `kmEnd` aufgehoben und der Benutzer kann den Kilometerstand manuell eingeben.
  2. Beim Absenden wird validiert, dass `kmEnd > kmStart` is. Liegt `kmEnd <= kmStart` vor, wird das Absenden verhindert und eine Fehlermeldung im UI angezeigt (statt stillschweigend 0 km einzureichen).
  3. `handleSubmit` und `handleStatusChange` fangen Fehler in einem `try-catch`-Block ab und zeigen dem Benutzer eine Fehlermeldung (z. B. per Toast/Notification) statt unhandled promise rejections auszulösen.
- **Betroffene Dateien:** `src/app/travel/page.tsx`
- **Hinweise:** Bei der manuellen Eingabe soll die gefahrene Distanz reaktiv im UI auf Basis der Differenz berechnet werden.

### [P1] Absichern des Calendar Feed API-Endpunkts und der Token-Generierung
- **Status:** pending
- **Beschreibung:** Der iCal-Feed-Endpunkt (`/api/calendar/feed`) liest Kalendereinträge und Klientennotizen basierend auf einem `calendarToken` aus. Er prüft jedoch nicht, ob der zugehörige Benutzer gelöscht (`isDeleted: true`) oder deaktiviert ist. Zudem verwendet die Token-Generierung in den Einstellungen einen unsicheren Fallback (`Math.random()`), der potenziell vorhersagbar ist.
- **Akzeptanzkriterien:**
  1. Der API-Endpunkt `/api/calendar/feed/route.ts` prüft nach dem Abruf des Benutzers, ob `userData.isDeleted` oder `userData.deletedAt` vorhanden sind, und gibt in diesem Fall einen Fehler (z.B. 403 Forbidden) zurück.
  2. Die Generierung des Tokens in `src/app/settings/page.tsx` nutzt eine kryptografisch sichere Methode (z.B. `crypto.randomUUID()` oder ein sicheres clientseitiges/serverseitiges Äquivalent) und verzichtet auf den unsicheren `Math.random()` Fallback, bzw. delegiert die Token-Generierung an eine sichere serverseitige Funktion.
- **Betroffene Dateien:** `src/app/api/calendar/feed/route.ts`, `src/app/settings/page.tsx`

### [P1] Beheben des Sicherheitsrisikos durch Hochladen des Service Account Keys
- **Status:** pending
- **Beschreibung:** Die Firebase Admin SDK-Initialisierung in `firebaseAdmin.ts` sucht nach `functions/service-account-key.json`. Dieses File liegt im lokalen Workspace. Obwohl es im Root-.gitignore steht, fehlt es in `functions/.gitignore` (dort steht nur `*-service-account-key.json` und `service-account.json`) und es gibt keine `.gcloudignore` Datei. Beim Deployment der Cloud Functions wird diese Datei unbemerkt zu Google Cloud hochgeladen.
- **Akzeptanzkriterien:**
  1. In `functions/.gitignore` wird die genaue Datei `service-account-key.json` eingetragen.
  2. Eine `.gcloudignore` Datei wird im Projekt-Root und im `functions/` Verzeichnis angelegt, um sicherzustellen, dass keine sensitiven JSON-Schlüsseldateien hochgeladen werden.
  3. Die Admin SDK Initialisierung wird so angepasst, dass sie primär Umgebungsvariablen (`process.env.FIREBASE_SERVICE_ACCOUNT`) nutzt, anstatt nach einer lokalen Datei zu suchen.
- **Betroffene Dateien:** `functions/.gitignore`, `src/lib/firebase/firebaseAdmin.ts`, `.gcloudignore` (neu), `functions/.gcloudignore` (neu)

### [P1] Absicherung gegen Invalid Date, NaN und Fehlerbehandlung in Vorträgen, Freizeiten und Beratungen
- **Status:** pending
- **Beschreibung:** Wenn Datumsfelder oder Zahlenfelder (wie Schwangerschaftswoche) in den Formularen geleert werden, werden sie als `Invalid Date` oder `NaN` an Firestore übertragen. Zudem fehlen in den Formularen für Vorträge und Freizeiten catch-Blöcke bei Speicher- und Löschvorgängen.
- **Akzeptanzkriterien:**
  1. Datumsänderungen werden vor dem Schreiben in den State validiert (`!isNaN(date.getTime())`). Leere Datumsfelder werden beim Absenden abgefangen und führen nicht zu `Invalid Date` in der DB.
  2. In `SkbConsultationForm` führt das Leeren der Schwangerschaftswoche nicht zu `NaN` im State (Fallback auf `null` oder `0`).
  3. In `LecturesPage` und `RetreatsPage` fangen die Submit- und Delete-Funktionen Fehler ab und benachrichtigen den Benutzer im UI, falls ein Datenbank- oder Berechtigungsfehler auftritt.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### [P1] Behebung von Tastatursteuerungs- und ARIA-Mängeln bei Klick-Elementen und Formularen
- **Status:** pending
- **Beschreibung:** Behebung von Tastatursteuerungs- und Screenreader-Mängeln im gesamten Projekt. Klickbare `div`- und `tr`-Elemente (wie Tabellenzeilen in der Klientenliste und Bearbeiten/Löschen-Icons in Klienten-Details, Vorträgen, Freizeiten und Zeiterfassung) müssen durch barrierefreie `<button>`-Tags oder Fokus-Strukturen mit Tastatur-Listenern (Enter/Space) und Rollen (`role="button"`) ersetzt werden. Formular-Labels müssen über `htmlFor` korrekt mit den entsprechenden Eingabefeldern (über `id`) verknüpft werden.
- **Akzeptanzkriterien:**
  1. Alle Editier- und Lösch-Buttons in den Listen (Klienten-Historie, Vorträge, Freizeiten, Zeiterfassung) sind per `Tab`-Taste fokussierbar und reagieren auf Tastendruck (Enter/Space).
  2. Tabellenzeilen in der Klientenliste sind fokussierbar (`tabIndex={0}`, `role="link"`) und navigieren bei Tastendruck zur Detailseite.
  3. Alle `<label>`-Elemente in `ClientForm`, `ConsultationForm` und `SkbConsultationForm` haben ein `htmlFor`-Attribut, das auf die `id` des zugehörigen `<input>`- oder `<select>`-Feldes verweist.
  4. Die Dropzone in `PhotoUpload` ist fokussierbar und per Tastatur auslösbar.
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`, `src/app/time-tracking/page.tsx`, `src/components/clients/ClientForm.tsx`, `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/components/ui/PhotoUpload.tsx`

### [P1] Behebung von Farbkontrast- und Darkmode-Mängeln (Ghost-Buttons & Modals)
- **Status:** pending
- **Beschreibung:** Behebung kritischer Kontrastprobleme im Lightmode und Darkmode. Ghost-Buttons ("Abbrechen") müssen im Darkmode lesbar sein (Farbe anpassen). Das allgemeine Modal-Fenster benötigt Unterstützung für das dunkle Farbschema, um blendende weiße Overlays im Darkmode zu vermeiden. Sekundäre Labels im Dashboard müssen kontraststärker dargestellt werden.
- **Akzeptanzkriterien:**
  1. Der Ghost-Button-Variant in `Button.tsx` erhält ein `dark:text-slate-300` (und passende Hover-Klassen), sodass der Kontrast im Darkmode mindestens 4.5:1 beträgt.
  2. Das `Modal`-Element (`Modal.tsx`) erhält Darkmode-Klassen (`dark:bg-slate-900 dark:text-white`), um sich nahtlos in das dunkle Farbschema einzufügen.
  3. Form-Labels, Status-Banner und Buttons, die innerhalb von Modals verwendet werden, erhalten entsprechende `dark:` Kontrast-Klassen.
  4. Die sekundären Labels auf den KPI-Cards im Dashboard und die "Nein"-Labels im Tabellenlayout erhalten kontraststärkere Farben im Lightmode (mindestens `text-gray-600` statt `text-gray-400`).
- **Betroffene Dateien:** `src/components/ui/Button.tsx`, `src/components/ui/Modal.tsx`, `src/app/page.tsx`, `src/app/clients/page.tsx`, `src/app/travel/page.tsx`, `src/app/settings/page.tsx`

### [P2] Beseitigung der React-Eingabebugs für Dezimal- und Zahlenfelder
- **Status:** pending
- **Beschreibung:** Die Stunden- und Vorbereitungsfelder in den Vortrags-, Freizeit- und Beratungsformularen (insbesondere in der individuellen Stundenverteilung per Wochentagsliste) leiden unter dem React-Eingabebug, bei dem der Dezimalpunkt bei der Eingabe (z. B. "1.") gelöscht wird. Auch setzen sich leere Zahlenfelder sofort auf "0" zurück.
- **Akzeptanzkriterien:**
  1. Lokale temporäre String-States (wie bereits für die Hauptstundenfelder implementiert) werden auch für alle individuellen Stundenfelder in der Verteilungsliste und für die Zahleneingaben auf den Vortrags- und Freizeitseiten verwendet.
  2. Die Konvertierung in Float-Werte erfolgt erst beim Absenden oder bei `onBlur`, um das Eintippen von Dezimalwerten (z. B. "1.5") über die Tastatur uneingeschränkt zu ermöglichen.
  3. Leere Eingaben setzen sich während der Eingabe nicht sofort reaktiv auf "0" zurück.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### [P2] Verbesserung der Barrierefreiheit auf Mobilgeräten (Hover-Bedingungen & Fokus-Fallen)
- **Status:** pending
- **Beschreibung:** Optimierung der Benutzeroberfläche für mobile Geräte und Screenreader durch Behebung von Hover-Abhängigkeiten und fehlenden Fokus-Fallen. Aktionssymbole in Tabellenzeilen dürfen nicht ausschließlich bei Hover sichtbar sein, da dies auf Touchscreens nicht möglich ist. Modals und das mobile Menü müssen den Fokus einfangen (Focus Trap).
- **Akzeptanzkriterien:**
  1. Aktionsbuttons in der Klientenliste (`page.tsx`) sind entweder immer sichtbar oder werden durch ein fokussierbares Aktionsmenü (z. B. Drei-Punkt-Menü) ersetzt, das per Klick/Tap aufgerufen werden kann und im Tastaturfokus sichtbar bleibt (`focus-within:opacity-100`).
  2. In Modals (`Modal.tsx`) wird der Fokus mithilfe einer Focus-Trap-Struktur (z. B. durch ein `useEffect`-Fokus-Handling) gefangen, damit der Tastatur-Fokus nicht auf den Hintergrund entweichen kann.
  3. Das mobile Sidebar-Menü fängt den Fokus ein und schließt sich sauber beim Drücken der `Escape`-Taste.
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/Sidebar.tsx`
