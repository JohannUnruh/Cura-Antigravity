## 2026-06-11T08:25:00Z
You are the Worker M3 for the SPFH module implementation in the Cura-Antigravity application.
Your working directory is C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_m3.
Your task is to implement the familyHelperService.ts service with Firestore CRUD and Zeiterfassung coupling.

Instructions:
1. Create the file `src/lib/firebase/services/familyHelperService.ts`:
   - Import `db` from `@/lib/firebase/config` and Firestore methods: `collection`, `doc`, `getDocs`, `getDoc`, `setDoc`, `deleteDoc`, `query`, `where`, `updateDoc` (or using setDoc merge).
   - Import `timeTrackingService` from `./timeTrackingService`.
   - Import types: `FamilyCase`, `FamilyJournalEntry`, `HazardAssessment8a` from `@/types/familyHelper`.
   - Implement mock mode support:
     - Keep a flag `let isMockMode = false;`
     - Provide `setFamilyHelperMockMode(mock: boolean)` to toggle the flag.
     - Provide `clearFamilyHelperMockDb()` to clear the memory store.
     - Keep memory maps for cases (`new Map<string, FamilyCase>()`), journals (`new Map<string, FamilyJournalEntry[]>()`), assessments (`new Map<string, HazardAssessment8a[]>()`), and templates (`new Map<string, Record<string, any>>()`).
   - Implement the following methods (handling both mock mode and production Firestore):
     - `createCase(caseData: Omit<FamilyCase, 'id'>): Promise<string>`: Creates a new case document. Generate ID like `case_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`. Set `createdAt` and return the new ID.
     - `getCaseById(id: string): Promise<FamilyCase | null>`: Retrieves the case. If not found in mock or Firestore, return `null`. Convert Firestore timestamp fields (`createdAt`, `updatedAt`) back to JS Date objects.
     - `getCases(userId?: string): Promise<FamilyCase[]>`: Retrieves all cases. If `userId` is provided, filter by `assignedWorkerId == userId`. Sort them by `createdAt` descending.
     - `updateCase(id: string, caseData: Partial<FamilyCase>): Promise<void>`: Updates the case. **If the case does not exist (check it first), throw new Error("Case not found")**. Set `updatedAt: new Date()` and update fields.
     - `deleteCase(id: string): Promise<void>`: Deletes the case. **If the case does not exist, throw new Error("Case not found")**. Also delete subcollections (for Firestore you can do document delete, for mock clear maps).
     - `getJournalEntries(caseId: string): Promise<FamilyJournalEntry[]>`: Retrieves all journal entries for a case, sorted by `date` descending. Parse date fields.
     - `addJournalEntry(caseId: string, entry: Omit<FamilyJournalEntry, 'id'>, createTimeEntry?: boolean, userId?: string): Promise<string>`: Adds a journal entry. **If the case does not exist, throw new Error("Case not found")**.
       - Generate entry ID: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`.
       - If `createTimeEntry` is true (and `userId` is provided), couple with Zeiterfassung:
         - Call `timeTrackingService.addTimeEntryWithCheck` with fields:
           `{ authorId: userId, date: entry.date, description: "SPFH Journal: " + case.familyName, durationInHours: entry.durationInHours, type: "Beratung", referenceId: entryId }`
         - Link the active/pool entry ID back to the journal: set `entry.timeEntryId = activeEntry.id || poolEntry.id; entry.hasTimeEntry = true;` (or similar).
       - Store in case `journal` subcollection (or map in mock). Return the entry ID.
     - `updateJournalEntry(caseId: string, entryId: string, entryUpdates: Partial<FamilyJournalEntry>): Promise<void>`: Updates a journal entry.
       - **If the case or the journal entries list/entry does not exist, throw new Error("Journal entries not found")**.
       - If coupled (has `timeEntryId` on the existing entry), update the corresponding `TimeEntry` in `timeTrackingService` with the updated date and duration using `timeTrackingService.updateTimeEntry`.
       - Update the journal entry document.
     - `deleteJournalEntry(caseId: string, entryId: string): Promise<void>`: Deletes a journal entry.
       - If coupled (has `timeEntryId`), delete the corresponding `TimeEntry` using `timeTrackingService.deleteTimeEntry` or `timeTrackingService.deleteTimeEntriesByReferenceIdOnly(entryId)`.
       - Delete the journal entry document.
     - `getHazardAssessments(caseId: string): Promise<HazardAssessment8a[]>`: Retrieves all hazard assessments for a case, sorted by `date` descending.
     - `addHazardAssessment(caseId: string, assessment: Omit<HazardAssessment8a, 'id'>): Promise<string>`: Adds a hazard assessment document in subcollection `hazard_assessments` (or mock map). Return new ID.
     - `updateHazardAssessment(caseId: string, assessmentId: string, assessmentUpdates: Partial<HazardAssessment8a>): Promise<void>`: Updates a hazard assessment document.
     - `getTemplates(caseId: string): Promise<Record<string, any>>`: Retrieves case templates.
     - `saveTemplate(caseId: string, templateId: string, content: any): Promise<void>`: Saves a template (e.g. `anamnese`, `hypothesen`, `interventionsplanung`, `evaluation` documents in `templates` subcollection).
2. Verify that the files are properly written and compiles. Run `npx tsc --noEmit` or `npm run lint` if needed.
3. Update your progress.md in your working directory and notify the parent orchestrator via send_message.
