"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { lectureService } from "@/lib/firebase/services/lectureService";
import { timeTrackingService } from "@/lib/firebase/services/timeTrackingService";
import { useSettings } from "@/contexts/SettingsContext";
import { Lecture } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { Presentation, Plus, Calendar, Clock, Pencil, Trash2, MapPin, Church, Users } from "lucide-react";

export default function LecturesPage() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [selected, setSelected] = useState<Lecture | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [trackHours, setTrackHours] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [lectureTypes, setLectureTypes] = useState<string[]>([]);

    const [form, setForm] = useState(() => getEmptyForm());

    function getEmptyForm() {
        return {
            topic: "",
            lectureType: "",
            location: "",
            church: "",
            participantCount: 0,
            notes: "",
            dateFrom: "",
            dateTo: "",
            durationInHours: 1,
            prepTimeInHours: 0,
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
            const lecturesData = await lectureService.getLecturesByAuthor(user.uid);
            setLectures(lecturesData);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (settings?.lectureTypes) setLectureTypes(settings.lectureTypes);
    }, [settings]);

    const openNew = () => {
        setSelected(null);
        setForm({
            topic: "",
            lectureType: "",
            location: "",
            church: "",
            participantCount: 0,
            notes: "",
            dateFrom: new Date().toISOString().slice(0, 10),
            dateTo: new Date().toISOString().slice(0, 10),
            durationInHours: 1,
            prepTimeInHours: 0,
            photoUrls: [],
        });
        setTrackHours(false);
        setTimeOfDay('morning');
        setIsModalOpen(true);
    };

    const openEdit = (item: Lecture) => {
        setSelected(item);
        setForm({
            topic: item.topic,
            lectureType: item.lectureType || "",
            location: item.location || "",
            church: item.church || "",
            participantCount: item.participantCount || 0,
            notes: item.notes || "",
            dateFrom: formatDate(new Date(item.dateFrom)),
            dateTo: formatDate(new Date(item.dateTo)),
            durationInHours: item.durationInHours,
            prepTimeInHours: item.prepTimeInHours,
            photoUrls: item.photoUrls || [],
        });
        setTrackHours(false);
        setTimeOfDay('morning');
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
                // Bearbeiten: Nur Vortrag aktualisieren, keine neuen Zeiteinträge
                await lectureService.updateLecture(selected.id, payload);
            } else {
                // Neu erstellen: Vortrag speichern + Zeiteinträge erstellen
                const added = await lectureService.addLecture(payload as Omit<Lecture, "id" | "createdAt">);
                savedId = added;

                // Zeiteinträge nur beim Erstellen hinzufügen
                if (trackHours && user?.uid && savedId) {
                    const totalH = (form.durationInHours || 0) + (form.prepTimeInHours || 0);
                    if (totalH > 0) {
                        const result = await timeTrackingService.addDistributedTimeEntries(
                            {
                                authorId: user.uid,
                                type: "Vortrag",
                                description: `Vortrag: ${form.topic}`,
                                referenceId: savedId
                            },
                            new Date(form.dateFrom),
                            new Date(form.dateTo),
                            totalH,
                            timeOfDay
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
            await lectureService.deleteLecture(isDeleteModalOpen);
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
                            <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl">
                                <Presentation className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            Vorträge
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Alle erfassten Vorträge und Seminare.</p>
                    </div>
                    <Button variant="primary" onClick={openNew} className="gap-2">
                        <Plus className="w-4 h-4" /> Neuer Vortrag
                    </Button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : lectures.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Noch keine Vorträge erfasst. Klicke auf &quot;Neuer Vortrag&quot; um zu beginnen.
                            </CardContent>
                        </Card>
                    ) : (
                        lectures.map(item => (
                            <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => openEdit(item)}>
                                <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.topic}</h3>
                                            {item.lectureType && (
                                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">{item.lectureType}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1.5 font-medium text-amber-600/80 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                {new Date(item.dateFrom).toLocaleDateString("de-DE") !== new Date(item.dateTo).toLocaleDateString("de-DE") &&
                                                    ` – ${new Date(item.dateTo).toLocaleDateString("de-DE")}`}
                                            </span>
                                            {item.location && (
                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.location}
                                                </span>
                                            )}
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
                                                <Clock className="w-3.5 h-3.5 text-gray-400" /> {item.durationInHours}h Vortrag
                                            </span>
                                            {item.prepTimeInHours > 0 && (
                                                <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full">+{item.prepTimeInHours}h Vorb.</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                            <Pencil className="w-4 h-4 text-gray-400 hover:text-amber-500" />
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

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? "Vortrag bearbeiten" : "Neuer Vortrag"}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Thema</label>
                            <input type="text" required value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                placeholder="z.B. Biblische Seelsorge Grundlagen" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Vortragsart</label>
                            <select
                                title="Vortragsart"
                                value={form.lectureType}
                                onChange={e => setForm({ ...form, lectureType: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                            >
                                <option value="">Bitte wählen...</option>
                                {lectureTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ort</label>
                                <input type="text" name="lectureLocation" autoComplete="off" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="z.B. Gemeindesaal" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gemeinde</label>
                                <input type="text" name="lectureChurch" autoComplete="off" value={form.church} onChange={e => setForm({ ...form, church: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="z.B. Mustergemeinde" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Anzahl Teilnehmer</label>
                                <input type="number" min="0" value={form.participantCount} onChange={e => setForm({ ...form, participantCount: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum Von</label>
                                <input type="date" required value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum Bis</label>
                                <input type="date" required value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vortragsstunden</label>
                                <input type="number" step="0.25" min="0" required value={form.durationInHours}
                                    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vorbereitungsstunden</label>
                                <input type="number" step="0.25" min="0" value={form.prepTimeInHours}
                                    onChange={e => setForm({ ...form, prepTimeInHours: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Notizen</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 h-20"
                                placeholder="Weitere Details zum Vortrag..." />
                        </div>

                        {/* Time Tracking Checkbox */}
                        <div className="flex flex-col gap-3 px-4 py-3 bg-indigo-50 rounded-xl border border-amber-100/50">
                            <label className="flex items-center gap-3 cursor-pointer hover:bg-amber-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={trackHours}
                                    onChange={(e) => setTrackHours(e.target.checked)}
                                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Stunden in Zeiterfassung übernehmen</span>
                                <span className="text-xs text-gray-400 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> inkl. Vorbereitung</span>
                            </label>

                            {trackHours && (
                                <div className="pl-7 flex items-center gap-4 mt-2">
                                    <span className="text-sm text-gray-600">Tagesabschnitt:</span>
                                    <select
                                        value={timeOfDay}
                                        title="Tagesabschnitt"
                                        onChange={(e) => setTimeOfDay(e.target.value as 'morning' | 'afternoon' | 'evening')}
                                        className="px-2 py-1 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        <option value="morning">Vormittags (ab 08:00)</option>
                                        <option value="afternoon">Nachmittags (ab 15:00)</option>
                                        <option value="evening">Abends (ab 18:00)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Foto-Upload */}
                        <div className="mt-4">
                            <PhotoUpload
                                existingPhotos={form.photoUrls || []}
                                onPhotosChange={(urls) => setForm({ ...form, photoUrls: urls })}
                                folder="lectures"
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
                    title="Vortrag löschen"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du diesen Vortrag löschen möchtest? Dies kann nicht rückgängig gemacht werden.
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
