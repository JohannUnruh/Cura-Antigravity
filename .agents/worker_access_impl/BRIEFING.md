# BRIEFING — 2026-06-11T09:51:30+02:00

## Mission
Implement access control permissions and settings UI for Family Helper and Foster Care modules.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_access_impl
- Original parent: 21a3a9fa-30b4-4ec7-9e34-b76b39b67cca
- Milestone: Access Control Implementation

## 🔒 Key Constraints
- CODE_ONLY network mode: no external web access, no curl/wget to external URLs.
- Always respond in German.
- Keep BRIEFING.md under 100 lines.
- Follow minimal changes principle.
- Verify everything. Do not cheat.

## Current Parent
- Conversation ID: 21a3a9fa-30b4-4ec7-9e34-b76b39b67cca
- Updated: not yet

## Task Summary
- **What to build**: Access control fields in UserProfile, options in Admin Settings UI, filtered Sidebar navigation, and Firestore Security Rules for Family Helper and Foster Care.
- **Success criteria**: lint + build passes, fields are fully integrated and saved, Sidebar menu dynamically filtered, Firestore security rules correctly restrict access.
- **Interface contracts**: src/types/index.ts (UserProfile)
- **Code layout**: src/app/settings/page.tsx, src/components/layout/Sidebar.tsx, firestore.rules

## Key Decisions Made
- Extracted helper functions `hasFamilyHelperAccess()` and `hasFosterCareAccess()` in `firestore.rules` to maintain clean rules matching the existing codebase architecture (such as `isAdmin()` and `isKassenwart()`).

## Loaded Skills
- firebase-firestore-basics — C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\skills\firebase-firestore-basics\SKILL.md — Firestore security rules and basic operations

## Change Tracker
- **Files modified**:
  - `src/types/index.ts`: Added access flags to `UserProfile`.
  - `src/app/settings/page.tsx`: Added form states, edit triggers, and checkboxes inside Modals.
  - `src/components/layout/Sidebar.tsx`: Added Familienhilfe and Pflegefamilien items with conditional rendering logic.
  - `firestore.rules`: Implemented helper check functions and matches for cases, families, and children collections.
- **Build status**: Pass
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (next build succeeded)
- **Lint status**: Pass (eslint clean)
- **Tests added/modified**: None
