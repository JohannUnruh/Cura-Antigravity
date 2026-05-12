import { TimeEntry, OvertimeTransfer, TimeEntryType } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { settingsService } from "./settingsService";

const COLLECTION_NAME = "time_entries";
const OVERTIME_TRANSFER_COLLECTION = "overtime_transfers";

// Type for creating new time entries (status is optional)
export type NewTimeEntry = Omit<TimeEntry, "id" | "createdAt" | "status"> & { status?: 'active' | 'overtime-pool' };

/**
 * Prüft, ob der User ein Minijobber ist
 * Nur für Minijobber gilt die Kontingent-Berechnung mit Überstundenpool
 */
export async function isMinijobber(authorId: string): Promise<boolean> {
    try {
        const userDoc = await getDoc(doc(db, "users", authorId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.contractType === 'Minijob';
        }
        return false;
    } catch (error) {
        console.error("Error checking contract type:", error);
        return false;
    }
}

/**
 * Berechnet die maximalen Arbeitsstunden pro Monat basierend auf den Settings
 * Monatskontingent = Verdienstgrenze monatlich / Mindestlohn pro Stunde
 * Nur für Minijobber relevant
 */
export async function getMaxHoursForMonth(): Promise<number> {
    const settings = await settingsService.getSettings();
    const monthlyLimit = settings.monthlyEarningsLimit || 538;
    const minimumWage = settings.minimumWage || 12.41;
    
    if (minimumWage <= 0) return 0;
    
    return Math.round((monthlyLimit / minimumWage) * 100) / 100;
}

/**
 * Berechnet die bereits verwendeten Stunden für einen bestimmten Monat
 * Nur 'active' Entries werden berücksichtigt (oder Einträge ohne status)
 */
export async function getHoursByMonth(authorId: string, year: number, month: number): Promise<number> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("authorId", "==", authorId)
    );
    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Einträge ohne status oder mit status 'active' zählen
        if (data.status === undefined || data.status === null || data.status === 'active') {
            const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
            if (date.getFullYear() === year && date.getMonth() === month) {
                total += data.durationInHours || 0;
            }
        }
    });

    return total;
}

/**
 * Berechnet die verbleibenden Stunden für einen Monat
 */
export async function getRemainingHours(authorId: string, year: number, month: number): Promise<number> {
    const maxHours = await getMaxHoursForMonth();
    const usedHours = await getHoursByMonth(authorId, year, month);
    return Math.max(0, maxHours - usedHours);
}

/**
 * Interne Helper-Funktion zum Erstellen eines TimeEntry
 */
