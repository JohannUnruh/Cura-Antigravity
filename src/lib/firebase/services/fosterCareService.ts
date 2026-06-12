import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { FosterFamily, FosterChild, FosterPlacement, FosterJournalEntry } from "@/types/fosterCare";
import { timeTrackingService } from "./timeTrackingService";

let isMockMode = false;

// In-Memory Database for Mock Mode
const mockFamilies = new Map<string, FosterFamily>();
const mockChildren = new Map<string, FosterChild>();
const mockPlacements = new Map<string, FosterPlacement>();
const mockJournal = new Map<string, FosterJournalEntry>();

export function setFosterCareMockMode(mock: boolean) {
    isMockMode = mock;
    if (!mock) {
        mockFamilies.clear();
        mockChildren.clear();
        mockPlacements.clear();
        mockJournal.clear();
    }
}

export function clearFosterCareMockDb() {
    mockFamilies.clear();
    mockChildren.clear();
    mockPlacements.clear();
    mockJournal.clear();
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

// Service implementation
export const fosterCareService = {
    // ─────────────────────────────────────────────────────────────────────────
    // FosterFamily (Pflegefamilie) CRUD
    // ─────────────────────────────────────────────────────────────────────────
    async createFamily(familyData: Omit<FosterFamily, 'id' | 'activePlacementsCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = `family_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date();
        const newFamily: FosterFamily = {
            ...familyData,
            id,
            activePlacementsCount: 0,
            createdAt: now,
            updatedAt: now
        };

        if (isMockMode) {
            mockFamilies.set(id, newFamily);
            return id;
        }

        const docRef = doc(db, "foster_families", id);
        await setDoc(docRef, newFamily);
        return id;
    },

    async getFamilyById(id: string): Promise<FosterFamily | null> {
        if (isMockMode) {
            const family = mockFamilies.get(id);
            if (!family) return null;
            return {
                ...family,
                createdAt: parseDate(family.createdAt),
                updatedAt: parseDate(family.updatedAt)
            };
        }

        const docSnap = await getDoc(doc(db, "foster_families", id));
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt)
        } as FosterFamily;
    },

    async getFamilies(): Promise<FosterFamily[]> {
        if (isMockMode) {
            const list = Array.from(mockFamilies.values());
            return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        const querySnapshot = await getDocs(collection(db, "foster_families"));
        const list: FosterFamily[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDate(data.updatedAt)
            } as FosterFamily);
        });

        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async updateFamily(id: string, familyData: Partial<FosterFamily>): Promise<void> {
        const family = await this.getFamilyById(id);
        if (!family) {
            throw new Error("Foster family not found");
        }

        const now = new Date();
        const updated: FosterFamily = {
            ...family,
            ...familyData,
            id,
            updatedAt: now
        };

        if (isMockMode) {
            mockFamilies.set(id, updated);
            return;
        }

        const docRef = doc(db, "foster_families", id);
        const cleanUpdates = Object.entries(updated).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async deleteFamily(id: string): Promise<void> {
        if (isMockMode) {
            mockFamilies.delete(id);
            return;
        }

        const docRef = doc(db, "foster_families", id);
        await deleteDoc(docRef);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FosterChild (Pflegekind) CRUD
    // ─────────────────────────────────────────────────────────────────────────
    async createChild(childData: Omit<FosterChild, 'id' | 'placementStatus' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = `child_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date();
        const newChild: FosterChild = {
            ...childData,
            id,
            birthDate: parseDate(childData.birthDate),
            placementStatus: 'unplaced',
            createdAt: now,
            updatedAt: now
        };

        if (isMockMode) {
            mockChildren.set(id, newChild);
            return id;
        }

        const docRef = doc(db, "foster_children", id);
        await setDoc(docRef, newChild);
        return id;
    },

    async getChildById(id: string): Promise<FosterChild | null> {
        if (isMockMode) {
            const child = mockChildren.get(id);
            if (!child) return null;
            return {
                ...child,
                birthDate: parseDate(child.birthDate),
                createdAt: parseDate(child.createdAt),
                updatedAt: parseDate(child.updatedAt)
            };
        }

        const docSnap = await getDoc(doc(db, "foster_children", id));
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            birthDate: parseDate(data.birthDate),
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt)
        } as FosterChild;
    },

    async getChildren(): Promise<FosterChild[]> {
        if (isMockMode) {
            const list = Array.from(mockChildren.values());
            return list
                .map(c => ({
                    ...c,
                    birthDate: parseDate(c.birthDate),
                    createdAt: parseDate(c.createdAt),
                    updatedAt: parseDate(c.updatedAt)
                }))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        const querySnapshot = await getDocs(collection(db, "foster_children"));
        const list: FosterChild[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                birthDate: parseDate(data.birthDate),
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDate(data.updatedAt)
            } as FosterChild);
        });

        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async updateChild(id: string, childData: Partial<FosterChild>): Promise<void> {
        const child = await this.getChildById(id);
        if (!child) {
            throw new Error("Foster child not found");
        }

        const now = new Date();
        const updated: FosterChild = {
            ...child,
            ...childData,
            id,
            birthDate: childData.birthDate ? parseDate(childData.birthDate) : child.birthDate,
            updatedAt: now
        };

        if (isMockMode) {
            mockChildren.set(id, updated);
            return;
        }

        const docRef = doc(db, "foster_children", id);
        const cleanUpdates = Object.entries(updated).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async deleteChild(id: string): Promise<void> {
        if (isMockMode) {
            mockChildren.delete(id);
            return;
        }

        const docRef = doc(db, "foster_children", id);
        await deleteDoc(docRef);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FosterPlacement (Platzierung) CRUD
    // ─────────────────────────────────────────────────────────────────────────
    async createPlacement(placementData: Omit<FosterPlacement, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = `placement_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date();
        
        // Validieren, dass Familie und Kind existieren
        const family = await this.getFamilyById(placementData.familyId);
        if (!family) {
            throw new Error("Foster family not found");
        }
        const child = await this.getChildById(placementData.childId);
        if (!child) {
            throw new Error("Foster child not found");
        }

        const newPlacement: FosterPlacement = {
            ...placementData,
            id,
            startDate: parseDate(placementData.startDate),
            endDate: placementData.endDate ? parseDate(placementData.endDate) : undefined,
            status: 'aktiv',
            createdAt: now,
            updatedAt: now
        };

        // Zustand Pflegefamilie (Belegte Plätze +1) und Pflegekind (placed) aktualisieren
        if (isMockMode) {
            mockPlacements.set(id, newPlacement);
            
            // Family updaten
            const updatedFamily: FosterFamily = {
                ...family,
                activePlacementsCount: family.activePlacementsCount + 1,
                updatedAt: now
            };
            mockFamilies.set(family.id, updatedFamily);

            // Child updaten
            const updatedChild: FosterChild = {
                ...child,
                placementStatus: 'placed',
                updatedAt: now
            };
            mockChildren.set(child.id, updatedChild);

            return id;
        }

        // Firestore Transaction / Batch, um Konsistenz zu wahren
        const batch = writeBatch(db);
        const placementRef = doc(db, "foster_placements", id);
        batch.set(placementRef, newPlacement);

        const familyRef = doc(db, "foster_families", family.id);
        batch.update(familyRef, {
            activePlacementsCount: family.activePlacementsCount + 1,
            updatedAt: now
        });

        const childRef = doc(db, "foster_children", child.id);
        batch.update(childRef, {
            placementStatus: 'placed',
            updatedAt: now
        });

        await batch.commit();
        return id;
    },

    async getPlacementById(id: string): Promise<FosterPlacement | null> {
        if (isMockMode) {
            const placement = mockPlacements.get(id);
            if (!placement) return null;
            return {
                ...placement,
                startDate: parseDate(placement.startDate),
                endDate: placement.endDate ? parseDate(placement.endDate) : undefined,
                createdAt: parseDate(placement.createdAt),
                updatedAt: parseDate(placement.updatedAt)
            };
        }

        const docSnap = await getDoc(doc(db, "foster_placements", id));
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            startDate: parseDate(data.startDate),
            endDate: data.endDate ? parseDate(data.endDate) : undefined,
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt)
        } as FosterPlacement;
    },

    async getPlacements(): Promise<FosterPlacement[]> {
        if (isMockMode) {
            const list = Array.from(mockPlacements.values());
            return list
                .map(p => ({
                    ...p,
                    startDate: parseDate(p.startDate),
                    endDate: p.endDate ? parseDate(p.endDate) : undefined,
                    createdAt: parseDate(p.createdAt),
                    updatedAt: parseDate(p.updatedAt)
                }))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        const querySnapshot = await getDocs(collection(db, "foster_placements"));
        const list: FosterPlacement[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                startDate: parseDate(data.startDate),
                endDate: data.endDate ? parseDate(data.endDate) : undefined,
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDate(data.updatedAt)
            } as FosterPlacement);
        });

        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async getPlacementsByFamily(familyId: string): Promise<FosterPlacement[]> {
        const placements = await this.getPlacements();
        return placements.filter(p => p.familyId === familyId);
    },

    async getPlacementsByChild(childId: string): Promise<FosterPlacement[]> {
        const placements = await this.getPlacements();
        return placements.filter(p => p.childId === childId);
    },

    async updatePlacement(id: string, placementData: Partial<FosterPlacement>): Promise<void> {
        const placement = await this.getPlacementById(id);
        if (!placement) {
            throw new Error("Placement not found");
        }

        const now = new Date();
        const updated: FosterPlacement = {
            ...placement,
            ...placementData,
            id,
            startDate: placementData.startDate ? parseDate(placementData.startDate) : placement.startDate,
            endDate: placementData.endDate ? parseDate(placementData.endDate) : placement.endDate,
            updatedAt: now
        };

        if (isMockMode) {
            mockPlacements.set(id, updated);
            return;
        }

        const docRef = doc(db, "foster_placements", id);
        const cleanUpdates = Object.entries(updated).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async endPlacement(id: string, endDate: Date, terminationReason?: string, notes?: string): Promise<void> {
        const placement = await this.getPlacementById(id);
        if (!placement) {
            throw new Error("Placement not found");
        }
        if (placement.status === 'beendet') {
            throw new Error("Placement is already ended");
        }

        const now = new Date();
        const family = await this.getFamilyById(placement.familyId);
        const child = await this.getChildById(placement.childId);

        const updatedPlacement: FosterPlacement = {
            ...placement,
            status: 'beendet',
            endDate: parseDate(endDate),
            terminationReason: terminationReason || undefined,
            notes: notes || placement.notes,
            updatedAt: now
        };

        if (isMockMode) {
            mockPlacements.set(id, updatedPlacement);

            if (family) {
                const updatedFamily: FosterFamily = {
                    ...family,
                    activePlacementsCount: Math.max(0, family.activePlacementsCount - 1),
                    updatedAt: now
                };
                mockFamilies.set(family.id, updatedFamily);
            }

            if (child) {
                const updatedChild: FosterChild = {
                    ...child,
                    placementStatus: 'unplaced',
                    updatedAt: now
                };
                mockChildren.set(child.id, updatedChild);
            }
            return;
        }

        const batch = writeBatch(db);
        const placementRef = doc(db, "foster_placements", id);
        batch.update(placementRef, {
            status: 'beendet',
            endDate: parseDate(endDate),
            terminationReason: terminationReason || null,
            notes: notes || null,
            updatedAt: now
        });

        if (family) {
            const familyRef = doc(db, "foster_families", family.id);
            batch.update(familyRef, {
                activePlacementsCount: Math.max(0, family.activePlacementsCount - 1),
                updatedAt: now
            });
        }

        if (child) {
            const childRef = doc(db, "foster_children", child.id);
            batch.update(childRef, {
                placementStatus: 'unplaced',
                updatedAt: now
            });
        }

        await batch.commit();
    },

    async deletePlacement(id: string): Promise<void> {
        const placement = await this.getPlacementById(id);
        if (!placement) return;

        const now = new Date();
        const family = await this.getFamilyById(placement.familyId);
        const child = await this.getChildById(placement.childId);

        if (isMockMode) {
            mockPlacements.delete(id);

            if (placement.status === 'aktiv') {
                if (family) {
                    const updatedFamily: FosterFamily = {
                        ...family,
                        activePlacementsCount: Math.max(0, family.activePlacementsCount - 1),
                        updatedAt: now
                    };
                    mockFamilies.set(family.id, updatedFamily);
                }
                if (child) {
                    const updatedChild: FosterChild = {
                        ...child,
                        placementStatus: 'unplaced',
                        updatedAt: now
                    };
                    mockChildren.set(child.id, updatedChild);
                }
            }
            return;
        }

        const batch = writeBatch(db);
        const placementRef = doc(db, "foster_placements", id);
        batch.delete(placementRef);

        if (placement.status === 'aktiv') {
            if (family) {
                const familyRef = doc(db, "foster_families", family.id);
                batch.update(familyRef, {
                    activePlacementsCount: Math.max(0, family.activePlacementsCount - 1),
                    updatedAt: now
                });
            }
            if (child) {
                const childRef = doc(db, "foster_children", child.id);
                batch.update(childRef, {
                    placementStatus: 'unplaced',
                    updatedAt: now
                });
            }
        }

        await batch.commit();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FosterJournalEntry (Journal) CRUD mit Zeiterfassungs-Koppelung
    // ─────────────────────────────────────────────────────────────────────────
    async createJournalEntry(
        entry: Omit<FosterJournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'hasTimeEntry' | 'timeEntryId'>,
        createTimeEntry?: boolean,
        userId?: string
    ): Promise<string> {
        const id = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date();

        let timeEntryId: string | undefined = undefined;
        let hasTimeEntry = false;

        // Wenn TimeEntry erwünscht ist, erstellen wir diesen
        if (createTimeEntry && userId) {
            const entryDate = parseDate(entry.date);
            const year = entryDate.getFullYear();
            const month = entryDate.getMonth() + 1; // getMonth() ist 0-basiert, timeTrackingService braucht 1-basierten Monat

            // Name der Familie oder des Kindes herausfinden für Beschreibung
            let description = "Pflegefamilien Journal";
            if (entry.familyId) {
                const family = await this.getFamilyById(entry.familyId);
                if (family) {
                    description = `Pflegefamilien Journal: Familie ${family.parent1.lastName}`;
                }
            } else if (entry.childId) {
                const child = await this.getChildById(entry.childId);
                if (child) {
                    description = `Pflegefamilien Journal: Kind ${child.firstName} ${child.lastName}`;
                }
            }

            const result = await timeTrackingService.addTimeEntryWithCheck({
                authorId: userId,
                date: entryDate,
                description,
                durationInHours: entry.durationInHours,
                type: "Beratung",
                referenceId: id
            }, year, month);

            const linkedId = result.activeEntry?.id || result.poolEntry?.id;
            if (linkedId) {
                timeEntryId = linkedId;
                hasTimeEntry = true;
            }
        }

        const newEntry: FosterJournalEntry = {
            ...entry,
            id,
            date: parseDate(entry.date),
            hasTimeEntry,
            timeEntryId,
            createdAt: now,
            updatedAt: now
        };

        if (isMockMode) {
            mockJournal.set(id, newEntry);
            return id;
        }

        const docRef = doc(db, "foster_journal", id);
        await setDoc(docRef, newEntry);
        return id;
    },

    async getJournalEntryById(id: string): Promise<FosterJournalEntry | null> {
        if (isMockMode) {
            const entry = mockJournal.get(id);
            if (!entry) return null;
            return {
                ...entry,
                date: parseDate(entry.date),
                createdAt: parseDate(entry.createdAt),
                updatedAt: parseDate(entry.updatedAt)
            };
        }

        const docSnap = await getDoc(doc(db, "foster_journal", id));
        if (!docSnap.exists()) {
            return null;
        }
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            date: parseDate(data.date),
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt)
        } as FosterJournalEntry;
    },

    async getJournalEntries(familyId?: string, childId?: string): Promise<FosterJournalEntry[]> {
        if (isMockMode) {
            let list = Array.from(mockJournal.values());
            if (familyId) {
                list = list.filter(e => e.familyId === familyId);
            }
            if (childId) {
                list = list.filter(e => e.childId === childId);
            }
            return list
                .map(e => ({
                    ...e,
                    date: parseDate(e.date),
                    createdAt: parseDate(e.createdAt),
                    updatedAt: parseDate(e.updatedAt)
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        let q = query(collection(db, "foster_journal"));
        if (familyId) {
            q = query(collection(db, "foster_journal"), where("familyId", "==", familyId));
        } else if (childId) {
            q = query(collection(db, "foster_journal"), where("childId", "==", childId));
        }

        const querySnapshot = await getDocs(q);
        const list: FosterJournalEntry[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                ...data,
                id: docSnap.id,
                date: parseDate(data.date),
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDate(data.updatedAt)
            } as FosterJournalEntry);
        });

        // Wenn beides familyId und childId angegeben war, filtern wir clientseitig nach dem restlichen Kriterium
        let filteredList = list;
        if (familyId && childId) {
            filteredList = list.filter(e => e.childId === childId);
        }

        return filteredList.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    async updateJournalEntry(id: string, entryUpdates: Partial<FosterJournalEntry>): Promise<void> {
        const entry = await this.getJournalEntryById(id);
        if (!entry) {
            throw new Error("Journal entry not found");
        }

        const now = new Date();
        const updated: FosterJournalEntry = {
            ...entry,
            ...entryUpdates,
            id,
            date: entryUpdates.date ? parseDate(entryUpdates.date) : entry.date,
            updatedAt: now
        };

        // Koppelung aktualisieren, wenn TimeEntry vorhanden ist
        if (entry.hasTimeEntry && entry.timeEntryId) {
            const updatedDuration = entryUpdates.durationInHours !== undefined ? entryUpdates.durationInHours : entry.durationInHours;
            const updatedDate = entryUpdates.date !== undefined ? parseDate(entryUpdates.date) : entry.date;

            await timeTrackingService.updateTimeEntry(entry.timeEntryId, {
                durationInHours: updatedDuration,
                date: updatedDate
            });
        }

        if (isMockMode) {
            mockJournal.set(id, updated);
            return;
        }

        const docRef = doc(db, "foster_journal", id);
        const cleanUpdates = Object.entries(updated).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanUpdates, { merge: true });
    },

    async deleteJournalEntry(id: string): Promise<void> {
        const entry = await this.getJournalEntryById(id);
        if (!entry) {
            throw new Error("Journal entry not found");
        }

        // Koppelung löschen, wenn TimeEntry vorhanden ist
        if (entry.hasTimeEntry && entry.timeEntryId) {
            await timeTrackingService.deleteTimeEntry(entry.timeEntryId);
        }

        if (isMockMode) {
            mockJournal.delete(id);
            return;
        }

        const docRef = doc(db, "foster_journal", id);
        await deleteDoc(docRef);
    }
};
