import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export const dynamic = "force-dynamic";

// Format date for iCalendar format
function formatICSDate(date: Date, isAllDay: boolean) {
    if (isAllDay) {
        // YYYYMMDD
        return date.toISOString().replace(/[-:]/g, "").split("T")[0];
    }
    // YYYYMMDDThhmmssZ (UTC)
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Escape special characters in strings for iCalendar format
function formatICSString(str: string) {
    if (!str) return "";
    return str
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return new NextResponse("Token is required", { status: 400 });
        }

        // Query Firestore for user matching this calendarToken using admin SDK
        const usersRef = adminDb.collection("users");
        const querySnapshot = await usersRef.where("calendarToken", "==", token).limit(1).get();

        if (querySnapshot.empty) {
            return new NextResponse("Invalid calendar token", { status: 401 });
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        if (userData.isDeleted === true || userData.deletedAt) {
            return new NextResponse("User account is deleted or disabled", { status: 403 });
        }

        const advisorName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Berater";

        // Fetch Clients to map client names
        const clientsRef = adminDb.collection("clients");
        const clientsSnapshot = await clientsRef.where("authorId", "==", userId).get();
        const clientMap = new Map<string, string>();
        clientsSnapshot.forEach((doc) => {
            const data = doc.data();
            clientMap.set(doc.id, data.name || "Unbekannter Klient");
        });

        // 1. Fetch Standard Consultations
        const consultationsRef = adminDb.collection("consultations");
        const consSnapshot = await consultationsRef.where("authorId", "==", userId).get();

        // 2. Fetch SKB Consultations
        const skbRef = adminDb.collection("skb_consultations");
        const skbSnapshot = await skbRef.where("authorId", "==", userId).get();

        // 3. Fetch Lectures
        const lecturesRef = adminDb.collection("lectures");
        const lecSnapshot = await lecturesRef.where("authorId", "==", userId).get();

        // 4. Fetch Retreats
        const retreatsRef = adminDb.collection("retreats");
        const retSnapshot = await retreatsRef.where("authorId", "==", userId).get();

        // Build iCal content
        let icsEvents = "";

        // Standard Consultations
        consSnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const clientName = clientMap.get(data.clientId) || "Unbekannter Klient";
            
            const dateFrom = data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom);
            const dateTo = data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo || data.dateFrom);

            const summary = `Beratung: ${clientName}`;
            const description = `Berater: ${advisorName}\nTyp: ${data.type || "Seelsorge"}\n\nZielvereinbarung:\n${data.goalAgreement || "Keine spezifische Zielvereinbarung"}\n\nNotizen:\n${data.notes || ""}`;

            icsEvents += `BEGIN:VEVENT
UID:consultation-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART:${formatICSDate(dateFrom, false)}
DTEND:${formatICSDate(dateTo, false)}
SUMMARY:${formatICSString(summary)}
DESCRIPTION:${formatICSString(description)}
END:VEVENT\n`;

            // If there's a target date (smartCheck.timeBound)
            if (data.smartCheck?.timeBound) {
                const targetDate = data.smartCheck.timeBound.toDate ? data.smartCheck.timeBound.toDate() : new Date(data.smartCheck.timeBound);
                const targetTitle = `Erinnerung: Zieltermin mit ${clientName}`;
                const targetDesc = `Berater: ${advisorName}\n\nZielvereinbarung:\n${data.goalAgreement || "Keine spezifische Zielvereinbarung"}`;
                
                // Weekly reminder event starting at dateFrom, repeating weekly until targetDate
                const untilStr = formatICSDate(targetDate, true);
                
                icsEvents += `BEGIN:VEVENT
UID:target-reminder-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART;VALUE=DATE:${formatICSDate(dateFrom, true)}
DTEND;VALUE=DATE:${formatICSDate(new Date(dateFrom.getTime() + 86400000), true)}
RRULE:FREQ=WEEKLY;UNTIL=${untilStr}
SUMMARY:${formatICSString(targetTitle)}
DESCRIPTION:${formatICSString(targetDesc)}
END:VEVENT\n`;

                // Single event on the target date itself
                icsEvents += `BEGIN:VEVENT
UID:target-deadline-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART;VALUE=DATE:${formatICSDate(targetDate, true)}
DTEND;VALUE=DATE:${formatICSDate(new Date(targetDate.getTime() + 86400000), true)}
SUMMARY:${formatICSString(`Zieltermin: ${clientName}`)}
DESCRIPTION:${formatICSString(targetDesc)}
END:VEVENT\n`;
            }
        });

        // SKB Consultations
        skbSnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const clientName = data.isAnonymous ? `SKB-${data.clientId || id}` : (clientMap.get(data.clientId) || "Unbekannter Klient");
            
            const dateFrom = data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom);
            const dateTo = data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo || data.dateFrom);

            const summary = `Schwangerschaftskonfliktberatung: ${clientName}`;
            const description = `Berater: ${advisorName}\n\nNotizen:\n${data.notes || ""}`;

            icsEvents += `BEGIN:VEVENT
UID:skb-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART:${formatICSDate(dateFrom, false)}
DTEND:${formatICSDate(dateTo, false)}
SUMMARY:${formatICSString(summary)}
DESCRIPTION:${formatICSString(description)}
END:VEVENT\n`;

            // Expected delivery date if present
            if (data.expectedDeliveryDate) {
                const edd = data.expectedDeliveryDate.toDate ? data.expectedDeliveryDate.toDate() : new Date(data.expectedDeliveryDate);
                const eddSummary = `Voraussichtlicher Entbindungstermin (${clientName})`;
                icsEvents += `BEGIN:VEVENT
UID:skb-edd-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART;VALUE=DATE:${formatICSDate(edd, true)}
DTEND;VALUE=DATE:${formatICSDate(new Date(edd.getTime() + 86400000), true)}
SUMMARY:${formatICSString(eddSummary)}
DESCRIPTION:Voraussichtlicher Entbindungstermin für Klient: ${clientName}
END:VEVENT\n`;
            }
        });

        // Lectures
        lecSnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const dateFrom = data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom);
            const dateTo = data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo || data.dateFrom);

            const summary = `Vortrag: ${data.topic || "Ohne Thema"}`;
            const description = `Berater: ${advisorName}\nTyp: ${data.lectureType || ""}\nOrt: ${data.location || ""}\nGemeinde: ${data.church || ""}\nTeilnehmer: ${data.participantCount || 0}\n\nNotizen:\n${data.notes || ""}`;

            icsEvents += `BEGIN:VEVENT
UID:lecture-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART:${formatICSDate(dateFrom, false)}
DTEND:${formatICSDate(dateTo, false)}
SUMMARY:${formatICSString(summary)}
DESCRIPTION:${formatICSString(description)}
END:VEVENT\n`;
        });

        // Retreats
        retSnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const dateFrom = data.dateFrom?.toDate ? data.dateFrom.toDate() : new Date(data.dateFrom);
            const dateTo = data.dateTo?.toDate ? data.dateTo.toDate() : new Date(data.dateTo || data.dateFrom);

            const summary = `Freizeit: ${data.topic || "Ohne Thema"}`;
            const description = `Berater: ${advisorName}\nTyp: ${data.retreatType || ""}\n\nNotizen:\n${data.notes || ""}`;

            icsEvents += `BEGIN:VEVENT
UID:retreat-${id}@cura
DTSTAMP:${formatICSDate(new Date(), false)}
DTSTART:${formatICSDate(dateFrom, false)}
DTEND:${formatICSDate(dateTo, false)}
SUMMARY:${formatICSString(summary)}
DESCRIPTION:${formatICSString(description)}
END:VEVENT\n`;
        });

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cura//Antigravity//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Cura Beratungskalender
X-WR-TIMEZONE:UTC
${icsEvents}END:VCALENDAR`;

        return new Response(icsContent, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": 'attachment; filename="calendar.ics"',
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        });
    } catch (error) {
        console.error("Error generating calendar feed:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
