"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { reminderService } from "@/lib/firebase/services/reminderService";
import { Reminder, ReminderFrequency, ReminderType } from "@/types";
import { Bell, Calendar, Repeat } from "lucide-react";

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    userId: string;
    initialData?: Partial<Reminder>;
}

const FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string; icon: string }[] = [
    { value: 'once', label: 'Einmalig', icon: '📅' },
    { value: 'weekly', label: 'Wöchentlich', icon: '🔄' },
    { value: 'monthly', label: 'Monatlich', icon: '📆' },
];

const TYPE_OPTIONS: { value: ReminderType; label: string; description: string }[] = [
    { value: 'consultation-goal', label: 'Gebetsanliegen', description: 'Erinnerung für ein Gebetsanliegen aus einer Beratung' },
    { value: 'client-birthday', label: 'Geburtstag', description: 'Erinnerung an den Geburtstag eines Klienten' },
    { value: 'custom', label: 'Benutzerdefiniert', description: 'Freie Erinnerung ohne Verknüpfung' },
];

export function ReminderModal({ isOpen, onClose, onSuccess, userId, initialData }: ReminderModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        type: (initialData?.type || 'custom') as ReminderType,
        title: initialData?.title || '',
        message: initialData?.message || '',
        scheduledDate: initialData?.scheduledDate 
            ? new Date(initialData.scheduledDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        frequency: (initialData?.frequency || 'weekly') as ReminderFrequency,
        relatedId: initialData?.relatedId || '',
        relatedType: initialData?.relatedType as 'consultation' | 'client' | 'skbConsultation' | undefined,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!form.title.trim()) {
            setError('Bitte einen Titel eingeben');
            return;
        }
        if (!form.message.trim()) {
            setError('Bitte eine Nachricht eingeben');
            return;
        }

        setIsSaving(true);

        try {
            const reminderData: Omit<Reminder, 'id' | 'createdAt'> = {
                userId,
                authorId: userId,
                type: form.type,
                title: form.title,
                message: form.message,
                scheduledDate: new Date(form.scheduledDate),
                frequency: form.frequency,
                relatedId: form.relatedId || undefined,
                relatedType: form.relatedType,
                isActive: true,
            };

            if (initialData?.id) {
                // Update
                await reminderService.updateReminder(initialData.id, reminderData);
            } else {
                // Create
                await reminderService.addReminder(reminderData);
            }

            onSuccess?.();
            handleClose();

        } catch (err) {
            console.error('Fehler beim Speichern:', err);
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setForm({
            type: 'custom',
            title: '',
            message: '',
            scheduledDate: new Date().toISOString().slice(0, 10),
            frequency: 'weekly',
            relatedId: '',
            relatedType: undefined,
        });
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={initialData?.id ? 'Erinnerung bearbeiten' : 'Neue Erinnerung erstellen'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Typ auswählen */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Bell className="w-4 h-4 inline mr-1" />
                        Art der Erinnerung
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                        {TYPE_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    form.type === option.value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value={option.value}
                                    checked={form.type === option.value}
                                    onChange={(e) => setForm({ ...form, type: e.target.value as ReminderType })}
                                    className="mt-1 h-4 w-4 text-indigo-600"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">{option.label}</div>
                                    <div className="text-sm text-gray-500">{option.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Titel */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Titel (kurz)
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="z.B. Achtung, bete dafür"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        maxLength={50}
                    />
                </div>

                {/* Nachricht */}
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Nachricht
                    </label>
                    <textarea
                        id="message"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="z.B. Gebetsanliegen von Max Mustermann"
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        maxLength={200}
                    />
                </div>

                {/* Datum */}
                <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Startdatum
                    </label>
                    <input
                        type="date"
                        id="scheduledDate"
                        value={form.scheduledDate}
                        onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Frequenz */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Repeat className="w-4 h-4 inline mr-1" />
                        Wiederholung
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {FREQUENCY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setForm({ ...form, frequency: option.value })}
                                className={`p-3 rounded-xl border-2 transition-all ${
                                    form.frequency === option.value
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="text-2xl mb-1">{option.icon}</div>
                                <div className="text-sm font-medium">{option.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Abbrechen
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSaving}>
                        {isSaving ? 'Speichern...' : (initialData?.id ? 'Aktualisieren' : 'Erinnerung erstellen')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
