/**
 * Cloud Functions für Google Calendar Integration
 * 
 * SECURITY: Service Account Credentials werden über Firebase Secret Manager verwaltet
 * - Niemals im Code hardcoden
 * - Niemals in .env Dateien committen
 * - Zugriff nur über process.env (via runWith secrets)
 */

// Verwende v1 API für kompatible Syntax
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { z } from "zod";

// Admin SDK initialisieren
if (!admin.apps.length) {
    admin.initializeApp();
}

// --- Secret Names ---
const SECRETS = [
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "GOOGLE_CALENDAR_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
];

// --- Region & Runtime Config ---
const runtimeConfig = functions.runWith({
    secrets: SECRETS,
    timeoutSeconds: 60,
    memory: "256MB" as const,
});

const regionalFunctions = runtimeConfig.region("europe-west3");

// --- Schema Validation für Type Safety ---

const CalendarEventSchema = z.object({
    title: z.string().min(1),
    description: z.string().nullish(), // Akzeptiert string, null, oder undefined
    startTime: z.string().datetime(), // ISO 8601 Format
    endTime: z.string().datetime(),
    location: z.string().nullish(),
    attendeeEmail: z.string().email().nullish(),
    clientId: z.string().nullish(),
    clientName: z.string().nullish()
});

type CalendarEventInput = z.infer<typeof CalendarEventSchema>;

// --- Helper: Google Calendar Client erstellen ---

async function createCalendarClient() {
    // Credentials aus Firebase Secret Manager / Environment Variables
    // Durch runWith({secrets: [...]}) sind sie als process.env verfügbar
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    // Debug: Prüfen ob Variablen gesetzt sind (ohne sensible Daten zu loggen)
    functions.logger.info("Checking credentials:", {
        hasKey: !!serviceAccountKey,
        hasCalendarId: !!calendarId,
        hasEmail: !!serviceAccountEmail,
    });

    if (!serviceAccountKey || !calendarId || !serviceAccountEmail) {
        const missing = [];
        if (!serviceAccountKey) missing.push('GOOGLE_SERVICE_ACCOUNT_KEY');
        if (!calendarId) missing.push('GOOGLE_CALENDAR_ID');
        if (!serviceAccountEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
        
        throw new Error(`Google Calendar Credentials nicht konfiguriert. Fehlende Secrets: ${missing.join(', ')}`);
    }

    // Parse den Service Account Key - kann als JSON-String oder nur als Private Key vorliegen
    let privateKey: string;
    let clientEmail: string;
    
    try {
        // Versuche als JSON zu parsen (falls der gesamte Service Account Key als JSON gespeichert wurde)
        const parsed = JSON.parse(serviceAccountKey);
        privateKey = parsed.private_key;
        clientEmail = parsed.client_email || serviceAccountEmail;
    } catch {
        // Kein JSON - verwende als rohen Private Key
        privateKey = serviceAccountKey.replace(/\\n/g, "\n");
        clientEmail = serviceAccountEmail;
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            type: "service_account",
            private_key: privateKey,
            client_email: clientEmail,
        },
        scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    return { calendar, calendarId };
}

// --- Cloud Function: Kalendereintrag erstellen ---

/**
 * Erstellt einen Kalendereintrag im "Zefabiko-Belegnungsplan"
 * 
 * SECURITY:
 * - Nur authentifizierte Benutzer können aufrufen
 * - Credentials über Secret Manager, nicht im Code
 * - Input-Validation mit Zod
 */
export const createCalendarEvent = regionalFunctions.https.onCall(async (data, context) => {
    // Security: Nur authentifizierte Benutzer
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Nur authentifizierte Benutzer können Kalendereinträge erstellen."
        );
    }

    const uid = context.auth.uid;

    // Debug: Rohe Daten loggen VOR der Validation
    functions.logger.info("Rohdaten empfangen:", {
        data,
        uid,
        startTimeType: typeof data.startTime,
        endTimeType: typeof data.endTime,
        startTime: data.startTime,
        endTime: data.endTime,
    });

    try {
        // Input Validation mit detailliertem Fehler
        const eventData: CalendarEventInput = CalendarEventSchema.parse(data);

        // Benutzername aus Firebase Auth holen
        let userName = "";
        try {
            const userRecord = await admin.auth().getUser(uid);
            userName = userRecord.displayName || userRecord.email || "";
        } catch {
            functions.logger.warn("Benutzername konnte nicht geladen werden", { uid });
        }

        // Titel mit Benutzername ergänzen
        const summary = userName
            ? `${eventData.title} (${userName})`
            : eventData.title;

        // Calendar Client erstellen
        const { calendar, calendarId } = await createCalendarClient();

        // Event erstellen
        const response = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: {
                summary,
                description: eventData.description || `Erstellt von ${userName || uid}`,
                start: {
                    dateTime: eventData.startTime,
                    timeZone: "Europe/Berlin",
                },
                end: {
                    dateTime: eventData.endTime,
                    timeZone: "Europe/Berlin",
                },
                location: eventData.location,
                attendees: eventData.attendeeEmail ? [{ email: eventData.attendeeEmail }] : [],
                extendedProperties: {
                    private: {
                        clientId: eventData.clientId || "",
                        clientName: eventData.clientName || "",
                        createdBy: uid,
                    },
                },
            },
        });

        const createdEvent = response.data;

        functions.logger.info("Kalendereintrag erstellt", {
            eventId: createdEvent.id,
            title: eventData.title,
            user: uid,
        });

        return {
            success: true,
            eventId: createdEvent.id,
            htmlLink: createdEvent.htmlLink,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Detaillierte Zod-Fehler loggen
            const errorDetails = error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code,
            }));
            
            functions.logger.error("Zod Validation Error:", {
                errors: errorDetails,
                receivedData: data,
            });

            throw new functions.https.HttpsError(
                "invalid-argument",
                "Ungültige Eingabedaten: " + errorDetails.map(e => `${e.path}: ${e.message}`).join(', ')
            );
        }

        functions.logger.error("Fehler beim Erstellen des Kalendereintrags", error);
        throw new functions.https.HttpsError(
            "internal",
            "Kalendereintrag konnte nicht erstellt werden"
        );
    }
});

