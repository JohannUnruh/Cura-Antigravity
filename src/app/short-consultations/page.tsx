"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { shortConsultationService } from "@/lib/firebase/services/shortConsultationService";
import { timeTrackingService } from "@/lib/firebase/services/timeTrackingService";
import { ShortConsultation, ShortConsultationType } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Coffee, Plus, Calendar, Clock, Trash2, Pencil } from "lucide-react";

const consultationTypes: ShortConsultationType[] = [
    'Glaubensstärkung (Stehcafé)',
    'Gebetshilfe (Stehcafé)',
    'Glaubensstärkung',
    'Gebetszeit für Frauen'
];

export default function ShortConsultationsPage() {
    const { user } = useAuth();
    const [consultations, setConsultations] = useState<ShortConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        date: "",
        durationInHours: 0.5,
        type: consultationTypes[0],
        notes: "",
        timeOfDay: "Ganztägig" as 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig'
    });

    const [selected, setSelected] = useState<ShortConsultation | null>(null);

    const formatDate = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await shortConsultationService.getConsultationsByAuthor(user.uid);
            setConsultations(data);
        } catch (error) {
            console.error("Error loading short consultations:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const openNew = () => {
        setSelected(null);
        setForm({
            date: formatDate(new Date()),
            durationInHours: 0.5,
            type: consultationTypes[0],
            notes: "",
            timeOfDay: "Ganztägig"
        });
        setIsModalOpen(true);
    };

    const openEdit = (item: ShortConsultation) => {
        setSelected(item);
        setForm({
            date: formatDate(new Date(item.date)),
            durationInHours: item.durationInHours,
            type: item.type,
            notes: item.notes || "",
            timeOfDay: item.timeOfDay || "Ganztägig"
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const payload = {
                authorId: user.uid,
                date: new Date(form.date),
                durationInHours: form.durationInHours,
                type: form.type,
                notes: form.notes,
                timeOfDay: form.timeOfDay
            };

            if (selected) {
                // Bearbeiten: Nur Kurzgespräch aktualisieren, keine neuen Zeiteinträge
                await shortConsultationService.updateConsultation(selected.id, payload);
            } else {
                // Neu erstellen: Kurzgespräch speichern + Zeiteintrag mit Kontingent-Prüfung
                const newDoc = await shortConsultationService.addConsultation(payload);

                const date = new Date(form.date);
                const year = date.getFullYear();
                const month = date.getMonth();

                // Verwende addTimeEntryWithCheck für Kontingent-Prüfung bei Minijobbern
                const result = await timeTrackingService.addTimeEntryWithCheck({
                    authorId: user.uid,
                    date: new Date(form.date),
                    timeOfDay: form.timeOfDay,
                    durationInHours: form.durationInHours,
                    type: 'Beratung',
                    description: form.type + (form.notes ? ` - ${form.notes}` : ''),
                    referenceId: newDoc.id
                }, year, month);

                // User über Overflow informieren
                if (result.status === 'split' || result.status === 'pool-only') {
                    console.log(`${result.poolEntry?.durationInHours}h wurden im Überstundenpool gespeichert`);
                }
            }

            await loadData();
            setIsModalOpen(false);
            setSelected(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isDeleteModalOpen) return;
        setIsSaving(true);
        try {
            await shortConsultationService.deleteConsultation(isDeleteModalOpen);
            if (user?.uid) {
                await timeTrackingService.deleteTimeEntriesByReferenceId(isDeleteModalOpen, user.uid);
            }
            setIsDeleteModalOpen(null);
            await loadData();
        } catch (error) {
            console.error("Error deleting short consultation:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">
                <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/40 p-2.5 rounded-xl">
                                <Coffee className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            Kurzgespräche
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Schnelle Erfassung von Spontan- und Stehcafé-Gesprächen ohne Akte.</p>
                    </div>
                    <Button variant="primary" onClick={openNew} className="gap-2">
                        <Plus className="w-4 h-4" /> Neues Kurzgespräch
                    </Button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        </div>
                    ) : consultations.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Bisher keine Kurzgespräche erfasst. Klicke auf &quot;Neues Kurzgespräch&quot; um zu beginnen.
                            </CardContent>
                        </Card>
                    ) : (
                        consultations.map(item => (
                            <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group">
                                <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {item.type}
                                            </h3>
                                        </div>

                                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2">
                                            {item.notes || "Keine Notizen hinterlegt."}
                                        </p>

                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5 font-medium text-orange-600/80 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(item.date).toLocaleDateString("de-DE")}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                <Clock className="w-4 h-4" />
                                                {item.durationInHours}h
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                            title="Bearbeiten"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteModalOpen(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            title="Löschen"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? "Kurzgespräch bearbeiten" : "Neues Kurzgespräch erfassen"}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                                <input id="date" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" />
                            </div>
                            <div>
                                <label htmlFor="timeOfDay" className="block text-sm font-medium text-gray-700 mb-1">Tageszeit (in Zeiterfassung)</label>
                                <select
                                    id="timeOfDay"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                    value={form.timeOfDay}
                                    onChange={(e) => setForm({ ...form, timeOfDay: e.target.value as 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig' })}
                                >
                                    <option value="Vormittags">Vormittags</option>
                                    <option value="Nachmittags">Nachmittags</option>
                                    <option value="Abends">Abends</option>
                                    <option value="Ganztägig">Ganztägig</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Gesprächsart</label>
                                <select
                                    id="type"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value as ShortConsultationType })}
                                >
                                    {consultationTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="durationInHours" className="block text-sm font-medium text-gray-700 mb-1">Dauer (in Stunden)</label>
                                <input id="durationInHours" type="number" step="0.25" min="0" required value={form.durationInHours}
                                    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Kurze Notiz</label>
                            <textarea
                                id="notes"
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                rows={3}
                                placeholder="z.B. Im Anschluss an den Gottesdienst..."
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 text-sm">
                            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                            <p>Dieses Gespräch wird automatisch auch in deine <strong>Zeiterfassung</strong> übertragen.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? "Wird gespeichert..." : "Erfassen"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    isOpen={!!isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(null)}
                    title="Gespräch löschen"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du dieses Kurzgespräch löschen möchtest? Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(null)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={handleDelete}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
