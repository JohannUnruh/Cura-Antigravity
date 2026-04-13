import { ShortConsultation } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from "firebase/firestore";

const COLLECTION_NAME = "short_consultations";

export const shortConsultationService = {
    async addConsultation(consultation: Omit<ShortConsultation, "id" | "createdAt">): Promise<ShortConsultation> {
        const prefix = "KG";
        const id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        const docRef = doc(db, COLLECTION_NAME, id);

        const newDoc: ShortConsultation = {
            ...consultation,
            id,
            createdAt: new Date(),
        };

        await setDoc(docRef, newDoc);
        return newDoc;
    },

    async updateConsultation(id: string, consultation: Partial<ShortConsultation>): Promise<ShortConsultation> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const cleanData = Object.entries(consultation).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });

        const updatedDoc = await getDoc(docRef);
        return updatedDoc.data() as ShortConsultation;
    },

    async deleteConsultation(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    },

    async getConsultationsByAuthor(authorId: string): Promise<ShortConsultation[]> {
        const q = query(collection(db, COLLECTION_NAME), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as ShortConsultation;
        });

        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    async getConsultationsByClientId(clientId: string, authorId: string): Promise<ShortConsultation[]> {
        // Short consultations are not linked to clients, so we return all by author
        // Filter by authorId only
        const q = query(collection(db, COLLECTION_NAME), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as ShortConsultation;
        });

        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
};
