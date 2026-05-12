import { Reminder, FcmToken, ReminderFrequency } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, Timestamp, updateDoc } from "firebase/firestore";

const REMINDERS_COLLECTION = "reminders";
const FCM_TOKENS_COLLECTION = "fcmTokens";

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

// Convert Firestore Timestamp to Date
function fromFirestore<T extends Record<string, unknown>>(data: T | undefined): T | null {
    if (!data) return null;
    const result: Record<string, unknown> = { ...data };
    for (const key in result) {
        if (result[key] && typeof result[key] === 'object' && 'toDate' in result[key]) {
            result[key] = (result[key] as { toDate: () => Date }).toDate();
        }
    }
    return result as T;
}

export const reminderService = {
    // ──────────────────────────────────────────────────────────────────────────
    // Reminders
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Create a new reminder
     */
    async addReminder(reminder: Omit<Reminder, "id" | "createdAt">): Promise<Reminder> {
        const id = `REM-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        const docRef = doc(db, REMINDERS_COLLECTION, id);

        const newDoc: Reminder = {
            ...reminder,
            id,
            createdAt: new Date(),
        };

        await setDoc(docRef, cleanForFirestore(newDoc));
        return newDoc;
    },

    /**
     * Create a reminder from a consultation (auto-fill title, message, date)
     */
    async createFromConsultation(
        userId: string,
        consultation: {
            clientName: string;
            type: string;
            dateFrom: Date;
            notes?: string;
            id: string;
        },
        frequency: ReminderFrequency = 'weekly'
    ): Promise<Reminder> {
        const title = `${consultation.clientName} – ${consultation.type}`;
        const message = consultation.notes
            ? consultation.notes.substring(0, 200)
            : `Erinnerung für Beratung: ${consultation.type}`;

        return this.addReminder({
            userId,
            authorId: userId,
            type: 'consultation-goal',
            title,
            message,
            scheduledDate: consultation.dateFrom,
            frequency,
            relatedId: consultation.id,
            relatedType: 'consultation',
            isActive: true,
        });
    },

    /**
     * Get reminder by ID
     */
    async getReminderById(id: string): Promise<Reminder | null> {
        const docSnap = await getDoc(doc(db, REMINDERS_COLLECTION, id));
        if (!docSnap.exists()) return null;
        return fromFirestore(docSnap.data()) as Reminder;
    },

    /**
     * Get all reminders for a specific user
     */
    async getRemindersByUserId(userId: string): Promise<Reminder[]> {
        const q = query(
            collection(db, REMINDERS_COLLECTION),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => fromFirestore(d.data())) as Reminder[];
    },

    /**
     * Get all active reminders for a user
     */
    async getActiveRemindersByUserId(userId: string): Promise<Reminder[]> {
        const q = query(
            collection(db, REMINDERS_COLLECTION),
            where("userId", "==", userId),
            where("isActive", "==", true),
            orderBy("scheduledDate", "asc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => fromFirestore(d.data())) as Reminder[];
    },

    /**
     * Get reminders due for sending (for Cloud Function)
     * Returns reminders where scheduledDate <= today and (frequency === 'once' and not sent yet)
     * or (weekly/monthly and nextScheduledAt <= today)
     */
    async getRemindersDueForSending(): Promise<Reminder[]> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get all active reminders
        const q = query(
            collection(db, REMINDERS_COLLECTION),
            where("isActive", "==", true)
        );
        const querySnapshot = await getDocs(q);
        
        const reminders = querySnapshot.docs.map(d => fromFirestore(d.data())) as Reminder[];
        
        // Filter client-side for complex date logic
        return reminders.filter(reminder => {
            const scheduledDate = new Date(reminder.scheduledDate);
            const isDateReached = scheduledDate <= today;
            
            if (!isDateReached) return false;

            // For 'once' frequency, check if not sent yet
            if (reminder.frequency === 'once') {
                return !reminder.lastSentAt;
            }

            // For weekly/monthly, check nextScheduledAt
            if (reminder.nextScheduledAt) {
                return new Date(reminder.nextScheduledAt) <= today;
            }
            
            // If no nextScheduledAt set but frequency is weekly/monthly, send if scheduledDate reached
            return true;
        });
    },

    /**
     * Update reminder
     */
    async updateReminder(id: string, reminder: Partial<Reminder>): Promise<Reminder> {
        const docRef = doc(db, REMINDERS_COLLECTION, id);
        const cleanData = Object.entries(reminder).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {} as Record<string, unknown>);

        await updateDoc(docRef, cleanForFirestore(cleanData));

        const updatedDoc = await getDoc(docRef);
        return fromFirestore(updatedDoc.data()) as Reminder;
    },

    /**
     * Mark reminder as sent (updates lastSentAt and nextScheduledAt)
     */
    async markAsSent(id: string, frequency: ReminderFrequency): Promise<void> {
        const docRef = doc(db, REMINDERS_COLLECTION, id);
        const now = new Date();
        
        let nextScheduledAt: Date | null = null;
        
        if (frequency === 'weekly') {
            // Add 7 days
            nextScheduledAt = new Date(now);
            nextScheduledAt.setDate(nextScheduledAt.getDate() + 7);
        } else if (frequency === 'monthly') {
            // Add 1 month
            nextScheduledAt = new Date(now);
            nextScheduledAt.setMonth(nextScheduledAt.getMonth() + 1);
        }

        await updateDoc(docRef, {
            lastSentAt: Timestamp.fromDate(now),
            nextScheduledAt: nextScheduledAt ? Timestamp.fromDate(nextScheduledAt) : null,
            updatedAt: Timestamp.fromDate(now)
        });
    },

    /**
     * Delete reminder
     */
    async deleteReminder(id: string): Promise<void> {
        const docRef = doc(db, REMINDERS_COLLECTION, id);
        await deleteDoc(docRef);
    },

    /**
     * Delete all reminders for a user
     */
    async deleteRemindersByUserId(userId: string): Promise<void> {
        const q = query(
            collection(db, REMINDERS_COLLECTION),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    },

    // ──────────────────────────────────────────────────────────────────────────
    // FCM Tokens
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Save or update FCM token for a user
     */
    async saveFcmToken(userId: string, token: string, deviceInfo?: { browser?: string; platform?: string; userAgent?: string }): Promise<FcmToken> {
        // Check if token already exists
        const q = query(
            collection(db, FCM_TOKENS_COLLECTION),
            where("userId", "==", userId),
            where("token", "==", token)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Update existing token
            const existingDoc = querySnapshot.docs[0];
            await updateDoc(existingDoc.ref, {
                isValid: true,
                lastUsedAt: Timestamp.fromDate(new Date()),
                deviceInfo: deviceInfo || null
            });
            
            const updatedDoc = await getDoc(existingDoc.ref);
            return fromFirestore(updatedDoc.data()) as FcmToken;
        }

        // Create new token document
        const id = `FCM-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
        const docRef = doc(db, FCM_TOKENS_COLLECTION, id);

        const newToken: FcmToken = {
            id,
            userId,
            token,
            deviceInfo,
            isValid: true,
            createdAt: new Date(),
            lastUsedAt: new Date()
        };

        await setDoc(docRef, cleanForFirestore(newToken));
        return newToken;
    },

    /**
     * Get all valid FCM tokens for a user
     */
    async getFcmTokensByUserId(userId: string): Promise<FcmToken[]> {
        const q = query(
            collection(db, FCM_TOKENS_COLLECTION),
            where("userId", "==", userId),
            where("isValid", "==", true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => fromFirestore(d.data())) as FcmToken[];
    },

    /**
     * Mark token as invalid (e.g., when push fails)
     */
    async markTokenAsInvalid(id: string): Promise<void> {
        const docRef = doc(db, FCM_TOKENS_COLLECTION, id);
        await updateDoc(docRef, {
            isValid: false,
            updatedAt: Timestamp.fromDate(new Date())
        });
    },

    /**
     * Delete FCM token
     */
    async deleteFcmToken(id: string): Promise<void> {
        const docRef = doc(db, FCM_TOKENS_COLLECTION, id);
        await deleteDoc(docRef);
    },

    /**
     * Get all valid FCM tokens (for Cloud Function)
     */
    async getAllValidFcmTokens(): Promise<FcmToken[]> {
        const q = query(
            collection(db, FCM_TOKENS_COLLECTION),
            where("isValid", "==", true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => fromFirestore(d.data())) as FcmToken[];
    },

    /**
     * Get FCM tokens by user ID (for Cloud Function - simplified query)
     */
    async getFcmTokensForUser(userId: string): Promise<FcmToken[]> {
        const q = query(
            collection(db, FCM_TOKENS_COLLECTION),
            where("userId", "==", userId),
            where("isValid", "==", true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => fromFirestore(d.data())) as FcmToken[];
    }
};
