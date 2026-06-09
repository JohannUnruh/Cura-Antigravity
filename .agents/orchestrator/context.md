# Context - Security and Usability Audit

## System State
- Current local time: 2026-06-09T22:46:56+02:00
- Repository: Cura-Antigravity Next.js-App
- App is using Tailwind v4, TypeScript strict, Firebase Auth, Firestore, and is deployed via Firebase App Hosting.

## Key Files to Investigate
- `firestore.rules` (Security rules)
- `src/app/api/` (API routes)
- Token handling / Auth logic (e.g. `src/contexts/AuthContext.tsx`, `src/lib/firebase/`)
- Forms with validations (e.g., `src/components/consultations/ConsultationForm.tsx`, etc.)
- Form error handling
- Contrast/accessibility (especially dark mode styles in Tailwind v4)
