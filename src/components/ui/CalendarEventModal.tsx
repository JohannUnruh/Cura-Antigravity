"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Calendar, Clock, MapPin, FileText } from "lucide-react";

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (event: {
        title: string;
        description: string;
        date: Date;
        endDate?: Date;
        startTime: string;
        endTime: string;
        location: string;
    }) => Promise<void>;
    clientName?: string;
    loading?: boolean;
}

export function CalendarEventModal({
    isOpen,
    onClose,
    onSubmit,
    clientName,
    loading = false
}: CalendarEventModalProps) {
    const today = new Date();
    today.setMinutes(0, 0, 0);

    const [formData, setFormData] = useState({
        date: today.toISOString().split('T')[0],
        endDate: "",
        startTime: "10:00",
        endTime: "11:00",
        location: "",
        description: ""
    });

    const title = clientName ? `Gespräch: ${clientName}` : "Gespräch";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
        const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
        
        const startDate = new Date(formData.date);
        startDate.setHours(startHours, startMinutes);
        
        const endDate = new Date(formData.endDate || formData.date);
        endDate.setHours(endHours, endMinutes);
        
        if (endDate < startDate) {
            alert("Enddatum/-zeit muss nach Startdatum/-zeit liegen!");
            return;
        }

        await onSubmit({
            title,
            description: formData.description,
            date: startDate,
            endDate: formData.endDate ? endDate : undefined,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location
        });

        // Reset form
        setFormData({
            date: new Date().toISOString().split('T')[0],
            endDate: "",
            startTime: "10:00",
            endTime: "11:00",
            location: "",
            description: ""
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kalendereintrag erstellen"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Klientenname / Titel */}
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">{title}</span>
                    </div>
                </div>

                {/* Datum */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Datum
                    </label>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Enddatum */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Enddatum (optional)
                    </label>
                    <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        min={formData.date}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Uhrzeit */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Von
                        </label>
                        <input
                            type="time"
                            required
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Bis
                        </label>
                        <input
                            type="time"
                            required
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Ort */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Ort (optional)
                    </label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="z.B. Büro, Gemeindehaus..."
                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white"
                    />
                </div>

                {/* Beschreibung */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Notiz (optional)
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Zusätzliche Informationen..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white resize-none"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                    <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={loading}
                    >
                        {loading ? "Wird erstellt..." : "Kalendereintrag erstellen"}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Abbrechen
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
