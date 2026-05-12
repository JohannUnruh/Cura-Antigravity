import { Consultation, LegacyConsultation, SkbConsultation } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from "firebase/firestore";

const CONSULTATIONS_COLLECTION = "consultations";
const SKB_COLLECTION = "skb_consultations";

// Firestore cannot store `undefined` values - remove them recursively
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(cleanForFirestore);
    if (typeof obj === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = cleanForFirestore(value);
            }
        }
        return cleaned;
    }
    return obj;
}

export const consultationService = {
    // --- Standard Consultations ---
    async addConsultation(consultation: Omit<Consultation, "id" | "createdAt">): Promise<Consultation> {
        let prefix = "CO";
        if (consultation.type) {
            prefix = consultation.type.substring(0, 2).toUpperCase();
        }

        const id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        const docRef = doc(db, CONSULTATIONS_COLLECTION, id);

        const newDoc: Consultation = {
            ...consultation,
            id,
            createdAt: new Date(),
        };

        await setDoc(docRef, cleanForFirestore(newDoc));
        return newDoc;
    },

    async updateConsultation(id: string, consultation: Partial<Consultation>): Promise<Consultation> {
        const docRef = doc(db, CONSULTATIONS_COLLECTION, id);
        const cleanData = Object.entries(consultation).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });

        const updatedDoc = await getDoc(docRef);
        return updatedDoc.data() as Consultation;
    },

    async deleteConsultation(id: string): Promise<void> {
        const docRef = doc(db, CONSULTATIONS_COLLECTION, id);
        await deleteDoc(docRef);
    },

    async deleteConsultationsByClientId(clientId: string, authorId: string): Promise<void> {
        const q = query(
            collection(db, CONSULTATIONS_COLLECTION),
            where("clientId", "==", clientId),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    },

    async getConsultationsByClientId(clientId: string, authorId: string): Promise<Consultation[]> {
        const q = query(
            collection(db, CONSULTATIONS_COLLECTION),
            where("clientId", "==", clientId),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Consultation;
        });

        return result.sort((a, b) => {
            const timeA = a.dateFrom ? new Date(a.dateFrom).getTime() : 0;
            const timeB = b.dateFrom ? new Date(b.dateFrom).getTime() : 0;
            return timeB - timeA;
        });
    },

    async getConsultations(): Promise<Consultation[]> {
        const q = query(collection(db, CONSULTATIONS_COLLECTION));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Consultation;
        });

        return result.sort((a, b) => {
            const timeA = a.dateFrom ? new Date(a.dateFrom).getTime() : 0;
            const timeB = b.dateFrom ? new Date(b.dateFrom).getTime() : 0;
            return timeB - timeA;
        });
    },

    async getConsultationsByAuthor(authorId: string): Promise<Consultation[]> {
        const q = query(collection(db, CONSULTATIONS_COLLECTION), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Consultation;
        });

        return result.sort((a, b) => {
            const timeA = a.dateFrom ? new Date(a.dateFrom).getTime() : 0;
            const timeB = b.dateFrom ? new Date(b.dateFrom).getTime() : 0;
            return timeB - timeA;
        });
    },

    // --- SKB Consultations ---
    async addSkbConsultation(skb: Omit<SkbConsultation, "id" | "createdAt">): Promise<SkbConsultation> {
        const prefix = "SKB";
        const id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();

        const docRef = doc(db, SKB_COLLECTION, id);
        const newDoc: SkbConsultation = {
            ...skb,
            id,
            createdAt: new Date(),
        };

        await setDoc(docRef, cleanForFirestore(newDoc));
        return newDoc;
    },

    async updateSkbConsultation(id: string, skb: Partial<SkbConsultation>): Promise<SkbConsultation> {
        const docRef = doc(db, SKB_COLLECTION, id);
        const cleanData = Object.entries(skb).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });

        const updatedDoc = await getDoc(docRef);
        return updatedDoc.data() as SkbConsultation;
    },

    async deleteSkbConsultation(id: string): Promise<void> {
        const docRef = doc(db, SKB_COLLECTION, id);
        await deleteDoc(docRef);
    },

    async deleteSkbConsultationsByClientId(clientId: string, authorId: string): Promise<void> {
        const q = query(
            collection(db, SKB_COLLECTION),
            where("clientId", "==", clientId),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    },

    async getSkbConsultationsByClientId(clientId: string, authorId: string): Promise<SkbConsultation[]> {
        const q = query(
            collection(db, SKB_COLLECTION),
            where("clientId", "==", clientId),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as SkbConsultation;
        });

        return result.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async getSkbConsultations(): Promise<SkbConsultation[]> {
        const q = query(collection(db, SKB_COLLECTION));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as SkbConsultation;
        });

        return result.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async getSkbConsultationsByAuthor(authorId: string): Promise<SkbConsultation[]> {
        const q = query(collection(db, SKB_COLLECTION), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as SkbConsultation;
        });

        return result.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    // --- Legacy Excel Consultations ---
    async getLegacyConsultations(): Promise<LegacyConsultation[]> {
        const q = query(collection(db, "legacy_consultations"));
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                authorId: typeof data.authorId === "string" ? data.authorId : "",
                durationInHours: typeof data.durationInHours === "number" ? data.durationInHours : 0,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            };
        });

        return items.sort((a, b) => {
            const dateA = a.dateFrom instanceof Date ? a.dateFrom.getTime() : 0;
            const dateB = b.dateFrom instanceof Date ? b.dateFrom.getTime() : 0;
            return dateB - dateA;
        });
    },

    async getLegacyConsultationsByAuthor(authorId: string): Promise<LegacyConsultation[]> {
        const q = query(collection(db, "legacy_consultations"), where("authorId", "==", authorId));
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                authorId: typeof data.authorId === "string" ? data.authorId : "",
                durationInHours: typeof data.durationInHours === "number" ? data.durationInHours : 0,
                dateFrom: data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom),
                dateTo: data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            };
        });

        return items.sort((a, b) => {
            const dateA = a.dateFrom instanceof Date ? a.dateFrom.getTime() : 0;
            const dateB = b.dateFrom instanceof Date ? b.dateFrom.getTime() : 0;
            return dateB - dateA;
        });
    }
};

