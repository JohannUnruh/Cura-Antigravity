"use client";

import { useEffect, useState } from "react";
import { reminderService } from "@/lib/firebase/services/reminderService";
import { Reminder, ReminderFrequency, ReminderType } from "@/types";
import { Bell, Calendar, Repeat, Trash2, Pencil } from "lucide-react";
import { Button } from "./Button";
import { ReminderModal } from "./ReminderModal";

interface ReminderListProps {
    userId: string;
}

const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
    once: 'Einmalig',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
};

const TYPE_ICONS: Record<ReminderType, string> = {
    'consultation-goal': '🙏',
    'client-birthday': '🎂',
    'custom': '📝',
};

export function ReminderList({ userId }: ReminderListProps) {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    useEffect(() => {
        loadReminders();
    }, [userId]);

    const loadReminders = async () => {
        try {
            setLoading(true);
            const data = await reminderService.getActiveRemindersByUserId(userId);
            setReminders(data);
        } catch (error) {
            console.error('Fehler beim Laden der Erinnerungen:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Möchtest du diese Erinnerung wirklich löschen?')) return;

        try {
            await reminderService.deleteReminder(id);
            await loadReminders();
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
        }
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingReminder(null);
    };

    const handleModalSuccess = () => {
        loadReminders();
        handleModalClose();
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getNextDate = (reminder: Reminder): string => {
        if (reminder.nextScheduledAt) {
            return formatDate(reminder.nextScheduledAt);
        }
        if (reminder.frequency === 'once') {
            return 'Bereits gesendet';
        }
        return formatDate(reminder.scheduledDate);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Lade Erinnerungen...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Meine Erinnerungen ({reminders.length})
                    </h3>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                >
                    + Neue Erinnerung
                </Button>
            </div>

            {/* Empty State */}
            {reminders.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔔</div>
                    <p className="text-gray-500 mb-2">Keine aktiven Erinnerungen</p>
                    <p className="text-sm text-gray-400">
                        Erstelle eine Erinnerung, um wöchentlich oder monatlich benachrichtigt zu werden
                    </p>
                </div>
            )}

            {/* List */}
            {reminders.length > 0 && (
                <div className="space-y-3">
                    {reminders.map((reminder) => (
                        <div
                            key={reminder.id}
                            className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors bg-white/50 backdrop-blur-sm"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    {/* Icon */}
                                    <div className="text-2xl">
                                        {TYPE_ICONS[reminder.type]}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900">
                                                {reminder.title}
                                            </h4>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                {FREQUENCY_LABELS[reminder.frequency]}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">
                                            {reminder.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Start: {formatDate(reminder.scheduledDate)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Repeat className="w-3 h-3" />
                                                Nächste: {getNextDate(reminder)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(reminder)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                                        title="Bearbeiten"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(reminder.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                                        title="Löschen"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <ReminderModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                userId={userId}
                initialData={editingReminder || undefined}
            />
        </div>
    );
}
