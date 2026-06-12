## 2026-06-11T08:29:26Z

<USER_REQUEST>
You are the Worker M5 for the SPFH module implementation in the Cura-Antigravity application.
Your working directory is C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m5.
Your task is to implement the Digital Case File Detail View at `src/app/family-helper/[caseId]/page.tsx`.

Instructions:
1. Create `src/app/family-helper/[caseId]/page.tsx`.
2. Secure the page using the `<ProtectedRoute>` component and the `useAuth` hook. Verify SPFH module access permissions. If the user profile lacks permission, render an access denied view.
3. Load case data:
   - Call `familyHelperService.getCaseById(caseId)` using Next.js `use` hook or `useParams()` to extract `caseId`. If the case is not found, render a "Fall nicht gefunden" message with a button to return to the dashboard.
   - Fetch the case's journal entries (`getJournalEntries`), hazard assessments (`getHazardAssessments`), and templates (`getTemplates`).
   - Store these states locally.
4. Implement a Tab Navigation layout with 5 tabs (or 4 tabs if risk assessment is hidden):
   - **Stammdaten (Details & Family Members)**:
     - Show Case Name, Case Number, Status (aktiv/inaktiv/beendet), Assigned Worker Name, and created date.
     - Show ASD-Kontakt (Name, Email, Telefon, Institution) and Kostenzusage (Bewilligte Stunden, Startdatum, Enddatum).
     - Render a form or "Edit" button to toggle form fields to update ASD-Kontakt, Case Status, and Kostenzusage. Call `familyHelperService.updateCase(...)` on submit.
     - Family Members list builder: display members table. In edit mode, allow adding/removing members, editing first/last names, and selecting the relation from `settings.familyMemberRelations || []` (fallback to default relations). Call `familyHelperService.updateCase(...)` to save changes.
   - **Hilfeplanung (Goals Tracker)**:
     - Allow adding a goal: category (select dropdown from `settings.familyGoalCategories || []`), description, targetValue (slider 1-10), currentValue (slider 1-10).
     - Display goals list. Each goal must show the category, description, and slider controls (1-10) for both `currentValue` and `targetValue`.
     - **Skalierungsänderungen im Ziele-Tracker werden sofort in der Datenbank persistiert**: When a slider's currentValue or targetValue is updated, immediately update the local state array of goals, and call `familyHelperService.updateCase(caseId, { goals: updatedGoals })` to save it to Firestore.
   - **Verlauf & Zeiterfassung (Journal & Hours Comparison)**:
     - Display contact journal entries list. Show date, type, hours, notes, and a Delete button.
     - Add journal entry form: date (Date), durationInHours (Number), type (select dropdown from `settings.familyJournalTypes || []`), notes (Textarea), and a checkbox "In Zeiterfassung eintragen". When checked and form is submitted, call `familyHelperService.addJournalEntry(caseId, entry, true, user.uid)`. If unchecked, call it with `false`. Refresh entries on success.
     - Hours Comparison: display target hours (Soll), actual hours (Ist), and remaining hours.
     - Burn-Down Chart: render a `LineChart` using `recharts` showing the remaining hours over time. Collect data points chronologically: start at target hours, and subtract each journal entry's duration sequentially.
   - **Vorlagen (Forms)**:
     - Four cards for filled-out forms: "Anamnese", "Hypothesen", "Interventionsplanung", and "Evaluation".
     - Each card contains a Textarea. Under each card, show a "Speichern" button. On save, call `familyHelperService.saveTemplate(caseId, templateId, { text: textareaValue })`.
   - **Krisenschutzraum (Risikoanalyse § 8a SGB VIII)**:
     - **Access Gating**: Only show and allow access if `canManage8a(userProfile, caseObj)` (which evaluates to true if `userProfile.role === 'Admin'` or `userProfile.id === caseObj.assignedWorkerId` and the role is not Kassenwart). If the user is not allowed, hide this tab entirely or show an access warning instead of the assessment forms.
     - Form to add assessment:
       - Prüfer Name (required)
       - Assessment Date (Date, defaults to now)
       - Result: select dropdown ('akut', 'latent', 'keine')
       - Indicators checklist: render checklist for indicators like "Körperliche Vernachlässigung", "Körperliche Misshandlung", "Seelische Misshandlung", "Sexuelle Gewalt", "Häusliche Gewalt", "Sucht/Psychische Erkrankung der Eltern", etc. For each, render radio options: 'ja', 'nein', 'unklar'.
       - Einzuleitende Maßnahmen (Textarea)
       - Form submit calls `familyHelperService.addHazardAssessment(caseId, assessment)`. Refresh list on success.
     - Display table of previous hazard assessments with date, examiner name, result, actions, and a way to view details.
5. Ensure the styling matches other sections of the application.
6. Verify that the files are properly written and compiles. Run typecheck and linting commands.
7. Update progress.md in your working directory and notify the parent orchestrator via send_message.
</USER_REQUEST>
