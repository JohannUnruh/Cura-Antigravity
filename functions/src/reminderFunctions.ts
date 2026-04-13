/**
 * Cloud Functions für Push-Benachrichtigungen (Erinnerungen)
 *
 * SECURITY: FCM Credentials werden über Firebase Secret Manager verwaltet
 * - VAPID Keys über Firebase Console generieren
 * - Niemals im Code hardcoden
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

// Admin SDK initialisieren
if (!admin.apps.length) {
    admin.initializeApp();
}

// --- Region & Runtime Config ---
const runtimeConfig = functions.runWith({
    timeoutSeconds: 540, // 9 Minuten für Batch-Verarbeitung
    memory: "512MB" as const,
});

const regionalFunctions = runtimeConfig.region("europe-west3");

// ──────────────────────────────────────────────────────────────────────────────
// Scheduled Function: Sende wöchentliche Erinnerungen
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Wird stündlich ausgeführt (Europe/Berlin)
 * Prüft für jeden User ob seine persönliche Benachrichtigungszeit erreicht ist
 * und sendet fällige Erinnerungen.
 */
export const sendScheduledReminders = regionalFunctions.pubsub
    .schedule('every 60 minutes')
    .timeZone('Europe/Berlin')
    .onRun(async (context) => {
        functions.logger.info("Starte sendScheduledReminders...");

        const db = admin.firestore();
        const remindersRef = db.collection("reminders");
        const fcmTokensRef = db.collection("fcmTokens");
        const usersRef = db.collection("users");

        try {
            // Aktuelle Zeit in Berlin
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDayOfWeek = now.getDay(); // 0=Sonntag, 1=Montag, ...

            // Nur in der 0. Minute jeder Stunde ausführen (Toleranz-Fenster: 0-2 Min)
            if (currentMinute > 2) {
                functions.logger.info(`Minute ${currentMinute} > 2, überspringen`);
                return { success: true, sent: 0, message: "Außerhalb des Zeitfensters" };
            }

            // Alle User holen und deren Benachrichtigungszeiten prüfen
            const usersSnapshot = await usersRef.get();
            if (usersSnapshot.empty) {
                functions.logger.info("Keine User gefunden");
                return { success: true, sent: 0 };
            }

            let totalSent = 0;
            let totalErrors = 0;

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;

                // Prüfen ob dieser User jetzt benachrichtigt werden will
                const userHour = userData.notificationHour ?? 9; // Default: 09:00
                const userMinute = userData.notificationMinute ?? 0;
                const userDayOfWeek = userData.notificationDayOfWeek ?? 1; // Default: Montag

                // Nur wenn aktuelle Stunde + Minute + Wochentag matchen
                if (currentHour !== userHour || currentDayOfWeek !== userDayOfWeek) {
                    continue;
                }

                functions.logger.info(`User ${userId} (${userData.firstName} ${userData.lastName}) ist dran: ${userDayOfWeek} ${userHour}:${String(userMinute).padStart(2, '0')}`);

                // Hole alle aktiven Erinnerungen für diesen User
                const remindersSnapshot = await remindersRef
                    .where("userId", "==", userId)
                    .where("isActive", "==", true)
                    .get();

                if (remindersSnapshot.empty) {
                    functions.logger.info(`Keine aktiven Erinnerungen für User ${userId}`);
                    continue;
                }

                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                for (const reminderDoc of remindersSnapshot.docs) {
                    const reminder = reminderDoc.data();
                    const scheduledDate = reminder.scheduledDate?.toDate();

                    if (!scheduledDate) continue;

                    // Prüfen ob Datum erreicht ist
                    if (scheduledDate > today) continue;

                    // Für 'once' Frequency: Nur senden wenn noch nicht gesendet
                    if (reminder.frequency === 'once' && reminder.lastSentAt) {
                        continue;
                    }

                    // Für weekly/monthly: nextScheduledAt prüfen
                    if (reminder.frequency !== 'once') {
                        const nextScheduledAt = reminder.nextScheduledAt?.toDate();
                        if (nextScheduledAt && nextScheduledAt > today) {
                            continue;
                        }
                    }

                    // Hole FCM Tokens für diesen User
                    const tokensSnapshot = await fcmTokensRef
                        .where("userId", "==", userId)
                        .where("isValid", "==", true)
                        .get();

                    if (tokensSnapshot.empty) {
                        functions.logger.warn(`Keine gültigen FCM Tokens für User ${userId}`);
                        continue;
                    }

                    // Sende Push an alle Tokens des Users
                    const tokens: string[] = [];
                    for (const tokenDoc of tokensSnapshot.docs) {
                        tokens.push(tokenDoc.data().token);
                    }

                    // Push-Nachricht erstellen und direkt senden
                    try {
                        const { getMessaging } = await import("firebase-admin/messaging");
                        const response = await getMessaging().sendEachForMulticast({
                            notification: {
                                title: reminder.title,
                                body: reminder.message,
                            },
                            data: {
                                type: reminder.type,
                                reminderId: reminderDoc.id,
                                relatedId: reminder.relatedId || "",
                                relatedType: reminder.relatedType || "",
                            },
                            tokens,
                        });

                        if (response.successCount > 0) {
                            totalSent += response.successCount;
                            functions.logger.info(`Erinnerung gesendet an ${response.successCount} Gerät(e)`, {
                                reminderId: reminderDoc.id,
                                userId,
                            });

                            // Firestore aktualisieren
                            await updateReminderAfterSend(reminderDoc.id, reminder.frequency);
                        }

                        if (response.failureCount > 0) {
                            totalErrors += response.failureCount;
                            functions.logger.warn(`${response.failureCount} Push-Nachrichten fehlgeschlagen`, {
                                reminderId: reminderDoc.id,
                            });
                        }
                    } catch (error) {
                        totalErrors++;
                        functions.logger.error(`Fehler beim Senden der Erinnerung`, {
                            reminderId: reminderDoc.id,
                            error,
                        });
                    }
                }
            }

            functions.logger.info("sendScheduledReminders abgeschlossen", {
                sent: totalSent,
                errors: totalErrors,
            });

            return {
                success: true,
                sent: totalSent,
                errors: totalErrors,
                message: `${totalSent} Erinnerungen gesendet, ${totalErrors} Fehler`
            };

        } catch (error) {
            functions.logger.error("Kritischer Fehler in sendScheduledReminders", error);
            return {
                success: false,
                sent: 0,
                errors: 1,
                message: error instanceof Error ? error.message : "Unbekannter Fehler"
            };
        }
    });

