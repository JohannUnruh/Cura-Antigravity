/**
 * Generiert eine .ics (iCalendar) Datei und löst einen Download im Browser aus.
 */
export function downloadICS({
    title,
    description,
    startDate,
    endDate,
    allDay = true,
}: {
    title: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    allDay?: boolean;
}) {
    // Format date for ICS
    const formatDate = (date: Date, isAllDay: boolean) => {
        if (isAllDay) {
            // YYYYMMDD
            return date.toISOString().replace(/[-:]/g, '').split('T')[0];
        }
        // YYYYMMDDThhmmssZ
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startStr = formatDate(startDate, allDay);
    
    // For all-day events, endDate must be the next day in ICS spec
    const end = endDate || (allDay ? new Date(startDate.getTime() + 86400000) : startDate);
    const endStr = formatDate(end, allDay);

    const formatString = (str: string) => {
        // Escape newlines, commas and semicolons for ICS
        return str.replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cura//Antigravity//DE
BEGIN:VEVENT
UID:${Math.random().toString(36).substring(2, 9)}@cura
DTSTAMP:${formatDate(new Date(), false)}
DTSTART${allDay ? ';VALUE=DATE:' : ':'}${startStr}
DTEND${allDay ? ';VALUE=DATE:' : ':'}${endStr}
SUMMARY:${formatString(title)}
DESCRIPTION:${formatString(description)}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zieltermin_${startDate.toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
