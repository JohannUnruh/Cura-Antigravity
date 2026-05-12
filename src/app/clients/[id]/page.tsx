"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { clientService } from "@/lib/firebase/services/clientService";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { timeTrackingService } from "@/lib/firebase/services/timeTrackingService";
import { calendarService } from "@/lib/firebase/services/calendarService";
import { downloadICS } from "@/lib/utils/icsExport";
import { Client, Consultation, SkbConsultation } from "@/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConsultationForm } from "@/components/consultations/ConsultationForm";
import { SkbConsultationForm } from "@/components/consultations/SkbConsultationForm";
import { CalendarEventModal } from "@/components/ui/CalendarEventModal";
import { ArrowLeft, Clock, Calendar, HeartHandshake, Baby, MessagesSquare, Trash2, Pencil, FileText, CalendarPlus, Target } from "lucide-react";



export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params?.id as string;
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [client, setClient] = useState<Client | null>(null);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [skbConsultations, setSkbConsultations] = useState<SkbConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
    const [isSkbModalOpen, setIsSkbModalOpen] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const [selectedSkb, setSelectedSkb] = useState<SkbConsultation | null>(null);
    const [prefilledConsultation, setPrefilledConsultation] = useState<Partial<Consultation> | undefined>(undefined);
    const [prefilledSkb, setPrefilledSkb] = useState<Partial<SkbConsultation> | undefined>(undefined);
    const [isDeleteConsModalOpen, setIsDeleteConsModalOpen] = useState(false);
    const [isDeleteSkbModalOpen, setIsDeleteSkbModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Calendar Modal states
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [isCalendarSaving, setIsCalendarSaving] = useState(false);

    const loadClient = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const data = await clientService.getClientById(clientId);
            setClient(data);
        } catch (error) {
            console.error("Error loading client:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    const loadHistory = useCallback(async () => {
        if (!clientId || !user?.uid) return;
        setLoadingHistory(true);
        try {
            const [consData, skbData] = await Promise.all([
                consultationService.getConsultationsByClientId(clientId, user.uid),
                consultationService.getSkbConsultationsByClientId(clientId, user.uid),
            ]);
            setConsultations(consData);
            setSkbConsultations(skbData);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }, [clientId, user?.uid]);

    const handleAddConsultation = async (data: Partial<Consultation>, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday') => {
        setIsSaving(true);
        try {
            const added = await consultationService.addConsultation({
                ...data,
                clientId: clientId,
                authorId: user?.uid || "",
            } as Omit<Consultation, "id" | "createdAt" | "updatedAt">);

            if (user?.uid) {
                const result = await timeTrackingService.addDistributedTimeEntries(
                    {
                        authorId: user.uid,
                        type: "Beratung",
                        description: `Beratung (ID: ${added.id.slice(-6).toUpperCase()})`,
                        referenceId: added.id
                    },
                    added.dateFrom,
                    added.dateTo || added.dateFrom,
                    added.unitsInHours || 1,
                    timeOfDay
                );
                
                // User über Overflow informieren
                if (result.hasOverflow) {
                    console.log(`${result.poolEntries.length} Einträge wurden im Überstundenpool gespeichert`);
                }
            }

            await loadHistory();
            setIsConsultationModalOpen(false);
        } catch (error) {
            console.error("Error saving consultation", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditConsultation = async (data: Partial<Consultation>) => {
        if (!selectedConsultation?.id) return;
        setIsSaving(true);
        try {
            // Nur die Beratung aktualisieren, keine neuen Zeiteinträge erstellen
            await consultationService.updateConsultation(selectedConsultation.id, data);

            await loadHistory();
            setIsConsultationModalOpen(false);
            setSelectedConsultation(null);
            setPrefilledConsultation(undefined);
        } catch (error) {
            console.error("Error updating consultation", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSkb = async (data: Partial<SkbConsultation>, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday') => {
        setIsSaving(true);
        try {
            let savedId = selectedSkb?.id;
            if (selectedSkb?.id) {
                // Bearbeiten: Nur SKB aktualisieren, keine neuen Zeiteinträge
                await consultationService.updateSkbConsultation(selectedSkb.id, data);
            } else {
                // Neu erstellen: SKB speichern + Zeiteinträge erstellen
                const added = await consultationService.addSkbConsultation({
                    ...data,
                    clientId: clientId,
                    authorId: user?.uid || "",
                } as Omit<SkbConsultation, 'id' | 'createdAt'>);
                savedId = added.id;

                // Zeiteinträge nur beim Erstellen hinzufügen
                if (user?.uid && savedId) {
                    const result = await timeTrackingService.addDistributedTimeEntries(
                        {
                            authorId: user.uid,
                            type: "Beratung",
                            description: `SKB-Beratung (ID: ${savedId.slice(-6).toUpperCase()})`,
                            referenceId: savedId
                        },
                        data.dateFrom || new Date(),
                        data.dateTo || data.dateFrom || new Date(),
                        data.durationInHours || 1,
                        timeOfDay
                    );

                    // User über Overflow informieren
                    if (result.hasOverflow) {
                        console.log(`${result.poolEntries.length} Einträge wurden im Überstundenpool gespeichert`);
                    }
                }
            }

            await loadHistory();
            setIsSkbModalOpen(false);
            setSelectedSkb(null);
            setPrefilledSkb(undefined);
        } catch (error) {
            console.error("Error saving SKB", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConsultation = async () => {
        if (!selectedConsultation?.id) return;
        setIsSaving(true);
        try {
            await consultationService.deleteConsultation(selectedConsultation.id);
            await loadHistory();
            setIsDeleteConsModalOpen(false);
            setSelectedConsultation(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSkb = async () => {
        if (!selectedSkb?.id) return;
        setIsSaving(true);
        try {
            await consultationService.deleteSkbConsultation(selectedSkb.id);
            await loadHistory();
            setIsDeleteSkbModalOpen(false);
            setSelectedSkb(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateCalendarEvent = async (event: {
        title: string;
        description: string;
        date: Date;
        endDate?: Date;
        startTime: string;
        endTime: string;
        location: string;
    }) => {
        if (!user || !client) return;
        setIsCalendarSaving(true);
        try {
            const [startHours, startMinutes] = event.startTime.split(':').map(Number);
            const [endHours, endMinutes] = event.endTime.split(':').map(Number);
            
            // Startzeit aus Datum + Uhrzeit erstellen
            const startDate = new Date(event.date);
            startDate.setHours(startHours, startMinutes, 0, 0);
            
            // Endzeit aus Enddatum (oder Startdatum) + Uhrzeit erstellen
            const endDate = event.endDate 
                ? new Date(event.endDate)
                : new Date(event.date);
            endDate.setHours(endHours, endMinutes, 0, 0);
            
            // Debug: Daten loggen
            console.log("Erstelle Kalender-Event mit:", {
                title: event.title,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                location: event.location
            });
            
            await calendarService.createCalendarEvent({
                title: event.title,
                description: event.description || `Gespräch mit ${client.name}`,
                startTime: startDate, // Date-Objekt
                endTime: endDate, // Date-Objekt
                location: event.location
            });
            
            setIsCalendarModalOpen(false);
        } catch (error) {
            console.error("Fehler beim Erstellen des Kalendereintrags:", error);
            throw error;
        } finally {
            setIsCalendarSaving(false);
        }
    };

    const handleICSExport = (consultation: Consultation) => {
        if (!client || !consultation.smartCheck?.timeBound) return;
        
        let targetDate = consultation.smartCheck.timeBound;
        // Firestore Timestamp oder String in Date umwandeln falls nötig
        if (!(targetDate instanceof Date)) {
            // @ts-ignore
            if (targetDate.toDate) {
                // @ts-ignore
                targetDate = targetDate.toDate();
            } else {
                targetDate = new Date(targetDate);
            }
        }
        
        const advisorName = user?.displayName || "Berater";
        const title = `Erinnerung: Zieltermin mit ${client.name}`;
        const description = `Berater: ${advisorName}\n\nZielvereinbarung:\n${consultation.goalAgreement || 'Keine Zielvereinbarung eingetragen.'}`;
        
        downloadICS({
            title,
            description,
            startDate: targetDate,
            allDay: true,
        });
    };

    useEffect(() => {
        loadClient();
        loadHistory();
    }, [loadClient, loadHistory]);

    // Handle AI prefill from notes page
    useEffect(() => {
        const aiPrefill = searchParams?.get("aiPrefill");
        const data = searchParams?.get("data");
        if (aiPrefill && data) {
            try {
                const parsed = JSON.parse(decodeURIComponent(data));
                // Remove the _source marker
                delete parsed._source;

                if (aiPrefill === "consultation") {
                    // Convert date strings to Date objects
                    const prefill: Record<string, unknown> = { ...parsed };
                    if (prefill.dateFrom) prefill.dateFrom = new Date(prefill.dateFrom as string);
                    if (prefill.dateTo) prefill.dateTo = new Date(prefill.dateTo as string);
                    if (prefill.smartCheck && typeof prefill.smartCheck === 'object') {
                        const sc = prefill.smartCheck as Record<string, unknown>;
                        if (sc.timeBound) sc.timeBound = new Date(sc.timeBound as string);
                    }
                    setPrefilledConsultation(prefill);
                    setSelectedConsultation(null);
                    setIsConsultationModalOpen(true);
                } else if (aiPrefill === "skb") {
                    const prefill: Record<string, unknown> = { ...parsed };
                    if (prefill.dateFrom) prefill.dateFrom = new Date(prefill.dateFrom as string);
                    if (prefill.dateTo) prefill.dateTo = new Date(prefill.dateTo as string);
                    if (prefill.expectedDeliveryDate) prefill.expectedDeliveryDate = new Date(prefill.expectedDeliveryDate as string);
                    setPrefilledSkb(prefill);
                    setSelectedSkb(null);
                    setIsSkbModalOpen(true);
                }
                // Clean URL
                router.replace(`/clients/${clientId}`);
            } catch (e) {
                console.error("Error parsing AI prefill data", e);
            }
        }
    }, [searchParams, clientId, router]);

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="flex h-full items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!client) {
        return (
            <ProtectedRoute>
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Klient nicht gefunden</h2>
                    <p className="text-gray-500">Diese Akte existiert nicht oder wurde gelöscht.</p>
                    <Button onClick={() => router.push("/clients")} variant="secondary">Zurück zur Übersicht</Button>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">

                {/* Back Button & Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/clients")}
                        className="p-2 rounded-full hover:bg-white/50 text-gray-500 transition-colors"
                        aria-label="Zurück zur Übersicht"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-1">
                            {client.personGroup} • {client.gender} • {client.isChurchMember ? "Mitglied" : "Kein Mitglied"}
                        </p>
                    </div>
                </div>

                {/* Info Card */}
                <Card className="border-white/60 shadow-sm bg-white/40 backdrop-blur-xl">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1">Erstellt am</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-indigo-400" />
                                    {client.createdAt.toLocaleDateString('de-DE')}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1">Fall-ID (Anonym)</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-400 font-mono">
                                    {client.id.split('_').pop()?.toUpperCase()}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1">Letzter Termin</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-400">vor 2 Tagen</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 py-2">
                    <Button
                        variant="primary"
                        onClick={() => {
                            let init: Partial<Consultation> | undefined = undefined;
                            if (consultations.length > 0) {
                                // Assuming consultations are sorted descending by date
                                const last = consultations[0];
                                init = { ...last, id: undefined, createdAt: undefined, authorId: undefined, clientId: undefined };
                                init.dateFrom = new Date();
                                init.dateTo = new Date();
                            }
                            setSelectedConsultation(null);
                            setPrefilledConsultation(init);
                            setIsConsultationModalOpen(true);
                        }}
                        className="flex-1 sm:flex-[2] py-6 text-base justify-start gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 border-none shadow-md hover:shadow-lg transition-all"
                    >
                        <div className="bg-white/20 p-2 rounded-lg"><HeartHandshake className="w-5 h-5 text-white" /></div>
                        Neues Seelsorgegespräch
                    </Button>

                    {client.gender === 'Weiblich' && !['Kind', 'Senior'].includes(client.personGroup) && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                let init: Partial<SkbConsultation> | undefined = undefined;
                                if (skbConsultations.length > 0) {
                                    const last = skbConsultations[0];
                                    init = { ...last, id: undefined, createdAt: undefined, authorId: undefined, clientId: undefined };
                                    init.dateFrom = new Date();
                                    init.dateTo = new Date();
                                }
                                setSelectedSkb(null);
                                setPrefilledSkb(init);
                                setIsSkbModalOpen(true);
                            }}
                            className="flex-1 py-6 text-base justify-start gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 border-none shadow-md hover:shadow-lg transition-all"
                        >
                            <div className="bg-white/20 p-2 rounded-lg"><Baby className="w-5 h-5 text-white" /></div>
                            Neue SKB-Beratung
                        </Button>
                    )}
                </div>

                {/* Calendar Event Button */}
                <Button
                    variant="secondary"
                    onClick={() => setIsCalendarModalOpen(true)}
                    className="py-4 text-base justify-start gap-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-300 dark:hover:border-emerald-400 hover:shadow-md transition-all"
                >
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg"><Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                    <div className="text-left">
                        <span className="block font-semibold text-gray-800 dark:text-slate-200">Kalendereintrag erstellen</span>
                        <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">Termin im &quot;Zefabiko-Belegnungsplan&quot; eintragen</span>
                    </div>
                </Button>

                {/* AI Notes Button */}
                <Button
                    variant="secondary"
                    onClick={() => router.push(`/clients/${clientId}/notes`)}
                    className="py-4 text-base justify-start gap-3 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 border-violet-200 dark:border-violet-500/30 hover:border-violet-300 dark:hover:border-violet-400 hover:shadow-md transition-all"
                >
                    <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-lg"><FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" /></div>
                    <div className="text-left">
                        <span className="block font-semibold text-gray-800 dark:text-slate-200">Gesprächsnotiz starten</span>
                        <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">Freitext schreiben → KI füllt das Formular</span>
                    </div>
                </Button>

                {/* Timeline / History */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <MessagesSquare className="w-5 h-5" />
                        Beratungs-Historie
                    </h2>

                    <div className="relative border-l-2 border-indigo-100/50 pl-6 ml-4 space-y-8">
                        {loadingHistory ? (
                            <div className="text-gray-400 text-sm py-4">Lade Historie...</div>
                        ) : (consultations.length === 0 && skbConsultations.length === 0) ? (
                            <div className="text-gray-400 text-sm py-4">Noch keine Beratungen vorhanden.</div>
                        ) : (
                            <>
                                {consultations.map((item) => (
                                    <div key={item.id} className="relative">
                                        <div className="absolute -left-[31px] bg-indigo-50 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                                        </div>
                                        <Card className="border-white/50 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 group-hover:bg-indigo-500 transition-colors" />
                                            <CardContent className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                {item.type}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                                                                <span className="flex items-center gap-1.5 font-medium text-indigo-600/80 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                                </span>
                                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {item.unitsInHours}h
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                                            Seelsorge
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed border-t border-gray-100 dark:border-white/5 pt-3">
                                                        {item.notes || "Keine Notizen hinterlegt."}
                                                    </p>
                                                    {item.smartCheck?.timeBound && (
                                                        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                                            <div className="flex items-center gap-2 text-indigo-900 text-sm">
                                                                <Target className="w-4 h-4 text-indigo-500" />
                                                                <span className="font-semibold">Zieltermin:</span>
                                                                <span>{((item.smartCheck.timeBound as any).toDate ? (item.smartCheck.timeBound as any).toDate() : new Date(item.smartCheck.timeBound as any)).toLocaleDateString("de-DE")}</span>
                                                            </div>
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm"
                                                                className="gap-2 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 bg-white ml-auto"
                                                                onClick={() => handleICSExport(item)}
                                                            >
                                                                <CalendarPlus className="w-4 h-4" />
                                                                .ics Export
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 justify-end sm:flex-col sm:justify-start">
                                                    <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedConsultation(item); setIsConsultationModalOpen(true); }}>
                                                        <Pencil className="w-4 h-4 text-gray-400 hover:text-indigo-500" />
                                                    </div>
                                                    <div className="p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedConsultation(item); setIsDeleteConsModalOpen(true); }}>
                                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                                {skbConsultations.map((item) => (
                                    <div key={item.id} className="relative">
                                        <div className="absolute -left-[31px] bg-emerald-50 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                                        </div>
                                        <Card className="border-white/50 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors" />
                                            <CardContent className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                                SKB-Beratung
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                                                                <span className="flex items-center gap-1.5 font-medium text-emerald-600/80 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                                </span>
                                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {item.durationInHours}h
                                                                </span>
                                                                {item.pregnancyWeek > 0 && (
                                                                    <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">
                                                                        SSW {item.pregnancyWeek}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            SKB
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed border-t border-gray-100 dark:border-white/5 pt-3">
                                                        {item.notes || "Keine Notizen hinterlegt."}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 justify-end sm:flex-col sm:justify-start">
                                                    <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedSkb(item); setIsSkbModalOpen(true); }}>
                                                        <Pencil className="w-4 h-4 text-gray-400 hover:text-emerald-500" />
                                                    </div>
                                                    <div className="p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer" onClick={() => { setSelectedSkb(item); setIsDeleteSkbModalOpen(true); }}>
                                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                <Modal
                    isOpen={isConsultationModalOpen}
                    onClose={() => {
                        setIsConsultationModalOpen(false);
                        setSelectedConsultation(null);
                        setPrefilledConsultation(undefined);
                    }}
                    title={selectedConsultation ? "Gespräch bearbeiten" : "Neues Gespräch"}
                >
                    <ConsultationForm
                        clientId={clientId}
                        initialData={prefilledConsultation || selectedConsultation || undefined}
                        onSubmit={(data, timeOfDay) => selectedConsultation
                            ? handleEditConsultation(data)
                            : handleAddConsultation(data, timeOfDay)
                        }
                        onCancel={() => {
                            setIsConsultationModalOpen(false);
                            setSelectedConsultation(null);
                            setPrefilledConsultation(undefined);
                        }}
                        loading={isSaving}
                    />
                </Modal>

                <Modal
                    isOpen={isSkbModalOpen}
                    onClose={() => {
                        setIsSkbModalOpen(false);
                        setSelectedSkb(null);
                        setPrefilledSkb(undefined);
                    }}
                    title={selectedSkb ? "SKB bearbeiten" : "Neue SKB-Beratung"}
                >
                    <SkbConsultationForm
                        clientId={clientId}
                        initialData={prefilledSkb || selectedSkb || undefined}
                        onSubmit={(data, timeOfDay) => handleSaveSkb(data, timeOfDay)}
                        onCancel={() => {
                            setIsSkbModalOpen(false);
                            setSelectedSkb(null);
                            setPrefilledSkb(undefined);
                        }}
                        loading={isSaving}
                    />
                </Modal>

                <Modal isOpen={isDeleteConsModalOpen} onClose={() => setIsDeleteConsModalOpen(false)} title="Seelsorgegespräch löschen">
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du das Seelsorgegespräch vom <strong>{selectedConsultation?.dateFrom ? new Date(selectedConsultation.dateFrom).toLocaleDateString('de-DE') : ''}</strong> löschen möchtest? Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteConsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={handleDeleteConsultation}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteSkbModalOpen} onClose={() => setIsDeleteSkbModalOpen(false)} title="SKB-Beratung löschen">
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du die SKB-Beratung vom <strong>{selectedSkb?.dateFrom ? new Date(selectedSkb.dateFrom).toLocaleDateString('de-DE') : ''}</strong> löschen möchtest? Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteSkbModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={handleDeleteSkb}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Calendar Event Modal */}
                <CalendarEventModal
                    isOpen={isCalendarModalOpen}
                    onClose={() => setIsCalendarModalOpen(false)}
                    onSubmit={handleCreateCalendarEvent}
                    clientName={client?.name}
                    loading={isCalendarSaving}
                />
            </div>
        </ProtectedRoute>
    );
}
