"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { shortConsultationService } from "@/lib/firebase/services/shortConsultationService";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { clientService } from "@/lib/firebase/services/clientService";
import { timeTrackingService } from "@/lib/firebase/services/timeTrackingService";
import { ShortConsultation, ShortConsultationType, Consultation, Client, PersonGroup } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormLabel } from "@/components/ui/FormLabel";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, ToastContainer } from "@/hooks/useToast";
import { Coffee, Plus, Calendar, Clock, Trash2, Pencil, UserPlus, CheckCircle2 } from "lucide-react";

const consultationTypes: ShortConsultationType[] = [
    'Glaubensstärkung (Stehcafé)',
    'Gebetshilfe (Stehcafé)',
    'Glaubensstärkung',
    'Gebetszeit für Frauen'
];

// Fallback, falls in den App-Settings keine Personengruppen gepflegt sind
const PERSON_GROUPS: PersonGroup[] = [
    'Ehepaar', 'Erwachsene', 'Familie', 'Jugendliche',
    'Teeny', 'Kind', 'Paar', 'Senior', 'Verwitwet'
];

export default function ShortConsultationsPage() {
    const { user, userProfile } = useAuth();
    const { settings } = useSettings();
    const [consultations, setConsultations] = useState<ShortConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // U-002/U-019: Sichtbares Feedback für alle Schreibvorgänge
    const { toast, showToast, dismissToast } = useToast();

    // Transfer "Kurzgespräch → Akte" (P2-④)
    const [transferItem, setTransferItem] = useState<ShortConsultation | null>(null);
    const [transferMode, setTransferMode] = useState<'new' | 'existing'>('new');
    const [clients, setClients] = useState<Client[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [newClient, setNewClient] = useState({
        name: "",
        personGroup: "Erwachsene" as PersonGroup,
        gender: "Männlich" as 'Männlich' | 'Weiblich'
    });
    const [transferSuccess, setTransferSuccess] = useState(false);

    // Gleiche Default-true-Semantik wie ProtectedRoute (Backward Compatibility)
    const canAccessClients = !!userProfile && (userProfile.role === 'Admin' || userProfile.hasClientAccess !== false);
    const personGroups = settings?.personGroups?.length ? settings.personGroups : PERSON_GROUPS;

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
                // Bearbeiten: Kurzgespräch aktualisieren …
                await shortConsultationService.updateConsultation(selected.id, payload);
                // U-004a: … und den verknüpften Zeiteintrag (referenceId) synchron
                // mitziehen, damit Stundenliste und Gespräch nicht auseinanderdriften.
                try {
                    await timeTrackingService.updateTimeEntriesByReferenceId(selected.id, user.uid, {
                        date: payload.date,
                        durationInHours: payload.durationInHours,
                        timeOfDay: payload.timeOfDay,
                        description: payload.type + (payload.notes ? ` - ${payload.notes}` : '')
                    });
                    showToast('success', 'Kurzgespräch aktualisiert — die Zeiterfassung wurde mitangepasst.');
                } catch (syncError) {
                    console.error("Error syncing linked time entry:", syncError);
                    showToast('warning', 'Kurzgespräch gespeichert, aber die Zeiterfassung konnte nicht aktualisiert werden. Bitte prüfe den Eintrag dort.');
                }
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

                // U-019: Erfolgs-/Overflow-Feedback statt stillem console.log
                if (result.status === 'split') {
                    showToast('warning', `Kurzgespräch gespeichert. Das Monatskontingent wurde überschritten — ${result.poolEntry?.durationInHours}h wanderten in den Überstundenpool.`);
                } else if (result.status === 'pool-only') {
                    showToast('info', `Kurzgespräch gespeichert. Das Monatskontingent ist ausgeschöpft — die gesamten ${result.poolEntry?.durationInHours}h liegen im Überstundenpool.`);
                } else {
                    showToast('success', 'Kurzgespräch gespeichert.');
                }
            }

            await loadData();
            setIsModalOpen(false);
            setSelected(null);
        } catch (error) {
            // U-002: Fehler waren bisher unhandled rejections — jetzt sichtbar
            console.error("Error saving short consultation:", error);
            showToast('error', 'Speichern fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.');
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
            showToast('success', 'Kurzgespräch gelöscht — der zugehörige Zeiteintrag wurde mit entfernt.');
        } catch (error) {
            console.error("Error deleting short consultation:", error);
            showToast('error', 'Löschen fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.');
        } finally {
            setIsSaving(false);
        }
    };

    const openTransfer = async (item: ShortConsultation) => {
        setTransferItem(item);
        setTransferMode('new');
        setTransferSuccess(false);
        setClientSearch("");
        setSelectedClientId("");
        setNewClient({ name: "", personGroup: "Erwachsene" as PersonGroup, gender: "Männlich" });

        if (user && clients.length === 0) {
            setClientsLoading(true);
            try {
                const data = await clientService.getClientsByAuthor(user.uid);
                setClients(data.filter(c => !c.archived));
            } catch (error) {
                console.error("Error loading clients:", error);
            } finally {
                setClientsLoading(false);
            }
        }
    };

    const handleTransfer = async () => {
        if (!user || !transferItem) return;
        const targetIsNew = transferMode === 'new';
        if (targetIsNew && !newClient.name.trim()) return;
        if (!targetIsNew && !selectedClientId) return;

        setIsSaving(true);
        try {
            let clientId = selectedClientId;
            if (targetIsNew) {
                clientId = await clientService.addClient({
                    authorId: user.uid,
                    name: newClient.name.trim(),
                    personGroup: newClient.personGroup,
                    gender: newClient.gender,
                    isChurchMember: false
                });
                // Neu angelegten Klienten für weitere Überführungen in dieser Session vormerken
                const created = await clientService.getClientById(clientId);
                if (created) setClients(prev => [created, ...prev]);
            }

            const dateFrom = new Date(transferItem.date);
            const dateTo = new Date(dateFrom.getTime() + transferItem.durationInHours * 3600000);

            // Kein neuer Zeiteintrag: Das Kurzgespräch ist bereits in der Zeiterfassung
            // erfasst (referenceId) — ein zweiter Eintrag würde die Stunden doppeln.
            // Partielle Beratung (ohne lifeStage/Problemfelder) — gleicher Cast wie im Klienten-Formular.
            const payload: Partial<Consultation> = {
                clientId,
                authorId: transferItem.authorId,
                dateFrom,
                dateTo,
                type: 'Beratung',
                unitsInHours: transferItem.durationInHours,
                prepTimeInHours: 0,
                notes: transferItem.notes || "",
                problemOriginId: "",
                subProblemsIds: [],
                goalTypeId: "",
                goalAgreement: "",
                causeFromCounselor: ""
            };
            await consultationService.addConsultation(payload as Omit<Consultation, "id" | "createdAt">);

            setTransferSuccess(true);
            setTimeout(() => setTransferItem(null), 1500);
        } catch (error) {
            console.error("Error transferring short consultation:", error);
            showToast('error', 'Überführen fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.personGroup.toLowerCase().includes(clientSearch.toLowerCase())
    );

    return (
        <ProtectedRoute requiredPermission="hasShortConsultationAccess">
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

                                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2 whitespace-pre-wrap">
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
                                        {canAccessClients && (
                                            <button
                                                onClick={() => openTransfer(item)}
                                                className="p-2 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                                title="In Akte überführen"
                                            >
                                                <UserPlus className="w-5 h-5" />
                                            </button>
                                        )}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FormLabel htmlFor="date" required className="dark:text-slate-300">Datum</FormLabel>
                                <input id="date" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20" />
                            </div>
                            <div>
                                {/* T-2 (Usability-Bericht 08.10.2026) */}
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FormLabel htmlFor="timeOfDay" className="mb-0 dark:text-slate-300">Tageszeit (in Zeiterfassung)</FormLabel>
                                    <InfoTooltip text="Gibt an, wann das Gespräch stattfand. Vormittags = ab 8 Uhr, Nachmittags = ab 15 Uhr, Abends = ab 18 Uhr. Wird für die Stundenauswertung und den Belegungsplan genutzt." />
                                </div>
                                <select
                                    id="timeOfDay"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                {/* T-1 (Usability-Bericht 08.10.2026) */}
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FormLabel htmlFor="type" required className="mb-0 dark:text-slate-300">Gesprächsart</FormLabel>
                                    <InfoTooltip text="Wähle die Art des Gesprächs. ‚Seelsorge Präsenz' = persönliches Gespräch, ‚Seelsorge telefonisch' = Telefonat. Stehcafé-Formate gehören zu den Kurzgesprächen, nicht hierher." />
                                </div>
                                <select
                                    id="type"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value as ShortConsultationType })}
                                >
                                    {consultationTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <FormLabel htmlFor="durationInHours" required className="dark:text-slate-300">Dauer (in Stunden)</FormLabel>
                                <input id="durationInHours" type="number" step="0.25" min="0" required value={form.durationInHours}
                                    // U-001: Scrollrad darf die Dauer nicht unbemerkt verstellen
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20" />
                            </div>
                        </div>

                        <div>
                            <FormLabel htmlFor="notes" required className="dark:text-slate-300">Kurze Notiz</FormLabel>
                            <textarea
                                id="notes"
                                required
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                rows={3}
                                placeholder="z.B. Im Anschluss an den Gottesdienst..."
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-100 dark:border-blue-500/30 text-sm">
                            <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
                            <p>Dieses Gespräch wird automatisch auch in deine <strong>Zeiterfassung</strong> übertragen.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
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
                        <p className="text-gray-600 dark:text-slate-300">
                            Bist du sicher, dass du dieses Kurzgespräch löschen möchtest? Der zugehörige Zeiteintrag wird mit gelöscht. Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(null)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={handleDelete}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={!!transferItem}
                    onClose={() => setTransferItem(null)}
                    title="Kurzgespräch in Akte überführen"
                >
                    {transferItem && (transferSuccess ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            <p className="text-gray-700 dark:text-slate-200 font-medium">Als Beratung in die Akte übernommen.</p>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">Das Kurzgespräch bleibt erhalten.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm text-gray-600 dark:text-slate-300">
                                <span className="font-medium">{transferItem.type}</span>
                                {" • "}
                                {new Date(transferItem.date).toLocaleDateString("de-DE")}
                                {" • "}
                                {transferItem.durationInHours}h
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTransferMode('new')}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${transferMode === 'new'
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-white/20'}`}
                                >
                                    Neuen Klient anlegen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransferMode('existing')}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${transferMode === 'existing'
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-white/20'}`}
                                >
                                    Bestehendem Klient zuordnen
                                </button>
                            </div>

                            {transferMode === 'new' ? (
                                <div className="space-y-4">
                                    <div>
                                        <FormLabel htmlFor="transfer-client-name" required className="dark:text-slate-300">Name</FormLabel>
                                        <input
                                            id="transfer-client-name"
                                            type="text"
                                            required
                                            value={newClient.name}
                                            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                            placeholder="Vor- und Nachname"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            {/* T-7 (Usability-Bericht 08.10.2026) */}
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <FormLabel htmlFor="transfer-person-group" required className="mb-0 dark:text-slate-300">Personengruppe</FormLabel>
                                                <InfoTooltip text="Beschreibt die Akte als Ganzes: ‚Ehepaar'/'Paar'/'Familie' = mehrere Personen in einer Akte, ‚Erwachsene'/'Senior'/'Teeny'/'Kind' = Einzelperson nach Alter." />
                                            </div>
                                            <select
                                                id="transfer-person-group"
                                                value={newClient.personGroup}
                                                onChange={e => setNewClient({ ...newClient, personGroup: e.target.value as PersonGroup })}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                            >
                                                {personGroups.map(group => (
                                                    <option key={group} value={group}>{group}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <FormLabel htmlFor="transfer-gender" required className="dark:text-slate-300">Geschlecht</FormLabel>
                                            <select
                                                id="transfer-gender"
                                                value={newClient.gender}
                                                onChange={e => setNewClient({ ...newClient, gender: e.target.value as 'Männlich' | 'Weiblich' })}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                            >
                                                <option value="Männlich">Männlich</option>
                                                <option value="Weiblich">Weiblich</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={clientSearch}
                                        onChange={e => setClientSearch(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="Klient suchen..."
                                        aria-label="Klient suchen"
                                    />
                                    {clientsLoading ? (
                                        <div className="flex justify-center p-4">
                                            <div className="w-6 h-6 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                                        </div>
                                    ) : filteredClients.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-slate-400 p-2">
                                            {clients.length === 0
                                                ? "Noch keine Klienten angelegt. Wechsle zu „Neuen Klient anlegen“."
                                                : "Keine Treffer für diese Suche."}
                                        </p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                            {filteredClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setSelectedClientId(c.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedClientId === c.id
                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium'
                                                        : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-white/20'}`}
                                                >
                                                    {c.name}
                                                    <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">{c.personGroup}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-100 dark:border-blue-500/30 text-sm">
                                <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
                                <p>Das Kurzgespräch bleibt erhalten. Die Stunden werden <strong>nicht</strong> doppelt in der Zeiterfassung verbucht.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                                <Button type="button" variant="ghost" onClick={() => setTransferItem(null)} disabled={isSaving}>Abbrechen</Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    disabled={isSaving || (transferMode === 'new' ? !newClient.name.trim() : !selectedClientId)}
                                    onClick={handleTransfer}
                                >
                                    {isSaving ? "Wird überführt..." : "In Akte überführen"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </Modal>

                {/* U-002/U-019: Toast-Feedback für alle Schreibvorgänge */}
                <ToastContainer toast={toast} onDismiss={dismissToast} />
            </div>
        </ProtectedRoute>
    );
}
