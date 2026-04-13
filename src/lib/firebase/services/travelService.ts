import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { TravelExpense } from "@/types";

const COLLECTION_NAME = "travel_expenses";

export const travelService = {
    async addExpense(data: Omit<TravelExpense, "id" | "createdAt">): Promise<string> {
        try {
            const expenseRef = doc(collection(db, COLLECTION_NAME));
            const newExpense: TravelExpense = {
                ...data,
                id: expenseRef.id,
                createdAt: new Date(),
            };
            await setDoc(expenseRef, newExpense);
            return expenseRef.id;
        } catch (error) {
            console.error("Error adding travel expense:", error);
            throw error;
        }
    },

    async getExpensesByUser(userId: string, role: string): Promise<TravelExpense[]> {
        try {
            let q;
            if (role === "Kassenwart" || role === "Admin") {
                // Kassenwart and Admin can see all expenses
                // Note: requires composite index for sorting if filtering. Just sorting by date:
                q = query(collection(db, COLLECTION_NAME), orderBy("startDate", "desc"));
            } else {
                q = query(collection(db, COLLECTION_NAME), where("authorId", "==", userId), orderBy("startDate", "desc"));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                } as TravelExpense;
            });
        } catch (error) {
            console.error("Error getting travel expenses:", error);
            return [];
        }
    },

    async updateExpense(id: string, data: Partial<TravelExpense>): Promise<void> {
        try {
            const expenseRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(expenseRef, data);
        } catch (error) {
            console.error("Error updating travel expense:", error);
            throw error;
        }
    },

    async deleteExpense(id: string): Promise<void> {
        try {
            const expenseRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(expenseRef);
        } catch (error) {
            console.error("Error deleting travel expense:", error);
            throw error;
        }
    },
};
