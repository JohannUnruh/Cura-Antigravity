# Handoff Report: Usability, Form Validations, and Error Handling Audit

This report documents key usability issues, missing validations, and error handling deficiencies identified across the Cura-App form and page files.

---

## 1. Observation

Direct observations and code locations for the identified issues:

### A. Inadequate / Missing Error Handling (Unhandled Promise Rejections)
- **Lectures Page (`src/app/lectures/page.tsx`)**:
  - **Save Action (Lines 185-244)**:
    ```tsx
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // ... (Firebase writes for lectureService and timeTrackingService)
            await loadData();
            setIsModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };
    ```
    There is no `catch` block. Any failure during execution (e.g. database offline, auth expiration, security rule violation) causes an unhandled promise rejection. The saving spinner (`isSaving`) turns off, but the modal stays open with no user notification.
  - **Delete Action (Lines 246-258)**:
    ```tsx
    const handleDelete = async () => {
        if (!isDeleteModalOpen) return;
        setIsSaving(true);
        try {
            await lectureService.deleteLecture(isDeleteModalOpen);
            setIsDeleteModalOpen(null);
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    ```
    If deletion fails, the error is caught and printed to the developer console via `console.error(error)`. However, the user is never notified. The delete confirmation modal stays open, and the spinner stops, leaving the user confused.

- **Retreats Page (`src/app/retreats/page.tsx`)**:
  - **Save Action (Lines 175-234)**: Identical structure with a `try-finally` block but no `catch` block.
  - **Delete Action (Lines 236-248)**: Identical structure, catches errors with `console.error(error)` but fails to show any user notification.

- **Travel Page (`src/app/travel/page.tsx`)**:
  - **Save Action (Lines 355-378)**: Identical structure with a `try-finally` block but no `catch` block.
  - **Status Change Action (Lines 380-383)**:
    ```tsx
    const handleStatusChange = async (id: string, status: TravelExpense["status"]) => {
        await travelService.updateExpense(id, { status });
        await loadData();
    };
    ```
    No try-catch-finally block. If writing to the backend fails, it creates an unhandled promise rejection.

---

### B. Missing Form Validations and Logical Constraints

- **Date Invalidation (All Forms)**:
  - In `ConsultationForm.tsx` (Lines 224, 234), `SkbConsultationForm.tsx` (Lines 198, 208), `TravelPage` (Lines 96, 519), `LecturesPage` (Lines 392, 397), and `RetreatsPage` (Lines 383, 388), clearing date inputs sets the field to `""`.
  - During submission, this empty string is passed directly to `new Date("")` which evaluates to `Invalid Date`.
  - In `ConsultationForm.tsx` (Lines 151-169):
    ```tsx
    const handleDateFromChange = (date: Date) => {
        setFormData(prev => {
            const updated = { ...prev, dateFrom: date };
            if (prev.dateTo && date.getTime() > prev.dateTo.getTime()) {
                updated.dateTo = date;
            }
            return updated;
        });
    };
    ```
    If `date` is `Invalid Date`, `date.getTime()` returns `NaN`, bypassing corrections. The form submits the `Invalid Date` object, polluting the database.

- **Odometer and Travel Logic (`src/app/travel/page.tsx`)**:
  - **Hard Read-Only Lock on Odometer End (Lines 560-563)**:
    ```tsx
    <input type="number" min="0" required value={form.kmEnd} readOnly
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed text-gray-500" />
    ```
    `kmEnd` is strictly `readOnly`. Users can only update it by calling `calculateDistance()` (which queries Nominatim/OSRM). If Nominatim fails (offline, rate-limited, or address not geocodable), the user cannot submit the travel expense at all because they cannot write the final odometer reading.
  - **Silent 0 km / 0.00 € Expense Submissions (Lines 355-367)**:
    ```tsx
    const kmDriven = Math.max(0, form.kmEnd - form.kmStart);
    const calculatedAmount = parseFloat((kmDriven * (settings?.travelExpenseRate || 0.30)).toFixed(2));
    ```
    If `kmEnd` is less than `kmStart` (e.g. because `kmEnd` was never calculated or `kmStart` was increased after calculation), the code silently sets `kmDriven` to `0` and reimbursement to `0.00 €`. There is no client-side warning preventing submission of invalid odometer values.

- **Pregnancy Week Invalid State (`SkbConsultationForm.tsx` lines 360-368)**:
  ```tsx
  <input
      type="number"
      min="0"
      max="42"
      value={formData.pregnancyWeek || 0}
      onChange={(e) => handleChange('pregnancyWeek', parseInt(e.target.value))}
      ...
  />
  ```
  If the field is cleared, `parseInt("")` evaluates to `NaN`, which is written directly to the form payload and stored in the database.

