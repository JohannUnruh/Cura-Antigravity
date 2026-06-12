import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { FamilyCase, FamilyJournalEntry, HazardAssessment8a } from "@/types/familyHelper";
import { timeTrackingService } from "./timeTrackingService";

let isMockMode = false;

// In-Memory Database for Mock Mode
const mockCases = new Map<string, FamilyCase>();
const mockJournals = new Map<string, FamilyJournalEntry[]>(); // key: caseId
const mockAssessments = new Map<string, HazardAssessment8a[]>(); // key: caseId
const mockTemplates = new Map<string, Record<string, unknown>>(); // key: caseId

export function setFamilyHelperMockMode(mock: boolean) {
    isMockMode = mock;
    if (!mock) {
        mockCases.clear();
        mockJournals.clear();
        mockAssessments.clear();
        mockTemplates.clear();
    }
}

export function clearFamilyHelperMockDb() {
    mockCases.clear();
    mockJournals.clear();
    mockAssessments.clear();
    mockTemplates.clear();
}

function parseDate(val: unknown): Date {
    if (!val) return new Date();
    let d: Date;
    if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
        d = (val as { toDate: () => Date }).toDate();
    } else if (val instanceof Date) {
        d = val;
    } else if (typeof val === 'string' || typeof val === 'number') {
        d = new Date(val);
    } else {
        d = new Date();
    }

    if (isNaN(d.getTime())) {
        throw new Error("Invalid date format: " + String(val));
    }
    return d;
}

function parseDateOptional(val: unknown): Date | undefined {
    if (!val) return undefined;
    let d: Date;
    if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
        d = (val as { toDate: () => Date }).toDate();
    } else if (val instanceof Date) {
        d = val;
    } else if (typeof val === 'string' || typeof val === 'number') {
        d = new Date(val);
    } else {
        return undefined;
    }

    if (isNaN(d.getTime())) {
        throw new Error("Invalid date format: " + String(val));
    }
    return d;
}

