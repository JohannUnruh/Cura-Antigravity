# Project: Access Flags and Security Rules implementation for Family Helper and Foster Care

## Architecture
- Next.js application utilizing Firebase Authentication and Cloud Firestore.
- User profiles stored in `/users/{userId}` Firestore collection.
- Frontend App Router settings page at `src/app/settings/page.tsx`.
- Sidebar navigation at `src/components/layout/Sidebar.tsx`.
- Security rules enforced via `firestore.rules`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: UserProfile Extension | Add permissions fields (`hasFamilyHelperAccess`, `hasFosterCareAccess`) to `src/types/index.ts` | none | DONE |
| 2 | R2: Admin User Management | Update `src/app/settings/page.tsx` to display and save access checkboxes in users list/modals | M1 | DONE |
| 3 | R3: Sidebar Navigation | Filter `/family-helper` and `/foster-care` links in `src/components/layout/Sidebar.tsx` based on user permissions | M1 | DONE |
| 4 | R4: Firestore Security Rules | Update `firestore.rules` to enforce checks on `/family_cases`, `/foster_families`, `/foster_children` collections | M1 | DONE |
| 5 | R5: E2E Verification & Audit | Build (`npm run build`) and lint (`npm run lint`), run verification tests | M1, M2, M3, M4 | DONE |

## Interface Contracts
- `UserProfile` object structure:
  - `hasFamilyHelperAccess?: boolean`
  - `hasFosterCareAccess?: boolean`
- Sidebar menu item configuration:
  - `/family-helper`: visible only if `hasFamilyHelperAccess === true` or `role === 'Admin'`
  - `/foster-care`: visible only if `hasFosterCareAccess === true` or `role === 'Admin'`
- Firestore paths rule requirements:
  - `/family_cases` (and subcollections): read/write allowed if authenticated user has `hasFamilyHelperAccess == true` or is Admin.
  - `/foster_families` (and subcollections): read/write allowed if authenticated user has `hasFosterCareAccess == true` or is Admin.
  - `/foster_children` (and subcollections): read/write allowed if authenticated user has `hasFosterCareAccess == true` or is Admin.

## Code Layout
- `src/types/index.ts` - TypeScript interfaces
- `src/app/settings/page.tsx` - Settings and Admin user admin dashboard
- `src/components/layout/Sidebar.tsx` - Main navigation bar
- `firestore.rules` - Firestore security rules
