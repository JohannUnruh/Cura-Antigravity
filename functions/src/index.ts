/**
 * Firebase Cloud Functions Entry Point
 */

import { onClientCreated, createCalendarEvent, checkCalendarConfig } from "./calendarFunctions";
import { sendScheduledReminders, sendImmediateReminder, cleanupInvalidTokens } from "./reminderFunctions";

// Export alle Functions
export {
    // Calendar Functions
    onClientCreated,
    createCalendarEvent,
    checkCalendarConfig,
    // Reminder/Push Functions
    sendScheduledReminders,
    sendImmediateReminder,
    cleanupInvalidTokens,
};
