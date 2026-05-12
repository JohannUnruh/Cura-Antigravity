import { Retreat } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";

const RETREATS_COLLECTION = "retreats";

export const retreatService = {
    async addRetreat(data: Omit<Retreat, "id" | "createdAt">) {
        const id = `retreat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const docRef = doc(db, RETREATS_COLLECTION, id);

        const newItem = {
            ...data,
            id,
            createdAt: Timestamp.now(),
            dateFrom: Timestamp.fromDate(new Date(data.dateFrom)),
            dateTo: Timestamp.fromDate(new Date(data.dateTo)),
        };

        await setDoc(docRef, newItem);
        return id;
    },

    async getRetreatsByAuthor(authorId: string): Promise<Retreat[]> {
        const q = query(
            collection(db, RETREATS_COLLECTION),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom instanceof Timestamp ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo instanceof Timestamp ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Retreat;
        });

        return items.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async updateRetreat(id: string, data: Partial<Retreat>) {
        const docRef = doc(db, RETREATS_COLLECTION, id);
        const updateData: Record<string, unknown> = { ...data };

        if (data.dateFrom) updateData.dateFrom = Timestamp.fromDate(new Date(data.dateFrom));
        if (data.dateTo) updateData.dateTo = Timestamp.fromDate(new Date(data.dateTo));

        await setDoc(docRef, updateData, { merge: true });
    },

    async getRetreats(): Promise<Retreat[]> {
        const q = query(
            collection(db, RETREATS_COLLECTION)
        );
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom instanceof Timestamp ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo instanceof Timestamp ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Retreat;
        });

        return items.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async deleteRetreat(id: string) {
        const docRef = doc(db, RETREATS_COLLECTION, id);
        await deleteDoc(docRef);
    },
};

