import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/config";

/**
 * Calendar Service für Google Calendar Integration
 * 
 * SECURITY:
 * - Ruft Cloud Functions auf (server-seitig)
 * - Keine Client-seitigen Credentials nötig
 * - Service Account Credentials im Firebase Secret Manager
 */

interface CalendarEvent {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeEmail?: string;
    clientId?: string;
    clientName?: string;
}

// Payload Typ für die Cloud Function (mit ISO Strings)
interface CalendarEventPayload {
    title: string;
    description?: string;
    startTime: string; // ISO String für Zod validation
    endTime: string; // ISO String für Zod validation
    location?: string;
    attendeeEmail?: string;
    clientId?: string;
    clientName?: string;
}

interface CalendarEventResponse {
    success: boolean;
    eventId: string;
    htmlLink?: string;
}

interface CalendarConfigResponse {
    success: boolean;
    configured: boolean;
    calendarId?: string;
    calendarSummary?: string;
    error?: string;
}

export const calendarService = {
    /**
     * Erstellt einen Kalendereintrag im "Zefabiko-Belegnungsplan"
     * 
     * SECURITY:
     * - Nur für authentifizierte Benutzer
     * - Credentials sicher im Secret Manager
     * - Input-Validation auf Server-Seite
     * 
     * @param event - Die Kalender-Informationen
     * @returns Die Event-ID und Link des erstellten Eintrags
     */
    async createCalendarEvent(event: CalendarEvent): Promise<CalendarEventResponse> {
        try {
            const functions = getFunctions(app, "europe-west3");
            const createEventFn = httpsCallable<CalendarEventPayload, CalendarEventResponse>(
                functions,
                "createCalendarEvent"
            );

            // Daten für die Cloud Function vorbereiten
            // WICHTIG: Nur setzen wenn Wert vorhanden ist (Firebase konvertiert undefined zu null)
            const payload: CalendarEventPayload = {
                title: event.title,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString(),
            };

            // Optionale Felder nur hinzufügen wenn vorhanden
            if (event.description) payload.description = event.description;
            if (event.location) payload.location = event.location;
            if (event.attendeeEmail) payload.attendeeEmail = event.attendeeEmail;
            if (event.clientId) payload.clientId = event.clientId;
            if (event.clientName) payload.clientName = event.clientName;

            // Debug: Daten loggen vor dem Senden
            console.log("Sende an Cloud Function:", payload);

            const result = await createEventFn(payload);

            console.log("Antwort von Cloud Function:", result.data);

            return result.data;
        } catch (error) {
            console.error("Fehler beim Erstellen des Kalendereintrags:", error);
            throw error;
        }
    },

    /**
     * Prüft, ob die Google Calendar Konfiguration korrekt ist
     * 
     * @returns Konfigurations-Status
     */
    async checkCalendarConfig(): Promise<CalendarConfigResponse> {
        try {
            const functions = getFunctions(app, "europe-west3");
            const checkConfigFn = httpsCallable<never, CalendarConfigResponse>(
                functions,
                "checkCalendarConfig"
            );

            const result = await checkConfigFn();
            return result.data;
        } catch (error) {
            console.error("Calendar Config Check failed:", error);
            return {
                success: false,
                configured: false,
                error: error instanceof Error ? error.message : "Unbekannter Fehler",
            };
        }
    },

    /**
     * Hinweis: Der Firestore Trigger (onClientCreated) wird automatisch
     * ausgelöst, wenn ein neuer Klient mit createCalendarEvent=true
     * angelegt wird. Kein manueller Aufruf nötig!
     */
};
