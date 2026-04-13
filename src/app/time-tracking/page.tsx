"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { timeTrackingService, getMaxHoursForMonth, getHoursByMonth, getRemainingHours, addTimeEntryWithCheck, isMinijobber } from "@/lib/firebase/services/timeTrackingService";
import { settingsService } from "@/lib/firebase/services/settingsService";
import { TimeEntry, TimeEntryType, OvertimeTransfer } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Clock, Plus, Calendar, FileText, Briefcase, Car, Tent, Presentation, MessagesSquare, Pencil, Trash2, Download, Sun, AlertCircle, CheckCircle2, ArrowRight, Timer, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const sanitizeDescription = (desc?: string, referenceId?: string) => {
    if (!desc) return "-";
    // Hide names backwards compatibly for old auto-imported entries
    const match = desc.match(/^(Beratung|SKB-Beratung|Beratung \(bearbeitet\)):\s*(.*)$/);
    if (match) {
        // For older entries lacking a referenceId, just use a random slice of the name or simply "Beratung"
        const fallbackId = referenceId ? referenceId.slice(-6).toUpperCase() : match[2].slice(0, 4).toUpperCase();
        return `${match[1]} (ID: ${fallbackId})`;
    }
    return desc;
};

const getTimeRangeStr = (timeOfDay?: string, durationInHours?: number) => {
    if (!timeOfDay || timeOfDay === "Ganztägig" || !durationInHours) return timeOfDay || "Ganztägig";

    let startHour = 8;
    if (timeOfDay === "Nachmittags" || timeOfDay === "afternoon") startHour = 15;
    else if (timeOfDay === "Abends" || timeOfDay === "evening") startHour = 18;
    else if (timeOfDay === "Vormittags" || timeOfDay === "morning") startHour = 8;

    const formatTime = (h: number) => {
        const hh = Math.floor(h).toString().padStart(2, '0');
        const m = Math.round((h % 1) * 60).toString().padStart(2, '0');
        return `${hh}:${m}`;
    };

    const label = (timeOfDay === "morning" || timeOfDay === "Vormittags") ? "Vormittags"
        : (timeOfDay === "afternoon" || timeOfDay === "Nachmittags") ? "Nachmittags"
            : "Abends";

    return `${label} (${formatTime(startHour)} - ${formatTime(startHour + durationInHours)} Uhr)`;
};

