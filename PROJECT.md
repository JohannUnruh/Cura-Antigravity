# Project: Cura-App Security & Usability Audit

## Architecture
- Firebase-backed Next.js application using Tailwind v4, Firestore, and Firebase App Hosting.
- Frontend app router structure in `src/app/`.
- Firebase rules defined in `firestore.rules`.
- Services in `src/lib/firebase/services/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Decompose & Setup | Initialize metadata, plan, context, and PROJECT.md | none | DONE |
| 2 | Security & Usability Audit | Scan codebase for security gaps (firestore.rules, API endpoints, token management) and usability bottlenecks (validations, accessibility, error handling) using Explorer subagents | M1 | DONE |
| 3 | Backlog Documentation | Document at least 3 high-quality issues/proposals in `BACKLOG.md` following the standard format | M2 | DONE |
| 4 | Final Verification & Handoff | Verify the backlog file format, compile the handoff report, and complete the task | M3 | DONE |

## Interface Contracts
- Standard `BACKLOG.md` entry format must be strictly adhered to.

## Code Layout
- `firestore.rules`: Security Rules for Firestore
- `src/app/api/`: Backend API routes
- `src/contexts/`: React contexts (including AuthContext.tsx, SettingsContext.tsx)
- `src/components/`: Common UI components and form controllers
- `src/lib/`: Common business logic, Firebase utilities, and client services
- `BACKLOG.md`: Target file for documenting the audit proposals
