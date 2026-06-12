"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { fosterCareService } from "@/lib/firebase/services/fosterCareService";
import { FosterFamily, FosterChild, FosterPlacement, FosterJournalEntry, FosterParent } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Clock,
    Users,
    User,
    Home,
    MapPin,
    Calendar,
    Edit2,
    Baby,
    AlertTriangle,
    CheckCircle2,
    FileText,
    History,
    Briefcase
} from "lucide-react";

type TabId = "stammdaten" | "placements" | "journal";

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

export default function FosterFamilyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const familyId = params?.id as string;
    const { user, userProfile, loading: authLoading } = useAuth();

    // Data State
    const [family, setFamily] = useState<FosterFamily | null>(null);
    const [placements, setPlacements] = useState<FosterPlacement[]>([]);
    const [children, setChildren] = useState<FosterChild[]>([]);
    const [journalEntries, setJournalEntries] = useState<FosterJournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>("stammdaten");
    const [toast, setToast] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Form State (Stammdaten)
    const [p1FirstName, setP1FirstName] = useState("");
    const [p1LastName, setP1LastName] = useState("");
    const [p1BirthDate, setP1BirthDate] = useState("");
    const [p1Email, setP1Email] = useState("");
    const [p1Phone, setP1Phone] = useState("");
    const [p1Occupation, setP1Occupation] = useState("");

    const [hasPartner, setHasPartner] = useState(false);
    const [p2FirstName, setP2FirstName] = useState("");
    const [p2LastName, setP2LastName] = useState("");
    const [p2BirthDate, setP2BirthDate] = useState("");
    const [p2Email, setP2Email] = useState("");
    const [p2Phone, setP2Phone] = useState("");
    const [p2Occupation, setP2Occupation] = useState("");

    const [street, setStreet] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [city, setCity] = useState("");
    const [status, setStatus] = useState<FosterFamily['status']>("aktiv");
    const [capacity, setCapacity] = useState(1);
    const [ageMin, setAgeMin] = useState(0);
    const [ageMax, setAgeMax] = useState(18);
    const [selectedGenders, setSelectedGenders] = useState<FosterChild['gender'][]>([]);
    const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>([]);
    const [notes, setNotes] = useState("");

    // Placement Form State
    const [selectedChildId, setSelectedChildId] = useState("");
    const [placementStartDate, setPlacementStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [placementNotes, setPlacementNotes] = useState("");
    const [isPlacementSaving, setIsPlacementSaving] = useState(false);

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
        if (!familyId) return;
        setLoading(true);
        try {
            const [familyData, placementsList, allChildren, journalList] = await Promise.all([
                fosterCareService.getFamilyById(familyId),
                fosterCareService.getPlacementsByFamily(familyId),
                fosterCareService.getChildren(),
                fosterCareService.getJournalEntries(familyId)
            ]);

            if (!familyData) {
                router.push("/foster-care");
                return;
            }

            setFamily(familyData);
            setPlacements(placementsList);
            setChildren(allChildren);
            setJournalEntries(journalList);

            // Populate form states
            setP1FirstName(familyData.parent1.firstName);
            setP1LastName(familyData.parent1.lastName);
            setP1BirthDate(familyData.parent1.birthDate || "");
            setP1Email(familyData.parent1.email || "");
            setP1Phone(familyData.parent1.phone || "");
            setP1Occupation(familyData.parent1.occupation || "");

            if (familyData.parent2) {
                setHasPartner(true);
                setP2FirstName(familyData.parent2.firstName);
                setP2LastName(familyData.parent2.lastName);
                setP2BirthDate(familyData.parent2.birthDate || "");
                setP2Email(familyData.parent2.email || "");
                setP2Phone(familyData.parent2.phone || "");
                setP2Occupation(familyData.parent2.occupation || "");
            } else {
                setHasPartner(false);
                setP2FirstName("");
                setP2LastName("");
                setP2BirthDate("");
                setP2Email("");
                setP2Phone("");
                setP2Occupation("");
            }

            setStreet(familyData.address.street);
            setZipCode(familyData.address.zipCode);
            setCity(familyData.address.city);
            setStatus(familyData.status);
            setCapacity(familyData.capacity);
            setAgeMin(familyData.preferences.ageMin);
            setAgeMax(familyData.preferences.ageMax);
            setSelectedGenders(familyData.preferences.genders || []);
            setSelectedCareTypes(familyData.preferences.careTypes || []);
            setNotes(familyData.notes || "");

        } catch (error) {
            console.error("Error loading foster family details:", error);
        } finally {
            setLoading(false);
        }
    }, [familyId, router]);

    useEffect(() => {
        if (user && userProfile) {
            loadData();
        }
    }, [user, userProfile, loadData]);

    // Save Stammdaten
    const handleSaveFamily = async () => {
        if (!p1FirstName.trim() || !p1LastName.trim() || !street.trim() || !zipCode.trim() || !city.trim()) {
            alert("Bitte füllen Sie alle Pflichtfelder aus.");
            return;
        }

        setIsSaving(true);
        try {
            const parent1: FosterParent = {
                firstName: p1FirstName.trim(),
                lastName: p1LastName.trim(),
                birthDate: p1BirthDate || undefined,
                email: p1Email.trim() || undefined,
                phone: p1Phone.trim() || undefined,
                occupation: p1Occupation.trim() || undefined
            };

            const parent2: FosterParent | undefined = hasPartner && p2FirstName.trim() && p2LastName.trim() ? {
                firstName: p2FirstName.trim(),
                lastName: p2LastName.trim(),
                birthDate: p2BirthDate || undefined,
                email: p2Email.trim() || undefined,
                phone: p2Phone.trim() || undefined,
                occupation: p2Occupation.trim() || undefined
            } : undefined;

            await fosterCareService.updateFamily(familyId, {
                parent1,
                parent2: parent2 || undefined,
                address: {
                    street: street.trim(),
                    zipCode: zipCode.trim(),
                    city: city.trim()
                },
                status,
                capacity,
                preferences: {
                    ageMin,
                    ageMax,
                    genders: selectedGenders,
                    careTypes: selectedCareTypes as FosterFamily['preferences']['careTypes']
                },
                notes: notes.trim() || undefined
            });

            setToast("Stammdaten erfolgreich gespeichert.");
            await loadData();
        } catch (error) {
            console.error("Error updating family:", error);
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

    // Gender Checkbox Handler
    const handleGenderCheckbox = (gender: FosterChild['gender']) => {
        setSelectedGenders(prev =>
            prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
        );
    };

    // CareType Checkbox Handler
    const handleCareTypeCheckbox = (careType: string) => {
        setSelectedCareTypes(prev =>
            prev.includes(careType) ? prev.filter(t => t !== careType) : [...prev, careType]
        );
    };

    // Create Placement (Matching)
    const handleCreatePlacement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChildId || !placementStartDate) {
            alert("Bitte wählen Sie ein Kind und ein Startdatum aus.");
            return;
        }

        setIsPlacementSaving(true);
        try {
            await fosterCareService.createPlacement({
                familyId,
                childId: selectedChildId,
                startDate: new Date(placementStartDate),
                notes: placementNotes.trim() || undefined
            });

            setToast("Vermittlung erfolgreich durchgeführt.");
            setSelectedChildId("");
            setPlacementNotes("");
            await loadData();
        } catch (error) {
            console.error("Error creating placement:", error);
            alert("Fehler bei der Vermittlung.");
        } finally {
            setIsPlacementSaving(false);
        }
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
        setJournalCreateTime(false); // Can't create new time entry on edit (usually already exists or not linked)
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
                    familyId,
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

    // Map children for display
    const childrenMap = useMemo(() => {
        return new Map(children.map(c => [c.id, c]));
    }, [children]);

    // Filter unplaced children matching family preferences
    const matchingUnplacedChildren = useMemo(() => {
        return children.filter(c => {
            if (c.placementStatus !== 'unplaced') return false;
            
            // Filter by age pref
            const age = getAge(c.birthDate);
            if (age < ageMin || age > ageMax) return false;

            // Filter by gender pref
            if (selectedGenders.length > 0 && !selectedGenders.includes(c.gender)) return false;

            return true;
        });
    }, [children, ageMin, ageMax, selectedGenders]);

    // Placements separated into Active & Past
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

    if (!family) return null;

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
                                Pflegefamilien-Akte
                            </span>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
                                Fam. {family.parent1.lastName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {activeTab === "stammdaten" && (
                            <Button
                                variant="primary"
                                onClick={handleSaveFamily}
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
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Pflegeeltern</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {family.parent1.firstName}
                                {family.parent2 && ` & ${family.parent2.firstName}`}
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Wohnort</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {family.address.city}
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                            <Baby className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Belegung / Kapazität</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {family.activePlacementsCount} von {family.capacity} Plätzen belegt
                            </p>
                        </div>
                    </Card>

                    <Card className="border-white/50 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 p-4 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Status</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 capitalize">
                                {family.status.replace("_", " ")}
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
                        onClick={() => setActiveTab("placements")}
                        className={`pb-4 text-sm font-semibold transition-all relative ${
                            activeTab === "placements"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        }`}
                    >
                        Belegungen & Matching ({activePlacements.length})
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Side: Parent Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Parent 1 */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <User className="w-5 h-5 text-indigo-500" /> Haupt-Pflegeelternteil (1)
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Vorname *</label>
                                                <input type="text" value={p1FirstName} onChange={e => setP1FirstName(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Nachname *</label>
                                                <input type="text" value={p1LastName} onChange={e => setP1LastName(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Geburtsdatum</label>
                                                <input type="date" value={p1BirthDate} onChange={e => setP1BirthDate(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Beruf</label>
                                                <input type="text" value={p1Occupation} onChange={e => setP1Occupation(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Telefon</label>
                                                <input type="tel" value={p1Phone} onChange={e => setP1Phone(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>E-Mail</label>
                                                <input type="email" value={p1Email} onChange={e => setP1Email(e.target.value)} className={inputCls} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Partner Toggle & Details */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <User className="w-5 h-5 text-indigo-500" /> Partner-Pflegeelternteil (2)
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="hasPartnerCheck"
                                                    checked={hasPartner}
                                                    onChange={e => setHasPartner(e.target.checked)}
                                                    className="rounded accent-indigo-600 cursor-pointer"
                                                />
                                                <label htmlFor="hasPartnerCheck" className="text-sm font-semibold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                                    Lebenspartner hinzufügen
                                                </label>
                                            </div>
                                        </div>

                                        {hasPartner ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                <div>
                                                    <label className={labelCls}>Vorname *</label>
                                                    <input type="text" value={p2FirstName} onChange={e => setP2FirstName(e.target.value)} className={inputCls} required={hasPartner} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Nachname *</label>
                                                    <input type="text" value={p2LastName} onChange={e => setP2LastName(e.target.value)} className={inputCls} required={hasPartner} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Geburtsdatum</label>
                                                    <input type="date" value={p2BirthDate} onChange={e => setP2BirthDate(e.target.value)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Beruf</label>
                                                    <input type="text" value={p2Occupation} onChange={e => setP2Occupation(e.target.value)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Telefon</label>
                                                    <input type="tel" value={p2Phone} onChange={e => setP2Phone(e.target.value)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>E-Mail</label>
                                                    <input type="email" value={p2Email} onChange={e => setP2Email(e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-slate-500 py-2">
                                                Kein Lebenspartner oder zweites Pflegeelternteil hinterlegt.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Address */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <Home className="w-5 h-5 text-indigo-500" /> Wohnort / Anschrift
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className={labelCls}>Straße & Hausnummer *</label>
                                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div>
                                                <label className={labelCls}>PLZ *</label>
                                                <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} className={inputCls} required />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className={labelCls}>Ort *</label>
                                                <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputCls} required />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Notes */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                            <FileText className="w-5 h-5 text-indigo-500" /> Interne Notizen & Bemerkungen
                                        </h3>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className={textareaCls} placeholder="Besonderheiten der Familie, z.B. Haustiere, Hobbies, wichtige medizinische Infos..." />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Side: Status, Capacity & Preferences */}
                            <div className="space-y-6">
                                {/* Status & Kapazitäten */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3">
                                            Status & Kapazität
                                        </h3>
                                        <div>
                                            <label className={labelCls}>Status</label>
                                            <select value={status} onChange={e => setStatus(e.target.value as FosterFamily['status'])} className={inputCls}>
                                                <option value="aktiv">Aktiv</option>
                                                <option value="inaktiv">Inaktiv</option>
                                                <option value="in_prüfung">In Prüfung</option>
                                                <option value="beendet">Beendet</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelCls}>Kapazität (Maximale Plätze)</label>
                                            <input type="number" min="1" max="10" value={capacity} onChange={e => setCapacity(Number(e.target.value) || 1)} className={inputCls} />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Präferenzen */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3">
                                            Aufnahme-Präferenzen
                                        </h3>

                                        {/* Alter */}
                                        <div className="space-y-2">
                                            <label className={labelCls}>Altersbereich (Jahre)</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <span className="text-xs text-gray-400">Mindestalter</span>
                                                    <input type="number" min="0" max="18" value={ageMin} onChange={e => setAgeMin(Number(e.target.value) || 0)} className={inputCls} />
                                                </div>
                                                <span className="self-end pb-2.5 font-bold text-gray-400">—</span>
                                                <div className="flex-1">
                                                    <span className="text-xs text-gray-400">Maximalalter</span>
                                                    <input type="number" min="0" max="18" value={ageMax} onChange={e => setAgeMax(Number(e.target.value) || 18)} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Geschlecht */}
                                        <div className="space-y-2 pt-2">
                                            <label className={labelCls}>Bevorzugte Geschlechter</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(["Männlich", "Weiblich", "Divers"] as FosterChild['gender'][]).map(g => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => handleGenderCheckbox(g)}
                                                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                            selectedGenders.includes(g)
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                                : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                                        }`}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Betreuungsart */}
                                        <div className="space-y-2 pt-2">
                                            <label className={labelCls}>Betreuungsformen</label>
                                            <div className="flex flex-col gap-2">
                                                {["Vollzeitpflege", "Bereitschaftspflege", "Kurzzeitpflege"].map(t => {
                                                    const isChecked = selectedCareTypes.includes(t);
                                                    return (
                                                        <label key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-slate-900/30 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleCareTypeCheckbox(t)}
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{t}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* === PLACEMENTS TAB === */}
                    {activeTab === "placements" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                            {/* Placements List */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Aktive Platzierungen */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                                            <Baby className="w-5 h-5 text-indigo-500" /> Aktive Vermittlungen ({activePlacements.length})
                                        </h3>

                                        {activePlacements.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                                                Momentan sind keine Kinder in dieser Pflegefamilie platziert.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {activePlacements.map(p => {
                                                    const child = childrenMap.get(p.childId);
                                                    if (!child) return null;
                                                    return (
                                                        <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 gap-4">
                                                            <div className="space-y-1">
                                                                <Link href={`/foster-care/children/${child.id}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5">
                                                                    <Baby className="w-4 h-4" />
                                                                    {child.firstName} {child.lastName}
                                                                </Link>
                                                                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    Seit {new Date(p.startDate).toLocaleDateString("de-DE")} ({getAge(child.birthDate)} Jahre alt, {child.gender})
                                                                </p>
                                                                {p.notes && (
                                                                    <p className="text-xs text-gray-600 dark:text-slate-400 italic mt-2">
                                                                        Notiz: {p.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => handleOpenEndPlacementModal(p.id)}
                                                                    className="flex-1 sm:flex-initial text-xs"
                                                                >
                                                                    Platzierung beenden
                                                                </Button>
                                                                <button
                                                                    onClick={() => handleDeletePlacement(p.id)}
                                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                                    title="Platzierung löschen"
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

                                {/* Historische Belegungen */}
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                                            <History className="w-5 h-5 text-indigo-500" /> Historie / Frühere Vermittlungen ({pastPlacements.length})
                                        </h3>

                                        {pastPlacements.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500 dark:text-slate-500">
                                                Es gibt keine historischen Platzierungsdaten für diese Familie.
                                            </div>
                                        ) : (
                                            <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {pastPlacements.map(p => {
                                                    const child = childrenMap.get(p.childId);
                                                    if (!child) return null;
                                                    return (
                                                        <div key={p.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-slate-900/30 text-sm">
                                                            <div className="flex justify-between items-start">
                                                                <Link href={`/foster-care/children/${child.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                                                                    {child.firstName} {child.lastName}
                                                                </Link>
                                                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-lg font-medium">
                                                                    Beendet
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                                                Zeitraum: {new Date(p.startDate).toLocaleDateString("de-DE")} - {p.endDate ? new Date(p.endDate).toLocaleDateString("de-DE") : "unbekannt"}
                                                            </p>
                                                            {p.terminationReason && (
                                                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                                                                        Grund: {p.terminationReason}
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

                            {/* Matching Sidebar Form */}
                            <div className="space-y-6">
                                <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                                            Neues Pflegekind vermitteln
                                        </h3>

                                        {family.status !== "aktiv" ? (
                                            <div className="flex gap-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-900/50">
                                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                                <p>Die Pflegefamilie ist inaktiv, beendet oder in Prüfung. Platzierungen können nur bei aktivem Status vorgenommen werden.</p>
                                            </div>
                                        ) : family.activePlacementsCount >= family.capacity ? (
                                            <div className="flex gap-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-900/50">
                                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                                <p>Die maximale Kapazität von {family.capacity} Plätzen wurde bereits erreicht. Erhöhen Sie die Kapazität unter den Stammdaten, um weitere Kinder zuzuweisen.</p>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleCreatePlacement} className="space-y-4">
                                                <div>
                                                    <label className={labelCls}>Pflegekind auswählen *</label>
                                                    <select
                                                        value={selectedChildId}
                                                        onChange={e => setSelectedChildId(e.target.value)}
                                                        className={inputCls}
                                                        required
                                                    >
                                                        <option value="">-- Kind wählen --</option>
                                                        {matchingUnplacedChildren.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.firstName} {c.lastName} ({getAge(c.birthDate)} J., {c.gender})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        Es werden nur unplatzierte Kinder angezeigt, die dem präferierten Alter ({ageMin}-{ageMax} J.) und Geschlecht entsprechen.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className={labelCls}>Startdatum der Vermittlung *</label>
                                                    <input
                                                        type="date"
                                                        value={placementStartDate}
                                                        onChange={e => setPlacementStartDate(e.target.value)}
                                                        className={inputCls}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className={labelCls}>Vermittlungsnotizen</label>
                                                    <textarea
                                                        value={placementNotes}
                                                        onChange={e => setPlacementNotes(e.target.value)}
                                                        className={textareaCls}
                                                        placeholder="Besondere Absprachen zum Einzug, rechtliche Besonderheiten..."
                                                    />
                                                </div>

                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    disabled={isPlacementSaving}
                                                    className="w-full flex justify-center items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>{isPlacementSaving ? "Vermittelt..." : "Vermittlung durchführen"}</span>
                                                </Button>
                                            </form>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* === JOURNAL TAB === */}
                    {activeTab === "journal" && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" /> Begleit- & Beratungsjournal der Familie
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
                                        Dokumentieren Sie hier Hausbesuche, Telefonate oder Beratungstermine für diese Familie.
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
                            <p>Durch das Beenden wird der Status des Pflegekindes wieder auf &quot;Unplatziert&quot; gesetzt, und der belegte Platz in der Pflegefamilie wird freigegeben.</p>
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
                                placeholder="Inhalte des Termins, besprochene Meilensteine, Herausforderungen..."
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
