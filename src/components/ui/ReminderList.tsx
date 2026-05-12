"use client";

import { useEffect, useState, useCallback } from "react";
import { reminderService } from "@/lib/firebase/services/reminderService";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { clientService } from "@/lib/firebase/services/clientService";
import { Reminder, ReminderFrequency, ReminderType } from "@/types";
import { Bell, Calendar, Repeat, Trash2, Pencil, Check, X } from "lucide-react";
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

interface ConsultationItem {
    id: string;
    clientName: string;
    type: string;
    dateFrom: Date;
    notes?: string;
}

export function ReminderList({ userId }: ReminderListProps) {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    // Inline form state
    const [showInlineForm, setShowInlineForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState({
        type: 'custom' as ReminderType,
        title: '',
        message: '',
        scheduledDate: new Date().toISOString().slice(0, 10),
        frequency: 'weekly' as ReminderFrequency,
    });

    // Consultation list state
    const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
    const [loadingConsultations, setLoadingConsultations] = useState(false);
    const [showConsultationPicker, setShowConsultationPicker] = useState(false);
    const [selectedConsultations, setSelectedConsultations] = useState<Set<string>>(new Set());
    const [creatingReminders, setCreatingReminders] = useState<Set<string>>(new Set());

    const loadReminders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await reminderService.getActiveRemindersByUserId(userId);
            setReminders(data);
        } catch (error) {
            console.error('Fehler beim Laden der Erinnerungen:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadReminders();
    }, [loadReminders]);

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

    // ──────────────────────────────────────────────────────────────────────────
    // Inline Form Handler
    // ──────────────────────────────────────────────────────────────────────────

    const handleInlineSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!form.title.trim()) {
            setFormError('Bitte einen Titel eingeben');
            return;
        }
        if (!form.message.trim()) {
            setFormError('Bitte eine Nachricht eingeben');
            return;
        }

        setIsSaving(true);

        try {
            await reminderService.addReminder({
                userId,
                authorId: userId,
                type: form.type,
                title: form.title,
                message: form.message,
                scheduledDate: new Date(form.scheduledDate),
                frequency: form.frequency,
                isActive: true,
            });

            // Reset form
            setForm({
                type: 'custom',
                title: '',
                message: '',
                scheduledDate: new Date().toISOString().slice(0, 10),
                frequency: 'weekly',
            });
            setShowInlineForm(false);
            await loadReminders();
        } catch (err) {
            console.error('Fehler beim Speichern:', err);
            setFormError(err instanceof Error ? err.message : 'Fehler beim Speichern');
        } finally {
            setIsSaving(false);
        }
    }, [form, loadReminders, userId]);

    const handleInlineCancel = () => {
        setShowInlineForm(false);
        setFormError(null);
        setForm({
            type: 'custom',
            title: '',
            message: '',
            scheduledDate: new Date().toISOString().slice(0, 10),
            frequency: 'weekly',
        });
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Consultation Picker
    // ──────────────────────────────────────────────────────────────────────────

    const loadConsultations = useCallback(async () => {
        setLoadingConsultations(true);
        try {
            const [consultations, skbConsultations, clients] = await Promise.all([
                consultationService.getConsultationsByAuthor(userId),
                consultationService.getSkbConsultationsByAuthor(userId),
                clientService.getClientsByAuthor(userId),
            ]);

            const clientMap = new Map(clients.map(c => [c.id, c]));

            const items: ConsultationItem[] = [
                ...consultations.map(c => ({
                    id: c.id,
                    clientName: clientMap.get(c.clientId)?.name || c.clientId,
                    type: c.type,
                    dateFrom: new Date(c.dateFrom),
                    notes: c.notes,
                })),
                ...skbConsultations.map(c => ({
                    id: c.id,
                    clientName: clientMap.get(c.clientId)?.name || c.clientId,
                    type: 'SKB Beratung',
                    dateFrom: new Date(c.dateFrom),
                    notes: c.notes,
                })),
            ].sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime());

            setConsultations(items);
        } catch (error) {
            console.error('Fehler beim Laden der Beratungen:', error);
        } finally {
            setLoadingConsultations(false);
        }
    }, [userId]);

    const toggleConsultation = (id: string) => {
        setSelectedConsultations(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const createRemindersFromSelected = useCallback(async () => {
        if (selectedConsultations.size === 0) return;

        setCreatingReminders(new Set(selectedConsultations));

        let successCount = 0;
        for (const id of selectedConsultations) {
            const consultation = consultations.find(c => c.id === id);
            if (!consultation) continue;

            try {
                await reminderService.createFromConsultation(userId, consultation);
                successCount++;
            } catch (error) {
                console.error(`Fehler bei Beratung ${id}:`, error);
            }
        }

        setSelectedConsultations(new Set());
        setCreatingReminders(new Set());
        await loadReminders();

        if (successCount > 0) {
            // Optional: Success message via parent
            console.log(`${successCount} Erinnerung(en) erstellt`);
        }
    }, [selectedConsultations, consultations, userId, loadReminders]);

    // ──────────────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Lade Erinnerungen...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Meine Erinnerungen ({reminders.length})
                    </h3>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setShowConsultationPicker(!showConsultationPicker);
                            if (!showConsultationPicker && consultations.length === 0) {
                                loadConsultations();
                            }
                        }}
                    >
                        <Check className="w-4 h-4 mr-1" /> Aus Beratung
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowInlineForm(!showInlineForm)}
                    >
                        + Neue Erinnerung
                    </Button>
                </div>
            </div>

            {/* Consultation Picker */}
            {showConsultationPicker && (
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            Beratung auswählen
                        </h4>
                        <button
                            onClick={() => setShowConsultationPicker(false)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {loadingConsultations ? (
                        <div className="text-center py-6 text-gray-500 text-sm">Lade Beratungen...</div>
                    ) : consultations.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">Keine Beratungen mit Termin gefunden.</div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                                {consultations.map(c => (
                                    <label
                                        key={c.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedConsultations.has(c.id)
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedConsultations.has(c.id)}
                                            onChange={() => toggleConsultation(c.id)}
                                            disabled={creatingReminders.has(c.id)}
                                            className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                {c.clientName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
                                                <span>{c.type}</span>
                                                <span>·</span>
                                                <span>{formatDate(c.dateFrom)}</span>
                                            </div>
                                        </div>
                                        {creatingReminders.has(c.id) && (
                                            <span className="text-xs text-indigo-600">Wird erstellt...</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                            {selectedConsultations.size > 0 && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={createRemindersFromSelected}
                                    disabled={creatingReminders.size > 0}
                                    className="w-full"
                                >
                                    {creatingReminders.size > 0
                                        ? `Erstelle ${selectedConsultations.size} Erinnerung(en)...`
                                        : `${selectedConsultations.size} Erinnerung(en) erstellen`}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Inline Form */}
            {showInlineForm && (
                <form onSubmit={handleInlineSubmit} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Neue Erinnerung</h4>

                    {/* Titel */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Titel
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="z.B. Achtung, bete dafür"
                            maxLength={50}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Nachricht */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Nachricht
                        </label>
                        <textarea
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="z.B. Gebetsanliegen von Max Mustermann"
                            rows={2}
                            maxLength={200}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                        />
                    </div>

                    {/* Datum + Frequenz nebeneinander */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                Startdatum
                            </label>
                            <input
                                type="date"
                                value={form.scheduledDate}
                                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                Wiederholung
                            </label>
                            <select
                                value={form.frequency}
                                onChange={(e) => setForm({ ...form, frequency: e.target.value as ReminderFrequency })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="weekly">Wöchentlich</option>
                                <option value="monthly">Monatlich</option>
                                <option value="once">Einmalig</option>
                            </select>
                        </div>
                    </div>

                    {/* Error */}
                    {formError && (
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                            {formError}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={handleInlineCancel}>
                            Abbrechen
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                            {isSaving ? 'Speichern...' : 'Erstellen'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Empty State */}
            {reminders.length === 0 && !showInlineForm && !showConsultationPicker && (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔔</div>
                    <p className="text-gray-500 dark:text-slate-400 mb-2">Keine aktiven Erinnerungen</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500">
                        Erstelle eine Erinnerung oder wähle eine Beratung aus
                    </p>
                </div>
            )}

            {/* List */}
            {reminders.length > 0 && (
                <div className="space-y-3">
                    {reminders.map((reminder) => (
                        <div
                            key={reminder.id}
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="text-2xl">
                                        {TYPE_ICONS[reminder.type]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                {reminder.title}
                                            </h4>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                                {FREQUENCY_LABELS[reminder.frequency]}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">
                                            {reminder.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(reminder)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-slate-400"
                                        title="Bearbeiten"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(reminder.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
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

            {/* Modal (nur noch für Bearbeiten) */}
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
