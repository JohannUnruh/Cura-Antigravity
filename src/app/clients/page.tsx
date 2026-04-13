"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { clientService } from "@/lib/firebase/services/clientService";
import { calendarService } from "@/lib/firebase/services/calendarService";
import { Client } from "@/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "@/components/clients/ClientForm";
import { CalendarEventModal } from "@/components/ui/CalendarEventModal";
import {
    Search,
    UserPlus,
    Edit2,
    Trash2,
    ChevronRight,
    SearchX,
    Calendar
} from "lucide-react";

export default function ClientsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Calendar Modal states
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [calendarClientId, setCalendarClientId] = useState<string | null>(null);
    const [calendarClientName, setCalendarClientName] = useState<string>("");
    const [isCalendarSaving, setIsCalendarSaving] = useState(false);

    const fetchClients = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await clientService.getClientsByAuthor(user.uid);
            setClients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        setFilteredClients(
            clients.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.personGroup.toLowerCase().includes(query)
            )
        );
    }, [searchQuery, clients]);

    const handleAddClient = async (data: Omit<Client, "id" | "createdAt">) => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Extrahiere Calendar-Daten aus dem Formular
            const { createCalendarEvent, calendarData, ...clientData } = data as any;
            
            // Klient anlegen
            await clientService.addClient({
                ...clientData,
                authorId: user.uid
            });
            
            // Optional: Kalendereintrag erstellen
            if (createCalendarEvent && calendarData) {
                try {
                    const [startHours, startMinutes] = calendarData.startTime.split(':').map(Number);
                    const [endHours, endMinutes] = calendarData.endTime.split(':').map(Number);
                    
                    const startDate = new Date(calendarData.date);
                    startDate.setHours(startHours, startMinutes);
                    
                    const endDate = new Date(calendarData.date);
                    endDate.setHours(endHours, endMinutes);
                    
                    await calendarService.createCalendarEvent({
                        title: `Erstgespräch: ${clientData.name}`,
                        description: `Erstgespräch mit neuem Klienten`,
                        startTime: startDate,
                        endTime: endDate,
                        location: calendarData.location
                    });
                } catch (calError) {
                    console.warn("Kalendereintrag fehlgeschlagen, aber Klient wurde angelegt:", calError);
                    // Keine Unterbrechung - Klient wurde erfolgreich angelegt
                }
            }
            
            setIsAddModalOpen(false);
            await fetchClients();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateClient = async (data: Omit<Client, "id" | "createdAt">) => {
        if (!editingClient) return;
        setIsSaving(true);
        try {
            await clientService.updateClient(editingClient.id, data);
            setEditingClient(null);
            await fetchClients();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async () => {
        if (!isDeleteModalOpen) return;
        setIsSaving(true);
        try {
            await clientService.deleteClient(isDeleteModalOpen, user?.uid || "");
            setIsDeleteModalOpen(null);
            await fetchClients();
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
        if (!user) return;
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
                description: event.description || `Gespräch mit ${calendarClientName}`,
                startTime: startDate, // Date-Objekt
                endTime: endDate, // Date-Objekt
                location: event.location
            });
            
            setIsCalendarModalOpen(false);
            setCalendarClientId(null);
            setCalendarClientName("");
        } catch (error) {
            console.error("Fehler beim Erstellen des Kalendereintrags:", error);
            throw error;
        } finally {
            setIsCalendarSaving(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">Klienten</h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Verwalte deine persönlichen Klienten-Akten</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Neuer Klient</span>
                    </Button>
                </div>

                {/* Filters & Controls */}
                <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                    <CardContent className="p-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Klienten oder Gruppe suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-900 dark:text-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Clients List */}
                <Card className="flex-1 overflow-hidden border-white/50 dark:border-white/10 shadow-sm relative z-0 bg-white/40 dark:bg-slate-900/40">
                    <CardContent className="h-full p-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-500 font-medium">Lade Klienten...</span>
                            </div>
                        ) : filteredClients.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">Name / Gruppe</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">Typ</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">Gemeinde</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">Erstellt am</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300 text-right">Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {filteredClients.map((client) => (
                                            <tr
                                                key={client.id}
                                                onClick={() => router.push(`/clients/${client.id}`)}
                                                className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase transition-transform group-hover:scale-110">
                                                            {client.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{client.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-slate-500">{client.gender}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-slate-300 border border-gray-200 dark:border-white/10">
                                                        {client.personGroup}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {client.isChurchMember ? (
                                                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">Ja</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-gray-400">Nein</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                    {client.createdAt.toLocaleDateString('de-DE')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingClient(client);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                                                            title="Bearbeiten"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsDeleteModalOpen(client.id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                                            title="Löschen"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCalendarClientId(client.id);
                                                                setCalendarClientName(client.name);
                                                                setIsCalendarModalOpen(true);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-white rounded-lg transition-all"
                                                            title="Kalendereintrag"
                                                        >
                                                            <Calendar className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-80 gap-4">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                    <SearchX className="w-8 h-8 text-gray-300" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900">Keine Klienten gefunden</h3>
                                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                        {searchQuery ? "Passe deinen Suchbegriff an oder füge einen neuen Klienten hinzu." : "Klicke auf 'Neuer Klient', um deine erste Akte anzulegen."}
                                    </p>
                                </div>
                                {!searchQuery && (
                                    <Button variant="ghost" onClick={() => setIsAddModalOpen(true)}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Ersten Klienten anlegen
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add Modal */}
                <Modal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    title="Neuen Klienten anlegen"
                >
                    <ClientForm
                        onSubmit={handleAddClient}
                        onCancel={() => setIsAddModalOpen(false)}
                        loading={isSaving}
                    />
                </Modal>

                {/* Edit Modal */}
                <Modal
                    isOpen={!!editingClient}
                    onClose={() => setEditingClient(null)}
                    title="Klienten-Akte bearbeiten"
                >
                    <ClientForm
                        initialData={editingClient || {}}
                        onSubmit={handleUpdateClient}
                        onCancel={() => setEditingClient(null)}
                        loading={isSaving}
                    />
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={!!isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(null)}
                    title="Klienten löschen"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Bist du sicher, dass du diesen Klienten löschen möchtest? Dies kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(null)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="button" variant="danger" disabled={isSaving} onClick={handleDeleteClient}>
                                {isSaving ? "Wird gelöscht..." : "Löschen"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Calendar Event Modal */}
                <CalendarEventModal
                    isOpen={isCalendarModalOpen}
                    onClose={() => {
                        setIsCalendarModalOpen(false);
                        setCalendarClientId(null);
                        setCalendarClientName("");
                    }}
                    onSubmit={handleCreateCalendarEvent}
                    clientName={calendarClientName}
                    loading={isCalendarSaving}
                />
            </div>
        </ProtectedRoute>
    );
}