async function _createTimeEntry(entry: NewTimeEntry): Promise<TimeEntry> {
    const id = `time_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const docRef = doc(db, COLLECTION_NAME, id);

    const newDoc: TimeEntry = {
        ...entry,
        status: entry.status || 'active',
        id,
        createdAt: new Date(),
    };

    await setDoc(docRef, newDoc);
    return newDoc;
}

/**
 * Fügt einen TimeEntry hinzu und prüft das Kontingent
 * Wenn das Kontingent überschritten wird, wird der Überschuss im Pool gespeichert
 * NUR für Minijobber - andere User-Typen erfassen alle Stunden direkt ohne Pool
 */
export async function addTimeEntryWithCheck(
    entry: NewTimeEntry,
    year: number,
    month: number
): Promise<{
    status: 'saved' | 'split' | 'pool-only' | 'non-minijob';
    activeEntry?: TimeEntry;
    poolEntry?: TimeEntry;
    remainingHours?: number;
    overtimeHours?: number;
}> {
    // Prüfen, ob User ein Minijobber ist
    const userIsMinijobber = await isMinijobber(entry.authorId);
    
    // Für Nicht-Minijobber: Alle Stunden direkt ohne Kontingent-Prüfung erfassen
    if (!userIsMinijobber) {
        const activeEntry = await _createTimeEntry({
            ...entry,
            status: 'active'
        });
        return {
            status: 'non-minijob',
            activeEntry
        };
    }

    // Für Minijobber: Kontingent-Prüfung wie bisher
    const remainingHours = await getRemainingHours(entry.authorId, year, month);
    const requestedHours = entry.durationInHours;

    // Fall 1: Alles passt ins Kontingent
    if (requestedHours <= remainingHours && remainingHours > 0) {
        const activeEntry = await _createTimeEntry({
            ...entry,
            status: 'active'
        });
        return {
            status: 'saved',
            activeEntry,
            remainingHours: remainingHours - requestedHours
        };
    }

    // Fall 2: Kontingent ist bereits ausgeschöpft
    if (remainingHours <= 0) {
        const poolEntry = await _createTimeEntry({
            ...entry,
            status: 'overtime-pool',
            originalMonth: `${year}-${String(month + 1).padStart(2, '0')}`
        });
        return {
            status: 'pool-only',
            poolEntry,
            overtimeHours: requestedHours
        };
    }

    // Fall 3: Aufteilen (Rest ins Kontingent, Überschuss in Pool)
    const activeHours = remainingHours;
    const overtimeHours = requestedHours - remainingHours;

    const activeEntry = await _createTimeEntry({
        ...entry,
        durationInHours: activeHours,
        status: 'active'
    });

    const poolEntry = await _createTimeEntry({
        ...entry,
        durationInHours: overtimeHours,
        status: 'overtime-pool',
        originalMonth: `${year}-${String(month + 1).padStart(2, '0')}`
    });

    return {
        status: 'split',
        activeEntry,
        poolEntry,
        remainingHours: 0,
        overtimeHours
    };
}

export const timeTrackingService = {
    async addTimeEntry(entry: NewTimeEntry): Promise<TimeEntry> {
        return _createTimeEntry(entry);
    },

    async addTimeEntryWithCheck(
        entry: NewTimeEntry,
        year: number,
        month: number
    ): Promise<{
        status: 'saved' | 'split' | 'pool-only' | 'non-minijob';
        activeEntry?: TimeEntry;
        poolEntry?: TimeEntry;
        remainingHours?: number;
        overtimeHours?: number;
    }> {
        return addTimeEntryWithCheck(entry, year, month);
    },

    /**
     * Fügt verteilte Zeiteinträge hinzu (z.B. für Beratungen, Vorträge, Freizeiten)
     * VERWENDET JETZT addTimeEntryWithCheck für korrekte Kontingent-Prüfung bei Minijobbern
     */
    async addDistributedTimeEntries(
        entry: {
            authorId: string;
            type: TimeEntryType;
            description: string;
            referenceId?: string;
            status?: 'active' | 'overtime-pool';
            timeOfDay?: 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig';
        },
        dateFrom: Date | string,
        dateTo: Date | string,
        totalHours: number,
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday' = 'morning'
    ): Promise<{
        activeEntries: TimeEntry[];
        poolEntries: TimeEntry[];
        hasOverflow: boolean;
    }> {

        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateTo);
        end.setHours(0, 0, 0, 0);

        let diffTime = end.getTime() - start.getTime();
        if (diffTime < 0) diffTime = 0;

        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const hoursPerDay = totalHours / diffDays;

        let timeOfDayFormatted: 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig' = 'Ganztägig';
        if (timeOfDay === 'morning') timeOfDayFormatted = 'Vormittags';
        if (timeOfDay === 'afternoon') timeOfDayFormatted = 'Nachmittags';
        if (timeOfDay === 'evening') timeOfDayFormatted = 'Abends';

        let startHour = 8;
        if (timeOfDay === 'afternoon') startHour = 15;
        if (timeOfDay === 'evening') startHour = 18;
        if (timeOfDay === 'allday') startHour = 8;

        const activeEntries: TimeEntry[] = [];
        const poolEntries: TimeEntry[] = [];
        let hasOverflow = false;

        // Einträge nacheinander erstellen mit Kontingent-Prüfung
        for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + i);
            currentDate.setHours(startHour, 0, 0, 0);

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // Verwende addTimeEntryWithCheck für Kontingent-Prüfung
            const result = await addTimeEntryWithCheck({
                ...entry,
                date: currentDate,
                durationInHours: hoursPerDay,
                timeOfDay: timeOfDayFormatted,
            }, year, month);

            if (result.activeEntry) {
                activeEntries.push(result.activeEntry);
            }
            if (result.poolEntry) {
                poolEntries.push(result.poolEntry);
                hasOverflow = true;
            }
        }

        return { activeEntries, poolEntries, hasOverflow };
    },

    async updateTimeEntry(id: string, entry: Partial<TimeEntry>): Promise<TimeEntry> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const cleanData = Object.entries(entry).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });

        const updatedDoc = await getDoc(docRef);
        return updatedDoc.data() as TimeEntry;
    },

    async deleteTimeEntry(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    },

    async deleteTimeEntriesByReferenceId(referenceId: string, authorId: string): Promise<void> {
        const q = query(collection(db, COLLECTION_NAME), where("referenceId", "==", referenceId), where("authorId", "==", authorId));
        const snapshots = await getDocs(q);
        const promises = snapshots.docs.map(d => deleteDoc(d.ref));
        await Promise.all(promises);
    },

    async getTimeEntriesByAuthor(authorId: string): Promise<TimeEntry[]> {
        const q = query(collection(db, COLLECTION_NAME), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as TimeEntry;
        });

        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    /**
     * Holt alle Entries im Überstundenpool für einen User
     */
    async getOvertimePoolEntries(authorId: string): Promise<TimeEntry[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("authorId", "==", authorId),
            where("status", "==", "overtime-pool")
        );
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as TimeEntry;
        });

        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    /**
     * Verschiebt einen Entry in den Überstundenpool
     */
    async moveToOvertimePool(entryId: string, originalMonth: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, entryId);
        await setDoc(docRef, {
            status: 'overtime-pool',
            originalMonth
        }, { merge: true });
    },

    /**
     * Verteilt Entries aus dem Pool auf einen Zielmonat
     * Ändert Status von 'overtime-pool' auf 'active' und setzt transferredFrom
     */
    async distributeFromPool(
        entryIds: string[],
        targetMonth: { year: number; month: number },
        authorId: string
    ): Promise<void> {
        const targetMonthStr = `${targetMonth.year}-${String(targetMonth.month + 1).padStart(2, '0')}`;
        const promises = entryIds.map(id => {
            const docRef = doc(db, COLLECTION_NAME, id);
            return setDoc(docRef, {
                status: 'active',
                transferredFrom: targetMonthStr,
                transferredAt: new Date(),
                transferredBy: authorId,
                originalMonth: null // Remove originalMonth when activated
            }, { merge: true });
        });
        await Promise.all(promises);
    },

    /**
     * Protokolliert einen Überstundentransfer
     */
    async logOvertimeTransfer(transfer: Omit<OvertimeTransfer, "id" | "createdAt">): Promise<OvertimeTransfer> {
        const id = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const docRef = doc(db, OVERTIME_TRANSFER_COLLECTION, id);

        const newDoc: OvertimeTransfer = {
            ...transfer,
            id,
            createdAt: new Date()
        };

        await setDoc(docRef, newDoc);
        return newDoc;
    },

    /**
     * Holt alle Transfers für einen User
     */
    async getOvertimeTransfers(authorId: string): Promise<OvertimeTransfer[]> {
        const q = query(
            collection(db, OVERTIME_TRANSFER_COLLECTION),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                transferredAt: data.transferredAt?.toDate ? data.transferredAt.toDate() : new Date(data.transferredAt),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as OvertimeTransfer;
        });
    },

    /**
     * Löscht einen Entry aus dem Pool
     */
    async deletePoolEntry(entryId: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, entryId);
        await deleteDoc(docRef);
    },

    /**
     * Updated einen Entry im Pool (für Bearbeiten-Funktion)
     */
    async updatePoolEntry(entryId: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
        const docRef = doc(db, COLLECTION_NAME, entryId);
        const cleanData = Object.entries(updates).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });

        const updatedDoc = await getDoc(docRef);
        return updatedDoc.data() as TimeEntry;
    },

    /**
     * Holt alle aktiven Entries für einen bestimmten Monat
     */
    async getTimeEntriesByMonth(authorId: string, year: number, month: number): Promise<TimeEntry[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("authorId", "==", authorId),
            where("status", "==", "active")
        );
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as TimeEntry;
        }).filter(entry => {
            const d = entry.date;
            return d.getFullYear() === year && d.getMonth() === month;
        });

        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
};
