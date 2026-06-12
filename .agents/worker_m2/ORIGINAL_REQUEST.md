## 2026-06-11T10:22:07+02:00
You are the Worker M2 for the SPFH module implementation in the Cura-Antigravity application.
Your working directory is C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m2.
Your task is to implement the Administrative settings dropdown UI and service defaults.

Instructions:
1. Modify `src/lib/firebase/services/settingsService.ts`:
   - Add the following default values in `defaultSettings` (lines 5-52):
     - `familyMemberRelations: ['Mutter', 'Vater', 'Kind', 'Großeltern', 'Pflegeeltern', 'Sonstige']`
     - `familyJournalTypes: ['Hausbesuch', 'Telefonat', 'Bürogespräch', 'ASD-Kontakt', 'Krisenintervention', 'Sonstiges']`
     - `familyGoalCategories: ['Erziehungskompetenz', 'Alltagsstrukturierung', 'Krisenbewältigung', 'Schule & Beruf', 'Gesundheit', 'Soziale Integration', 'Sonstiges']`
2. Modify `src/app/settings/page.tsx`:
   - In the `appForm` state initialization (lines 124-133), include empty array initializations for `familyMemberRelations`, `familyJournalTypes`, and `familyGoalCategories`.
   - In the JSX form for App Settings (under the card content containing the `TagInput` fields), add three new fields for the new parameters using the `TagInput` component, matching the styling of other fields (such as `skbInterventions`). Use the following labels:
     - "Familienhilfe - Beziehungsrollen" (fields: `familyMemberRelations`)
     - "Familienhilfe - Terminarten" (fields: `familyJournalTypes`)
     - "Familienhilfe - Zielkategorien" (fields: `familyGoalCategories`)
3. Verify that the files are properly written and syntactically valid (run `npm run lint` and `npm run build` or verify).
4. Update your progress.md in your working directory and notify the parent orchestrator via send_message.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Respond in German (Antworte immer auf Deutsch).