export const familyHelperService = {
    async createCase(caseData: Omit<FamilyCase, 'id'>): Promise<string> {
        const id = `case_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date();
        const newCase: FamilyCase = {
            ...caseData,
            id,
            createdAt: now,
            updatedAt: now
        };

        if (isMockMode) {
            mockCases.set(id, newCase);
            return id;
        }

        const docRef = doc(db, "family_cases", id);
        await setDoc(docRef, newCase);
        return id;
    },

    async getCaseById(id: string): Promise<FamilyCase | null> {
        if (isMockMode) {
            return mockCases.get(id) || null;
        }

        const docSnap = await getDoc(doc(db, "family_cases", id));
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDateOptional(data.updatedAt)
        } as FamilyCase;
    },

    async getCases(userId?: string): Promise<FamilyCase[]> {
        if (isMockMode) {
            let list = Array.from(mockCases.values());
            if (userId) {
                list = list.filter(c => c.assignedWorkerId === userId);
            }
            return list.sort((a, b) => {
                const timeA = parseDate(a.createdAt).getTime();
                const timeB = parseDate(b.createdAt).getTime();
                return timeB - timeA;
            });
        }

        let q = query(collection(db, "family_cases"));
        if (userId) {
            q = query(collection(db, "family_cases"), where("assignedWorkerId", "==", userId));
        }
        const querySnapshot = await getDocs(q);
        const list: FamilyCase[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDateOptional(data.updatedAt)
            } as FamilyCase);
        });

        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async updateCase(id: string, caseData: Partial<FamilyCase>): Promise<void> {
        const caseObj = await this.getCaseById(id);
        if (!caseObj) {
            throw new Error("Case not found");
        }

        const now = new Date();
        if (isMockMode) {
            const updated: FamilyCase = {
                ...caseObj,
                ...caseData,
                id,
                updatedAt: now
            };
            mockCases.set(id, updated);
            return;
        }

        const docRef = doc(db, "family_cases", id);
        const updates = {
            ...caseData,
            updatedAt: now
        };
        const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async deleteCase(id: string): Promise<void> {
        const caseObj = await this.getCaseById(id);
        if (!caseObj) {
            throw new Error("Case not found");
        }

        // Get journals to delete coupled time entries and journal documents
        const journals = await this.getJournalEntries(id);
        for (const j of journals) {
            if (j.hasTimeEntry && j.timeEntryId) {
                await timeTrackingService.deleteTimeEntry(j.timeEntryId);
            }
            if (!isMockMode) {
                const journalDocRef = doc(db, "family_cases", id, "journal", j.id);
                await deleteDoc(journalDocRef);
            }
        }

        // Get hazard assessments to delete assessment documents
        const assessments = await this.getHazardAssessments(id);
        for (const a of assessments) {
            if (!isMockMode) {
                const assessmentDocRef = doc(db, "family_cases", id, "hazard_assessments", a.id);
                await deleteDoc(assessmentDocRef);
            }
        }

        // Get templates to delete template documents
        if (!isMockMode) {
            try {
                const templates = await this.getTemplates(id);
                for (const tId of Object.keys(templates)) {
                    const templateDocRef = doc(db, "family_cases", id, "templates", tId);
                    await deleteDoc(templateDocRef);
                }
            } catch {
                // Ignore templates subcollection deletion errors
            }
        }

        if (isMockMode) {
            mockCases.delete(id);
            mockJournals.delete(id);
            mockAssessments.delete(id);
            mockTemplates.delete(id);
            return;
        }

        const docRef = doc(db, "family_cases", id);
        await deleteDoc(docRef);
    },

    async getJournalEntries(caseId: string): Promise<FamilyJournalEntry[]> {
        if (isMockMode) {
            const entries = mockJournals.get(caseId) || [];
            return entries
                .map(entry => ({
                    ...entry,
                    date: parseDate(entry.date)
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        const q = query(collection(db, "family_cases", caseId, "journal"));
        const querySnapshot = await getDocs(q);
        const list: FamilyJournalEntry[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                date: parseDate(data.date),
            } as FamilyJournalEntry);
        });

        return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    async addJournalEntry(
        caseId: string,
        entry: Omit<FamilyJournalEntry, 'id'>,
        createTimeEntry?: boolean,
        userId?: string
    ): Promise<string> {
        const caseObj = await this.getCaseById(caseId);
        if (!caseObj) {
            throw new Error("Case not found");
        }

        // Validate journal entry date is within fundingCommitment
        if (caseObj.fundingCommitment) {
            const entryDate = parseDate(entry.date);
            const start = parseDate(caseObj.fundingCommitment.startDate);
            const end = parseDate(caseObj.fundingCommitment.endDate);
            
            const entryTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
            const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

            if (entryTime < startTime || entryTime > endTime) {
                throw new Error("Journal entry date is outside the funding commitment period");
            }
        }

        const entryId = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        let timeEntryId: string | undefined = undefined;
        let hasTimeEntry = false;

        if (createTimeEntry && userId) {
            const entryDate = parseDate(entry.date);
            const year = entryDate.getFullYear();
            const month = entryDate.getMonth();

            const result = await timeTrackingService.addTimeEntryWithCheck({
                authorId: userId,
                date: entryDate,
                description: "SPFH Journal: " + caseObj.familyName,
                durationInHours: entry.durationInHours,
                type: "Beratung",
                referenceId: entryId
            }, year, month);

            const linkedId = result.activeEntry?.id || result.poolEntry?.id;
            if (linkedId) {
                timeEntryId = linkedId;
                hasTimeEntry = true;
            }
        }

        const newEntry: FamilyJournalEntry = {
            ...entry,
            id: entryId,
            date: parseDate(entry.date),
            hasTimeEntry,
            timeEntryId
        };

        if (isMockMode) {
            const entries = mockJournals.get(caseId) || [];
            entries.push(newEntry);
            mockJournals.set(caseId, entries);
            return entryId;
        }

        const docRef = doc(db, "family_cases", caseId, "journal", entryId);
        await setDoc(docRef, newEntry);
        return entryId;
    },

    async updateJournalEntry(
        caseId: string,
        entryId: string,
        entryUpdates: Partial<FamilyJournalEntry>
    ): Promise<void> {
        const caseObj = await this.getCaseById(caseId);
        if (!caseObj) {
            throw new Error("Journal entries not found");
        }

        let existingEntry: FamilyJournalEntry | undefined = undefined;
        let entriesList: FamilyJournalEntry[] = [];
        let idx = -1;

        if (isMockMode) {
            entriesList = mockJournals.get(caseId) || [];
            idx = entriesList.findIndex(e => e.id === entryId);
            if (idx === -1) {
                throw new Error("Journal entries not found");
            }
            existingEntry = entriesList[idx];
        } else {
            const docRef = doc(db, "family_cases", caseId, "journal", entryId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error("Journal entries not found");
            }
            const data = docSnap.data();
            existingEntry = {
                ...data,
                id: docSnap.id,
                date: parseDate(data.date)
            } as FamilyJournalEntry;
        }

        // Validate updated journal entry date is within fundingCommitment
        if (caseObj.fundingCommitment) {
            const updatedDate = entryUpdates.date !== undefined ? parseDate(entryUpdates.date) : parseDate(existingEntry.date);
            const start = parseDate(caseObj.fundingCommitment.startDate);
            const end = parseDate(caseObj.fundingCommitment.endDate);

            const entryTime = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate()).getTime();
            const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

            if (entryTime < startTime || entryTime > endTime) {
                throw new Error("Journal entry date is outside the funding commitment period");
            }
        }

        if (existingEntry.hasTimeEntry && existingEntry.timeEntryId) {
            const updatedDuration = entryUpdates.durationInHours !== undefined ? entryUpdates.durationInHours : existingEntry.durationInHours;
            const updatedDate = entryUpdates.date !== undefined ? parseDate(entryUpdates.date) : parseDate(existingEntry.date);

            await timeTrackingService.updateTimeEntry(existingEntry.timeEntryId, {
                durationInHours: updatedDuration,
                date: updatedDate
            });
        }

        const updatedEntry: FamilyJournalEntry = {
            ...existingEntry,
            ...entryUpdates,
            id: entryId,
            date: entryUpdates.date ? parseDate(entryUpdates.date) : existingEntry.date
        };

        if (isMockMode) {
            entriesList[idx] = updatedEntry;
            mockJournals.set(caseId, entriesList);
            return;
        }

        const docRef = doc(db, "family_cases", caseId, "journal", entryId);
        const cleanUpdates = Object.entries(updatedEntry).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async deleteJournalEntry(caseId: string, entryId: string): Promise<void> {
        let existingEntry: FamilyJournalEntry | undefined = undefined;
        let entriesList: FamilyJournalEntry[] = [];
        let idx = -1;

        if (isMockMode) {
            entriesList = mockJournals.get(caseId) || [];
            idx = entriesList.findIndex(e => e.id === entryId);
            if (idx === -1) {
                throw new Error("Journal entry not found");
            }
            existingEntry = entriesList[idx];
        } else {
            const docRef = doc(db, "family_cases", caseId, "journal", entryId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error("Journal entry not found");
            }
            const data = docSnap.data();
            existingEntry = {
                ...data,
                id: docSnap.id,
                date: parseDate(data.date)
            } as FamilyJournalEntry;
        }

        if (existingEntry.hasTimeEntry && existingEntry.timeEntryId) {
            await timeTrackingService.deleteTimeEntry(existingEntry.timeEntryId);
        }

        if (isMockMode) {
            entriesList.splice(idx, 1);
            mockJournals.set(caseId, entriesList);
            return;
        }

        const docRef = doc(db, "family_cases", caseId, "journal", entryId);
        await deleteDoc(docRef);
    },

    async getHazardAssessments(caseId: string): Promise<HazardAssessment8a[]> {
        if (isMockMode) {
            const list = mockAssessments.get(caseId) || [];
            return list
                .map(item => ({
                    ...item,
                    date: parseDate(item.date)
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        const q = query(collection(db, "family_cases", caseId, "hazard_assessments"));
        const querySnapshot = await getDocs(q);
        const list: HazardAssessment8a[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                date: parseDate(data.date),
            } as HazardAssessment8a);
        });

        return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    async addHazardAssessment(
        caseId: string,
        assessment: Omit<HazardAssessment8a, 'id'>
    ): Promise<string> {
        const caseObj = await this.getCaseById(caseId);
        if (!caseObj) {
            throw new Error("Case not found");
        }

        const id = `hazard_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newAssessment: HazardAssessment8a = {
            ...assessment,
            id,
            date: parseDate(assessment.date)
        };

        if (isMockMode) {
            const list = mockAssessments.get(caseId) || [];
            list.push(newAssessment);
            mockAssessments.set(caseId, list);
            return id;
        }

        const docRef = doc(db, "family_cases", caseId, "hazard_assessments", id);
        await setDoc(docRef, newAssessment);
        return id;
    },

    async updateHazardAssessment(
        caseId: string,
        assessmentId: string,
        assessmentUpdates: Partial<HazardAssessment8a>
    ): Promise<void> {
        if (isMockMode) {
            const list = mockAssessments.get(caseId);
            if (!list) {
                throw new Error("Assessments not found");
            }
            const idx = list.findIndex(a => a.id === assessmentId);
            if (idx === -1) {
                throw new Error("Assessment not found");
            }
            list[idx] = {
                ...list[idx],
                ...assessmentUpdates,
                id: assessmentId,
                date: assessmentUpdates.date ? parseDate(assessmentUpdates.date) : list[idx].date
            };
            mockAssessments.set(caseId, list);
            return;
        }

        const docRef = doc(db, "family_cases", caseId, "hazard_assessments", assessmentId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("Assessment not found");
        }

        const cleanUpdates = Object.entries(assessmentUpdates).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        if (cleanUpdates.date) {
            cleanUpdates.date = parseDate(cleanUpdates.date);
        }

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async getTemplates(caseId: string): Promise<Record<string, unknown>> {
        if (isMockMode) {
            return mockTemplates.get(caseId) || {};
        }

        const q = query(collection(db, "family_cases", caseId, "templates"));
        const querySnapshot = await getDocs(q);
        const result: Record<string, unknown> = {};
        querySnapshot.forEach(docSnap => {
            result[docSnap.id] = docSnap.data();
        });
        return result;
    },

    async saveTemplate(caseId: string, templateId: string, content: unknown): Promise<void> {
        if (isMockMode) {
            const templates = mockTemplates.get(caseId) || {};
            templates[templateId] = content as Record<string, unknown>;
            mockTemplates.set(caseId, templates);
            return;
        }

        const docRef = doc(db, "family_cases", caseId, "templates", templateId);
        await setDoc(docRef, (content as Record<string, unknown>) || {});
    }
};
