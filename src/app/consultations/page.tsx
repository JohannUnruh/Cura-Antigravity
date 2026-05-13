"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { clientService } from "@/lib/firebase/services/clientService";
import { Consultation } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Clock, Calendar, MessagesSquare, ArrowRight, Trash2, Target, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { downloadICS } from "@/lib/utils/icsExport";
interface ConsultationWithClient extends Consultation {
    clientName?: string;
}

export default function ConsultationsPage() {
    const { user, userProfile } = useAuth();
    const [consultations, setConsultations] = useState<ConsultationWithClient[]>([]);
    const [legacyConsultations, setLegacyConsultations] = useState<unknown[]>([]);
    const [activeTab, setActiveTab] = useState<'current' | 'legacy'>('current');
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [consData, clientsData, legacyData] = await Promise.all([
                consultationService.getConsultationsByAuthor(user.uid),
                clientService.getClientsByAuthor(user.uid),
                consultationService.getLegacyConsultationsByAuthor(user.uid)
            ]);

            // Map client names
            const mapped = consData.map((c: Consultation) => {
                const client = clientsData.find(cl => cl.id === c.clientId);
                return {
                    ...c,
                    clientName: client ? client.name : "Unbekannter Klient"
                };
            });

            setConsultations(mapped);
            setLegacyConsultations(legacyData);
        } catch (error) {
            console.error("Error loading consultations:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = async () => {
        if (!isDeleteModalOpen) return;
        setIsDeleting(true);
        try {
            await consultationService.deleteConsultation(isDeleteModalOpen);
            setIsDeleteModalOpen(null);
            await loadData();
        } catch (error) {
            console.error("Error deleting consultation:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleICSExport = (consultation: ConsultationWithClient) => {
        if (!user || !consultation.smartCheck?.timeBound) return;

        let targetDate = consultation.smartCheck.timeBound;
        if (typeof targetDate === 'string') {
            targetDate = new Date(targetDate);
        } else if (typeof (targetDate as { toDate?: () => Date }).toDate === 'function') {
            targetDate = (targetDate as { toDate: () => Date }).toDate();
        }

        const advisorName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user.displayName || "Berater");
        const title = `Erinnerung: Zieltermin mit ${consultation.clientName || 'Klient'}`;
        const description = `Berater: ${advisorName}\\n\\nZielvereinbarung:\\n${consultation.goalAgreement || 'Keine spezifische Zielvereinbarung dokumentiert.'}`;

        // Start weekly reminder from today
        const today = new Date();

        downloadICS({
            title, 
            description, 
            startDate: today,
            allDay: true,
            repeatWeeklyUntilDate: targetDate as Date
        });
    };

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">
                <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2.5 rounded-xl">
                                <MessagesSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            Alle Beratungen
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Eine chronologische Übersicht aller geführten Seelsorge-Gespräche.</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-gray-100/50 dark:bg-white/5 rounded-xl w-fit border border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveTab('current')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'current' ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Aktuelle Beratungen
                    </button>
                    <button
                        onClick={() => setActiveTab('legacy')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'legacy' ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Historische Daten (Excel)
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'current' ? (
                        consultations.length === 0 ? (
                            <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                    Es wurden noch keine aktuellen Gespräche erfasst.
                                </CardContent>
                            </Card>
                        ) : (
                            consultations.map((item) => (
                                <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group">
                                    <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {item.type}
                                                </h3>
                                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                                                    {item.clientName}
                                                </span>
                                            </div>

                                            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2">
                                                {item.notes || "Keine Notizen hinterlegt."}
                                            </p>

                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                    {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                    {item.unitsInHours}h
                                                </span>
                                            </div>
                                            
                                            {item.smartCheck?.timeBound && (
                                                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 w-fit">
                                                    <div className="flex items-center gap-2 text-indigo-900 text-sm">
                                                        <Target className="w-4 h-4 text-indigo-500" />
                                                        <span className="font-semibold">Zieltermin:</span>
                                                        <span>{((item.smartCheck.timeBound as { toDate?: () => Date }).toDate ? (item.smartCheck.timeBound as { toDate: () => Date }).toDate() : new Date(item.smartCheck.timeBound as string | number)).toLocaleDateString("de-DE")}</span>
                                                    </div>
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        className="gap-2 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 bg-white"
                                                        onClick={() => handleICSExport(item)}
                                                    >
                                                        <CalendarPlus className="w-4 h-4" />
                                                        .ics Export
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end gap-2 mt-4 md:mt-0">
                                            <button
                                                onClick={() => setIsDeleteModalOpen(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <Link href={`/clients/${item.clientId}`}>
                                                <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 pl-3">
                                                    Zur Akte
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )
                    ) : (
                        legacyConsultations.length === 0 ? (
                            <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                    Keine historischen Daten gefunden.
                                </CardContent>
                            </Card>
                        ) : (
                            legacyConsultations.map((item) => (
                                <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center mb-3">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {item.topic || item.consultationType}
                                                    </h3>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                                        Excel Import
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.consultationType && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{item.consultationType}</span>}
                                                    {item.targetGroup && <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{item.targetGroup}</span>}
                                                    {item.ageGroup && <span className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">{item.ageGroup}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                    {new Date(item.dateFrom).toLocaleDateString("de-DE")}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                    {item.durationInHours}h
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-2 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl text-sm border border-gray-100 dark:border-white/10">
                                            <div>
                                                <p className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold mb-1">Problemherkunft / Folgen</p>
                                                <p className="text-gray-700 dark:text-slate-300">{item.origin || "Nicht angegeben"}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {[item.consequence1, item.consequence2, item.consequence3, item.consequence4].filter(Boolean).map((c, idx) => (
                                                        <span key={idx} className="text-[11px] text-gray-500 dark:text-slate-500 italic">#{c}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold mb-1">Fazit / Erfolg</p>
                                                <p className="text-gray-700 dark:text-slate-300 italic">{item.conclusion || "Kein Fazit hinterlegt."}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={!!isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(null)}
                    title="Gespräch löschen"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du dieses Seelsorge-Gespräch löschen möchtest? Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(null)} disabled={isDeleting}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isDeleting} onClick={handleDelete}>
                                {isDeleting ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
