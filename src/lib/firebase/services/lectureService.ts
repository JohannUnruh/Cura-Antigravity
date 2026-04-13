import { Lecture } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, Timestamp } from "firebase/firestore";

const LECTURES_COLLECTION = "lectures";

export const lectureService = {
    async addLecture(data: Omit<Lecture, "id" | "createdAt">) {
        const id = `lecture_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const docRef = doc(db, LECTURES_COLLECTION, id);

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

    async getLecturesByAuthor(authorId: string): Promise<Lecture[]> {
        const q = query(
            collection(db, LECTURES_COLLECTION),
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
            } as Lecture;
        });

        return items.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async updateLecture(id: string, data: Partial<Lecture>) {
        const docRef = doc(db, LECTURES_COLLECTION, id);
        const updateData: any = { ...data };

        if (data.dateFrom) updateData.dateFrom = Timestamp.fromDate(new Date(data.dateFrom));
        if (data.dateTo) updateData.dateTo = Timestamp.fromDate(new Date(data.dateTo));

        await setDoc(docRef, updateData, { merge: true });
    },

    async getLectures(): Promise<Lecture[]> {
        const q = query(
            collection(db, LECTURES_COLLECTION)
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
            } as Lecture;
        });

        return items.sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());
    },

    async deleteLecture(id: string) {
        const docRef = doc(db, LECTURES_COLLECTION, id);
        await deleteDoc(docRef);
    },
};

