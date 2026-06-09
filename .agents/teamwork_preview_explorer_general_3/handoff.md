# ACCESSIBILITY & LAYOUT AUDIT REPORT (DARK MODE & MOBILE)

**Date**: 2026-06-09  
**Auditor**: Accessibility Auditor Explorer  
**Task**: Analyze accessibility, contrast, and layout issues in the Cura-App, especially under dark mode and mobile views, and propose fixes.

---

## 1. Observation

During a thorough static analysis of the Cura-App codebase, the following specific accessibility, contrast, and layout issues were observed:

### A. Contrast Violations in Light Mode (Secondary text & badges)
- **Dashboard KPI card sub-labels**: In `src/app/page.tsx`, the descriptive labels inside the KPI cards use the Tailwind class `text-gray-400` on light gradient backgrounds (e.g. `indigo-50`, `blue-50`, `teal-50`, `orange-50` to white).
  - Line 321: `<p className="text-xs text-gray-400 mt-1 font-medium italic">Inkl. Vorbereitung</p>` on a gradient ending in white.
  - Line 334: `<p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Bei {stats.lectureCount} Vorträgen</p>`
  - Line 347: `<p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Bei {stats.retreatCount} Freizeiten</p>`
  - Line 362: `<p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Aktiv in Betreuung</p>`
  - **Contrast Ratio**: `#9ca3af` (Tailwind `gray-400`) on white (`#ffffff`) or light blue/indigo yields **2.5:1** (WCAG AA requires **4.5:1**).
- **Client List Table**: In `src/app/clients/page.tsx` line 279, the label "Nein" for church membership is styled as:
  - `<span className="text-xs font-medium text-gray-400">Nein</span>`
  - **Contrast Ratio**: `#9ca3af` on `#ffffff` is **2.5:1** (WCAG AA requires **4.5:1**).
- **Lectures & Retreats Lists**: In `src/app/lectures/page.tsx` and `src/app/retreats/page.tsx`, detail icons and labels use `text-gray-400` against light card backgrounds:
  - `src/app/lectures/page.tsx` line 309: `<MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.location}`
  - `src/app/lectures/page.tsx` line 439: `<span className="text-xs text-gray-400 ml-auto flex items-center gap-1">`
  - `src/app/retreats/page.tsx` line 295: `<MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.location}`
  - `src/app/retreats/page.tsx` line 423: `<span className="text-xs text-gray-400 ml-auto flex items-center gap-1">`
  - **Contrast Ratio**: `#9ca3af` on `#ffffff` is **2.5:1**.

### B. Contrast Violations in Dark Mode (Ghost buttons & Kassenwart controls)
- **Ghost button variant**: In `src/components/ui/Button.tsx` line 20:
  - `ghost: "hover:bg-white/40 text-gray-700"`
  - **Contrast Ratio**: In dark mode, when a ghost button is placed inside a modal (`bg-slate-900` or similar) or against the dark page background (`#0b1120`), `#374151` (Tailwind `gray-700`) on `#0f172a` (slate-900) yields only **1.7:1**!
  - **Impact**: This applies to all "Abbrechen" (Cancel) buttons in modals (like Add Client in `clients/page.tsx` line 388, Delete Consultations in `clients/[id]/page.tsx` line 743, etc.) rendering them virtually invisible in dark mode.
- **Kassenwart Status Buttons**: In `src/app/travel/page.tsx`:
  - Line 490: `<Button variant="ghost" ... className="text-green-600 hover:bg-green-50 hover:text-green-700 gap-1.5 text-sm">`
  - Line 497: `<Button variant="ghost" ... className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 text-sm">`
  - **Contrast Ratio**: The green button uses `#16a34a` (green-600), which on dark background yields **3.5:1**. The red button uses `#dc2626` (red-600), which on dark background yields **2.3:1**.

### C. Modal Theme Glare & Dark Mode Incoherence
- **Opaque Light Modal Background**: In `src/components/ui/Modal.tsx` line 39:
  - `className="glass-panel w-full max-w-3xl bg-white/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 relative my-8"`
  - **Impact**: There is no dark override (like `dark:bg-slate-950/95` or `dark:bg-slate-900/95`), so the modal renders as bright white in dark mode.
- **Unstyled Form Labels inside Modals**: Because the modal was hardcoded to be white, input labels inside the modal forms do not have dark mode styles. For example:
  - `src/app/settings/page.tsx` lines 720, 725, 732, 741, 753, 759, 764: `<label className="block text-sm font-medium text-gray-700 mb-1">`
  - If the modal background is fixed to support dark mode, these labels will remain dark gray `#374151` and become unreadable against a dark background.

