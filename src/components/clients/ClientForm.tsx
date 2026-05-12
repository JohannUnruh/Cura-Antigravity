"use client";

import { useState } from "react";
import { Client, PersonGroup } from "@/types";
import { Button } from "../ui/Button";
import { useSettings } from "@/contexts/SettingsContext";
import { Calendar, Clock } from "lucide-react";

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

export function ClientForm({ initialData, onSubmit, onCancel, loading }: ClientFormProps) {
    const { settings } = useSettings();
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        personGroup: initialData?.personGroup || "Erwachsene" as PersonGroup,
        gender: initialData?.gender || "Männlich" as const,
        isChurchMember: initialData?.isChurchMember ?? false,
        authorId: initialData?.authorId || "",
    });

    // Calendar-Option State
    const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
    const [calendarData, setCalendarData] = useState({
        date: new Date().toISOString().split('T')[0],
        endDate: "",
        startTime: "10:00",
        endTime: "11:00",
        location: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            ...formData,
            createCalendarEvent,
            calendarData
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name / Haushaltsname</label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    placeholder="z.B. Familie Müller oder Max Mustermann"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Personengruppe</label>
                    <select
                        value={formData.personGroup}
                        onChange={(e) => {
                            const group = e.target.value as PersonGroup;
                            const noGender = ['Ehepaar', 'Familie', 'Paar'].includes(group);
                            setFormData({
                                ...formData,
                                personGroup: group,
                                gender: noGender ? 'Männlich' : formData.gender,
                            });
                        }}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    >
                        {(settings?.personGroups || PERSON_GROUPS).map((group) => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>

                {!['Ehepaar', 'Familie', 'Paar'].includes(formData.personGroup) && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Geschlecht (Hauptperson)</label>
                        <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                            {(['Männlich', 'Weiblich'] as const).map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: g })}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.gender === g
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <input
                    type="checkbox"
                    id="isChurchMember"
                    checked={formData.isChurchMember}
                    onChange={(e) => setFormData({ ...formData, isChurchMember: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isChurchMember" className="text-sm font-medium text-gray-700 cursor-pointer">
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
                        Kalendereintrag für Erstgespräch erstellen
                    </label>
                </div>

                {createCalendarEvent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-white/10">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Datum
                            </label>
                            <input
                                type="date"
                                value={calendarData.date}
                                onChange={(e) => setCalendarData({ ...calendarData, date: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Enddatum (optional)
                            </label>
                            <input
                                type="date"
                                value={calendarData.endDate}
                                onChange={(e) => setCalendarData({ ...calendarData, endDate: e.target.value })}
                                min={calendarData.date}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Von
                            </label>
                            <input
                                type="time"
                                value={calendarData.startTime}
                                onChange={(e) => setCalendarData({ ...calendarData, startTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Bis
                            </label>
                            <input
                                type="time"
                                value={calendarData.endTime}
                                onChange={(e) => setCalendarData({ ...calendarData, endTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            />
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