---

### C. Input Usability & React State Interaction Bugs

- **React Trailing Decimal / Number Input Bug in Custom Distribution**:
  - In `ConsultationForm.tsx` (Lines 380-386) and `SkbConsultationForm.tsx` (Lines 316-324):
    ```tsx
    onChange={(e) => handleCustomHourChange(key, parseFloat(e.target.value) || 0)}
    ```
  - In `LecturesPage` (Lines 404, 415) and `RetreatsPage` (Lines 395, 407):
    ```tsx
    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) || 0 })}
    ```
  - Typing a decimal like `1.5` requires typing `1.`. Since `parseFloat("1.") === 1`, the parent state updates to `1` instantly. The input field re-renders with the value `1`, stripping the trailing dot and preventing the input of decimals.

- **Number Field Auto-Reset to 0 (UX Annoyance)**:
  - In `TravelPage` (Line 556), `LecturesPage` (Line 384), and `RetreatsPage` (Line 369):
    ```tsx
    onChange={e => setForm({ ...form, participantCount: parseInt(e.target.value) || 0 })}
    ```
    Clearing the number field in order to type a new number temporarily triggers an empty string, which evaluates to `0`. The field immediately resets to `0`, preventing natural typing flow.

- **Units and Prep Hour Input State Mismatch**:
  - In `ConsultationForm.tsx` (Lines 271-314) and `SkbConsultationForm.tsx` (Lines 228-251):
    If users type invalid characters in the text inputs (e.g. letters), `parseFloat` evaluates to `NaN`. The input displays the invalid text, but the internal state remains unchanged, resulting in a silent desynchronization where the submitted form does not match what the user sees.

---

## 2. Logic Chain

1. **Observations on Error Handling**: Since `handleSubmit` functions lack `catch` blocks and delete functions only log to the console, any failure of the asynchronous Firebase service remains unhandled. This means the user is left stuck on loading states with no visual feedback when a write operation fails.
2. **Observations on Date Fields**: Standard browser date inputs return empty string (`""`) when cleared. Since the code does not validate this before instantiating `new Date()`, the system produces and persists `Invalid Date` objects in Firestore.
3. **Observations on Travel Page**: Locking `kmEnd` behind a mandatory routing API query without manual overrides creates a single point of failure. If the service is unreachable, the page is unusable. Furthermore, fallback calculations like `Math.max(0, kmEnd - kmStart)` permit sending travel logs where `kmEnd < kmStart` as a `0 km` trip without validation warnings, which is a logic violation.
4. **Observations on React State & Number Fields**: Instantly parsing inputs with `parseFloat`/`parseInt` in `onChange` triggers UI re-renders that format away decimals (truncating `1.`) and replace empty inputs with `0`. This forces users to use spin buttons or select and overwrite text.

---

## 3. Caveats

- **Network failures**: We did not test Nominatim API rate-limits directly as we are operating in a read-only environment, but Nominatim's public policy is strict and it frequently returns `429 Too Many Requests` or slow responses.
- **Backend checks**: We assume Firestore security rules do not already catch `NaN` or `Invalid Date` objects. Even if they did, the client would crash or report a generic "insufficient permissions" error due to missing client-side checks and catch blocks.

---

## 4. Conclusion

The Cura-App has several critical usability bottlenecks:
1. **Critical Path Block**: Travel expense claims cannot be submitted if geocoding/routing services fail, since `kmEnd` is locked.
2. **Database Pollution Risk**: Cleared dates and pregnancy weeks write `Invalid Date` and `NaN` to the database.
3. **Silent Errors**: Users can submit invalid travel data (negative distance) or experience unhandled exceptions where the UI hangs without error messages.
4. **Input Friction**: Number and decimal fields suffer from standard React state-binding bugs, hindering fast data entry.

---

## 5. Verification Method

- **Files to Inspect**:
  - `src/components/consultations/ConsultationForm.tsx`
  - `src/components/consultations/SkbConsultationForm.tsx`
  - `src/app/travel/page.tsx`
  - `src/app/lectures/page.tsx`
  - `src/app/retreats/page.tsx`
- **Manual Verification Steps (to simulate usability bugs)**:
  1. Open Travel Page, try to type in the Odometer End field. Observe it is blocked. Disconnect internet access and try to calculate route. Observe the route calculation fails, and you are permanently blocked from submitting.
  2. In Travel Page, enter `kmStart = 1000` and click "Distanz berechnen" (which calculates e.g. 50km, setting `kmEnd = 1050`). Now manually change `kmStart` to `1200` and submit the form. Observe that the form submits successfully with 0 km driven and 0,00 € reimbursement.
  3. In Lectures or Retreats Page, open the "Neuer Vortrag" modal, clear the participant count field or the date field, and submit. Check the database payload to see `Invalid Date` being stored.
  4. In Lectures Page, try to type "1.5" directly into the duration field. Note how the decimal point is immediately stripped.