### D. Keyboard Accessibility & Semantics Gaps (Missing Interactive elements & Links)
- **Clickable Table Rows**: In `src/app/clients/page.tsx` line 254-256, table rows are clickable:
  - `<tr key={client.id} onClick={() => router.push(\`/clients/\${client.id}\`)} ...>`
  - **Impact**: Keyboard users cannot focus on `<tr>` because it lacks a `tabIndex={0}` or `role="link"`, and they cannot activate it via Enter/Space key because it lacks a keydown listener.
- **Interactive Controls as divs**: Edit and Delete triggers are coded as simple `div` tags with `cursor-pointer` instead of `<button>` tags:
  - `src/app/clients/[id]/page.tsx` line 624: `<div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedConsultation(item); setIsConsultationModalOpen(true); }}>` (enclosing a Pencil icon).
  - `src/app/clients/[id]/page.tsx` line 627: `<div className="p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedConsultation(item); setIsDeleteConsModalOpen(true); }}>` (enclosing a Trash2 icon).
  - `src/app/clients/[id]/page.tsx` lines 674 & 677 (Edit/Delete SKB consultations).
  - `src/app/lectures/page.tsx` lines 331 & 334 (Edit/Delete Lectures).
  - `src/app/retreats/page.tsx` lines 316 & 319 (Edit/Delete Retreats).
  - `src/app/time-tracking/page.tsx` lines 1032 & 1035 (Edit/Delete time-tracking entries).
  - **Impact**: These icons are completely skipped in keyboard navigation. Keyboard users cannot edit or delete any entries.
- **Div Dropzone**: In `src/components/ui/PhotoUpload.tsx` line 143:
  - `<div onClick={() => fileInputRef.current?.click()} className="...">`
  - **Impact**: Keyboard-only users cannot select files for upload because the dropzone is not focusable and lacks keyboard event handlers.
- **Tab list role structure**: Tab controls in Settings (`src/app/settings/page.tsx` lines 392, 395, 400, 403) are simple `<button>` elements with no tablist role structures (`role="tab"`, `aria-selected="true"`, etc.).
- **Missing Label htmlFor & Input ID links**:
  - In `ClientForm.tsx` lines 95, 108, 130, 197, 209, 222, 234: Labels lack `htmlFor` attributes, and input elements lack `id` attributes.
  - In `ConsultationForm.tsx` lines 219, 229, 239, 255, 270, 296, 422, 433, 443, 453, 500, 519, 532: Labels lack `htmlFor` and input elements lack `id` attributes.
  - In `SkbConsultationForm.tsx` lines 193, 203, 213, 227, 346, 360, 371, 380, 393, 416, 441, 455: Labels lack `htmlFor` and input elements lack `id` attributes.
  - **Impact**: Screen readers cannot read the labels associated with form fields, making forms inaccessible.
- **Missing aria-labels on icon-only buttons**:
  - In `src/app/clients/page.tsx` line 318, the row chevron button has no label:
    - `<button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>`
  - In `src/components/ui/VoiceInput.tsx` lines 75 & 90: Button has `title` but no `aria-label`.

### E. Touchscreen & Focus Usability (Hover-Only buttons & Focus traps)
- **Invisible actions until Hover**: In `src/app/clients/page.tsx` line 286:
  - `<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">`
  - **Impact**: The action buttons (Edit, Delete, Calendar) are completely hidden (`opacity-0`) and only display on mouse hover. Touchscreen devices (mobile/tablet) do not support hover, rendering these buttons inaccessible. Keyboard users also focus on these buttons while they are completely invisible.
- **Missing Focus Trap**:
  - In `src/components/ui/Modal.tsx`, a keyboard user can tab out of the modal dialog into elements behind the modal backdrop.
  - In `src/components/layout/Sidebar.tsx`, the mobile sidebar overlay does not trap focus or support closing via the Escape key.

---

## 2. Logic Chain

1. **Observed Contrast Levels**: Visual indicators using Tailwind `text-gray-400` against white or light-toned backdrops (like in KPI cards or table tags) produce a contrast ratio of **2.5:1**.
   - **Reasoning**: WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum) states that normal text (under 18pt or 14pt bold) must have a contrast ratio of at least **4.5:1**. 
   - **Conclusion**: This is a direct WCAG AA violation. The light gray text is illegible for users with low vision.
