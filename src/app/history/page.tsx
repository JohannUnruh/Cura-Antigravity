"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { retreatService } from "@/lib/firebase/services/retreatService";
import { lectureService } from "@/lib/firebase/services/lectureService";
import { clientService } from "@/lib/firebase/services/clientService";
import { shortConsultationService } from "@/lib/firebase/services/shortConsultationService";
import { Card, CardContent } from "@/components/ui/Card";
import { History as HistoryIcon, MessagesSquare, Presentation, Tent, Calendar, Clock, MapPin, Tag, Coffee } from "lucide-react";

type HistoryItem = {
    id: string;
    type: 'consultation' | 'legacy_consultation' | 'retreat' | 'lecture' | 'short_consultation';
    title: string;
    date: Date;
    duration: number;
    description: string;
    meta?: any;
};

export default function UnifiedHistoryPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'consultation' | 'retreat' | 'lecture' | 'short'>('all');

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [cons, legacyCons, retreats, lectures, clients, shortCons] = await Promise.all([
                consultationService.getConsultationsByAuthor(user.uid),
                consultationService.getLegacyConsultationsByAuthor(user.uid),
                retreatService.getRetreatsByAuthor(user.uid),
                lectureService.getLecturesByAuthor(user.uid),
                clientService.getClientsByAuthor(user.uid),
                shortConsultationService.getConsultationsByAuthor(user.uid)
            ]);

            const items: HistoryItem[] = [
                ...cons.map(c => {
                    const client = clients.find(cl => cl.id === c.clientId);
                    return {
                        id: c.id,
                        type: 'consultation' as const,
                        title: `Beratung: ${client?.name || 'Unbekannt'}`,
                        date: new Date(c.dateFrom),
                        duration: c.unitsInHours,
                        description: c.notes || c.type,
                        meta: { label: c.type, clientName: client?.name }
                    };
                }),
                ...legacyCons.map(c => ({
                    id: c.id,
                    type: 'legacy_consultation' as const,
                    title: `Seelsorge (Ex.): ${c.topic || c.consultationType}`,
                    date: new Date(c.dateFrom),
                    duration: c.durationInHours,
                    description: c.conclusion || c.origin || '',
                    meta: { label: 'Excel Import', type: c.consultationType }
                })),
                ...retreats.map(r => ({
                    id: r.id,
                    type: 'retreat' as const,
                    title: `Freizeit: ${r.title}`,
                    date: new Date(r.dateFrom),
                    duration: r.durationInHours,
                    description: r.notes || `${r.retreatType || ''} @ ${r.location || ''}`,
                    meta: { location: r.location, type: r.retreatType }
                })),
                ...lectures.map(l => ({
                    id: l.id,
                    type: 'lecture' as const,
                    title: `Vortrag: ${l.topic}`,
                    date: new Date(l.dateFrom),
                    duration: l.durationInHours,
                    description: l.notes || `${l.lectureType || ''} @ ${l.location || ''}`,
                    meta: { location: l.location, type: l.lectureType }
                })),
                ...shortCons.map(s => ({
                    id: s.id,
                    type: 'short_consultation' as const,
                    title: `Kurzgespräch: ${s.type}`,
                    date: new Date(s.date),
                    duration: s.durationInHours,
                    description: s.notes || 'Keine Notizen',
                    meta: { label: 'Kurzgespräch', type: s.type }
                }))
            ];

            // Sort by date descending
            items.sort((a, b) => b.date.getTime() - a.date.getTime());
            setHistory(items);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredItems = history.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'consultation') return item.type === 'consultation' || item.type === 'legacy_consultation';
        if (filter === 'short') return item.type === 'short_consultation';
        return item.type === filter;
    });

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">
                <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-white/10 p-2.5 rounded-xl">
                                <HistoryIcon className="w-8 h-8 text-slate-600 dark:text-slate-300" />
                            </div>
                            Gesamt-Historie
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Alle deine Aktivitäten im Überblick – Beratungen, Freizeiten und Vorträge.</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: 'Alle', icon: HistoryIcon },
                        { id: 'consultation', label: 'Beratungen', icon: MessagesSquare },
                        { id: 'lecture', label: 'Vorträge', icon: Presentation },
                        { id: 'retreat', label: 'Freizeiten', icon: Tent },
                        { id: 'short', label: 'Kurzgespräche', icon: Coffee },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === f.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/60 dark:bg-white/10 text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 border border-white/60 dark:border-white/10'}`}
                        >
                            <f.icon className="w-4 h-4" />
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Keine Einträge für diesen Filter gefunden.
                            </CardContent>
                        </Card>
                    ) : (
                        filteredItems.map((item) => (
                            <Card key={`${item.type}-${item.id}`} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow">
                                <CardContent className="p-5 flex gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        item.type === 'consultation' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' :
                                        item.type === 'legacy_consultation' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                                        item.type === 'retreat' ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' :
                                        item.type === 'lecture' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                                        'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                                    }`}>
                                        {item.type.includes('consultation') && !item.type.includes('short') ? <MessagesSquare className="w-6 h-6" /> :
                                            item.type === 'retreat' ? <Tent className="w-6 h-6" /> :
                                            item.type === 'lecture' ? <Presentation className="w-6 h-6" /> :
                                            <Coffee className="w-6 h-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {item.date.toLocaleDateString("de-DE")}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {item.duration}h
                                                    </span>
                                                    {item.meta?.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {item.meta.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.meta?.label && (
                                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${item.type === 'legacy_consultation' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-500'
                                                    }`}>
                                                    {item.meta.label}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-2">
                                            {item.description || "Keine weiteren Details hinterlegt."}
                                        </p>

                                        {item.meta?.type && (
                                            <div className="flex gap-2 mt-3">
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/5">
                                                    <Tag className="w-3 h-3" />
                                                    {item.meta.type}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
