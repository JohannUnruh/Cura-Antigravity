"use client";

import { useState } from "react";
import { Client, PersonGroup } from "@/types";
import { Button } from "../ui/Button";
import { FormLabel } from "../ui/FormLabel";
import { InfoTooltip } from "../ui/InfoTooltip";
import { useSettings } from "@/contexts/SettingsContext";
import { Calendar, Clock, Download } from "lucide-react";
import { downloadICS } from "@/lib/utils/icsExport";

type ClientCalendarData = {
    date: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
};

export type ClientFormSubmission = Omit<Client, "id" | "createdAt"> & {
    createCalendarEvent?: boolean;
    calendarData?: ClientCalendarData;
};

const PERSON_GROUPS: PersonGroup[] = [
    'Ehepaar', 'Erwachsene', 'Familie', 'Jugendliche',
    'Teeny', 'Kind', 'Paar', 'Senior', 'Verwitwet'
];

interface ClientFormProps {
    initialData?: Partial<Client>;
    onSubmit: (data: ClientFormSubmission) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

const MULTI_PERSON_GROUPS: PersonGroup[] = ['Ehepaar', 'Familie', 'Paar'];

export function ClientForm({ initialData, onSubmit, onCancel, loading }: ClientFormProps) {
    const { settings } = useSettings();
    const [formData, setFormData] = useState<{
        name: string;
        personGroup: PersonGroup;
        // U-017: Bei Mehrpersonen-Akten bleibt das Geschlecht ungesetzt statt
        // still auf „Männlich" zu fallen.
        gender: 'Männlich' | 'Weiblich' | undefined;
        isChurchMember: boolean;
        authorId: string;
    }>(() => {
        const initialGroup = initialData?.personGroup || ("Erwachsene" as PersonGroup);
        const isMultiPerson = MULTI_PERSON_GROUPS.includes(initialGroup);
        return {
            name: initialData?.name || "",
            personGroup: initialGroup,
            gender: isMultiPerson ? undefined : (initialData?.gender ?? "Männlich"),
            isChurchMember: initialData?.isChurchMember ?? false,
            authorId: initialData?.authorId || "",
        };
    });

    // Calendar-Option State
    const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
    const [saveToGoogleCalendar, setSaveToGoogleCalendar] = useState(true);
    const [icsError, setIcsError] = useState<string | null>(null);
    const [calendarData, setCalendarData] = useState({
        date: new Date().toISOString().split('T')[0],
        endDate: "",
        startTime: "10:00",
        endTime: "11:00",
        location: ""
    });

    const handleIcsExport = () => {
        const [startHours, startMinutes] = calendarData.startTime.split(':').map(Number);
        const [endHours, endMinutes] = calendarData.endTime.split(':').map(Number);

        const startDate = new Date(calendarData.date);
        startDate.setHours(startHours, startMinutes, 0, 0);

        const endDate = calendarData.endDate
            ? new Date(calendarData.endDate)
            : new Date(calendarData.date);
        endDate.setHours(endHours, endMinutes, 0, 0);

        if (endDate < startDate) {
            // U-008: Kein natives alert() — Inline-Fehler unter dem Enddatum-Feld
            setIcsError("Enddatum/-zeit muss nach Startdatum/-zeit liegen!");
            return;
        }
        setIcsError(null);

        downloadICS({
            title: `Erstgespräch: ${formData.name || 'Klient'}`,
            description: `Erstgespräch mit neuem Klienten`,
            startDate,
            endDate,
            allDay: false,
            fileName: `erstgespraech_${formData.name ? formData.name.replace(/\s+/g, '_') : 'klient'}_${calendarData.date}.ics`
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            ...formData,
            createCalendarEvent: createCalendarEvent && saveToGoogleCalendar,
            calendarData: createCalendarEvent ? calendarData : undefined
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <FormLabel htmlFor="clientName" required className="dark:text-slate-300">Name / Haushaltsname</FormLabel>
                <input
                    type="text"
                    id="clientName"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="z.B. Familie Müller oder Max Mustermann"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <FormLabel htmlFor="personGroup" required className="dark:text-slate-300">Personengruppe</FormLabel>
                        {/* T-7 (Usability-Bericht 08.10.2026) */}
                        <InfoTooltip text="Beschreibt die Akte als Ganzes: ‚Ehepaar'/'Paar'/'Familie' = mehrere Personen in einer Akte, ‚Erwachsene'/'Senior'/'Teeny'/'Kind' = Einzelperson nach Alter." />
                    </div>
                    <select
                        id="personGroup"
                        value={formData.personGroup}
                        onChange={(e) => {
                            const group = e.target.value as PersonGroup;
                            const noGender = MULTI_PERSON_GROUPS.includes(group);
                            setFormData({
                                ...formData,
                                personGroup: group,
                                // U-017: Kein stilles „Männlich" für Mehrpersonen-Akten
                                gender: noGender ? undefined : (formData.gender ?? 'Männlich'),
                            });
                        }}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                        {(settings?.personGroups || PERSON_GROUPS).map((group) => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>

                {!MULTI_PERSON_GROUPS.includes(formData.personGroup) ? (
                    <div className="space-y-2">
                        <FormLabel required className="dark:text-slate-300">Geschlecht (Hauptperson)</FormLabel>
                        <div className="flex gap-4 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                            {(['Männlich', 'Weiblich'] as const).map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: g })}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.gender === g
                                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <FormLabel className="dark:text-slate-300">Geschlecht</FormLabel>
                        <p className="text-sm text-gray-500 dark:text-slate-400 py-1.5">
                            Bei Sammelakten (Paar/Familie) wird kein Geschlecht erfasst.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-500/30">
                <input
                    type="checkbox"
                    id="isChurchMember"
                    checked={formData.isChurchMember}
                    onChange={(e) => setFormData({ ...formData, isChurchMember: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isChurchMember" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                    Ist Gemeindeglied / Zugehörig
                </label>
            </div>

            {/* Calendar-Option */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30">
                    <input
                        type="checkbox"
                        id="createCalendarEvent"
                        checked={createCalendarEvent}
                        onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="createCalendarEvent" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Erstgespräch planen
                    </label>
                </div>

                {createCalendarEvent && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-white/10">
                        {/* Option: Google Kalender / Belegungsplan */}
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-white/10">
                            <input
                                type="checkbox"
                                id="saveToGoogleCalendar"
                                checked={saveToGoogleCalendar}
                                onChange={(e) => setSaveToGoogleCalendar(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="saveToGoogleCalendar" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                                Kalendereintrag für den Belegungsplan erstellen
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="calendarDate" className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Datum
                                </label>
                                <input
                                    type="date"
                                    id="calendarDate"
                                    value={calendarData.date}
                                    onChange={(e) => setCalendarData({ ...calendarData, date: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="calendarEndDate" className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Enddatum (optional)
                                </label>
                                <input
                                    type="date"
                                    id="calendarEndDate"
                                    value={calendarData.endDate}
                                    onChange={(e) => {
                                        setCalendarData({ ...calendarData, endDate: e.target.value });
                                        setIcsError(null);
                                    }}
                                    min={calendarData.date}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                                {icsError && (
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1" role="alert">
                                        {icsError}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="calendarStartTime" className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Von
                                </label>
                                <input
                                    type="time"
                                    id="calendarStartTime"
                                    value={calendarData.startTime}
                                    onChange={(e) => setCalendarData({ ...calendarData, startTime: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="calendarEndTime" className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Bis
                                </label>
                                <input
                                    type="time"
                                    id="calendarEndTime"
                                    value={calendarData.endTime}
                                    onChange={(e) => setCalendarData({ ...calendarData, endTime: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* ICS Button */}
                        <div className="pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleIcsExport}
                                className="w-full gap-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                            >
                                <Download className="w-4 h-4" /> Erstgespräch als ICS exportieren
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
                >
                    {loading ? "Wird gespeichert..." : "Speichern"}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Abbrechen
                </Button>
            </div>
        </form>
    );
}