// --- Firestore Trigger: Neuer Klient → Optionaler Kalendereintrag ---

/**
 * Trigger: Wird ausgeführt, wenn ein neuer Klient in Firestore erstellt wird
 * 
 * Wenn der Klient ein `calendarData` Feld hat, wird automatisch ein Kalendereintrag erstellt
 * 
 * SECURITY:
 * - Läuft server-seitig, keine Client-Credentials nötig
 * - Secret Manager für Google Credentials
 */
export const onClientCreated = regionalFunctions.firestore
    .document("clients/{clientId}")
    .onCreate(async (snap, context) => {
        const clientData = snap.data();
        const clientId = context.params.clientId;
        
        // Prüfen, ob Kalender-Daten vorhanden sind
        if (!clientData.createCalendarEvent || !clientData.calendarData) {
            functions.logger.info("Kein Kalendereintrag für Klienten gewünscht", {
                clientId,
            });
            return;
        }

        try {
            const { calendarData } = clientData;
            const { calendar, calendarId } = await createCalendarClient();

            // Datum/Zeit parsen
            const [startHours, startMinutes] = calendarData.startTime.split(":").map(Number);
            const [endHours, endMinutes] = calendarData.endTime.split(":").map(Number);

            const startDate = new Date(calendarData.date);
            startDate.setHours(startHours, startMinutes, 0, 0);

            const endDate = calendarData.endDate
                ? new Date(calendarData.endDate)
                : new Date(calendarData.date);
            endDate.setHours(endHours, endMinutes, 0, 0);

            // Event erstellen
            const response = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: {
                    summary: `Erstgespräch: ${clientData.name}`,
                    description: `Automatisch erstellt bei Klienten-Anlage`,
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: "Europe/Berlin",
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: "Europe/Berlin",
                    },
                    location: calendarData.location || "",
                    extendedProperties: {
                        private: {
                            clientId: clientId,
                            clientName: clientData.name,
                            autoCreated: "true",
                        },
                    },
                },
            });

            // Firestore Dokument aktualisieren mit Event-ID
            await snap.ref.update({
                calendarEventId: response.data.id,
                calendarEventLink: response.data.htmlLink,
                calendarCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            functions.logger.info("Kalendereintrag für neuen Klienten erstellt", {
                clientId,
                clientName: clientData.name,
                eventId: response.data.id,
            });
        } catch (error) {
            // WICHTIG: Fehler beim Kalender nicht zum Klienten-Anlage-Fehler machen
            functions.logger.warn("Kalendereintrag fehlgeschlagen, aber Klient wurde angelegt", {
                clientId,
                error,
            });

            // Fehler in Firestore dokumentieren
            await snap.ref.update({
                calendarError: `Fehler beim Erstellen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
                calendarErrorAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

// --- Health Check Function ---

/**
 * Prüft, ob die Calendar Integration korrekt konfiguriert ist
 */
export const checkCalendarConfig = regionalFunctions.https.onCall(async (data, context) => {
    // Security: Nur authentifizierte Benutzer
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Nur für authentifizierte Benutzer");
    }

    try {
        const { calendar, calendarId } = await createCalendarClient();
        
        // Kalender auflisten, um Zugriff zu prüfen
        const response = await calendar.calendars.get({ calendarId });
        
        return {
            success: true,
            calendarId,
            calendarSummary: response.data.summary,
            configured: true,
        };
    } catch (error) {
        functions.logger.error("Calendar Config Check failed", error);
        return {
            success: false,
            configured: false,
            error: error instanceof Error ? error.message : "Unbekannter Fehler",
        };
    }
});