---

## 6. Proposed Backlog Entries

These entries are formatted according to the standard schema in `BACKLOG.md` and should be added to the backlog for the implementer agent:

### [P0] Fehlerbehebung bei Odometer-Eingabe und Fehlerbehandlung im Fahrtkosten-Modul
- **Status:** pending
- **Beschreibung:** Im Fahrtkosten-Modul blockiert eine Fehlfunktion der automatischen Distanzberechnung den gesamten Erfassungsprozess, da der Kilometerstand Ende (`kmEnd`) schreibgeschützt ist. Zudem fehlen clientseitige Plausibilitätsprüfungen (z. B. `kmEnd > kmStart`) und Fehlerbehandlungen bei Datenbankfehlern.
- **Akzeptanzkriterien:**
  1. Es gibt ein Kontrollkästchen "Kilometerstand manuell eingeben". Wenn aktiviert, wird der Schreibschutz (`readOnly`) von `kmEnd` aufgehoben und der Benutzer kann den Kilometerstand manuell eingeben.
  2. Beim Absenden wird validiert, dass `kmEnd > kmStart` ist. Liegt `kmEnd <= kmStart` vor, wird das Absenden verhindert und eine Fehlermeldung im UI angezeigt (statt stillschweigend 0 km einzureichen).
  3. `handleSubmit` und `handleStatusChange` fangen Fehler in einem `try-catch`-Block ab und zeigen dem Benutzer eine Fehlermeldung (z. B. per Toast/Notification) statt unhandled promise rejections auszulösen.
- **Betroffene Dateien:** `src/app/travel/page.tsx`
- **Hinweise:** Bei der manuellen Eingabe soll die gefahrene Distanz reaktiv im UI auf Basis der Differenz berechnet werden.

### [P1] Absicherung gegen Invalid Date, NaN und Fehlerbehandlung in Vorträgen, Freizeiten und Beratungen
- **Status:** pending
- **Beschreibung:** Wenn Datumsfelder oder Zahlenfelder (wie Schwangerschaftswoche) in den Formularen geleert werden, werden sie als `Invalid Date` oder `NaN` an Firestore übertragen. Zudem fehlen in den Formularen für Vorträge und Freizeiten catch-Blöcke bei Speicher- und Löschvorgängen.
- **Akzeptanzkriterien:**
  1. Datumsänderungen werden vor dem Schreiben in den State validiert (`!isNaN(date.getTime())`). Leere Datumsfelder werden beim Absenden abgefangen und führen nicht zu `Invalid Date` in der DB.
  2. In `SkbConsultationForm` führt das Leeren der Schwangerschaftswoche nicht zu `NaN` im State (Fallback auf `null` oder `0`).
  3. In `LecturesPage` und `RetreatsPage` fangen die Submit- und Delete-Funktionen Fehler ab und benachrichtigen den Benutzer im UI, falls ein Datenbank- oder Berechtigungsfehler auftritt.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`

### [P2] Beseitigung der React-Eingabebugs für Dezimal- und Zahlenfelder
- **Status:** pending
- **Beschreibung:** Die Stunden- und Vorbereitungsfelder in den Vortrags-, Freizeit- und Beratungsformularen (insbesondere in der individuellen Stundenverteilung per Wochentagsliste) leiden unter dem React-Eingabebug, bei dem der Dezimalpunkt bei der Eingabe (z. B. "1.") gelöscht wird. Auch setzen sich leere Zahlenfelder sofort auf "0" zurück.
- **Akzeptanzkriterien:**
  1. Lokale temporäre String-States (wie bereits für die Hauptstundenfelder implementiert) werden auch für alle individuellen Stundenfelder in der Verteilungsliste und für die Zahleneingaben auf den Vortrags- und Freizeitseiten verwendet.
  2. Die Konvertierung in Float-Werte erfolgt erst beim Absenden oder bei `onBlur`, um das Eintippen von Dezimalwerten (z. B. "1.5") über die Tastatur uneingeschränkt zu ermöglichen.
  3. Leere Eingaben setzen sich während der Eingabe nicht sofort reaktiv auf "0" zurück.
- **Betroffene Dateien:** `src/components/consultations/ConsultationForm.tsx`, `src/components/consultations/SkbConsultationForm.tsx`, `src/app/lectures/page.tsx`, `src/app/retreats/page.tsx`
