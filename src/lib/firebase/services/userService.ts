import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { UserProfile } from "@/types";

export const userService = {
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
                } as UserProfile;
            }
            return null;
        } catch (error) {
            console.error("Error getting user profile:", error);
            return null;
        }
    },

    async saveUserProfile(profile: UserProfile): Promise<void> {
        try {
            const docRef = doc(db, "users", profile.id);
            const cleanData = Object.entries(profile).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, unknown>);
            await setDoc(docRef, { ...cleanData, updatedAt: new Date() }, { merge: true });
        } catch (error) {
            console.error("Error saving user profile:", error);
            throw error;
        }
    },

    async getAllUsers(): Promise<UserProfile[]> {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const users: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
                } as UserProfile);
            });
            return users;
        } catch (error) {
            console.error("Error getting all users:", error);
            return [];
        }
    },

    async deleteUserProfile(userId: string): Promise<void> {
        try {
            await setDoc(doc(db, "users", userId), { deletedAt: new Date(), isDeleted: true }, { merge: true });
            // Alternatively stringly delete: await deleteDoc(doc(db, "users", userId));
            // Setting isDeleted is safer, we'll actually delete for now to make it disappear
            const { deleteDoc } = await import("firebase/firestore");
            await deleteDoc(doc(db, "users", userId));
        } catch (error) {
            console.error("Error deleting user profile:", error);
            throw error;
        }
    }
};