// ──────────────────────────────────────────────────────────────────────────────
// Helper: Reminder nach Senden aktualisieren
// ──────────────────────────────────────────────────────────────────────────────

async function updateReminderAfterSend(reminderId: string, frequency: string) {
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    let nextScheduledAt: Date | null = null;
    
    if (frequency === 'weekly') {
        nextScheduledAt = new Date();
        nextScheduledAt.setDate(nextScheduledAt.getDate() + 7);
    } else if (frequency === 'monthly') {
        nextScheduledAt = new Date();
        nextScheduledAt.setMonth(nextScheduledAt.getMonth() + 1);
    }

    await db.collection("reminders").doc(reminderId).update({
        lastSentAt: now,
        nextScheduledAt: nextScheduledAt ? admin.firestore.Timestamp.fromDate(nextScheduledAt) : null,
        updatedAt: now,
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTPS Function: Manuelle Erinnerung sofort senden (Test/On-Demand)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sendet eine Push-Benachrichtigung sofort an den aktuellen User
 * Nützlich für:
 * - Test der Push-Funktionalität
 * - Sofort-Erinnerung beim Erstellen
 */
export const sendImmediateReminder = regionalFunctions.https.onCall(async (data, context) => {
    // Security: Nur authentifizierte Benutzer
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Nur authentifizierte Benutzer können Erinnerungen senden."
        );
    }

    const uid = context.auth.uid;
    const { title, message, reminderId } = data;

    if (!title || !message) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "title und message sind erforderlich"
        );
    }

    try {
        const db = admin.firestore();
        
        // Hole FCM Tokens für diesen User
        const tokensSnapshot = await db.collection("fcmTokens")
            .where("userId", "==", uid)
            .where("isValid", "==", true)
            .get();

        if (tokensSnapshot.empty) {
            throw new functions.https.HttpsError(
                "not-found",
                "Keine FCM Tokens für diesen Benutzer gefunden. Bitte Push-Benachrichtigungen in den Einstellungen aktivieren."
            );
        }

        const tokens: string[] = [];
        for (const tokenDoc of tokensSnapshot.docs) {
            tokens.push(tokenDoc.data().token);
        }

        // Push-Nachricht erstellen und direkt senden
        const response = await getMessaging().sendEachForMulticast({
            notification: {
                title,
                body: message,
            },
            data: {
                type: 'immediate',
                reminderId: reminderId || "",
            },
            tokens,
        });

        return {
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
        };

    } catch (error) {
        functions.logger.error("Fehler beim Senden der sofortigen Erinnerung", error);
        
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        
        throw new functions.https.HttpsError(
            "internal",
            "Erinnerung konnte nicht gesendet werden"
        );
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// Cleanup Function: Ungültige Tokens entfernen
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Entfernt ungültige FCM Tokens aus der Datenbank
 * Läuft monatlich am 1. um 03:00 Uhr
 */
export const cleanupInvalidTokens = regionalFunctions.pubsub
    .schedule('0 3 1 * *') // Jeden 1. des Monats um 03:00
    .timeZone('Europe/Berlin')
    .onRun(async () => {
        functions.logger.info("Starte cleanupInvalidTokens...");

        const db = admin.firestore();
        
        try {
            // Hole alle ungültigen Tokens
            const invalidSnapshot = await db.collection("fcmTokens")
                .where("isValid", "==", false)
                .get();

            if (invalidSnapshot.empty) {
                functions.logger.info("Keine ungültigen Tokens zum Bereinigen");
                return { success: true, deleted: 0 };
            }

            // Lösche alle ungültigen Tokens
            const batch = db.batch();
            invalidSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            functions.logger.info(`cleanupInvalidTokens abgeschlossen: ${invalidSnapshot.size} Tokens gelöscht`);

            return { 
                success: true, 
                deleted: invalidSnapshot.size,
                message: `${invalidSnapshot.size} ungültige Tokens gelöscht` 
            };

        } catch (error) {
            functions.logger.error("Fehler in cleanupInvalidTokens", error);
            return { 
                success: false, 
                deleted: 0,
                message: error instanceof Error ? error.message : "Unbekannter Fehler" 
            };
        }
    });