2. **Observed Ghost Button Styles**: The class `text-gray-700` (`#374151`) on dark slate backgrounds (`#0f172a` or `#0b1120`) yields a contrast of **1.7:1**.
   - **Reasoning**: This fails both normal text minimums (4.5:1) and interactive elements minimums (3.0:1).
   - **Conclusion**: Crucial cancellation buttons are visually lost in dark mode, breaking basic usability.
3. **Observed Clickable Divs/Rows**: Interactive controls are marked as `div` or `tr` with `onClick` but lack `tabIndex`, `role`, and `onKeyDown`.
   - **Reasoning**: Screen readers and keyboard navigation require elements to have standard interactive roles (e.g. `<button>` or `<a href="...">`) or explicit keyboard support via `tabIndex="0"` and event handling for Enter and Space keys (WCAG 2.1 Success Criterion 2.1.1 - Keyboard).
   - **Conclusion**: Keyboard-only users are locked out of critical operations (editing/deleting records, navigating lists).
4. **Observed Hover-Only Elements**: Client list action buttons have `opacity-0` and only become visible on `group-hover:opacity-100`.
   - **Reasoning**: Touchscreen layouts do not have a cursor to hover, and keyboard focus does not toggle the hover state.
   - **Conclusion**: Action buttons are unusable on mobile layouts and represent a focus visibility violation (WCAG 2.4.7).

---

## 3. Caveats

- Contrast checks were computed based on standard hex codes for Tailwind v4 colors (e.g., slate-900 = `#0f172a`, gray-400 = `#9ca3af`, gray-700 = `#374151`, white = `#ffffff`) and standard browser background blending. Local monitor configurations, client-side opacity styling, or custom user styles may alter the final rendering slightly.
- Headings analysis was done page-by-page. A global heading outline scan was not run.
- Automated screen reader testing (e.g. JAWS, NVDA, VoiceOver) was not conducted; analysis is based on static HTML structure.

---

## 4. Conclusion

The Cura-App has several high-severity accessibility and contrast issues that impact both dark mode usability and keyboard/mobile operation:
1. **Critical keyboard gaps**: Users without a mouse cannot navigate to client profiles, edit/delete any consultations/lectures/time-entries, or upload photos.
2. **Severely broken dark mode styling**: Modal overlays flash full-white, and cancel buttons become invisible, leading to high friction.
3. **Responsive layout bugs**: Action buttons inside client lists are inaccessible on mobile/touch interfaces due to hover-only states.
4. **Screen-reader blind spots**: Missing `htmlFor` and `id` linking in forms leaves screen readers unable to read labels for form fields.

---

## 5. Verification Method

To independently verify these findings:
1. **Audit Contrast**: Open Chrome DevTools, toggle device emulation, select elements like the KPI sublabels (e.g. `src/app/page.tsx:321`) or Cancel buttons in dark mode, and inspect the computed color contrast value.
2. **Keyboard Navigation Test**: Press `Tab` continuously on the Client List or Consultation List page. Notice that:
   - Client rows are skipped.
   - Action buttons (Edit/Delete divs) are completely skipped.
   - For fields inside forms, clicking a label does not focus the input.
3. **Mobile Layout Check**: Using mobile responsive tools, try to view and tap the Edit/Delete actions in the client table. They will remain invisible because there is no hover action.

---

## 6. Backlog Proposals (BACKLOG.md format)

The following proposals are structured for copy-pasting directly into `BACKLOG.md`:

### [P1] Behebung von Tastatursteuerungs- und ARIA-Mängeln bei Klick-Elementen und Formularen
- **Status:** pending
- **Beschreibung:** Behebung von Tastatursteuerungs- und Screenreader-Mängeln im gesamten Projekt. Klickbare `div`- und `tr`-Elemente (wie Tabellenzeilen in der Klientenliste und Bearbeiten/Löschen-Icons in Klienten-Details, Vorträgen, Freizeiten und Zeiterfassung) müssen durch barrierefreie `<button>`-Tags oder Fokus-Strukturen mit Tastatur-Listenern (Enter/Space) und Rollen (`role="button"`) ersetzt werden. Formular-Labels müssen über `htmlFor` korrekt mit den entsprechenden Eingabefeldern (über `id`) verknüpft werden.
- **Akzeptanzkriterien:**
  1. Alle Editier- und Lösch-Buttons in den Listen (Klienten-Historie, Vorträge, Freizeiten, Zeiterfassung) sind per `Tab`-Taste fokussierbar und reagieren auf Tastendruck (Enter/Space).
  2. Tabellenzeilen in der Klientenliste sind fokussierbar (`tabIndex={0}`, `role="link"`) und navigieren bei Tastendruck zur Detailseite.
  3. Alle `<label>`-Elemente in `ClientForm`, `ConsultationForm` und `SkbConsultationForm` haben ein `htmlFor`-Attribut, das auf die `id` des zugehörigen `<input>`- oder `<select>`-Feldes verweist.
  4. Die Dropzone in `PhotoUpload` ist fokussierbar und per Tastatur auslösbar.
