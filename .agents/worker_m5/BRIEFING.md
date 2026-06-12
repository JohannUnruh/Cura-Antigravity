# BRIEFING — 2026-06-11T08:29:32Z

## Mission
Implement the Digital Case File Detail View at `src/app/family-helper/[caseId]/page.tsx` for the SPFH module in the Cura-Antigravity application.

## 🔒 My Identity
- Archetype: Worker M5
- Roles: implementer, qa, specialist
- Working directory: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m5
- Original parent: 7112c9e4-8fcb-4783-8925-2867d5f61c4e
- Milestone: SPFH Case Detail View

## 🔒 Key Constraints
- CODE_ONLY network mode: no external HTTP/HTTPS requests (no curl, wget, etc.).
- Never use whole-file replacement for editing existing files if small edits can be made. Since we are creating a new file `src/app/family-helper/[caseId]/page.tsx`, we can write it from scratch.
- Ensure typecheck and linting commands pass.
- Secure case view with ProtectedRoute and useAuth, verify SPFH module permission.
- Tab navigation layout with 5 tabs (or 4 if risk assessment is hidden/access gated).
- Real state and real behavior (NO CHEATING/facades).

## Current Parent
- Conversation ID: 7112c9e4-8fcb-4783-8925-2867d5f61c4e
- Updated: 2026-06-11T08:29:32Z

## Task Summary
- **What to build**: Next.js page `src/app/family-helper/[caseId]/page.tsx` displaying case details, goals tracker, contact journal/hours comparison (with Recharts LineChart), templates/forms, and hazard assessment (§ 8a SGB VIII) with access gating.
- **Success criteria**: Functional tabbed view, proper state persistence to familyHelperService/Firestore, security access validation, no type check/lint errors.
- **Interface contracts**: familyHelperService, ProtectedRoute, useAuth.
- **Code layout**: Next.js App Router (src/app/family-helper/[caseId]/page.tsx).

## Key Decisions Made
- [TBD]

## Artifact Index
- `src/app/family-helper/[caseId]/page.tsx` — Main case detail view page.

## Change Tracker
- **Files modified**: None
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None

## Loaded Skills
- None