export default function TimeTrackingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, userProfile } = useAuth();
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState<TimeEntry | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);

    // Info Message State
    const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'info' | 'warning', text: string } | null>(null);

    // Overtime Pool Modal States
    const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
    const [poolEntries, setPoolEntries] = useState<TimeEntry[]>([]);
    const [poolTransfers, setPoolTransfers] = useState<OvertimeTransfer[]>([]);
    const [selectedPoolEntryIds, setSelectedPoolEntryIds] = useState<string[]>([]);
    const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
    const [isEditPoolEntryModalOpen, setIsEditPoolEntryModalOpen] = useState(false);
    const [entryToEditPool, setEntryToEditPool] = useState<TimeEntry | null>(null);
    const [entryToDeletePool, setEntryToDeletePool] = useState<TimeEntry | null>(null);
    const [targetMonth, setTargetMonth] = useState(new Date().getMonth());
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());
    const [targetDate, setTargetDate] = useState<number | null>(null); // null = ganzer Tag, 1-31 = spezifischer Tag
    const [targetTimeOfDay, setTargetTimeOfDay] = useState<'Ganztägig' | 'Vormittags' | 'Nachmittags' | 'Abends'>('Ganztägig');
    const [targetMonthUsedHours, setTargetMonthUsedHours] = useState(0);
    const [targetMonthMaxHours, setTargetMonthMaxHours] = useState(0);
    const [isPoolSaving, setIsPoolSaving] = useState(false);

    const [editPoolForm, setEditPoolForm] = useState<{
        date: string;
        description: string;
        durationInHours: number;
        timeOfDay: string;
        type: string;
    }>({
        date: "",
        description: "",
        durationInHours: 1,
        timeOfDay: "Ganztägig",
        type: "Büro"
    });

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Overtime State
    const [maxHours, setMaxHours] = useState<number>(0);
    const [usedHours, setUsedHours] = useState<number>(0);
    const [remainingHours, setRemainingHours] = useState<number>(0);
    const [overtimePoolHours, setOvertimePoolHours] = useState<number>(0);
    const [isMinijobberUser, setIsMinijobberUser] = useState<boolean>(false);
    const [hoursPerVacationDay, setHoursPerVacationDay] = useState<number>(8);
    const [vacationDaysPerYear, setVacationDaysPerYear] = useState<number>(0);
    const [takenVacationDays, setTakenVacationDays] = useState<number>(0);
    const [remainingVacationDays, setRemainingVacationDays] = useState<number>(0);

    const [form, setForm] = useState(() => getEmptyForm());

    function getEmptyForm() {
        return {
            date: new Date().toISOString().slice(0, 10),
            description: "",
            durationInHours: 1,
            timeOfDay: "Ganztägig" as "Vormittags" | "Nachmittags" | "Abends" | "Ganztägig",
            type: "Büro" as TimeEntryType,
            authorId: "",
        };
    }

    const formatDate = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const showInfoMessage = (type: 'success' | 'info' | 'warning', text: string) => {
        setInfoMessage({ type, text });
        setTimeout(() => setInfoMessage(null), 5000);
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Prüfen, ob User ein Minijobber ist
            const isMinijob = await isMinijobber(user.uid);
            setIsMinijobberUser(isMinijob);

            // Lade Einstellungen für Stunden pro Urlaubstag
            const settings = await settingsService.getSettings();
            setHoursPerVacationDay(settings.hoursPerVacationDay ?? 8);

            // Lade Urlaubsanspruch aus User-Profil
            if (userProfile?.vacationDaysPerYear) {
                setVacationDaysPerYear(userProfile.vacationDaysPerYear);
            }

            // Lade alle Entries (für Anzeige)
            const allEntries = await timeTrackingService.getTimeEntriesByAuthor(user.uid);
            // Filtere nur active Entries für die aktuelle Ansicht (oder Einträge ohne status)
            setEntries(allEntries.filter(e => e.status === undefined || e.status === null || e.status === 'active'));

            // Berechne genommene Urlaubstage für das aktuelle Jahr
            const currentYear = new Date().getFullYear();
            const vacationEntries = allEntries.filter(e => {
                const entryDate = new Date(e.date);
                return e.type === 'Urlaub' && entryDate.getFullYear() === currentYear;
            });
            const totalVacationHours = vacationEntries.reduce((sum, e) => sum + e.durationInHours, 0);
            const vacationDaysTaken = hoursPerVacationDay > 0 ? Math.floor(totalVacationHours / hoursPerVacationDay) : 0;
            setTakenVacationDays(vacationDaysTaken);
            
            // Resturlaub berechnen
            const remainingDays = userProfile?.vacationDaysPerYear ? userProfile.vacationDaysPerYear - vacationDaysTaken : 0;
            setRemainingVacationDays(Math.max(0, remainingDays));

            // Lade Overtime Pool Stunden
            const poolEntries = await timeTrackingService.getOvertimePoolEntries(user.uid);
            const poolTotal = poolEntries.reduce((sum, e) => sum + e.durationInHours, 0);
            setOvertimePoolHours(poolTotal);

            // Berechne Kontingent (nur für Minijobber)
            if (isMinijob) {
                const max = await getMaxHoursForMonth();
                setMaxHours(max);

                const used = await getHoursByMonth(user.uid, selectedYear, selectedMonth);
                setUsedHours(used);

                const remaining = await getRemainingHours(user.uid, selectedYear, selectedMonth);
                setRemainingHours(remaining);
            } else {
                // Für Nicht-Minijobber: Keine Kontingent-Berechnung
                setMaxHours(0);
                setUsedHours(0);
                setRemainingHours(0);
            }
        } finally {
            setLoading(false);
        }
    }, [user, selectedMonth, selectedYear, userProfile, hoursPerVacationDay]);

    const loadPoolData = useCallback(async () => {
        if (!user) return;
        try {
            const entries = await timeTrackingService.getOvertimePoolEntries(user.uid);
            setPoolEntries(entries);

            const transferHistory = await timeTrackingService.getOvertimeTransfers(user.uid);
            setPoolTransfers(transferHistory);
        } catch (error) {
            console.error("Error loading pool data:", error);
            showInfoMessage('warning', 'Fehler beim Laden des Überstundenpools.');
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // Check URL parameter for pool view
    useEffect(() => {
        const viewParam = searchParams?.get('view');
        if (viewParam === 'pool') {
            openPoolModal();
            // Clean URL without reloading
            router.replace('/time-tracking', { scroll: false });
        }
    }, [searchParams]);

    // Load target month hours when distribute modal opens
    useEffect(() => {
        if (isDistributeModalOpen && user) {
            const loadTargetMonthHours = async () => {
                const maxHours = await getMaxHoursForMonth();
                setTargetMonthMaxHours(maxHours);

                const entries = await timeTrackingService.getTimeEntriesByMonth(user.uid, targetYear, targetMonth);
                const used = entries.reduce((sum, e) => sum + e.durationInHours, 0);
                setTargetMonthUsedHours(used);
            };
            loadTargetMonthHours();
        }
    }, [isDistributeModalOpen, targetMonth, targetYear, user]);

    const openNew = () => {
        setSelected(null);
        setForm(getEmptyForm());
        setIsModalOpen(true);
    };

    // Pool Modal Handlers
    const openPoolModal = async () => {
        await loadPoolData();
        setIsPoolModalOpen(true);
    };

    const handleSelectPoolEntry = (entryId: string) => {
        setSelectedPoolEntryIds(prev =>
            prev.includes(entryId)
                ? prev.filter(id => id !== entryId)
                : [...prev, entryId]
        );
    };

    const handleSelectAllPoolEntries = () => {
        if (selectedPoolEntryIds.length === poolEntries.length) {
            setSelectedPoolEntryIds([]);
        } else {
            setSelectedPoolEntryIds(poolEntries.map(e => e.id));
        }
    };

    const openDistributeModal = () => {
        if (selectedPoolEntryIds.length === 0) return;
        setIsDistributeModalOpen(true);
    };

    const handleDistribute = async () => {
        if (selectedPoolEntryIds.length === 0 || !user) return;

        setIsPoolSaving(true);
        try {
            const selectedHours = poolEntries
                .filter(e => selectedPoolEntryIds.includes(e.id))
                .reduce((sum, e) => sum + e.durationInHours, 0);

            // Zuerst Status auf 'active' setzen mit distributeFromPool
            await timeTrackingService.distributeFromPool(selectedPoolEntryIds, { year: targetYear, month: targetMonth }, user.uid);

            // Wenn ein spezifisches Datum ausgewählt ist, jetzt das Datum aktualisieren
            if (targetDate !== null) {
                for (const entryId of selectedPoolEntryIds) {
                    const newDate = new Date(targetYear, targetMonth, targetDate);
                    await timeTrackingService.updateTimeEntry(entryId, {
                        date: newDate,
                        timeOfDay: targetTimeOfDay
                    });
                }
            }

            await timeTrackingService.logOvertimeTransfer({
                authorId: user.uid,
                hours: selectedHours,
                sourceMonth: poolEntries.find(e => selectedPoolEntryIds.includes(e.id))?.originalMonth || "unknown",
                targetMonth: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
                entryIds: selectedPoolEntryIds,
                transferredBy: user.uid,
                transferredAt: new Date()
            });

            await loadPoolData();
            await loadData();
            setSelectedPoolEntryIds([]);
            setIsDistributeModalOpen(false);
            showInfoMessage('success', `Überstunden wurden erfolgreich auf ${months[targetMonth]} ${targetYear}${targetDate ? ` (Tag ${targetDate}, ${targetTimeOfDay})` : ''} verteilt.`);
        } catch (error) {
            console.error("Error distributing overtime:", error);
            showInfoMessage('warning', `Fehler beim Verteilen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        } finally {
            setIsPoolSaving(false);
        }
    };

    const selectedPoolHours = poolEntries
        .filter(e => selectedPoolEntryIds.includes(e.id))
        .reduce((sum, e) => sum + e.durationInHours, 0);

    const remainingTargetHours = targetMonthMaxHours - targetMonthUsedHours;
    const canDistribute = selectedPoolHours <= remainingTargetHours;

    const openEditPoolEntry = (entry: TimeEntry) => {
        setEntryToEditPool(entry);
        setEditPoolForm({
            date: new Date(entry.date).toISOString().slice(0, 10),
            description: entry.description,
            durationInHours: entry.durationInHours,
            timeOfDay: entry.timeOfDay || "Ganztägig",
            type: entry.type
        });
        setIsEditPoolEntryModalOpen(true);
    };

    const handleEditPoolEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryToEditPool) return;

        setIsPoolSaving(true);
        try {
            await timeTrackingService.updatePoolEntry(entryToEditPool.id, {
                date: new Date(editPoolForm.date),
                description: editPoolForm.description,
                durationInHours: editPoolForm.durationInHours,
                timeOfDay: editPoolForm.timeOfDay as any,
                type: editPoolForm.type as any
            });
            await loadPoolData();
            setIsEditPoolEntryModalOpen(false);
            setEntryToEditPool(null);
        } catch (error) {
            console.error("Error updating entry:", error);
            alert("Fehler beim Aktualisieren.");
        } finally {
            setIsPoolSaving(false);
        }
    };

    const openDeletePoolEntry = (entry: TimeEntry) => {
        setEntryToDeletePool(entry);
        setIsPoolModalOpen(false);
    };

    const handleDeletePoolEntry = async () => {
        if (!entryToDeletePool) return;

        setIsPoolSaving(true);
        try {
            await timeTrackingService.deletePoolEntry(entryToDeletePool.id);
            await loadPoolData();
            await loadData();
            setEntryToDeletePool(null);
        } catch (error) {
            console.error("Error deleting entry:", error);
            alert("Fehler beim Löschen.");
        } finally {
            setIsPoolSaving(false);
        }
    };

    const handleDeletePoolEntryFromModal = (entry: TimeEntry) => {
        setEntryToDeletePool(entry);
    };

    const openEdit = (item: TimeEntry) => {
        setSelected(item);
        setForm({
            date: formatDate(new Date(item.date)),
            description: sanitizeDescription(item.description, item.referenceId) || "",
            durationInHours: item.durationInHours,
            timeOfDay: item.timeOfDay || "Ganztägig",
            type: item.type,
            authorId: item.authorId,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item: TimeEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        setEntryToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!entryToDelete) return;
        setIsSaving(true);
        try {
            await timeTrackingService.deleteTimeEntry(entryToDelete.id);
            await loadData();
            setIsDeleteModalOpen(false);
            setEntryToDelete(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...form,
                date: new Date(form.date),
                authorId: user?.uid || "",
            };

            if (selected) {
                // Bei Bearbeiten einfach update (keine Kontingent-Prüfung)
                await timeTrackingService.updateTimeEntry(selected.id, payload);
            } else {
                // Bei neuem Eintrag: Kontingent-Prüfung mit addTimeEntryWithCheck
                const date = new Date(form.date);
                const year = date.getFullYear();
                const month = date.getMonth();

                const result = await addTimeEntryWithCheck(payload, year, month);

                // User über Ergebnis informieren
                if (result.status === 'split') {
                    showInfoMessage('warning', `Monatskontingent wurde überschritten. ${result.activeEntry?.durationInHours}h wurden im aktuellen Monat gespeichert, ${result.poolEntry?.durationInHours}h im Überstundenpool.`);
                } else if (result.status === 'pool-only') {
                    showInfoMessage('info', `Monatskontingent ist ausgeschöpft. Die gesamten ${result.poolEntry?.durationInHours}h wurden im Überstundenpool gespeichert.`);
                } else if (result.status === 'non-minijob') {
                    // Für Nicht-Minijobber: Keine spezielle Meldung, einfach speichern
                    showInfoMessage('success', 'Zeiteintrag erfolgreich gespeichert.');
                }
            }
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving time entry:", error);
            showInfoMessage('warning', 'Fehler beim Speichern. Bitte versuchen Sie es erneut.');
        } finally {
            setIsSaving(false);
        }
    };

    const getTypeIcon = (type: TimeEntryType) => {
        switch (type) {
            case "Beratung": return <MessagesSquare className="w-4 h-4 text-indigo-500" />;
            case "Büro": return <Briefcase className="w-4 h-4 text-blue-500" />;
            case "Fahrt": return <Car className="w-4 h-4 text-green-500" />;
            case "Freizeit": return <Tent className="w-4 h-4 text-orange-500" />;
            case "Urlaub": return <Sun className="w-4 h-4 text-yellow-500" />;
            case "Vortrag": return <Presentation className="w-4 h-4 text-purple-500" />;
            default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const filteredEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const totalHours = filteredEntries.reduce((acc, curr) => acc + curr.durationInHours, 0);
    const totalHoursRounded = Math.round(totalHours * 10) / 10;

    const exportPDF = async () => {
        const doc = new jsPDF();
        const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });

        try {
            const getBase64Image = async (url: string) => {
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            };
            const logoBase64 = await getBase64Image("/icon.png");
            // logo at (14, 12), size 16x16
            doc.addImage(logoBase64, 'PNG', 14, 12, 16, 16);
            doc.setFontSize(18);
            doc.text(`Zeiterfassung - ${monthName}`, 34, 24);
        } catch (error) {
            console.error("Could not load logo for PDF", error);
            // Fallback if logo fails
            doc.setFontSize(18);
            doc.text(`Zeiterfassung - ${monthName}`, 14, 22);
        }

        doc.setFontSize(11);
        doc.text(`Benutzer: ${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim() || user?.email || "Unbekannt", 14, 35);

        const tableColumn = ["Datum", "Tageszeit", "Kategorie", "Dauer", "Beschreibung/Notiz"];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableRows: any[] = [];

        // Nur 'active' Entries im PDF (overtime-pool Entries nicht anzeigen)
        const sortedEntries = [...filteredEntries]
            .filter(e => e.status !== 'overtime-pool')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedEntries.forEach(entry => {
            const entryData = [
                new Date(entry.date).toLocaleDateString("de-DE"),
                getTimeRangeStr(entry.timeOfDay, entry.durationInHours),
                entry.type,
                entry.durationInHours + "h",
                sanitizeDescription(entry.description, entry.referenceId)
            ];
            tableRows.push(entryData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [225, 29, 72] }, // matches rose-600 approx
            styles: { fontSize: 10 }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable?.finalY || 45;
        doc.setFontSize(14);
        doc.text(`Gesamtstunden: ${totalHoursRounded.toFixed(1)}h`, 14, finalY + 15);

        doc.save(`Zeiterfassung_${monthName.replace(' ', '_')}.pdf`);
    };

    const months = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-rose-100 dark:bg-rose-900/40 p-2.5 rounded-xl">
                                <Clock className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                            </div>
                            Zeiterfassung
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Erfasse deine Arbeitsstunden für die Abrechnung.</p>
                    </div>
                    <Button variant="primary" onClick={openNew} className="gap-2">
                        <Plus className="w-4 h-4" /> Neue Zeit erfassen
                    </Button>
                </div>

                {/* Mini-Dashboard für Minijobber */}
                {isMinijobberUser && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-blue-100 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Monat</h3>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{months[selectedMonth].slice(0, 3)} {selectedYear}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Soll-Stunden</h3>
                                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{maxHours}h</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Monatliches Kontingent</p>
                                </CardContent>
                            </Card>

                            <Card className={`border-amber-100 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm ${remainingHours < 5 ? 'ring-2 ring-red-500/20' : ''}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                                <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Ist-Stunden</h3>
                                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{usedHours}h</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Erfasste Stunden</p>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${remainingHours < 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                            {remainingHours}h offen
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Urlaubs-Dashboard */}
                        {vacationDaysPerYear > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-purple-100 dark:border-purple-500/20 bg-gradient-to-br from-purple-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                                    <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Urlaubsanspruch</h3>
                                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{vacationDaysPerYear} Tage</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Jährlicher Anspruch</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-orange-100 dark:border-orange-500/20 bg-gradient-to-br from-orange-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Genommen</h3>
                                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{takenVacationDays} Tage</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Bereits genommen</p>
                                    </CardContent>
                                </Card>

                                <Card className={`border-teal-100 dark:border-teal-500/20 bg-gradient-to-br from-teal-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm ${remainingVacationDays < 5 ? 'ring-2 ring-red-500/20' : ''}`}>
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                                    <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Resturlaub</h3>
                                                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{remainingVacationDays} Tage</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500 dark:text-slate-400">Noch verfügbar</p>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${remainingVacationDays < 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                {remainingVacationDays} Tage
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-white/50 shadow-sm bg-white/40 md:col-span-2">
                        <CardContent className="p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">Gesamte Stunden ({months[selectedMonth]} {selectedYear})</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalHoursRounded} <span className="text-lg text-gray-500 dark:text-slate-500 font-normal">h</span></p>
                                {/* Fortschrittsbalken - Nur für Minijobber */}
                                {isMinijobberUser && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-600 dark:text-slate-400">Verwendet: {usedHours}h von {maxHours}h</span>
                                            <span className={`font-medium ${remainingHours < 5 ? 'text-red-600' : 'text-gray-600'}`}>
                                                Verbleibend: {remainingHours}h
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${usedHours / maxHours > 0.9 ? 'bg-red-500' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.min((usedHours / maxHours) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {!isMinijobberUser && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
                                        Keine Kontingent-Begrenzung (Tätigkeit: {userProfile?.contractType || 'Nicht definiert'})
                                    </p>
                                )}
                            </div>
                            <Button variant="secondary" onClick={exportPDF} disabled={filteredEntries.length === 0} className="gap-2 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200">
                                <Download className="w-4 h-4" /> PDF Export
                            </Button>
                        </CardContent>
                    </Card>

                    {isMinijobberUser && (
                        <Card className="border-white/50 shadow-sm bg-gradient-to-br from-amber-50 to-white dark:from-slate-900/80 dark:to-slate-900/40">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">Überstundenpool</h3>
                                </div>
                                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{overtimePoolHours.toFixed(1)} <span className="text-lg text-gray-500 dark:text-slate-500 font-normal">h</span></p>
                                <Button
                                    variant="primary"
                                    onClick={openPoolModal}
                                    className="gap-2 mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <Clock className="w-4 h-4" /> Pool verwalten
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-white/50 shadow-sm bg-white/40">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">Monat filtern</h3>
                            <div className="flex gap-4">
                                <select
                                    title="Monat auswählen"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="flex-1 px-3 py-2 bg-white/60 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-rose-500/20 text-gray-900 dark:text-white"
                                >
                                    {months.map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    title="Jahr auswählen"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="px-3 py-2 bg-white/60 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-rose-500/20 text-gray-900 dark:text-white"
                                >
                                    {[...Array(5)].map((_, i) => {
                                        const y = new Date().getFullYear() - 2 + i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Keine Zeiten für {months[selectedMonth]} {selectedYear} erfasst.
                            </CardContent>
                        </Card>
                    ) : (
                        filteredEntries.map(item => (
                            <Card key={item.id} className="border-white/50 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => openEdit(item)}>
                                <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            {getTypeIcon(item.type)}
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                                {item.type}
                                                {item.referenceId && <span className="ml-2 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">Auto-Import</span>}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1.5 font-medium text-rose-600/80 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(item.date).toLocaleDateString("de-DE")}
                                            </span>
                                            {item.timeOfDay && (
                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                    {getTimeRangeStr(item.timeOfDay, item.durationInHours)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                <Clock className="w-3.5 h-3.5" /> {item.durationInHours}h
                                            </span>
                                            {item.description && <span className="text-gray-400 dark:text-slate-500 max-w-sm truncate whitespace-nowrap" title={sanitizeDescription(item.description, item.referenceId)}>| {sanitizeDescription(item.description, item.referenceId)}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-rose-500" />
                                        </div>
                                        <div className="p-2 hover:bg-red-50 rounded-full transition-colors" onClick={(e) => handleDelete(item, e)}>
                                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? "Zeit bearbeiten" : "Neue Zeit erfassen"}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tageszeit</label>
                                <select required title="Tageszeit auswählen" value={form.timeOfDay} onChange={e => setForm({ ...form, timeOfDay: e.target.value as "Vormittags" | "Nachmittags" | "Abends" | "Ganztägig" })}
                                    disabled={form.type === "Urlaub"}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                                    <option value="Ganztägig">Ganztägig</option>
                                    <option value="Vormittags">Vormittags</option>
                                    <option value="Nachmittags">Nachmittags</option>
                                    <option value="Abends">Abends</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Std.)</label>
                                <input type="number" step="0.25" min="0" required value={form.durationInHours}
                                    onChange={e => setForm({ ...form, durationInHours: parseFloat(e.target.value) })}
                                    disabled={form.type === "Urlaub"}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                                <select required value={form.type} onChange={e => {
                                    const val = e.target.value as TimeEntryType;
                                    setForm(prev => {
                                        if (val === "Urlaub") {
                                            return { ...prev, type: val, timeOfDay: "Ganztägig", durationInHours: hoursPerVacationDay };
                                        }
                                        return { ...prev, type: val };
                                    });
                                }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20">
                                    <option value="Büro">Büro / Administration</option>
                                    <option value="Beratung">Beratung</option>
                                    <option value="Vortrag">Vortrag</option>
                                    <option value="Freizeit">Freizeit / Event</option>
                                    <option value="Urlaub">Urlaub</option>
                                    <option value="Fahrt">Fahrtzeit</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung / Notiz</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 min-h-[100px]"
                                placeholder="Details zur erbrachten Leistung..." />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eintrag löschen">
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Möchtest du die erfasste Zeit <strong>{entryToDelete?.type} ({entryToDelete?.durationInHours}h)</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={confirmDelete}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Info Message Toast */}
                {infoMessage && (
                    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className={`px-6 py-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-md ${
                            infoMessage.type === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                                : infoMessage.type === 'warning'
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                        }`}>
                            {infoMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            {infoMessage.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            {infoMessage.type === 'info' && <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                            <p className="text-sm font-medium">{infoMessage.text}</p>
                            <button 
                                onClick={() => setInfoMessage(null)}
                                className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Overtime Pool Modal */}
                <Modal isOpen={isPoolModalOpen} onClose={() => setIsPoolModalOpen(false)} title="Überstundenpool verwalten">
                    <div className="space-y-4">
                        {/* Pool Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Verfügbarer Pool</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {poolEntries.reduce((sum, e) => sum + e.durationInHours, 0).toFixed(1)}h
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{poolEntries.length} Einträge</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ausgewählt</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {poolEntries.filter(e => selectedPoolEntryIds.includes(e.id)).reduce((sum, e) => sum + e.durationInHours, 0).toFixed(1)}h
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{selectedPoolEntryIds.length} von {poolEntries.length}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Übertragen</p>
                                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {poolTransfers.reduce((sum, t) => sum + t.hours, 0).toFixed(1)}h
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{poolTransfers.length} Transfers</p>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end">
                            <Button
                                variant="primary"
                                onClick={openDistributeModal}
                                disabled={selectedPoolEntryIds.length === 0}
                                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <ArrowRight className="w-4 h-4" /> Ausgewählte verteilen ({poolEntries.filter(e => selectedPoolEntryIds.includes(e.id)).reduce((sum, e) => sum + e.durationInHours, 0).toFixed(1)}h)
                            </Button>
                        </div>

                        {/* Select All */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={selectedPoolEntryIds.length === poolEntries.length && poolEntries.length > 0}
                                onChange={handleSelectAllPoolEntries}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Alle auswählen</span>
                        </div>

                        {/* Pool Entries List */}
                        {poolEntries.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Keine Überstunden im Pool</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {poolEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg hover:shadow-md transition-shadow">
                                        <input
                                            type="checkbox"
                                            checked={selectedPoolEntryIds.includes(entry.id)}
                                            onChange={() => handleSelectPoolEntry(entry.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">{entry.type}</span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">{entry.durationInHours}h</span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {new Date(entry.date).toLocaleDateString("de-DE")}
                                                {entry.timeOfDay && ` - ${entry.timeOfDay}`}
                                                {entry.originalMonth && ` (Ursprünglich: ${entry.originalMonth})`}
                                            </div>
                                            {entry.description && (
                                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">{entry.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditPoolEntry(entry)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                                title="Bearbeiten"
                                            >
                                                <Pencil className="w-4 h-4 text-gray-400 hover:text-indigo-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePoolEntryFromModal(entry)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Distribute Modal */}
                <Modal isOpen={isDistributeModalOpen} onClose={() => setIsDistributeModalOpen(false)} title="Überstunden verteilen">
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-slate-300">
                            Sie möchten <strong>{poolEntries.filter(e => selectedPoolEntryIds.includes(e.id)).reduce((sum, e) => sum + e.durationInHours, 0).toFixed(1)}h</strong> auf einen Zielmonat verteilen.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Zielmonat</label>
                                <select
                                    value={targetMonth}
                                    onChange={(e) => {
                                        setTargetMonth(parseInt(e.target.value));
                                        setTargetDate(null); // Reset date when month changes
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20 text-gray-900 dark:text-white"
                                >
                                    {months.map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jahr</label>
                                <select
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20 text-gray-900 dark:text-white"
                                >
                                    {[...Array(5)].map((_, i) => {
                                        const y = new Date().getFullYear() - 2 + i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Kalenderansicht für Datumsauswahl */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Ziel-Datum (optional)
                            </label>
                            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                {/* Tageszeit Auswahl */}
                                <div className="flex gap-2 mb-4">
                                    {(['Ganztägig', 'Vormittags', 'Nachmittags', 'Abends'] as const).map((time) => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => setTargetTimeOfDay(time)}
                                            className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                                                targetTimeOfDay === time
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-amber-500'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>

                                {/* Kalender Grid */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetDate(null)}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                            targetDate === null
                                            ? 'bg-amber-600 text-white border-amber-600'
                                            : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-amber-500'
                                        }`}
                                    >
                                        Ganzer Monat
                                    </button>
                                    <div className="flex-1 grid grid-cols-7 gap-1">
                                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                                            <div key={day} className="text-xs text-center font-medium text-gray-500 dark:text-slate-400 py-1">
                                                {day}
                                            </div>
                                        ))}
                                        {(() => {
                                            const firstDay = new Date(targetYear, targetMonth, 1);
                                            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                                            const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
                                            const days = [];
                                            
                                            // Empty cells for days before month starts
                                            for (let i = 0; i < startDay; i++) {
                                                days.push(<div key={`empty-${i}`} className="p-1" />);
                                            }
                                            
                                            // Day cells
                                            for (let day = 1; day <= daysInMonth; day++) {
                                                const isSelected = targetDate === day;
                                                days.push(
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => setTargetDate(day)}
                                                        className={`p-2 text-sm rounded-lg transition-all ${
                                                            isSelected
                                                                ? 'bg-amber-600 text-white font-bold'
                                                                : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            }
                                            return days;
                                        })()}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                                    {targetDate 
                                        ? `Ausgewählt: ${targetDate}. ${months[targetMonth]} ${targetYear} (${targetTimeOfDay})`
                                        : `Ausgewählt: Ganzer ${months[targetMonth]} ${targetYear}`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Target Month Info */}
                        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-slate-400">Maximale Stunden:</span>
                                <span className="text-sm font-medium">{targetMonthMaxHours}h</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-slate-400">Bereits verwendet:</span>
                                <span className="text-sm font-medium">{targetMonthUsedHours}h</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                                <span className="text-sm text-gray-600 dark:text-slate-400">Verbleibend:</span>
                                <span className={`text-sm font-bold ${remainingTargetHours < poolEntries.filter(e => selectedPoolEntryIds.includes(e.id)).reduce((sum, e) => sum + e.durationInHours, 0) ? 'text-red-600' : 'text-green-600'}`}>
                                    {remainingTargetHours}h
                                </span>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-sm text-gray-600 dark:text-slate-400">Zu verteilen:</span>
                                <span className="text-sm font-bold text-amber-600">{poolEntries.filter(e => selectedPoolEntryIds.includes(e.id)).reduce((sum, e) => sum + e.durationInHours, 0)}h</span>
                            </div>
                        </div>

                        {!canDistribute && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Der Zielmonat hat nicht genügend Kapazität. Bitte wählen Sie einen anderen Monat.
                            </div>
                        )}

                        {canDistribute && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Der Zielmonat hat genügend Kapazität.
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                            <Button type="button" variant="ghost" onClick={() => setIsDistributeModalOpen(false)} disabled={isPoolSaving}>
                                Abbrechen
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleDistribute}
                                disabled={isPoolSaving || !canDistribute}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {isPoolSaving ? "Wird verteilt..." : "Verteilen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Edit Pool Entry Modal */}
                <Modal isOpen={isEditPoolEntryModalOpen} onClose={() => setIsEditPoolEntryModalOpen(false)} title="Eintrag bearbeiten">
                    <form onSubmit={handleEditPoolEntry} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Datum</label>
                                <input
                                    type="date"
                                    required
                                    value={editPoolForm.date}
                                    onChange={(e) => setEditPoolForm({ ...editPoolForm, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Dauer (h)</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    required
                                    value={editPoolForm.durationInHours}
                                    onChange={(e) => setEditPoolForm({ ...editPoolForm, durationInHours: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tageszeit</label>
                            <select
                                value={editPoolForm.timeOfDay}
                                onChange={(e) => setEditPoolForm({ ...editPoolForm, timeOfDay: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                            >
                                <option value="Ganztägig">Ganztägig</option>
                                <option value="Vormittags">Vormittags</option>
                                <option value="Nachmittags">Nachmittags</option>
                                <option value="Abends">Abends</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kategorie</label>
                            <select
                                value={editPoolForm.type}
                                onChange={(e) => setEditPoolForm({ ...editPoolForm, type: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                            >
                                <option value="Büro">Büro / Administration</option>
                                <option value="Beratung">Beratung</option>
                                <option value="Vortrag">Vortrag</option>
                                <option value="Freizeit">Freizeit / Event</option>
                                <option value="Urlaub">Urlaub</option>
                                <option value="Fahrt">Fahrtzeit</option>
                                <option value="Sonstiges">Sonstiges</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Beschreibung</label>
                            <textarea
                                value={editPoolForm.description}
                                onChange={(e) => setEditPoolForm({ ...editPoolForm, description: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/20 min-h-[80px]"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                            <Button type="button" variant="ghost" onClick={() => setIsEditPoolEntryModalOpen(false)} disabled={isPoolSaving}>
                                Abbrechen
                            </Button>
                            <Button type="submit" variant="primary" disabled={isPoolSaving}>
                                {isPoolSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Pool Entry Confirmation */}
                <Modal isOpen={!!entryToDeletePool} onClose={() => setEntryToDeletePool(null)} title="Eintrag löschen">
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-slate-300">
                            Möchtest du die Überstunde <strong>{entryToDeletePool?.type} ({entryToDeletePool?.durationInHours}h)</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                            <Button type="button" variant="ghost" onClick={() => setEntryToDeletePool(null)} disabled={isPoolSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isPoolSaving} onClick={handleDeletePoolEntry}>
                                {isPoolSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
