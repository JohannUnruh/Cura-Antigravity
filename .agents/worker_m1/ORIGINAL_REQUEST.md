## 2026-06-11T08:21:08Z

You are the Worker M1 for the SPFH module implementation in the Cura-Antigravity application.
Your working directory is C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m1.
Your task is to implement the datatypes and AppSettings extensions.

Instructions:
1. Create `src/types/familyHelper.ts` containing the following types:
   - `FamilyMember`: `{ firstName: string; lastName: string; birthDate?: string; relation: string; }`
   - `AsdContact`: `{ name: string; email?: string; phone?: string; institution?: string; }`
   - `FundingCommitment`: `{ hoursGranted: number; startDate: string; endDate: string; hourlyRate?: number; }`
   - `FamilyGoal`: `{ id: string; category: string; description: string; targetValue: number; currentValue: number; createdAt: Date; updatedAt?: Date; }`
   - `FamilyJournalEntry`: `{ id: string; date: Date; durationInHours: number; type: string; notes: string; hasTimeEntry: boolean; timeEntryId?: string; }`
   - `HazardAssessment8a`: `{ id: string; date: Date; assessorName: string; indicators: { [key: string]: 'ja' | 'nein' | 'unklar' }; actionsTaken: string; result: 'akut' | 'latent' | 'keine'; nextReviewDate?: string; }`
   - `FamilyCase`: `{ id?: string; familyName: string; caseNumber: string; assignedWorkerId: string; status: 'aktiv' | 'inaktiv' | 'beendet'; members: FamilyMember[]; asdContact?: AsdContact; fundingCommitment?: FundingCommitment; createdAt: Date; updatedAt?: Date; }`
2. Modify `src/types/index.ts` to:
   - Add optional lists to `AppSettings` interface:
     - `familyMemberRelations?: string[];`
     - `familyJournalTypes?: string[];`
     - `familyGoalCategories?: string[];`
   - Add `export * from "./familyHelper";` at the bottom of the file to export these types globally from `@/types`.
3. Verify that the files are properly written and syntactically valid (TypeScript check can be run or verified).
4. Update your progress.md in your working directory and notify the parent orchestrator via send_message.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Respond in German (Antworte immer auf Deutsch).
