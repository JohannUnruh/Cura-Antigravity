"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { familyHelperService } from "@/lib/firebase/services/familyHelperService";
import { userService } from "@/lib/firebase/services/userService";
import { FamilyCase, UserProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { 
    Plus, 
    Search, 
    Clock, 
    Users, 
    User, 
    FolderOpen, 
    Trash2, 
    Calendar,
    SearchX
} from "lucide-react";

interface CaseWithHours extends FamilyCase {
    actualHours: number;
    targetHours: number;
}

interface FamilyMemberInput {
    firstName: string;
    lastName: string;
    relation: string;
}

export default function FamilyHelperDashboard() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { settings } = useSettings();

    // Cases & Users data
    const [cases, setCases] = useState<CaseWithHours[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Modal creation states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal Form Fields
    const [familyName, setFamilyName] = useState("");
    const [caseNumber, setCaseNumber] = useState("");
    const [status, setStatus] = useState<'aktiv' | 'inaktiv' | 'beendet'>('aktiv');
    const [assignedWorkerId, setAssignedWorkerId] = useState("");
    const [mandate, setMandate] = useState("");
    const [members, setMembers] = useState<FamilyMemberInput[]>([]);
    const [hasFunding, setHasFunding] = useState(false);
    const [hoursGranted, setHoursGranted] = useState<string>("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Filtering & Searching States
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("alle");
    const [workerFilter, setWorkerFilter] = useState("alle");
    const [sortBy, setSortBy] = useState("familyNameAsc");

    const familyRelations = useMemo(() => {
        return settings?.familyMemberRelations || ['Kind', 'Mutter', 'Vater', 'Pflegeeltern', 'Sonstige'];
    }, [settings]);

    const loadData = useCallback(async () => {
        if (!user || !userProfile) return;
        setLoadingData(true);
        try {
            // Fetch cases
            const rawCases = await familyHelperService.getCases(
                userProfile.role === 'Admin' ? undefined : user.uid
            );

            // Fetch journal entries for all cases in parallel to compute hours
            const casesWithHoursData = await Promise.all(
                rawCases.map(async (c) => {
                    const actualHours = c.id
                        ? (await familyHelperService.getJournalEntries(c.id)).reduce(
                              (sum, entry) => sum + (entry.durationInHours || 0),
                              0
                          )
                        : 0;
                    const targetHours = c.fundingCommitment?.hoursGranted || 0;
                    return {
                        ...c,
                        actualHours,
                        targetHours,
                    };
                })
            );
            setCases(casesWithHoursData);

            // Fetch users list (only for Admins)
            if (userProfile.role === 'Admin') {
                const allUsers = await userService.getAllUsers();
                setUsers(allUsers);
            }
        } catch (error) {
            console.error("Error loading SPFH dashboard data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (user && userProfile) {
            loadData();
        }
    }, [user, userProfile, loadData]);

    const handleOpenNewModal = () => {
        setFamilyName("");
        setCaseNumber("");
        setStatus("aktiv");
        setAssignedWorkerId(user?.uid || "");
        setMandate("");
        setMembers([]);
        setHasFunding(false);
        setHoursGranted("");
        setStartDate("");
        setEndDate("");
        setIsModalOpen(true);
    };

    const handleAddMember = () => {
        setMembers((prev) => [
            ...prev,
            { firstName: "", lastName: familyName || "", relation: familyRelations[0] || "Kind" },
        ]);
    };

    const handleRemoveMember = (index: number) => {
        setMembers((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleMemberChange = (index: number, field: keyof FamilyMemberInput, value: string) => {
        setMembers((prev) =>
            prev.map((m, idx) => (idx === index ? { ...m, [field]: value } : m))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!familyName.trim() || !caseNumber.trim()) {
            return;
        }

        const workerId = userProfile?.role === 'Admin' ? assignedWorkerId : user?.uid;
        if (!workerId) {
            alert("Bitte wählen Sie einen zugewiesenen Mitarbeiter aus.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                familyName: familyName.trim(),
                caseNumber: caseNumber.trim(),
                assignedWorkerId: workerId,
                status,
                mandate: mandate.trim() || undefined,
                members: members.map((m) => ({
                    firstName: m.firstName.trim(),
                    lastName: m.lastName.trim(),
                    relation: m.relation,
                })),
                fundingCommitment:
                    hasFunding && hoursGranted && startDate && endDate
                        ? {
                               hoursGranted: Number(hoursGranted),
                               startDate,
                               endDate,
                           }
                        : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await familyHelperService.createCase(payload);
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Error creating new SPFH case:", error);
            alert("Fehler beim Erstellen des Falls.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to map worker ID to worker name
    const getWorkerName = (workerId: string) => {
        const foundUser = users.find((u) => u.id === workerId);
        if (foundUser) {
            return `${foundUser.firstName} ${foundUser.lastName}`;
        }
        if (workerId === user?.uid && userProfile) {
            return `${userProfile.firstName} ${userProfile.lastName}`;
        }
        return workerId;
    };

    // Calculate overall stats
    const stats = useMemo(() => {
        const activeCases = cases.filter((c) => c.status === "aktiv").length;
        const totalActualHours = cases.reduce((sum, c) => sum + c.actualHours, 0);
        const totalTargetHours = cases.reduce((sum, c) => sum + c.targetHours, 0);
        return { activeCases, totalActualHours, totalTargetHours };
    }, [cases]);

    // Filtering and sorting logic
    const filteredCases = useMemo(() => {
        return cases
            .filter((c) => {
                const query = searchTerm.toLowerCase();
                const matchesSearch =
                    c.familyName.toLowerCase().includes(query) ||
                    c.caseNumber.toLowerCase().includes(query);

                const matchesStatus = statusFilter === "alle" || c.status === statusFilter;

                const matchesWorker =
                    userProfile?.role !== "Admin" ||
                    workerFilter === "alle" ||
                    c.assignedWorkerId === workerFilter;

                return matchesSearch && matchesStatus && matchesWorker;
            })
            .sort((a, b) => {
                if (sortBy === "familyNameAsc") {
                    return a.familyName.localeCompare(b.familyName);
                }
                if (sortBy === "familyNameDesc") {
                    return b.familyName.localeCompare(a.familyName);
                }
                if (sortBy === "createdAtAsc") {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                if (sortBy === "createdAtDesc") {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return 0;
            });
    }, [cases, searchTerm, statusFilter, workerFilter, sortBy, userProfile?.role]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <ProtectedRoute requiredPermission="hasFamilyHelperAccess">
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6">
                
                {/* Header & Stats Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            Familienhilfe (SPFH)
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            Fallverwaltung und Stundenübersicht für die Sozialpädagogische Familienhilfe
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleOpenNewModal}
                        className="flex items-center gap-2 px-6"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Neuer Fall</span>
                    </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Aktive Fälle
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {loadingData ? "..." : stats.activeCases}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100/50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Gesamte Ist-Stunden
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {loadingData ? "..." : `${stats.totalActualHours.toFixed(1)} Std.`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100/50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Gesamte Soll-Stunden
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {loadingData ? "..." : `${stats.totalTargetHours.toFixed(1)} Std.`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Controls */}
                <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                    <CardContent className="p-4">
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${userProfile?.role === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Fallnummer oder Familienname..."
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
                                    <option value="alle">Alle Status</option>
                                    <option value="aktiv">Aktiv</option>
                                    <option value="inaktiv">Inaktiv</option>
                                    <option value="beendet">Beendet</option>
                                </select>
                            </div>

                            {/* Assigned Worker (Admin only) */}
                            {userProfile?.role === 'Admin' && (
                                <div>
                                    <select
                                        value={workerFilter}
                                        onChange={(e) => setWorkerFilter(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value="alle">Alle Mitarbeiter</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.firstName} {u.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Sorting */}
                            <div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="familyNameAsc">Name (A-Z)</option>
                                    <option value="familyNameDesc">Name (Z-A)</option>
                                    <option value="createdAtDesc">Neueste zuerst</option>
                                    <option value="createdAtAsc">Älteste zuerst</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cases Grid/List */}
                {loadingData ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-500 font-medium">Lade Fälle...</span>
                    </div>
                ) : filteredCases.length === 0 ? (
                    <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 p-12 text-center">
                        <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-950 dark:text-white mb-1">Keine Fälle gefunden</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Es gibt keine Fälle, die Ihren Filtern entsprechen.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCases.map((c) => {
                            const percentage = c.targetHours > 0 ? Math.min(100, (c.actualHours / c.targetHours) * 100) : 0;
                            const statusColors = {
                                aktiv: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                inaktiv: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                beendet: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50",
                            };

                            return (
                                <Link key={c.id} href={`/family-helper/${c.id}`} className="block group">
                                    <Card className="h-full border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between">
                                        <CardContent className="p-6 space-y-4 flex-1">
                                            {/* Family Name & Status Badge */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        Familie {c.familyName}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 font-mono">
                                                        Fallnr: {c.caseNumber}
                                                    </p>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[c.status]}`}>
                                                    {c.status}
                                                </span>
                                            </div>

                                            {/* Assigned Worker */}
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span>
                                                    Mitarbeiter: <strong className="font-semibold text-gray-800 dark:text-slate-200">{getWorkerName(c.assignedWorkerId)}</strong>
                                                </span>
                                            </div>

                                            {/* Family members count */}
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span>
                                                    Mitglieder: <strong className="font-semibold text-gray-800 dark:text-slate-200">{c.members?.length || 0}</strong>
                                                </span>
                                            </div>
                                        </CardContent>

                                        {/* Hours progress bar */}
                                        <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/20 dark:bg-slate-900/20">
                                            <div className="flex justify-between text-xs font-semibold mb-1.5 text-gray-500 dark:text-slate-400">
                                                <span>Ist: {c.actualHours.toFixed(1)} Std.</span>
                                                <span>Soll: {c.targetHours.toFixed(1)} Std.</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        percentage >= 100 
                                                            ? 'bg-emerald-500' 
                                                            : percentage >= 80 
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
                )}

                {/* "Neuer Fall" Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Neuen SPFH-Fall anlegen"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Familienname */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                    Familienname <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    placeholder="z.B. Müller"
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Fallnummer */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                    Fallnummer <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={caseNumber}
                                    onChange={(e) => setCaseNumber(e.target.value)}
                                    placeholder="z.B. SPFH-2026-004"
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as 'aktiv' | 'inaktiv' | 'beendet')}
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                >
                                    <option value="aktiv">Aktiv</option>
                                    <option value="inaktiv">Inaktiv</option>
                                    <option value="beendet">Beendet</option>
                                </select>
                            </div>

                            {/* Zugewiesener Mitarbeiter */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                    Zugewiesener Mitarbeiter
                                </label>
                                {userProfile?.role === "Admin" ? (
                                    <select
                                        value={assignedWorkerId}
                                        onChange={(e) => setAssignedWorkerId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- Mitarbeiter auswählen --</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.firstName} {u.lastName} ({u.role})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-slate-400 font-medium cursor-not-allowed"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Jugendamt-Auftrag / Hilfebedarf */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                Jugendamt-Auftrag / Hilfebedarf
                            </label>
                            <textarea
                                value={mandate}
                                onChange={(e) => setMandate(e.target.value)}
                                placeholder="Beschreibung des offiziellen Auftrags durch das Jugendamt..."
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white text-sm resize-y"
                            />
                        </div>

                        {/* Familienmitglieder Inline Builder */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                                    Familienmitglieder
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddMember}
                                    className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Mitglied hinzufügen</span>
                                </Button>
                            </div>

                            {members.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-slate-500 italic">
                                    Keine Mitglieder hinzugefügt.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {members.map((member, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Vorname"
                                                    value={member.firstName}
                                                    onChange={(e) => handleMemberChange(index, "firstName", e.target.value)}
                                                    required
                                                    className="px-3 py-1.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-gray-900 dark:text-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Nachname"
                                                    value={member.lastName}
                                                    onChange={(e) => handleMemberChange(index, "lastName", e.target.value)}
                                                    required
                                                    className="px-3 py-1.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-gray-900 dark:text-white"
                                                />
                                                <select
                                                    value={member.relation}
                                                    onChange={(e) => handleMemberChange(index, "relation", e.target.value)}
                                                    className="px-3 py-1.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-gray-900 dark:text-white"
                                                >
                                                    {familyRelations.map((rel) => (
                                                        <option key={rel} value={rel}>
                                                            {rel}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMember(index)}
                                                className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                title="Mitglied entfernen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Optional Funding Commitment */}
                        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hasFunding"
                                    checked={hasFunding}
                                    onChange={(e) => setHasFunding(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <label htmlFor="hasFunding" className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none">
                                    Bewilligung hinterlegen (Stundenbudget)
                                </label>
                            </div>

                            {hasFunding && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50/30 dark:bg-slate-900/30 rounded-2xl border border-gray-200/50 dark:border-white/5">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                            Bewilligte Stunden
                                        </label>
                                        <input
                                            type="number"
                                            value={hoursGranted}
                                            onChange={(e) => setHoursGranted(e.target.value)}
                                            min="0"
                                            required={hasFunding}
                                            className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                            Startdatum
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required={hasFunding}
                                            className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-slate-300">
                                            Enddatum
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            required={hasFunding}
                                            className="w-full px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                            >
                                Abbrechen
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSaving}
                                className="px-6"
                            >
                                {isSaving ? "Wird gespeichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                </Modal>

            </div>
        </ProtectedRoute>
    );
}
