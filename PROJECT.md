# Project: Cura SPFH (Familienhilfe) Module

## Architecture
- Next.js 16 (App Router) client application with Firebase backend (Firestore, Auth).
- Core types defined in `src/types/index.ts` and `src/types/familyHelper.ts`.
- Firestore CRUD services in `src/lib/firebase/services/familyHelperService.ts` and `settingsService.ts`.
- User profiles and access control flags (`hasFamilyHelperAccess`) stored in `/users`.
- View routes in `src/app/family-helper/` and settings integration in `src/app/settings/page.tsx`.
- PDF generation utilizing `jsPDF` and `jspdf-autotable`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Datatypes & AppSettings | Create `src/types/familyHelper.ts` and extend `AppSettings` in `src/types/index.ts` | none | DONE |
| M2 | Administrative Settings | Modify `src/app/settings/page.tsx` and `settingsService.ts` for TagInput configuration | M1 | DONE |
| M3 | familyHelperService | Implement Firestore CRUD for SPFH cases, journals, templates, and time entry coupling | M1, M2 | DONE |
| M4 | Case Overview Dashboard | Create dashboard overview at `src/app/family-helper/page.tsx` with filtering and case creation | M3 | DONE |
| M5 | Digital Case File View | Create detail view at `src/app/family-helper/[caseId]/page.tsx` with tabbed navigation | M4 | PLANNED |
| M6 | PDF-Export | Implement Entwicklungsbericht and Leistungsnachweis export using jsPDF | M5 | PLANNED |
| M7 | E2E Testing Track | Design and execute E2E test suite validating all functionality | M1, M2, M3, M4, M5, M6 | PLANNED |

## Interface Contracts
### `src/types/familyHelper.ts`
- `FamilyMember`: `{ firstName: string; lastName: string; birthDate?: string; relation: string; }`
- `AsdContact`: `{ name: string; email?: string; phone?: string; institution?: string; }`
- `FundingCommitment`: `{ hoursGranted: number; startDate: string; endDate: string; hourlyRate?: number; }`
- `FamilyGoal`: `{ id: string; category: string; description: string; targetValue: number; currentValue: number; createdAt: any; updatedAt?: any; }`
- `FamilyJournalEntry`: `{ id: string; date: any; durationInHours: number; type: string; notes: string; hasTimeEntry: boolean; timeEntryId?: string; }`
- `HazardAssessment8a`: `{ id: string; date: any; assessorName: string; indicators: { [key: string]: 'ja' | 'nein' | 'unklar' }; actionsTaken: string; result: 'akut' | 'latent' | 'keine'; nextReviewDate?: string; }`
- `FamilyCase`:
  - `id?: string`
  - `familyName: string`
  - `caseNumber: string`
  - `assignedWorkerId: string` (UserProfile ID)
  - `status: 'aktiv' | 'inaktiv' | 'beendet'`
  - `members: FamilyMember[]`
  - `asdContact?: AsdContact`
  - `fundingCommitment?: FundingCommitment`
  - `createdAt: any`
  - `updatedAt?: any`

### AppSettings Extension in `src/types/index.ts`
- `familyMemberRelations?: string[];`
- `familyJournalTypes?: string[];`
- `familyGoalCategories?: string[];`

### familyHelperService Interface (`src/lib/firebase/services/familyHelperService.ts`)
- `getCases(userId?: string): Promise<FamilyCase[]>`
- `getCaseById(id: string): Promise<FamilyCase | null>`
- `createCase(caseData: Omit<FamilyCase, 'id'>): Promise<string>`
- `updateCase(id: string, caseData: Partial<FamilyCase>): Promise<void>`
- `deleteCase(id: string): Promise<void>`
- `getJournalEntries(caseId: string): Promise<FamilyJournalEntry[]>`
- `addJournalEntry(caseId: string, entry: Omit<FamilyJournalEntry, 'id'>, createTimeEntry?: boolean, userId?: string): Promise<string>`
- `updateJournalEntry(caseId: string, entryId: string, entry: Partial<FamilyJournalEntry>): Promise<void>`
- `deleteJournalEntry(caseId: string, entryId: string): Promise<void>`
- `getHazardAssessments(caseId: string): Promise<HazardAssessment8a[]>`
- `addHazardAssessment(caseId: string, assessment: Omit<HazardAssessment8a, 'id'>): Promise<string>`
- `updateHazardAssessment(caseId: string, assessmentId: string, assessment: Partial<HazardAssessment8a>): Promise<void>`

## Code Layout
- `src/types/familyHelper.ts` — SPFH-specific type definitions
- `src/types/index.ts` — Central types
- `src/lib/firebase/services/familyHelperService.ts` — Firestore Service
- `src/app/settings/page.tsx` — Settings page
- `src/app/family-helper/page.tsx` — Dashboard view
- `src/app/family-helper/[caseId]/page.tsx` — Detail view
- `src/lib/firebase/services/settingsService.ts` — Dropdown configuration service
