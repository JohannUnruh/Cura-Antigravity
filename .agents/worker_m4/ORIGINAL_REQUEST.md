## 2026-06-11T08:27:05Z

You are the Worker M4 for the SPFH module implementation in the Cura-Antigravity application.
Your working directory is C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m4.
Your task is to implement the Case Overview Dashboard at `src/app/family-helper/page.tsx`.

Instructions:
1. Create `src/app/family-helper/page.tsx`.
2. Secure the page using the `<ProtectedRoute>` component. Use `useAuth` hook to check permissions. If `userProfile` is loaded but `!userProfile.hasFamilyHelperAccess && userProfile.role !== 'Admin'`, render an access denied view matching the style of other pages (with a heading "Zugriff verweigert", warning text, and a button to go back to the home page `/`).
3. Load case data:
   - Call `familyHelperService.getCases(userProfile.role === 'Admin' ? undefined : user.uid)` to get the cases.
   - For each case, fetch its journal entries via `familyHelperService.getJournalEntries(caseId)` using `Promise.all` in the load handler.
   - Compute `actualHours` as the sum of `durationInHours` of all journal entries.
   - Compute `targetHours` as `fundingCommitment?.hoursGranted || 0` from the case data.
   - Store cases along with their calculated hours in the local state.
4. Implement UI layout:
   - Header with title "Familienhilfe (SPFH)", showing statistics: total active cases, total actual hours vs. total target hours.
   - A "Neuer Fall" button to trigger the creation modal.
   - Filtering and searching controls:
     - Search text input (filtering by `familyName` or `caseNumber` case-insensitively).
     - Status select dropdown ('alle', 'aktiv', 'inaktiv', 'beendet').
     - Assigned worker select dropdown (only visible to Admins, allowing filtering by worker ID. Fetch all users using `userService.getAllUsers()`).
     - Sorting select dropdown ('familyNameAsc' (A-Z), 'familyNameDesc' (Z-A), 'createdAtAsc' (Älteste zuerst), 'createdAtDesc' (Neueste zuerst)).
   - Cases grid/list:
     - For each case, show family name, case number, status badge (with colors: green for aktiv, yellow for inaktiv, gray for beendet), assigned worker name, and hours progress (a visual bar showing `actualHours` / `targetHours` ratio, with labels like "Ist: X / Soll: Y Std.").
     - Link the card/item to the case detail page: `/family-helper/${case.id}` using Next.js `Link`.
5. Implement the "Neuer Fall" Modal using the `<Modal>` component:
   - Form fields:
     - Familienname (required)
     - Fallnummer (required)
     - Status: select ('aktiv', 'inaktiv', 'beendet', defaults to 'aktiv')
     - Zugewiesener Mitarbeiter: select dropdown (for Admins, prefilled with all user profiles from `userService.getAllUsers()`; for non-Admins, disabled and fixed to the current user's UID and name).
     - Familienmitglieder: an inline list builder in the modal where the user can click "Mitglied hinzufügen" to add inputs for `firstName`, `lastName`, and select `relation` (relationship role options from `settings.familyMemberRelations || []` or sensible defaults like 'Kind', 'Mutter', 'Vater', 'Pflegeeltern', 'Sonstige'). Include a delete button for each member line.
     - Optional funding commitment (hoursGranted, startDate, endDate).
   - Form submit handler calling `familyHelperService.createCase(...)` and refreshing the list on success.
6. Verify that the files are properly written and compiles. Run typecheck and linting commands to check.
7. Update progress.md in your working directory and notify the parent orchestrator via send_message.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Respond in German (Antworte immer auf Deutsch).
