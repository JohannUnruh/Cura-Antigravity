"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { retreatService } from "@/lib/firebase/services/retreatService";
import { timeTrackingService } from "@/lib/firebase/services/timeTrackingService";
import { useSettings } from "@/contexts/SettingsContext";
import { Retreat } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { Tent, Plus, Calendar, Clock, MapPin, Pencil, Trash2, Church, Users } from "lucide-react";

const getDaysRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const curr = new Date(start);
    curr.setHours(0, 0, 0, 0);
    const stop = new Date(end);
    stop.setHours(0, 0, 0, 0);
    
    let count = 0;
    while (curr <= stop && count < 100) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
        count++;
    }
    return dates;
};

export default function RetreatsPage() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [retreats, setRetreats] = useState<Retreat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [selected, setSelected] = useState<Retreat | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [trackHours, setTrackHours] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [retreatTypes, setRetreatTypes] = useState<string[]>([]);
    const [distributionType, setDistributionType] = useState<'equal' | 'custom'>('equal');
    const [customHoursMap, setCustomHoursMap] = useState<Record<string, number>>({});

    const [form, setForm] = useState(() => getEmptyForm());

    const dates = useMemo(() => {
        if (!form.dateFrom || !form.dateTo) return [];
        return getDaysRange(new Date(form.dateFrom), new Date(form.dateTo));
    }, [form.dateFrom, form.dateTo]);

    const isMultiDay = dates.length > 1;
    const totalHours = (form.durationInHours || 0) + (form.prepTimeInHours || 0);

    useEffect(() => {
        if (distributionType === 'equal') {
            const count = dates.length;
            if (count > 0) {
                const hoursPerDay = Math.round((totalHours / count) * 100) / 100;
                const newMap: Record<string, number> = {};
                dates.forEach((d) => {
                    const key = d.toISOString().split('T')[0];
                    newMap[key] = hoursPerDay;
                });
                setCustomHoursMap(newMap);
            }
        }
    }, [dates, totalHours, distributionType]);

    const handleCustomHourChange = (dateKey: string, val: number) => {
        const newMap = { ...customHoursMap, [dateKey]: val };
        setCustomHoursMap(newMap);
        
        const sum = Object.values(newMap).reduce((acc, curr) => acc + curr, 0);
        const prep = form.prepTimeInHours || 0;
        const newUnits = Math.max(0, sum - prep);
        setForm(prev => ({ ...prev, durationInHours: newUnits }));
    };

    function getEmptyForm() {
        return {
            title: "",
            retreatType: "",
            location: "",
            church: "",
            participantCount: 0,
            notes: "",
            dateFrom: "",
            dateTo: "",
            durationInHours: 1,
            prepTimeInHours: 0,
            authorId: "",
            photoUrls: [] as string[],
        };
    }

    const formatDate = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const retreatsData = await retreatService.getRetreatsByAuthor(user.uid);
            setRetreats(retreatsData);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (settings?.retreatTypes) setRetreatTypes(settings.retreatTypes);
    }, [settings]);

    const openNew = () => {
        setSelected(null);
        setForm(getEmptyForm());
        setTrackHours(false);
        setTimeOfDay('morning');
        setDistributionType('equal');
        setCustomHoursMap({});
        setIsModalOpen(true);
    };

    const openEdit = (item: Retreat) => {
        setSelected(item);
        setForm({
            title: item.title,
            retreatType: item.retreatType || "",
            location: item.location || "",
            church: item.church || "",
            participantCount: item.participantCount || 0,
            notes: item.notes || "",
            dateFrom: formatDate(new Date(item.dateFrom)),
            dateTo: formatDate(new Date(item.dateTo)),
            durationInHours: item.durationInHours,
            prepTimeInHours: item.prepTimeInHours,
            authorId: item.authorId || "",
            photoUrls: item.photoUrls || [],
        });
        setTrackHours(false);
        setTimeOfDay('morning');
        setDistributionType('equal');
        setCustomHoursMap({});
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...form,
                authorId: user?.uid || "",
                dateFrom: new Date(form.dateFrom),
                dateTo: new Date(form.dateTo),
            };

            let savedId = selected?.id;

            if (selected) {
                // Bearbeiten: Nur Freizeit aktualisieren, keine neuen Zeiteinträge
                await retreatService.updateRetreat(selected.id, payload);
            } else {
                // Neu erstellen: Freizeit speichern + Zeiteinträge erstellen
                const added = await retreatService.addRetreat(payload as Omit<Retreat, "id" | "createdAt">);
                savedId = added;

                // Zeiteinträge nur beim Erstellen hinzufügen
                if (trackHours && user?.uid && savedId) {
                    const totalH = (form.durationInHours || 0) + (form.prepTimeInHours || 0);
                    if (totalH > 0) {
                        const customHoursList = distributionType === 'custom'
                            ? dates.map(d => {
                                const key = d.toISOString().split('T')[0];
                                return { date: d, hours: customHoursMap[key] || 0 };
                              })
                            : undefined;

                        const result = await timeTrackingService.addDistributedTimeEntries(
                            {
                                authorId: user.uid,
                                type: "Freizeit",
                                description: `Freizeit: ${form.title}`,
                                referenceId: savedId
                            },
                            new Date(form.dateFrom),
                            new Date(form.dateTo),
                            totalH,
                            timeOfDay,
                            customHoursList
                        );

                        // User über Overflow informieren
                        if (result.hasOverflow) {
                            console.log(`${result.poolEntries.length} Einträge wurden im Überstundenpool gespeichert`);
                        }
                    }
                }
            }

            await loadData();
            setIsModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isDeleteModalOpen) return;
        setIsSaving(true);
        try {
            await retreatService.deleteRetreat(isDeleteModalOpen);
            setIsDeleteModalOpen(null);
            await loadData();
        } catch (error) {
            console.error(error);
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
                            <div className="bg-teal-100 dark:bg-teal-900/40 p-2.5 rounded-xl">
                                <Tent className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                            </div>
                            Freizeiten
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Alle erfassten Freizeiten und Events.</p>
                    </div>
                    <Button variant="primary" onClick={openNew} className="gap-2">
                        <Plus className="w-4 h-4" /> Neue Freizeit
                    </Button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                        </div>
                    ) : retreats.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Noch keine Freizeiten erfasst. Klicke auf &quot;Neue Freizeit&quot; um zu beginnen.
                            </CardContent>
                        </Card>
                    ) : (
                        retreats.map(item => (
                            <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => openEdit(item)}>
                                <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{item.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1.5 font-medium text-teal-600/80 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                {new Date(item.dateFrom).toLocaleDateString("de-DE") !== new Date(item.dateTo).toLocaleDateString("de-DE") &&
                                                    ` – ${new Date(item.dateTo).toLocaleDateString("de-DE")}`}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.location}
                                            </span>
                                            {item.church && (
                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                    <Church className="w-3.5 h-3.5 text-gray-400" /> {item.church}
                                                </span>
                                            )}
                                            {item.participantCount && item.participantCount > 0 ? (
                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" /> {item.participantCount} TN
                                                </span>
                                            ) : null}
                                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" /> {item.durationInHours}h
                                            </span>
                                            {item.prepTimeInHours > 0 && (
                                                <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full">+{item.prepTimeInHours}h Vorb.</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                            <Pencil className="w-4 h-4 text-gray-400 hover:text-teal-500" />
                                        </div>
                                        <div className="p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(item.id); }}>
                                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? "Freizeit bearbeiten" : "Neue Freizeit"}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titel der Freizeit</label>
                            <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                                placeholder="z.B. Männerfreizeit Schwarzwald" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Art der Freizeit</label>
                                <select
                                    title="Art der Freizeit"
                                    value={form.retreatType}
                                    onChange={e => setForm({ ...form, retreatType: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                                >
                                    <option value="">Bitte wählen...</option>
                                    {retreatTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ort</label>
                                <input type="text" name="retreatLocation" autoComplete="off" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                                    placeholder="z.B. Freizeitheim Alpenblick" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gemeinde</label>
                                <input type="text" name="retreatChurch" autoComplete="off" value={form.church} onChange={e => setForm({ ...form, church: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                                    placeholder="z.B. EFG Musterstadt" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Anzahl Teilnehmer</label>
                                <input type="number" min="0" value={form.participantCount} onChange={e => setForm({ ...form, participantCount: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Notizen</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 h-20"
                                placeholder="Weitere Details zur Freizeit..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum Von</label>
                                <input type="date" required value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum Bis</label>
                                <input type="date" required value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Durchführung (Std.)</label>
                                <input type="number" step="0.25" min="0" required value={form.durationInHours}
                                    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) || 0 })}
                                    readOnly={distributionType === 'custom' && trackHours && isMultiDay && !selected}
                                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 ${
                                        distributionType === 'custom' && trackHours && isMultiDay && !selected
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-50'
                                    }`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vorbereitungszeit (Std.)</label>
                                <input type="number" step="0.25" min="0" value={form.prepTimeInHours}
                                    onChange={e => setForm({ ...form, prepTimeInHours: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20" />
                            </div>
                        </div>

                        {/* Time Tracking Checkbox */}
                        {!selected && (
                            <div className="flex flex-col gap-3 px-4 py-3 bg-teal-50/30 rounded-xl border border-teal-200/50">
                                <label className="flex items-center gap-3 cursor-pointer hover:bg-teal-50/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={trackHours}
                                        onChange={(e) => setTrackHours(e.target.checked)}
                                        className="w-4 h-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Stunden in Zeiterfassung übernehmen</span>
                                    <span className="text-xs text-gray-400 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> inkl. Vorbereitung</span>
                                </label>

                                {trackHours && (
                                    <>
                                        <div className="pl-7 flex items-center gap-4 mt-2">
                                            <span className="text-sm text-gray-600">Tagesabschnitt:</span>
                                            <select
                                                value={timeOfDay}
                                                title="Tagesabschnitt"
                                                onChange={(e) => setTimeOfDay(e.target.value as 'morning' | 'afternoon' | 'evening')}
                                                className="px-2 py-1 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-teal-500/20"
                                            >
                                                <option value="morning">Vormittags (ab 08:00)</option>
                                                <option value="afternoon">Nachmittags (ab 15:00)</option>
                                                <option value="evening">Abends (ab 18:00)</option>
                                            </select>
                                        </div>

                                        {isMultiDay && (
                                            <div className="pl-7 pt-2 border-t border-teal-200/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Stundenverteilung</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDistributionType('equal')}
                                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                                distributionType === 'equal'
                                                                    ? 'bg-teal-600 text-white'
                                                                    : 'bg-white text-gray-600 border border-gray-200'
                                                            }`}
                                                        >
                                                            Gleichmäßig
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDistributionType('custom')}
                                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                                distributionType === 'custom'
                                                                    ? 'bg-teal-600 text-white'
                                                                    : 'bg-white text-gray-600 border border-gray-200'
                                                            }`}
                                                        >
                                                            Individuell
                                                        </button>
                                                    </div>
                                                </div>

                                                {distributionType === 'custom' ? (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                        {dates.map((date) => {
                                                            const key = date.toISOString().split('T')[0];
                                                            const formattedDate = date.toLocaleDateString('de-DE', {
                                                                weekday: 'short',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                            });
                                                            return (
                                                                <div key={key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                                                    <span className="text-sm text-gray-600 font-medium">{formattedDate}</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="number"
                                                                            step="0.25"
                                                                            min="0"
                                                                            value={customHoursMap[key] || 0}
                                                                            onChange={(e) => handleCustomHourChange(key, parseFloat(e.target.value) || 0)}
                                                                            className="w-20 px-2 py-1 text-right border border-gray-200 rounded focus:ring-2 focus:ring-teal-500/20"
                                                                        />
                                                                        <span className="text-xs text-gray-500">Std.</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="text-right text-xs text-gray-500 pt-1">
                                                            Gesamtsumme: <span className="font-semibold text-gray-700">{totalHours} Std.</span> (inkl. Vorbereitung)
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500">
                                                        Die gesamten {totalHours} Std. (inkl. Vorbereitung) werden gleichmäßig auf {dates.length} Tage verteilt ({Math.round((totalHours / dates.length) * 100) / 100} Std./Tag).
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Foto-Upload */}
                        <div className="mt-4">
                            <PhotoUpload
                                existingPhotos={form.photoUrls || []}
                                onPhotosChange={(urls) => setForm({ ...form, photoUrls: urls })}
                                folder="retreats"
                                itemId={selected?.id}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={!!isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(null)}
                    title="Freizeit löschen"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du diese Freizeit löschen möchtest? Dies kann nicht rückgängig gemacht werden.
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
