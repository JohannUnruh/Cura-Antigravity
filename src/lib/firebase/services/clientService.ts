import { Client } from "@/types";
import { consultationService } from "./consultationService";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "clients";

export const clientService = {
    async addClient(clientData: Omit<Client, "id" | "createdAt">) {
        const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const docRef = doc(db, COLLECTION_NAME, id);

        await setDoc(docRef, {
            ...clientData,
            createdAt: new Date()
        });

        return id;
    },

    async getClientsByAuthor(authorId: string): Promise<Client[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("authorId", "==", authorId)
        );
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            } as Client;
        });
    },

    async getClientById(clientId: string): Promise<Client | null> {
        const docRef = doc(db, COLLECTION_NAME, clientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            } as Client;
        }
        return null;
    },

    async updateClient(clientId: string, clientData: Partial<Client>) {
        const docRef = doc(db, COLLECTION_NAME, clientId);
        const cleanData = Object.entries(clientData).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await setDoc(docRef, cleanData, { merge: true });
    },

    async deleteClient(clientId: string, authorId: string) {
        const docRef = doc(db, COLLECTION_NAME, clientId);
        await deleteDoc(docRef);

        await consultationService.deleteConsultationsByClientId(clientId, authorId);
        await consultationService.deleteSkbConsultationsByClientId(clientId, authorId);
    },

    async getAllClients(): Promise<Client[]> {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            } as Client;
        });
    },

    async addFavorite(uid: string, clientId: string, name: string) {
        const docRef = doc(db, "users", uid, "favorites", clientId);
        await setDoc(docRef, {
            clientId,
            name,
            addedAt: new Date()
        });
    },

    async removeFavorite(uid: string, clientId: string) {
        const docRef = doc(db, "users", uid, "favorites", clientId);
        await deleteDoc(docRef);
    },

    async isFavorite(uid: string, clientId: string): Promise<boolean> {
        const docRef = doc(db, "users", uid, "favorites", clientId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    },

    subscribeFavorites(uid: string, callback: (favorites: {clientId: string; name: string}[]) => void, onError?: (error: Error) => void) {
        const q = collection(db, "users", uid, "favorites");
        return onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                clientId: doc.id,
                name: doc.data().name || ""
            }));
            callback(list);
        }, (error) => {
            console.error("Error in subscribeFavorites snapshot listener:", error);
            if (onError) onError(error);
        });
    }
};