- **Betroffene Dateien:**
  - `src/app/clients/page.tsx`
  - `src/app/clients/[id]/page.tsx`
  - `src/app/lectures/page.tsx`
  - `src/app/retreats/page.tsx`
  - `src/app/time-tracking/page.tsx`
  - `src/components/clients/ClientForm.tsx`
  - `src/components/consultations/ConsultationForm.tsx`
  - `src/components/consultations/SkbConsultationForm.tsx`
  - `src/components/ui/PhotoUpload.tsx`

### [P1] Behebung von Farbkontrast- und Darkmode-Mängeln (Ghost-Buttons & Modals)
- **Status:** pending
- **Beschreibung:** Behebung kritischer Kontrastprobleme im Lightmode und Darkmode. Ghost-Buttons ("Abbrechen") müssen im Darkmode lesbar sein (Farbe anpassen). Das allgemeine Modal-Fenster benötigt Unterstützung für das dunkle Farbschema, um blendende weiße Overlays im Darkmode zu vermeiden. Sekundäre Labels im Dashboard müssen kontraststärker dargestellt werden.
- **Akzeptanzkriterien:**
  1. Der Ghost-Button-Variant in `Button.tsx` erhält ein `dark:text-slate-300` (und passende Hover-Klassen), sodass der Kontrast im Darkmode mindestens 4.5:1 beträgt.
  2. Das `Modal`-Element (`Modal.tsx`) erhält Darkmode-Klassen (`dark:bg-slate-900 dark:text-white`), um sich nahtlos in das dunkle Farbschema einzufügen.
  3. Form-Labels, Status-Banner und Buttons, die innerhalb von Modals verwendet werden, erhalten entsprechende `dark:` Kontrast-Klassen.
  4. Die sekundären Labels auf den KPI-Cards im Dashboard und die "Nein"-Labels im Tabellenlayout erhalten kontraststärkere Farben im Lightmode (mindestens `text-gray-600` statt `text-gray-400`).
- **Betroffene Dateien:**
  - `src/components/ui/Button.tsx`
  - `src/components/ui/Modal.tsx`
  - `src/app/page.tsx`
  - `src/app/clients/page.tsx`
  - `src/app/travel/page.tsx`
  - `src/app/settings/page.tsx`

### [P2] Verbesserung der Barrierefreiheit auf Mobilgeräten (Hover-Bedingungen & Fokus-Fallen)
- **Status:** pending
- **Beschreibung:** Optimierung der Benutzeroberfläche für mobile Geräte und Screenreader durch Behebung von Hover-Abhängigkeiten und fehlenden Fokus-Fallen. Aktionssymbole in Tabellenzeilen dürfen nicht ausschließlich bei Hover sichtbar sein, da dies auf Touchscreens nicht möglich ist. Modals und das mobile Menü müssen den Fokus einfangen (Focus Trap).
- **Akzeptanzkriterien:**
  1. Aktionsbuttons in der Klientenliste (`page.tsx`) sind entweder immer sichtbar oder werden durch ein fokussierbares Aktionsmenü (z. B. Drei-Punkt-Menü) ersetzt, das per Klick/Tap aufgerufen werden kann und im Tastaturfokus sichtbar bleibt (`focus-within:opacity-100`).
  2. In Modals (`Modal.tsx`) wird der Fokus mithilfe einer Focus-Trap-Struktur (z. B. durch ein `useEffect`-Fokus-Handling) gefangen, damit der Tastatur-Fokus nicht auf den Hintergrund entweichen kann.
  3. Das mobile Sidebar-Menü fängt den Fokus ein und schließt sich sauber beim Drücken der `Escape`-Taste.
- **Betroffene Dateien:**
  - `src/app/clients/page.tsx`
  - `src/components/ui/Modal.tsx`
  - `src/components/layout/Sidebar.tsx`
