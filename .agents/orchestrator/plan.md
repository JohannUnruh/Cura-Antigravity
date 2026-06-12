# Plan - Family Helper & Foster Care Access Implementation

## Phase 1: Planning and Decomposing
- Update `ORIGINAL_REQUEST.md`, `BRIEFING.md`, `progress.md` and `PROJECT.md` to reflect the new follow-up requirements.
- Initialize recurring heartbeat cron task.

## Phase 2: Implementation (UserProfile & Settings Page UI)
- Dispatch a Worker to add `hasFamilyHelperAccess?: boolean` and `hasFosterCareAccess?: boolean` to `src/types/index.ts`.
- Dispatch a Worker to add settings UI checkboxes for "Familienhilfe" and "Pflegefamilien" to the new-user and edit-user modals in `src/app/settings/page.tsx`, ensuring proper Firestore state load/save logic.

## Phase 3: Implementation (Sidebar Navigation & Security Rules)
- Dispatch a Worker to update `src/components/layout/Sidebar.tsx` to conditionally render the `/family-helper` and `/foster-care` navigation items based on user profile access flags (or Admin role).
- Dispatch a Worker to update `firestore.rules` to secure `/family_cases`, `/foster_families`, `/foster_children` collections.

## Phase 4: E2E Verification & Audit
- Dispatch a Worker to run `npm run build` and `npm run lint` on the codebase.
- Dispatch a Forensic Auditor to ensure no cheating, hardcoded checks, or bypasses exist in the implementation or security rules.
- Review reports and write final handoff.
