import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { ContractType, UserProfile } from "@/types";
import { cleanFirestoreData, toFirestoreDate } from "@/lib/firebase/firestoreValues";
import {
    buildArchiveDocumentPatch,
    buildArchiveRelationshipPatch,
    buildArchiveUserPatch,
    buildRestoreDocumentPatch,
    buildRestoreRelationshipPatch,
    buildRestoreUserPatch,
    canManageUserArchive
} from "@/lib/contracts/archive";

/**
 * Liest einen Datums-Feldwert robust: nativer Timestamp, ISO-String,
 * Zahl oder die durch einen Alt-Bug entstandene Map {seconds,nanoseconds}.
 * Fällt uninterpretierbar aus, wird das Fallback genutzt statt ein
 * Invalid Date zu erzeugen (Ursache des RangeError beim Speichern, 12.09.).
 */
const readDate = (value: unknown, fallback: Date): Date => toFirestoreDate(value) ?? fallback;
const readDateOrUndefined = (value: unknown): Date | undefined => toFirestoreDate(value) ?? undefined;

/** Fehlercode, wenn ein Admin sein eigenes Konto archivieren/wiederherstellen wollte (D5). */
export const CANNOT_ARCHIVE_OWN_ACCOUNT = "CANNOT_ARCHIVE_OWN_ACCOUNT";

/**
 * Liest ein Profil und wirft, wenn es nicht existiert.
 * Archiv-Aktionen brauchen den aktuellen Stand (Array-Rewrites, Idempotenz).
 */
async function requireUserProfile(userId: string): Promise<UserProfile> {
    const docSnap = await getDoc(doc(db, "users", userId));
    if (!docSnap.exists()) {
        throw new Error(`USER_NOT_FOUND: ${userId}`);
    }
    const data = docSnap.data();
    return {
        ...data,
        id: docSnap.id,
        createdAt: readDate(data.createdAt, new Date()),
        updatedAt: readDateOrUndefined(data.updatedAt),
    } as UserProfile;
}

/**
 * Archiv-Write mit Selbst-Sperr-Schutz (D5): Niemand — auch kein Admin — darf
 * den eigenen Account archivieren oder wiederherstellen. Die Regel steht
 * zusätzlich serverseitig in firestore.rules (`uid != request.auth.uid`).
 */
async function writeArchivePatch(userId: string, adminUid: string, patch: Partial<UserProfile>): Promise<void> {
    if (!canManageUserArchive(adminUid, userId)) {
        throw new Error(CANNOT_ARCHIVE_OWN_ACCOUNT);
    }
    const cleanData = cleanFirestoreData({ ...patch, updatedAt: new Date() }) as Record<string, unknown>;
    await setDoc(doc(db, "users", userId), cleanData, { merge: true });
}

export const userService = {
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    ...data,
                    createdAt: readDate(data.createdAt, new Date()),
                    updatedAt: readDateOrUndefined(data.updatedAt),
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
            const cleanData = cleanFirestoreData(profile) as Record<string, unknown>;
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
                    createdAt: readDate(data.createdAt, new Date()),
                    updatedAt: readDateOrUndefined(data.updatedAt),
                } as UserProfile);
            });
            return users;
        } catch (error) {
            console.error("Error getting all users:", error);
            return [];
        }
    },

    /**
     * Archiviert ein Benutzerkonto (D1/D2 — Ersatz für das frühere harte Löschen).
     * Login wird über das ProtectedRoute-Gate entzogen, Seelsorge-Daten bleiben
     * unangetastet (AC7 — hier wird NUR das users-Dokument beschrieben).
     */
    async archiveUser(userId: string, adminUid: string): Promise<void> {
        try {
            await writeArchivePatch(userId, adminUid, buildArchiveUserPatch(adminUid));
        } catch (error) {
            console.error("Error archiving user profile:", error);
            throw error;
        }
    },

    /** Stellt ein archiviertes Benutzerkonto wieder her (AC5: Login wieder möglich). */
    async restoreUser(userId: string, adminUid: string): Promise<void> {
        try {
            await writeArchivePatch(userId, adminUid, buildRestoreUserPatch());
        } catch (error) {
            console.error("Error restoring user profile:", error);
            throw error;
        }
    },

    /** Archiviert einen kompletten Vertragsstrang einer Art (D4, Verhältnis-Ebene). */
    async archiveContractRelationship(userId: string, contractType: ContractType, adminUid: string): Promise<void> {
        try {
            const profile = await requireUserProfile(userId);
            await writeArchivePatch(userId, adminUid, buildArchiveRelationshipPatch(profile, contractType, adminUid));
        } catch (error) {
            console.error("Error archiving contract relationship:", error);
            throw error;
        }
    },

    /** Stellt einen archivierten Vertragsstrang wieder her (exakter Vorzustand, AC5). */
    async restoreContractRelationship(userId: string, contractType: ContractType, adminUid: string): Promise<void> {
        try {
            const profile = await requireUserProfile(userId);
            await writeArchivePatch(userId, adminUid, buildRestoreRelationshipPatch(profile, contractType));
        } catch (error) {
            console.error("Error restoring contract relationship:", error);
            throw error;
        }
    },

    /** Archiviert ein einzelnes Vertragsdokument (D4, Dokument-Ebene). */
    async archiveContractDocument(userId: string, documentId: string, adminUid: string): Promise<void> {
        try {
            const profile = await requireUserProfile(userId);
            await writeArchivePatch(userId, adminUid, buildArchiveDocumentPatch(profile, documentId, adminUid));
        } catch (error) {
            console.error("Error archiving contract document:", error);
            throw error;
        }
    },

    /** Stellt ein archiviertes Vertragsdokument wieder her (AC5). */
    async restoreContractDocument(userId: string, documentId: string, adminUid: string): Promise<void> {
        try {
            const profile = await requireUserProfile(userId);
            await writeArchivePatch(userId, adminUid, buildRestoreDocumentPatch(profile, documentId));
        } catch (error) {
            console.error("Error restoring contract document:", error);
            throw error;
        }
    }
};
