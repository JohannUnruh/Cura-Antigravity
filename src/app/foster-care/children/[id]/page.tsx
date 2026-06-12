"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { fosterCareService } from "@/lib/firebase/services/fosterCareService";
import { FosterFamily, FosterChild, FosterPlacement, FosterJournalEntry } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Clock,
    User,
    Calendar,
    Edit2,
    Baby,
    AlertTriangle,
    CheckCircle2,
    History,
    Briefcase,
    Shield,
    Users
} from "lucide-react";

type TabId = "stammdaten" | "history" | "journal";

const inputCls = "w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm";
const labelCls = "block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300";
const textareaCls = "w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm resize-y min-h-[100px]";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 text-sm font-medium">
            {message}
        </div>
    );
}

export default function FosterChildDetailPage() {
    const params = useParams();
    const router = useRouter();
    const childId = params?.id as string;
    const { user, userProfile, loading: authLoading } = useAuth();

    // Data State
    const [child, setChild] = useState<FosterChild | null>(null);
    const [placements, setPlacements] = useState<FosterPlacement[]>([]);
    const [families, setFamilies] = useState<FosterFamily[]>([]);
    const [journalEntries, setJournalEntries] = useState<FosterJournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>("stammdaten");
    const [toast, setToast] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Form State (Stammdaten)
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [gender, setGender] = useState<FosterChild['gender']>("Männlich");
    const [custodyStatus, setCustodyStatus] = useState("");
    const [guardianName, setGuardianName] = useState("");
    const [guardianContact, setGuardianContact] = useState("");
    const [originFamilyDetails, setOriginFamilyDetails] = useState("");
    const [notes, setNotes] = useState("");

    // End Placement Modal State
    const [isEndPlacementModalOpen, setIsEndPlacementModalOpen] = useState(false);
    const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
    const [placementEndDate, setPlacementEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [terminationReason, setTerminationReason] = useState("");
    const [endPlacementNotes, setEndPlacementNotes] = useState("");

    // Journal Modal State
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
    const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
    const [journalDate, setJournalDate] = useState(new Date().toISOString().split("T")[0]);
    const [journalDuration, setJournalDuration] = useState("1");
    const [journalType, setJournalType] = useState<FosterJournalEntry['type']>("Gespräch");
    const [journalNotes, setJournalNotes] = useState("");
    const [journalCreateTime, setJournalCreateTime] = useState(true);

    const loadData = useCallback(async () => {
        if (!childId) return;
        setLoading(true);
        try {
            const [childData, placementsList, allFamilies, journalList] = await Promise.all([
                fosterCareService.getChildById(childId),
                fosterCareService.getPlacementsByChild(childId),
                fosterCareService.getFamilies(),
                fosterCareService.getJournalEntries(undefined, childId)
            ]);

            if (!childData) {
                router.push("/foster-care");
                return;
            }

            setChild(childData);
            setPlacements(placementsList);
            setFamilies(allFamilies);
            setJournalEntries(journalList);

            // Populate form states
            setFirstName(childData.firstName);
            setLastName(childData.lastName);
            
            const bdate = childData.birthDate instanceof Date 
                ? childData.birthDate.toISOString().split("T")[0] 
                : new Date(childData.birthDate).toISOString().split("T")[0];
            setBirthDate(bdate);
            setGender(childData.gender);
            setCustodyStatus(childData.custodyStatus);
            setGuardianName(childData.guardianName || "");
            setGuardianContact(childData.guardianContact || "");
            setOriginFamilyDetails(childData.originFamilyDetails || "");
            setNotes(childData.notes || "");

        } catch (error) {
            console.error("Error loading foster child details:", error);
        } finally {
            setLoading(false);
        }
    }, [childId, router]);

    useEffect(() => {
        if (user && userProfile) {
            loadData();
        }
    }, [user, userProfile, loadData]);

    // Save Stammdaten
    const handleSaveChild = async () => {
        if (!firstName.trim() || !lastName.trim() || !birthDate) {
            alert("Bitte füllen Sie alle Pflichtfelder aus.");
            return;
        }

        setIsSaving(true);
        try {
            await fosterCareService.updateChild(childId, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                birthDate: new Date(birthDate),
                gender,
                custodyStatus: custodyStatus.trim(),
                guardianName: guardianName.trim() || undefined,
                guardianContact: guardianContact.trim() || undefined,
                originFamilyDetails: originFamilyDetails.trim() || undefined,
                notes: notes.trim() || undefined
            });

            setToast("Stammdaten erfolgreich gespeichert.");
            await loadData();
        } catch (error) {
            console.error("Error updating child:", error);
            alert("Fehler beim Speichern der Stammdaten.");
        } finally {
            setIsSaving(false);
        }
    };

    // Age helper
    const getAge = (birthDate: Date | string) => {
        const bdate = birthDate instanceof Date ? birthDate : new Date(birthDate);
        const ageDifMs = Date.now() - bdate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // End Placement
    const handleOpenEndPlacementModal = (placementId: string) => {
        setSelectedPlacementId(placementId);
        setPlacementEndDate(new Date().toISOString().split("T")[0]);
        setTerminationReason("");
        setEndPlacementNotes("");
        setIsEndPlacementModalOpen(true);
    };

    const handleEndPlacementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlacementId || !placementEndDate) return;

        try {
            await fosterCareService.endPlacement(
                selectedPlacementId,
                new Date(placementEndDate),
                terminationReason.trim() || undefined,
                endPlacementNotes.trim() || undefined
            );

            setIsEndPlacementModalOpen(false);
            setToast("Platzierung erfolgreich beendet.");
            await loadData();
        } catch (error) {
            console.error("Error ending placement:", error);
            alert("Fehler beim Beenden der Platzierung.");
        }
    };

    // Delete Placement (Clean deletion of placement history)
    const handleDeletePlacement = async (placementId: string) => {
        if (!confirm("Sind Sie sicher, dass Sie diese Platzierung unwiderruflich löschen möchten?")) return;

        try {
            await fosterCareService.deletePlacement(placementId);
            setToast("Platzierung gelöscht.");
            await loadData();
        } catch (error) {
            console.error("Error deleting placement:", error);
            alert("Fehler beim Löschen der Platzierung.");
        }
    };

    // Open Journal Modal for creating a new entry
    const handleOpenNewJournalModal = () => {
        setEditingJournalId(null);
        setJournalDate(new Date().toISOString().split("T")[0]);
        setJournalDuration("1");
        setJournalType("Gespräch");
        setJournalNotes("");
        setJournalCreateTime(true);
        setIsJournalModalOpen(true);
    };

    // Open Journal Modal for editing an entry
    const handleOpenEditJournalModal = (entry: FosterJournalEntry) => {
        setEditingJournalId(entry.id);
        const dateStr = entry.date instanceof Date 
            ? entry.date.toISOString().split("T")[0] 
            : new Date(entry.date).toISOString().split("T")[0];
        setJournalDate(dateStr);
        setJournalDuration(String(entry.durationInHours));
        setJournalType(entry.type);
        setJournalNotes(entry.notes);
        setJournalCreateTime(false);
        setIsJournalModalOpen(true);
    };

    // Save Journal Entry (create or update)
    const handleSaveJournalEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!journalDate || !journalNotes.trim()) {
            alert("Bitte füllen Sie alle Pflichtfelder aus.");
            return;
        }

        try {
            if (editingJournalId) {
                // Update
                await fosterCareService.updateJournalEntry(editingJournalId, {
                    date: new Date(journalDate),
                    durationInHours: Number(journalDuration) || 0,
                    type: journalType,
                    notes: journalNotes.trim()
                });
                setToast("Journaleintrag aktualisiert.");
            } else {
                // Create
                await fosterCareService.createJournalEntry({
                    childId,
                    authorId: user?.uid || "unknown",
                    date: new Date(journalDate),
                    durationInHours: Number(journalDuration) || 0,
                    type: journalType,
                    notes: journalNotes.trim()
                }, journalCreateTime, user?.uid);
                setToast("Journaleintrag erstellt.");
            }

            setIsJournalModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Error saving journal entry:", error);
            alert("Fehler beim Speichern des Journaleintrags.");
        }
    };

    // Delete Journal Entry
    const handleDeleteJournalEntry = async (entryId: string) => {
        if (!confirm("Sind Sie sicher, dass Sie diesen Journaleintrag löschen möchten? (Gekoppelte Zeiterfassungen werden ebenfalls gelöscht)")) return;

        try {
            await fosterCareService.deleteJournalEntry(entryId);
            setToast("Journaleintrag gelöscht.");
            await loadData();
        } catch (error) {
            console.error("Error deleting journal entry:", error);
            alert("Fehler beim Löschen des Journaleintrags.");
        }
    };

    // Map families for display
    const familiesMap = useMemo(() => {
        return new Map(families.map(f => [f.id, f]));
    }, [families]);

    // Split placements into Active & Past
    const activePlacements = useMemo(() => {
        return placements.filter(p => p.status === 'aktiv');
    }, [placements]);

    const pastPlacements = useMemo(() => {
        return placements.filter(p => p.status === 'beendet');
    }, [placements]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!child) return null;

    return (
        <ProtectedRoute requiredPermission="hasFosterCareAccess">
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6 pb-12">
                {/* Header Navigation */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/foster-care" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                            <ArrowLeft className="w-6 h-6 text-gray-500" />
                        </Link>
                        <div>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Pflegekinder-Akte
                            </span>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
                                {child.firstName} {child.lastName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {activeTab === "stammdaten" && (
                            <Button
                                variant="primary"
                                onClick={handleSaveChild}
                                disabled={isSaving}
                                className="flex items-center gap-2 w-full sm:w-auto px-6 shadow-md"
                            >
                                <Save className="w-5 h-5" />
                                <span>{isSaving ? "Speichert..." : "Stammdaten speichern"}</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info Card Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Alter (Geburtsdatum)</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {getAge(child.birthDate)} Jahre ({new Date(child.birthDate).toLocaleDateString("de-DE")})
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Sorgerecht</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {child.custodyStatus}
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Vormund / Pfleger</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {child.guardianName || "Kein Vormund"}
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Zuweisung</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 capitalize">
                                {child.placementStatus === 'placed' ? 'Platziert' : child.placementStatus === 'unplaced' ? 'Unplatziert (Suchend)' : 'Beendet'}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-gray-200 dark:border-white/10 gap-6">
                    <button
                        onClick={() => setActiveTab("stammdaten")}
                        className={`pb-4 text-sm font-semibold transition-all relative ${
                            activeTab === "stammdaten"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        }`}
                    >
                        Stammdaten
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-4 text-sm font-semibold transition-all relative ${
                            activeTab === "history"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        }`}
                    >
                        Vermittlungshistorie ({placements.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("journal")}
                        className={`pb-4 text-sm font-semibold transition-all relative ${
                            activeTab === "journal"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        }`}
                    >
                        Begleitjournal ({journalEntries.length})
                    </button>
                </div>

                {/* Tab Contents */}
                <div>
                    {/* === STAMMDATEN TAB === */}
                    {activeTab === "stammdaten" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                            {/* Left Side: Child Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Basisdaten */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <Baby className="w-5 h-5 text-indigo-500" /> Basisdaten des Kindes
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Vorname *</label>
                                                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Nachname *</label>
                                                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Geburtsdatum *</label>
                                                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Geschlecht</label>
                                                <select value={gender} onChange={e => setGender(e.target.value as FosterChild['gender'])} className={inputCls}>
                                                    <option value="Männlich">Männlich</option>
                                                    <option value="Weiblich">Weiblich</option>
                                                    <option value="Divers">Divers</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Vormund / Pfleger */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <Shield className="w-5 h-5 text-indigo-500" /> Rechtlicher Vormund / Amtspfleger
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Name des Vormunds / Pflegers</label>
                                                <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputCls} placeholder="Name der Person oder des Jugendamtes..." />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Sorgerechtsstatus *</label>
                                                <input type="text" value={custodyStatus} onChange={e => setCustodyStatus(e.target.value)} className={inputCls} placeholder="z.B. Alleinsorge Mutter, Jugendamt (Vormund)..." required />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className={labelCls}>Kontaktdaten des Vormunds</label>
                                                <textarea value={guardianContact} onChange={e => setGuardianContact(e.target.value)} className={textareaCls} placeholder="Telefonnummer, E-Mail-Adresse, Anschrift des Amtes..." />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Herkunftsfamilie */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <Users className="w-5 h-5 text-indigo-500" /> Herkunftsfamilie & Umgangskontakte
                                        </h3>
                                        <textarea value={originFamilyDetails} onChange={e => setOriginFamilyDetails(e.target.value)} className={textareaCls} placeholder="Informationen zu den leiblichen Eltern, Geschwistern, vereinbarten Umgangsregelungen und begleiteten Kontakten..." />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Side: Notes */}
                            <div className="space-y-6">
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 h-full flex flex-col justify-between">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3">
                                            Besonderheiten & Aktennotizen
                                        </h3>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${textareaCls} min-h-[300px]`} placeholder="Wichtige medizinische Informationen, psychologische Befunde, Schul-/Kindergartensituation, traumatische Erfahrungen..." />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* === HISTORY TAB === */}
                    {activeTab === "history" && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Aktive Platzierung */}
                            <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Aktuelle Platzierung
                                    </h3>

                                    {activePlacements.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                                            Das Kind ist zurzeit in keiner Pflegefamilie platziert (Status: Suchend).
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {activePlacements.map(p => {
                                                const familyObj = familiesMap.get(p.familyId);
                                                return (
                                                    <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Pflegefamilie</p>
                                                            {familyObj ? (
                                                                <Link href={`/foster-care/families/${familyObj.id}`} className="font-bold text-lg text-indigo-600 dark:text-indigo-400 hover:underline">
                                                                    Familie {familyObj.parent1.lastName}
                                                                </Link>
                                                            ) : (
                                                                <span className="font-bold text-lg text-gray-900 dark:text-white">Unbekannte Familie</span>
                                                            )}
                                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                Eingezogen am {new Date(p.startDate).toLocaleDateString("de-DE")}
                                                            </p>
                                                            {p.notes && (
                                                                <p className="text-xs text-gray-600 dark:text-slate-400 italic mt-2">
                                                                    Vermittlungsnotiz: {p.notes}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            <Button
                                                                variant="secondary"
                                                                onClick={() => handleOpenEndPlacementModal(p.id)}
                                                                className="flex-1 sm:flex-initial text-xs"
                                                            >
                                                                Platzierung beenden
                                                            </Button>
                                                            <button
                                                                onClick={() => handleDeletePlacement(p.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                                title="Zuweisung löschen"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Historie */}
                            <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                                        <History className="w-5 h-5 text-indigo-500" /> Frühere Pflegeverhältnisse ({pastPlacements.length})
                                    </h3>

                                    {pastPlacements.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500 dark:text-slate-500">
                                            Es sind keine beendeten Platzierungen für dieses Kind dokumentiert.
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {pastPlacements.map(p => {
                                                const familyObj = familiesMap.get(p.familyId);
                                                return (
                                                    <div key={p.id} className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-slate-900/30 text-sm">
                                                        <div className="flex justify-between items-start">
                                                            {familyObj ? (
                                                                <Link href={`/foster-care/families/${familyObj.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                                                                    Fam. {familyObj.parent1.lastName} ({familyObj.address.city})
                                                                </Link>
                                                            ) : (
                                                                <span className="font-semibold text-gray-900 dark:text-white">Unbekannte Familie</span>
                                                            )}
                                                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-lg font-medium">
                                                                Beendet
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                                            Dauer: {new Date(p.startDate).toLocaleDateString("de-DE")} - {p.endDate ? new Date(p.endDate).toLocaleDateString("de-DE") : "unbekannt"}
                                                        </p>
                                                        {p.terminationReason && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                                                                Beendigungsgrund: {p.terminationReason}
                                                            </p>
                                                        )}
                                                        {p.notes && (
                                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">
                                                                Notizen: {p.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* === JOURNAL TAB === */}
                    {activeTab === "journal" && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" /> Begleit- & Beratungsjournal des Kindes
                                </h3>
                                <Button
                                    variant="primary"
                                    onClick={handleOpenNewJournalModal}
                                    className="flex items-center gap-2 px-5 py-2 shadow-sm text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Neuer Tagebucheintrag</span>
                                </Button>
                            </div>

                            {journalEntries.length === 0 ? (
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 p-12 text-center">
                                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-950 dark:text-white mb-1">Noch keine Einträge</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        Dokumentieren Sie hier Gespräche, Kontakte oder Beratungen mit dem Kind, Vormund oder den leiblichen Eltern.
                                    </p>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {journalEntries.map((entry) => {
                                        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
                                        const typeColors = {
                                            Hausbesuch: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30",
                                            Gespräch: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
                                            Telefonat: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30",
                                            Sonstiges: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50",
                                        };

                                        return (
                                            <Card key={entry.id} className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 hover:bg-white/55 dark:hover:bg-slate-900/55 transition-all">
                                                <CardContent className="p-5 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-wrap items-center gap-2.5">
                                                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${typeColors[entry.type]}`}>
                                                                {entry.type}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {entryDate.toLocaleDateString("de-DE")}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {entry.durationInHours} {entry.durationInHours === 1 ? "Stunde" : "Stunden"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {entry.hasTimeEntry && (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/30" title="Zeiterfassung verknüpft">
                                                                    <Briefcase className="w-3 h-3" />
                                                                    <span>Zeiterfassung</span>
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenEditJournalModal(entry)}
                                                                className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                                                title="Eintrag bearbeiten"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteJournalEntry(entry.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                                                title="Eintrag löschen"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                        {entry.notes}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* === MODAL: PLATZIERUNG BEENDEN === */}
                <Modal
                    isOpen={isEndPlacementModalOpen}
                    onClose={() => setIsEndPlacementModalOpen(false)}
                    title="Platzierung beenden"
                >
                    <form onSubmit={handleEndPlacementSubmit} className="space-y-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs rounded-xl border border-amber-200 dark:border-amber-900/50 flex gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Durch das Beenden wird das Pflegekind wieder auf &quot;Unplatziert&quot; gesetzt, und der belegte Platz in der Pflegefamilie wird freigegeben.</p>
                        </div>

                        <div>
                            <label className={labelCls}>Enddatum der Zuweisung *</label>
                            <input
                                type="date"
                                value={placementEndDate}
                                onChange={e => setPlacementEndDate(e.target.value)}
                                className={inputCls}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Beendigungsgrund *</label>
                            <select
                                value={terminationReason}
                                onChange={e => setTerminationReason(e.target.value)}
                                className={inputCls}
                                required
                            >
                                <option value="">-- Grund wählen --</option>
                                <option value="Rückkehr zur Herkunftsfamilie">Rückkehr zur Herkunftsfamilie</option>
                                <option value="Verselbstständigung / Eigene Wohnung">Verselbstständigung / Eigene Wohnung</option>
                                <option value="Wechsel der Betreuungsform">Wechsel der Betreuungsform</option>
                                <option value="Abbruch der Platzierung durch Pflegefamilie">Abbruch der Platzierung durch Pflegefamilie</option>
                                <option value="Abbruch der Platzierung durch Jugendamt">Abbruch der Platzierung durch Jugendamt</option>
                                <option value="Sonstige Gründe">Sonstige Gründe</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Zusätzliche Notizen</label>
                            <textarea
                                value={endPlacementNotes}
                                onChange={e => setEndPlacementNotes(e.target.value)}
                                className={textareaCls}
                                placeholder="Details zur Beendigung, Anschlussmaßnahmen..."
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="secondary" type="button" onClick={() => setIsEndPlacementModalOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button variant="primary" type="submit">
                                Platzierung beenden
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* === MODAL: JOURNAL EINTRAG ERSTELLEN/BEARBEITEN === */}
                <Modal
                    isOpen={isJournalModalOpen}
                    onClose={() => setIsJournalModalOpen(false)}
                    title={editingJournalId ? "Journaleintrag bearbeiten" : "Neuen Journaleintrag erstellen"}
                >
                    <form onSubmit={handleSaveJournalEntry} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Datum *</label>
                                <input
                                    type="date"
                                    value={journalDate}
                                    onChange={e => setJournalDate(e.target.value)}
                                    className={inputCls}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Dauer (in Stunden)</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={journalDuration}
                                    onChange={e => setJournalDuration(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Kontaktart *</label>
                            <select
                                value={journalType}
                                onChange={e => setJournalType(e.target.value as FosterJournalEntry['type'])}
                                className={inputCls}
                                required
                            >
                                <option value="Gespräch">Gespräch</option>
                                <option value="Hausbesuch">Hausbesuch</option>
                                <option value="Telefonat">Telefonat</option>
                                <option value="Sonstiges">Sonstiges</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Notizen & Dokumentation *</label>
                            <textarea
                                value={journalNotes}
                                onChange={e => setJournalNotes(e.target.value)}
                                className={textareaCls}
                                placeholder="Inhalte des Termins, Meilensteine, Befinden des Kindes..."
                                required
                            />
                        </div>

                        {!editingJournalId && (
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="journalCreateTimeCheck"
                                    checked={journalCreateTime}
                                    onChange={e => setJournalCreateTime(e.target.checked)}
                                    className="rounded accent-indigo-600 cursor-pointer"
                                />
                                <label htmlFor="journalCreateTimeCheck" className="text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                    Automatisch einen Beratungs-Zeiteintrag im Arbeitszeitnachweis anlegen
                                </label>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="secondary" type="button" onClick={() => setIsJournalModalOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button variant="primary" type="submit">
                                Speichern
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Toast Notification */}
                {toast && <Toast message={toast} onClose={() => setToast(null)} />}
            </div>
        </ProtectedRoute>
    );
}
