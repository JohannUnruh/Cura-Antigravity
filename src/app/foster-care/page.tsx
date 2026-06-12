"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { fosterCareService } from "@/lib/firebase/services/fosterCareService";
import { FosterFamily, FosterChild, FosterParent } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { 
    Plus, 
    Search, 
    Baby, 
    Users, 
    Home, 
    MapPin, 
    Calendar, 
    ArrowRight, 
    Shield, 
    User, 
    Activity, 
    SearchX 
} from "lucide-react";

type TabId = "families" | "children";

export default function FosterCareDashboard() {
    const { user, userProfile, loading: authLoading } = useAuth();
    
    // Core data
    const [families, setFamilies] = useState<FosterFamily[]>([]);
    const [children, setChildren] = useState<FosterChild[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<TabId>("families");

    // Filtering & Sorting
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("alle");
    const [sortBy, setSortBy] = useState("nameAsc");

    // Modal creation states
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields - FosterFamily
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
    const [familyStatus, setFamilyStatus] = useState<FosterFamily['status']>("aktiv");
    const [capacity, setCapacity] = useState("1");
    const [ageMin, setAgeMin] = useState("0");
    const [ageMax, setAgeMax] = useState("18");
    const [selectedGenders, setSelectedGenders] = useState<FosterChild['gender'][]>(["Männlich", "Weiblich", "Divers"]);
    const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>(["Vollzeitpflege"]);
    const [familyNotes, setFamilyNotes] = useState("");

    // Form fields - FosterChild
    const [childFirstName, setChildFirstName] = useState("");
    const [childLastName, setChildLastName] = useState("");
    const [childBirthDate, setChildBirthDate] = useState("");
    const [childGender, setChildGender] = useState<FosterChild['gender']>("Männlich");
    const [custodyStatus, setCustodyStatus] = useState("");
    const [guardianName, setGuardianName] = useState("");
    const [guardianContact, setGuardianContact] = useState("");
    const [originFamilyDetails, setOriginFamilyDetails] = useState("");
    const [childNotes, setChildNotes] = useState("");

    const loadData = useCallback(async () => {
        if (!user || !userProfile) return;
        setLoadingData(true);
        try {
            const [familiesList, childrenList] = await Promise.all([
                fosterCareService.getFamilies(),
                fosterCareService.getChildren()
            ]);
            setFamilies(familiesList);
            setChildren(childrenList);
        } catch (error) {
            console.error("Error loading foster care data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (user && userProfile) {
            loadData();
        }
    }, [user, userProfile, loadData]);

    const handleOpenNewFamilyModal = () => {
        setP1FirstName("");
        setP1LastName("");
        setP1BirthDate("");
        setP1Email("");
        setP1Phone("");
        setP1Occupation("");
        setHasPartner(false);
        setP2FirstName("");
        setP2LastName("");
        setP2BirthDate("");
        setP2Email("");
        setP2Phone("");
        setP2Occupation("");
        setStreet("");
        setZipCode("");
        setCity("");
        setFamilyStatus("aktiv");
        setCapacity("1");
        setAgeMin("0");
        setAgeMax("18");
        setSelectedGenders(["Männlich", "Weiblich", "Divers"]);
        setSelectedCareTypes(["Vollzeitpflege"]);
        setFamilyNotes("");
        setIsFamilyModalOpen(true);
    };

    const handleOpenNewChildModal = () => {
        setChildFirstName("");
        setChildLastName("");
        setChildBirthDate("");
        setChildGender("Männlich");
        setCustodyStatus("Gemeinsam");
        setGuardianName("");
        setGuardianContact("");
        setOriginFamilyDetails("");
        setChildNotes("");
        setIsChildModalOpen(true);
    };

    const handleGenderCheckbox = (gender: FosterChild['gender']) => {
        setSelectedGenders(prev => 
            prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
        );
    };

    const handleCareTypeCheckbox = (careType: string) => {
        setSelectedCareTypes(prev =>
            prev.includes(careType) ? prev.filter(t => t !== careType) : [...prev, careType]
        );
    };

    const handleSubmitFamily = async (e: React.FormEvent) => {
        e.preventDefault();
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

            await fosterCareService.createFamily({
                parent1,
                parent2,
                address: {
                    street: street.trim(),
                    zipCode: zipCode.trim(),
                    city: city.trim()
                },
                status: familyStatus,
                capacity: Number(capacity) || 1,
                preferences: {
                    ageMin: Number(ageMin) || 0,
                    ageMax: Number(ageMax) || 18,
                    genders: selectedGenders,
                    careTypes: selectedCareTypes as FosterFamily['preferences']['careTypes']
                },
                notes: familyNotes.trim() || undefined
            });

            setIsFamilyModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Error saving foster family:", error);
            alert("Fehler beim Erstellen der Pflegefamilie.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmitChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!childFirstName.trim() || !childLastName.trim() || !childBirthDate) {
            alert("Bitte füllen Sie alle Pflichtfelder aus.");
            return;
        }

        setIsSaving(true);
        try {
            await fosterCareService.createChild({
                firstName: childFirstName.trim(),
                lastName: childLastName.trim(),
                birthDate: new Date(childBirthDate),
                gender: childGender,
                custodyStatus: custodyStatus.trim(),
                guardianName: guardianName.trim() || undefined,
                guardianContact: guardianContact.trim() || undefined,
                originFamilyDetails: originFamilyDetails.trim() || undefined,
                notes: childNotes.trim() || undefined
            });

            setIsChildModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Error saving foster child:", error);
            alert("Fehler beim Anlegen des Pflegekindes.");
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

    // Filtering & Sorting families
    const filteredFamilies = useMemo(() => {
        return families
            .filter(f => {
                const query = searchTerm.toLowerCase();
                const matchesSearch = 
                    f.parent1.firstName.toLowerCase().includes(query) ||
                    f.parent1.lastName.toLowerCase().includes(query) ||
                    f.parent2?.firstName.toLowerCase().includes(query) ||
                    f.parent2?.lastName.toLowerCase().includes(query) ||
                    f.address.city.toLowerCase().includes(query);

                const matchesStatus = statusFilter === "alle" || f.status === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === "nameAsc") {
                    return a.parent1.lastName.localeCompare(b.parent1.lastName);
                }
                if (sortBy === "nameDesc") {
                    return b.parent1.lastName.localeCompare(a.parent1.lastName);
                }
                return 0;
            });
    }, [families, searchTerm, statusFilter, sortBy]);

    // Filtering & Sorting children
    const filteredChildren = useMemo(() => {
        return children
            .filter(c => {
                const query = searchTerm.toLowerCase();
                const matchesSearch = 
                    c.firstName.toLowerCase().includes(query) ||
                    c.lastName.toLowerCase().includes(query);

                const matchesStatus = 
                    statusFilter === "alle" || 
                    c.placementStatus === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === "nameAsc") {
                    return a.lastName.localeCompare(b.lastName);
                }
                if (sortBy === "nameDesc") {
                    return b.lastName.localeCompare(a.lastName);
                }
                return 0;
            });
    }, [children, searchTerm, statusFilter, sortBy]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <ProtectedRoute requiredPermission="hasFosterCareAccess">
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                            <Baby className="w-9 h-9 text-indigo-500" /> Pflegefamilien & Pflegekinder
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            Ressourcenverwaltung, Vermittlung und Fachdienstbegleitung
                        </p>
                    </div>
                    {activeTab === "families" ? (
                        <Button
                            variant="primary"
                            onClick={handleOpenNewFamilyModal}
                            className="flex items-center gap-2 px-6 shadow-md"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Neue Pflegefamilie</span>
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleOpenNewChildModal}
                            className="flex items-center gap-2 px-6 shadow-md"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Neues Pflegekind</span>
                        </Button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 overflow-x-auto bg-white/40 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-white/50 dark:border-white/10 shadow-sm w-fit">
                    <button
                        onClick={() => {
                            setActiveTab("families");
                            setStatusFilter("alle");
                            setSearchTerm("");
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === "families"
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-gray-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5"
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Pflegeeltern-Pool</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("children");
                            setStatusFilter("alle");
                            setSearchTerm("");
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === "children"
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-gray-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5"
                        }`}
                    >
                        <Baby className="w-4 h-4" />
                        <span>Pflegekinder-Akten</span>
                    </button>
                </div>

                {/* Filters */}
                <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === "families" ? "Name der Pflegeeltern, Stadt..." : "Name des Kindes..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm"
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm"
                                >
                                    {activeTab === "families" ? (
                                        <>
                                            <option value="alle">Alle Status</option>
                                            <option value="aktiv">Aktiv</option>
                                            <option value="inaktiv">Inaktiv</option>
                                            <option value="in_prüfung">In Prüfung</option>
                                            <option value="beendet">Beendet</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="alle">Alle Platzierungsstatus</option>
                                            <option value="unplaced">Unplatziert (Suchend)</option>
                                            <option value="placed">Platziert</option>
                                            <option value="beendet">Beendet</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Sorting */}
                            <div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="nameAsc">Name (A-Z)</option>
                                    <option value="nameDesc">Name (Z-A)</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Grid */}
                {loadingData ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-500 font-medium">Lade Daten...</span>
                    </div>
                ) : activeTab === "families" ? (
                    // === FAMILIES TAB ===
                    filteredFamilies.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 p-12 text-center">
                            <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-950 dark:text-white mb-1">Keine Pflegeeltern gefunden</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Es gibt keine Pflegefamilien, die Ihren Filtern entsprechen.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFamilies.map((f) => {
                                const percentage = f.capacity > 0 ? Math.min(100, (f.activePlacementsCount / f.capacity) * 100) : 0;
                                const statusColors = {
                                    aktiv: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                    inaktiv: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
                                    in_prüfung: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                    beendet: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50",
                                };

                                return (
                                    <Link key={f.id} href={`/foster-care/families/${f.id}`} className="block group">
                                        <Card className="h-full border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden">
                                            <CardContent className="p-6 space-y-4 flex-1">
                                                {/* Header Info */}
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            Fam. {f.parent1.lastName}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {f.address.zipCode} {f.address.city}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[f.status]}`}>
                                                        {f.status.replace("_", " ")}
                                                    </span>
                                                </div>

                                                {/* Eltern-Info */}
                                                <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                                                    <p className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        <User className="w-4 h-4 text-indigo-400" />
                                                        {f.parent1.firstName}
                                                        {f.parent2 && ` & ${f.parent2.firstName}`}
                                                    </p>
                                                </div>

                                                {/* Präferenzen */}
                                                <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Präferenzen</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg">
                                                            Alter: {f.preferences.ageMin}-{f.preferences.ageMax} Jahre
                                                        </span>
                                                        {f.preferences.careTypes?.map(t => (
                                                            <span key={t} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>

                                            {/* Capacity bar */}
                                            <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/20 dark:bg-slate-900/20">
                                                <div className="flex justify-between text-xs font-semibold mb-1.5 text-gray-500 dark:text-slate-400">
                                                    <span>Belegung: {f.activePlacementsCount} Plätze</span>
                                                    <span>Gesamt: {f.capacity}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            percentage >= 100 
                                                                ? 'bg-amber-500' 
                                                                : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )
                ) : (
                    // === CHILDREN TAB ===
                    filteredChildren.length === 0 ? (
                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 p-12 text-center">
                            <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-950 dark:text-white mb-1">Keine Pflegekinder gefunden</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Es gibt keine Pflegekinder, die Ihren Filtern entsprechen.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredChildren.map((c) => {
                                const statusColors = {
                                    unplaced: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
                                    placed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                    beendet: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50",
                                };

                                return (
                                    <Link key={c.id} href={`/foster-care/children/${c.id}`} className="block group">
                                        <Card className="h-full border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden">
                                            <CardContent className="p-6 space-y-4 flex-1">
                                                {/* Header Info */}
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {c.firstName} {c.lastName}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(c.birthDate).toLocaleDateString("de-DE")} ({getAge(c.birthDate)} Jahre)
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[c.placementStatus]}`}>
                                                        {c.placementStatus === "unplaced" ? "Unplatziert" : c.placementStatus === "placed" ? "Platziert" : "Beendet"}
                                                    </span>
                                                </div>

                                                {/* Details */}
                                                <div className="space-y-1.5 text-sm text-gray-600 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-white/5">
                                                    <p>
                                                        Sorgerecht: <strong className="font-semibold text-gray-800 dark:text-slate-200">{c.custodyStatus}</strong>
                                                    </p>
                                                    {c.guardianName && (
                                                        <p>
                                                            Vormund: <strong className="font-semibold text-gray-800 dark:text-slate-200">{c.guardianName}</strong>
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>

                                            <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/20 dark:bg-slate-900/20 flex justify-between items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                <span>Akte einsehen</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )
                )}

                {/* === NEUE PFLEGEFAMILIE MODAL === */}
                <Modal
                    isOpen={isFamilyModalOpen}
                    onClose={() => setIsFamilyModalOpen(false)}
                    title="Neue Pflegefamilie anlegen"
                >
                    <form onSubmit={handleSubmitFamily} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Basisdaten - Elternteil 1 */}
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                                <User className="w-5 h-5 text-indigo-500" /> Haupt-Pflegeelternteil (1)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Vorname <span className="text-red-500">*</span></label>
                                    <input type="text" required value={p1FirstName} onChange={e => setP1FirstName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Nachname <span className="text-red-500">*</span></label>
                                    <input type="text" required value={p1LastName} onChange={e => setP1LastName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Geburtsdatum</label>
                                    <input type="date" value={p1BirthDate} onChange={e => setP1BirthDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Beruf</label>
                                    <input type="text" value={p1Occupation} onChange={e => setP1Occupation(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Telefon</label>
                                    <input type="text" value={p1Phone} onChange={e => setP1Phone(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">E-Mail</label>
                                    <input type="email" value={p1Email} onChange={e => setP1Email(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Partner Checkbox */}
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="hasPartner" 
                                checked={hasPartner} 
                                onChange={e => setHasPartner(e.target.checked)}
                                className="rounded accent-indigo-600" 
                            />
                            <label htmlFor="hasPartner" className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none">
                                Zweites Pflegeelternteil / Lebenspartner hinzufügen
                            </label>
                        </div>

                        {/* Basisdaten - Elternteil 2 */}
                        {hasPartner && (
                            <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                                    <User className="w-5 h-5 text-indigo-500" /> Partner-Pflegeelternteil (2)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Vorname <span className="text-red-500">*</span></label>
                                        <input type="text" required={hasPartner} value={p2FirstName} onChange={e => setP2FirstName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Nachname <span className="text-red-500">*</span></label>
                                        <input type="text" required={hasPartner} value={p2LastName} onChange={e => setP2LastName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Geburtsdatum</label>
                                        <input type="date" value={p2BirthDate} onChange={e => setP2BirthDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Beruf</label>
                                        <input type="text" value={p2Occupation} onChange={e => setP2Occupation(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Telefon</label>
                                        <input type="text" value={p2Phone} onChange={e => setP2Phone(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">E-Mail</label>
                                        <input type="email" value={p2Email} onChange={e => setP2Email(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Anschrift */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                                <Home className="w-5 h-5 text-indigo-500" /> Wohnort / Anschrift
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Straße & Hausnummer <span className="text-red-500">*</span></label>
                                    <input type="text" required value={street} onChange={e => setStreet(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">PLZ <span className="text-red-500">*</span></label>
                                    <input type="text" required value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Ort <span className="text-red-500">*</span></label>
                                    <input type="text" required value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Status & Kapazitäten */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                                <Activity className="w-5 h-5 text-indigo-500" /> Status & Kapazitäten
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Überprüfungsstatus</label>
                                    <select value={familyStatus} onChange={e => setFamilyStatus(e.target.value as FosterFamily['status'])} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm">
                                        <option value="aktiv">Aktiv (Belegbar)</option>
                                        <option value="in_prüfung">Bewerber / In Prüfung</option>
                                        <option value="inaktiv">Inaktiv (Pausiert)</option>
                                        <option value="beendet">Beendet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Gesamte Kapazität (Plätze)</label>
                                    <input type="number" min="1" max="10" required value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Alter von</label>
                                        <input type="number" min="0" max="18" required value={ageMin} onChange={e => setAgeMin(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Alter bis</label>
                                        <input type="number" min="0" max="18" required value={ageMax} onChange={e => setAgeMax(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Präferenzen & Pflegeart */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Pflegearten</label>
                                <div className="space-y-2">
                                    {["Vollzeitpflege", "Bereitschaftspflege", "Kurzzeitpflege"].map(t => (
                                        <label key={t} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCareTypes.includes(t)} 
                                                onChange={() => handleCareTypeCheckbox(t)}
                                                className="rounded accent-indigo-600" 
                                            />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Geschlecht</label>
                                <div className="space-y-2">
                                    {["Männlich", "Weiblich", "Divers"].map(g => (
                                        <label key={g} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedGenders.includes(g as FosterChild['gender'])} 
                                                onChange={() => handleGenderCheckbox(g as FosterChild['gender'])}
                                                className="rounded accent-indigo-600" 
                                            />
                                            {g}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sonstige Notizen */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Besondere Hinweise / Notizen</label>
                            <textarea value={familyNotes} onChange={e => setFamilyNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm resize-y" placeholder="Zusätzliche Infos wie Haustiere, Wohnsituation, etc." />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                            <Button type="button" variant="ghost" onClick={() => setIsFamilyModalOpen(false)} disabled={isSaving}>
                                Abbrechen
                            </Button>
                            <Button type="submit" variant="primary" disabled={isSaving} className="px-6">
                                {isSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* === NEUES PFLEGEKIND MODAL === */}
                <Modal
                    isOpen={isChildModalOpen}
                    onClose={() => setIsChildModalOpen(false)}
                    title="Neues Pflegekind anlegen"
                >
                    <form onSubmit={handleSubmitChild} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Vorname <span className="text-red-500">*</span></label>
                                <input type="text" required value={childFirstName} onChange={e => setChildFirstName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Nachname <span className="text-red-500">*</span></label>
                                <input type="text" required value={childLastName} onChange={e => setChildLastName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Geburtsdatum <span className="text-red-500">*</span></label>
                                <input type="date" required value={childBirthDate} onChange={e => setChildBirthDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Geschlecht</label>
                                <select value={childGender} onChange={e => setChildGender(e.target.value as FosterChild['gender'])} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm">
                                    <option value="Männlich">Männlich</option>
                                    <option value="Weiblich">Weiblich</option>
                                    <option value="Divers">Divers</option>
                                </select>
                            </div>
                        </div>

                        {/* Sorgerecht & Vormund */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                                <Shield className="w-5 h-5 text-indigo-500" /> Rechtlicher Status
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Sorgerechtsstatus</label>
                                    <input type="text" placeholder="z.B. Jugendamt, Alleinsorge" value={custodyStatus} onChange={e => setCustodyStatus(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Name des Vormunds</label>
                                    <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">Kontakt Vormund</label>
                                    <input type="text" placeholder="Telefon oder E-Mail" value={guardianContact} onChange={e => setGuardianContact(e.target.value)} className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Herkunftsfamilie */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Herkunftsfamilie & Umgangskontakte</label>
                            <textarea value={originFamilyDetails} onChange={e => setOriginFamilyDetails(e.target.value)} rows={2} className="w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm resize-y" placeholder="Regelungen und Kontaktdaten der leiblichen Eltern..." />
                        </div>

                        {/* Sonstige Hinweise */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Sonstige Hinweise</label>
                            <textarea value={childNotes} onChange={e => setChildNotes(e.target.value)} rows={2} className="w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm resize-y" placeholder="Zusätzliche Notizen zum Kind..." />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                            <Button type="button" variant="ghost" onClick={() => setIsChildModalOpen(false)} disabled={isSaving}>
                                Abbrechen
                            </Button>
                            <Button type="submit" variant="primary" disabled={isSaving} className="px-6">
                                {isSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

            </div>
        </ProtectedRoute>
    );
}
