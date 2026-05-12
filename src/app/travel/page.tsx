"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { travelService } from "@/lib/firebase/services/travelService";
import { useSettings } from "@/contexts/SettingsContext";
import { TravelExpense, UserProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Car, Plus, Calendar, MapPin, CheckCircle2, XCircle, Clock3, RefreshCcw } from "lucide-react";

export default function TravelPage() {
    const { user, userProfile } = useAuth();
    const { settings } = useSettings();
    const [expenses, setExpenses] = useState<TravelExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState<TravelExpense | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

    const [form, setForm] = useState(() => getEmptyForm(userProfile));

    function getEmptyForm(profile: UserProfile | null = null) {
        let fullStartAddress = profile?.address?.city || "";
        if (profile?.address) {
            const { street, zipCode, city } = profile.address;
            const parts = [];
            if (street) parts.push(street);
            if (zipCode || city) {
                const zipCity = [zipCode, city].filter(Boolean).join(" ");
                if (zipCity) parts.push(zipCity);
            }
            if (parts.length > 0) fullStartAddress = parts.join(", ");
        }

        return {
            startDate: "",
            startLocation: fullStartAddress,
            endLocation: "",
            kmStart: 0,
            kmEnd: 0,
            authorId: profile?.id || "",
        };
    }

    const formatDate = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const expensesData = await travelService.getExpensesByUser(user.uid, userProfile?.role || 'Mitarbeiter');
            setExpenses(expensesData);
        } finally {
            setLoading(false);
        }
    }, [user, userProfile]);

    useEffect(() => { loadData(); }, [loadData]);

    const openNew = () => {
        setSelected(null);
        setForm(getEmptyForm(userProfile));
        setIsModalOpen(true);
    };

    const openEdit = (item: TravelExpense) => {
        setSelected(item);
        setForm({
            startDate: formatDate(new Date(item.startDate)),
            startLocation: item.startLocation,
            endLocation: item.endLocation,
            kmStart: item.kmStart,
            kmEnd: item.kmEnd,
            authorId: item.authorId || "",
        });
        setIsModalOpen(true);
    };

    const calculateDistance = async () => {
        if (!form.startLocation || !form.endLocation) return;

        setIsCalculatingDistance(true);
        try {
            // 1. Geocode Start Location
            const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.startLocation)}`);
            const startData = await startRes.json();

            // 2. Geocode End Location
            const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.endLocation)}`);
            const endData = await endRes.json();

            if (startData.length > 0 && endData.length > 0) {
                const startLat = startData[0].lat;
                const startLon = startData[0].lon;
                const endLat = endData[0].lat;
                const endLon = endData[0].lon;

                // 3. Routing via OSRM (Open Source Routing Machine)
                const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`);
                const routeData = await routeRes.json();

                if (routeData.routes && routeData.routes.length > 0) {
                    // Distance is in meters, convert to km and round mathematically
                    const distanceKm = Math.round(routeData.routes[0].distance / 1000);
                    setForm(prev => ({
                        ...prev,
                        kmEnd: prev.kmStart + distanceKm
                    }));
                } else {
                    alert("Konnte keine Route zwischen den Orten finden.");
                }
            } else {
                alert("Einer der Orte konnte nicht gefunden werden. Bitte genauer angeben (z.B. mit Postleitzahl).");
            }
        } catch (error) {
            console.error("Error calculating route:", error);
            alert("Fehler bei der automatischen Berechnung.");
        } finally {
            setIsCalculatingDistance(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const kmDriven = Math.max(0, form.kmEnd - form.kmStart);
            const calculatedAmount = parseFloat((kmDriven * (settings?.travelExpenseRate || 0.30)).toFixed(2));
            const payload = {
                ...form,
                startDate: new Date(form.startDate),
                kmDriven,
                calculatedAmount,
                status: "Eingereicht" as const,
            };
            if (selected) {
                await travelService.updateExpense(selected.id, payload);
            } else {
                await travelService.addExpense(payload as Omit<TravelExpense, "id" | "createdAt">);
            }
            await loadData();
            setIsModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: TravelExpense["status"]) => {
        await travelService.updateExpense(id, { status });
        await loadData();
    };

    const statusConfig = {
        Eingereicht: { label: "Eingereicht", icon: Clock3, color: "bg-yellow-100 text-yellow-700" },
        Genehmigt: { label: "Genehmigt", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
        Abgelehnt: { label: "Abgelehnt", icon: XCircle, color: "bg-red-100 text-red-700" },
    };

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pb-10">
                <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-sky-100 dark:bg-sky-900/40 p-2.5 rounded-xl">
                                <Car className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                            </div>
                            Fahrtkosten
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Fahrtkostenabrechnungen einreichen und verwalten. (Satz: {settings?.travelExpenseRate || 0.3} €/km)</p>
                    </div>
                    <Button variant="primary" onClick={openNew} className="gap-2">
                        <Plus className="w-4 h-4" /> Neue Fahrt
                    </Button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-12 text-center text-gray-500 dark:text-slate-400">
                                Noch keine Fahrtkosten erfasst. Klicke auf &quot;Neue Fahrt&quot; um zu beginnen.
                            </CardContent>
                        </Card>
                    ) : (
                        expenses.map(item => {
                            const sc = statusConfig[item.status];
                            const StatusIcon = sc.icon;
                            return (
                                <Card key={item.id} className="border-white/50 dark:border-white/10 shadow-sm bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-shadow group">
                                    <CardContent className="p-5 text-gray-900 dark:text-white">
                                        <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                            <div
                                                className={`flex-1 ${item.status === 'Eingereicht' ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                                onClick={() => item.status === 'Eingereicht' && openEdit(item)}
                                            >
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                                        {item.startLocation} → {item.endLocation}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.color.replace('yellow-700', 'yellow-900 dark:text-yellow-400').replace('green-700', 'green-900 dark:text-green-400').replace('red-700', 'red-900 dark:text-red-400')} dark:bg-opacity-20`}>
                                                        <StatusIcon className="w-3.5 h-3.5" /> {sc.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1.5 font-medium text-sky-600/80 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(item.startDate).toLocaleDateString("de-DE")}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.kmDriven} km
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full font-bold">
                                                        {(item.kmDriven * (settings?.travelExpenseRate || 0.30)).toFixed(2)} €
                                                    </span>
                                                    <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                                        Start: {item.kmStart.toLocaleString()} km | Ende: {item.kmEnd.toLocaleString()} km
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Kassenwart buttons */}
                                            {item.status === "Eingereicht" && userProfile?.role === "Kassenwart" && (
                                                <div className="flex gap-2 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(item.id, "Genehmigt")}
                                                        className="text-green-600 hover:bg-green-50 hover:text-green-700 gap-1.5 text-sm"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> Genehmigen
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(item.id, "Abgelehnt")}
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 text-sm"
                                                    >
                                                        <XCircle className="w-4 h-4" /> Ablehnen
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? "Fahrt bearbeiten" : "Neue Fahrt erfassen"}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                            <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Startort</label>
                                <input type="text" required value={form.startLocation}
                                    onChange={e => setForm({ ...form, startLocation: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="z.B. Musterstr. 1, 70173 Stuttgart" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zielort</label>
                                <input type="text" required value={form.endLocation}
                                    onChange={e => setForm({ ...form, endLocation: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="z.B. Zielstr. 42, 80331 München" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometerstand Start</label>
                                <input type="number" min="0" required value={form.kmStart}
                                    onChange={e => setForm({ ...form, kmStart: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometerstand Ende (Auto-Berechnung)</label>
                                <input type="number" min="0" required value={form.kmEnd} readOnly
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-not-allowed text-gray-500" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-100/50">
                            <div className="flex-1">
                                {form.kmEnd > form.kmStart ? (
                                    <div className="flex items-center gap-2">
                                        <Car className="w-5 h-5 text-sky-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            Gefahrene Distanz: <span className="text-sky-700 font-bold">{form.kmEnd - form.kmStart} km</span>
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-500">Route noch nicht berechnet</span>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={calculateDistance}
                                disabled={isCalculatingDistance || !form.startLocation || !form.endLocation}
                                className="text-sky-600 border-sky-200 hover:bg-sky-100 bg-white"
                            >
                                <RefreshCcw className={`w-4 h-4 mr-2 ${isCalculatingDistance ? 'animate-spin' : ''}`} />
                                {form.kmEnd > form.kmStart ? "Neu berechnen" : "Distanz berechnen"}
                            </Button>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? "Wird eingereicht..." : "Einreichen"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
