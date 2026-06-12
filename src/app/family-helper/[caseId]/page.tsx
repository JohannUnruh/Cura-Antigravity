"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { familyHelperService } from "@/lib/firebase/services/familyHelperService";
import { FamilyCase, FamilyMember, AsdContact, FundingCommitment, FamilyGoal, FamilyJournalEntry, HazardAssessment8a } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { exportDevelopmentReport, exportPerformanceRecord } from "@/lib/pdf/familyHelperPdfExport";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
    ArrowLeft, Save, Plus, Trash2, FileText, Target, Clock,
    AlertTriangle, Shield, ChevronDown, ChevronUp, Users, BookOpen,
    Edit2, Download
} from "lucide-react";

type TabId = "stammdaten" | "hilfeplanung" | "verlauf" | "vorlagen" | "krisenschutz";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "stammdaten", label: "Stammdaten", icon: Users },
    { id: "hilfeplanung", label: "Hilfeplanung", icon: Target },
    { id: "verlauf", label: "Verlauf & Zeit", icon: Clock },
    { id: "vorlagen", label: "Vorlagen", icon: BookOpen },
    { id: "krisenschutz", label: "Krisenschutz", icon: Shield },
];

const DEFAULT_RELATIONS = ["Kind", "Mutter", "Vater", "Pflegeeltern", "Sonstige"];
const DEFAULT_JOURNAL_TYPES = ["Hausbesuch", "Telefonat", "Beratungsgespräch", "Netzwerkarbeit", "Dokumentation", "Supervision"];
const DEFAULT_GOAL_CATEGORIES = ["Erziehungskompetenz", "Alltagsstruktur", "Gesundheit", "Soziale Integration", "Wohnsituation"];

const HAZARD_INDICATORS = [
    "Körperliche Anzeichen",
    "Emotionale Vernachlässigung",
    "Unangemessene Aufsicht",
    "Häusliche Gewalt",
    "Substanzmissbrauch",
    "Isolation des Kindes",
    "Fehlende medizinische Versorgung",
    "Mangelernährung",
];

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

function getScaleColor(v: number): string {
    if (v < 4) return "bg-red-500";
    if (v <= 7) return "bg-amber-500";
    return "bg-emerald-500";
}

export default function CaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params?.caseId as string;
    const { user, userProfile, loading: authLoading } = useAuth();
    const { settings } = useSettings();

    const [familyCase, setFamilyCase] = useState<FamilyCase | null>(null);
    const [journalEntries, setJournalEntries] = useState<FamilyJournalEntry[]>([]);
    const [assessments, setAssessments] = useState<HazardAssessment8a[]>([]);
    const [templates, setTemplates] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>("stammdaten");
    const [toast, setToast] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editable form state for Stammdaten
    const [editFamilyName, setEditFamilyName] = useState("");
    const [editCaseNumber, setEditCaseNumber] = useState("");
    const [editStatus, setEditStatus] = useState<"aktiv" | "inaktiv" | "beendet">("aktiv");
    const [editMembers, setEditMembers] = useState<FamilyMember[]>([]);
    const [editAsd, setEditAsd] = useState<AsdContact>({ name: "" });
    const [editFunding, setEditFunding] = useState<FundingCommitment | null>(null);

    // Journal form
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
    const [journalDate, setJournalDate] = useState(new Date().toISOString().split("T")[0]);
    const [journalDuration, setJournalDuration] = useState("1");
    const [journalType, setJournalType] = useState("");
    const [journalNotes, setJournalNotes] = useState("");
    const [journalCreateTime, setJournalCreateTime] = useState(true);
    const [editingJournalId, setEditingJournalId] = useState<string | null>(null);

    // Goal form
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalCategory, setGoalCategory] = useState("");
    const [goalDescription, setGoalDescription] = useState("");
    const [goalTarget, setGoalTarget] = useState(8);

    // Hazard assessment form
    const [hazardIndicators, setHazardIndicators] = useState<Record<string, "ja" | "nein" | "unklar">>({});
    const [hazardActions, setHazardActions] = useState("");
    const [hazardResult, setHazardResult] = useState<"akut" | "latent" | "keine">("keine");
    const [hazardNextReview, setHazardNextReview] = useState("");
    const [hazardAssessor, setHazardAssessor] = useState("");

    // Template accordion state
    const [openTemplates, setOpenTemplates] = useState<Record<string, boolean>>({});

    // PDF export state
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfMonth, setPdfMonth] = useState(new Date().getMonth());
    const [pdfYear, setPdfYear] = useState(new Date().getFullYear());

    const relations = useMemo(() => settings?.familyMemberRelations?.length ? settings.familyMemberRelations : DEFAULT_RELATIONS, [settings]);
    const journalTypes = useMemo(() => settings?.familyJournalTypes?.length ? settings.familyJournalTypes : DEFAULT_JOURNAL_TYPES, [settings]);
    const goalCategories = useMemo(() => settings?.familyGoalCategories?.length ? settings.familyGoalCategories : DEFAULT_GOAL_CATEGORIES, [settings]);

    const loadData = useCallback(async () => {
        if (!caseId) return;
        setLoading(true);
        try {
            const [caseData, journal, hazards, tmpl] = await Promise.all([
                familyHelperService.getCaseById(caseId),
                familyHelperService.getJournalEntries(caseId),
                familyHelperService.getHazardAssessments(caseId),
                familyHelperService.getTemplates(caseId),
            ]);
            if (!caseData) {
                router.push("/family-helper");
                return;
            }
            setFamilyCase(caseData);
            setJournalEntries(journal);
            setAssessments(hazards);
            setTemplates(tmpl as Record<string, Record<string, string>>);

            // Initialize edit form
            setEditFamilyName(caseData.familyName);
            setEditCaseNumber(caseData.caseNumber);
            setEditStatus(caseData.status);
            setEditMembers(caseData.members || []);
            setEditAsd(caseData.asdContact || { name: "" });
            setEditFunding(caseData.fundingCommitment || null);
        } catch (error) {
            console.error("Fehler beim Laden der Fallakte:", error);
        } finally {
            setLoading(false);
        }
    }, [caseId, router]);

    useEffect(() => {
        if (user && userProfile) loadData();
    }, [user, userProfile, loadData]);

    // ── Stammdaten Handlers ──
    const saveStammdaten = async () => {
        if (!caseId || !familyCase) return;
        setIsSaving(true);
        try {
            await familyHelperService.updateCase(caseId, {
                familyName: editFamilyName,
                caseNumber: editCaseNumber,
                status: editStatus,
                members: editMembers,
                asdContact: editAsd.name ? editAsd : undefined,
                fundingCommitment: editFunding || undefined,
            });
            await loadData();
            setToast("Stammdaten gespeichert");
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            alert("Fehler beim Speichern der Stammdaten.");
        } finally {
            setIsSaving(false);
        }
    };

    const addMember = () => setEditMembers(prev => [...prev, { firstName: "", lastName: editFamilyName, relation: relations[0] }]);
    const removeMember = (idx: number) => setEditMembers(prev => prev.filter((_, i) => i !== idx));
    const updateMember = (idx: number, field: keyof FamilyMember, value: string) =>
        setEditMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));

    // ── Goals Handlers ──
    const addGoal = async () => {
        if (!caseId || !familyCase || !goalDescription.trim()) return;
        setIsSaving(true);
        try {
            const newGoal: FamilyGoal = {
                id: `goal_${Date.now()}`,
                category: goalCategory || goalCategories[0],
                description: goalDescription.trim(),
                targetValue: goalTarget,
                currentValue: 1,
                createdAt: new Date(),
            };
            const updatedGoals = [...(familyCase.goals || []), newGoal];
            await familyHelperService.updateCase(caseId, { goals: updatedGoals });
            setIsGoalModalOpen(false);
            setGoalDescription("");
            setGoalTarget(8);
            await loadData();
            setToast("Ziel hinzugefügt");
        } catch (error) {
            console.error("Fehler beim Hinzufügen des Ziels:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateGoalScale = async (goalId: string, value: number) => {
        if (!caseId || !familyCase) return;
        const updatedGoals = (familyCase.goals || []).map(g =>
            g.id === goalId ? { ...g, currentValue: value, updatedAt: new Date() } : g
        );
        try {
            await familyHelperService.updateCase(caseId, { goals: updatedGoals });
            setFamilyCase(prev => prev ? { ...prev, goals: updatedGoals } : null);
        } catch (error) {
            console.error("Fehler beim Aktualisieren des Skalenwerts:", error);
        }
    };

    const removeGoal = async (goalId: string) => {
        if (!caseId || !familyCase) return;
        const updatedGoals = (familyCase.goals || []).filter(g => g.id !== goalId);
        try {
            await familyHelperService.updateCase(caseId, { goals: updatedGoals });
            await loadData();
            setToast("Ziel entfernt");
        } catch (error) {
            console.error("Fehler beim Löschen des Ziels:", error);
        }
    };

    // ── Journal Handlers ──
    const openNewJournal = () => {
        setEditingJournalId(null);
        setJournalDate(new Date().toISOString().split("T")[0]);
        setJournalDuration("1");
        setJournalType(journalTypes[0]);
        setJournalNotes("");
        setJournalCreateTime(true);
        setIsJournalModalOpen(true);
    };

    const openEditJournal = (entry: FamilyJournalEntry) => {
        setEditingJournalId(entry.id);
        const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
        setJournalDate(d.toISOString().split("T")[0]);
        setJournalDuration(String(entry.durationInHours));
        setJournalType(entry.type);
        setJournalNotes(entry.notes);
        setJournalCreateTime(false);
        setIsJournalModalOpen(true);
    };

    const saveJournal = async () => {
        if (!caseId) return;
        setIsSaving(true);
        try {
            if (editingJournalId) {
                await familyHelperService.updateJournalEntry(caseId, editingJournalId, {
                    date: new Date(journalDate),
                    durationInHours: parseFloat(journalDuration) || 0,
                    type: journalType,
                    notes: journalNotes,
                });
            } else {
                await familyHelperService.addJournalEntry(
                    caseId,
                    {
                        date: new Date(journalDate),
                        durationInHours: parseFloat(journalDuration) || 0,
                        type: journalType,
                        notes: journalNotes,
                        hasTimeEntry: false,
                    },
                    journalCreateTime,
                    user?.uid
                );
            }
            setIsJournalModalOpen(false);
            await loadData();
            setToast(editingJournalId ? "Eintrag aktualisiert" : "Eintrag erstellt");
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            alert(String(error));
        } finally {
            setIsSaving(false);
        }
    };

    const deleteJournal = async (entryId: string) => {
        if (!caseId || !confirm("Diesen Eintrag wirklich löschen?")) return;
        try {
            await familyHelperService.deleteJournalEntry(caseId, entryId);
            await loadData();
            setToast("Eintrag gelöscht");
        } catch (error) {
            console.error("Fehler beim Löschen:", error);
        }
    };

    // ── Template Handlers ──
    const updateTemplateField = (templateId: string, field: string, value: string) => {
        setTemplates(prev => ({
            ...prev,
            [templateId]: { ...(prev[templateId] || {}), [field]: value },
        }));
    };

    const saveTemplate = async (templateId: string) => {
        if (!caseId) return;
        setIsSaving(true);
        try {
            await familyHelperService.saveTemplate(caseId, templateId, templates[templateId] || {});
            setToast("Vorlage gespeichert");
        } catch (error) {
            console.error("Fehler beim Speichern der Vorlage:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Hazard Assessment Handlers ──
    const saveHazardAssessment = async () => {
        if (!caseId || !hazardAssessor.trim()) {
            alert("Bitte geben Sie den Namen des Bewertenden an.");
            return;
        }
        setIsSaving(true);
        try {
            await familyHelperService.addHazardAssessment(caseId, {
                date: new Date(),
                assessorName: hazardAssessor,
                indicators: hazardIndicators,
                actionsTaken: hazardActions,
                result: hazardResult,
                nextReviewDate: hazardNextReview || undefined,
            });
            // Reset form
            setHazardIndicators({});
            setHazardActions("");
            setHazardResult("keine");
            setHazardNextReview("");
            setHazardAssessor("");
            await loadData();
            setToast("Gefährdungseinschätzung gespeichert");
        } catch (error) {
            console.error("Fehler:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // ── PDF Export ──
    const handleExportDevelopmentReport = async () => {
        if (!familyCase) return;
        const workerName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "";
        await exportDevelopmentReport(familyCase, familyCase.goals || [], templates, workerName);
        setToast("Entwicklungsbericht heruntergeladen");
    };

    const handleExportPerformanceRecord = async () => {
        if (!familyCase) return;
        const workerName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "";
        await exportPerformanceRecord(familyCase, journalEntries, workerName, pdfMonth, pdfYear);
        setIsPdfModalOpen(false);
        setToast("Leistungsnachweis heruntergeladen");
    };

    // ── Journal Stats ──
    const totalActualHours = useMemo(() =>
        journalEntries.reduce((sum, e) => sum + (e.durationInHours || 0), 0), [journalEntries]);
    const budgetHours = familyCase?.fundingCommitment?.hoursGranted || 0;
    const remainingPercent = budgetHours > 0 ? Math.max(0, ((budgetHours - totalActualHours) / budgetHours) * 100) : 0;

    const chartData = useMemo(() => [
        { name: "Soll", stunden: budgetHours, fill: "#6366f1" },
        { name: "Ist", stunden: Math.round(totalActualHours * 10) / 10, fill: totalActualHours > budgetHours ? "#ef4444" : "#10b981" },
    ], [budgetHours, totalActualHours]);

    // ── Loading & Access Guards ──
    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!familyCase) return null;

    const statusBadge = (s: string) => {
        const colors: Record<string, string> = {
            aktiv: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            inaktiv: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            beendet: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
        };
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[s] || colors.aktiv}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
    };

    return (
        <ProtectedRoute requiredPermission="hasFamilyHelperAccess">
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6 max-w-5xl mx-auto w-full pb-10">
                {toast && <Toast message={toast} onClose={() => setToast(null)} />}

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/family-helper" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                {familyCase.familyName}
                                {statusBadge(familyCase.status)}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Az. {familyCase.caseNumber}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handleExportDevelopmentReport} className="gap-2 text-sm">
                            <Download className="w-4 h-4" /> Bericht
                        </Button>
                        <Button variant="ghost" onClick={() => setIsPdfModalOpen(true)} className="gap-2 text-sm">
                            <FileText className="w-4 h-4" /> Leistungsnachweis
                        </Button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 overflow-x-auto bg-white/40 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-white/50 dark:border-white/10 shadow-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-gray-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5"
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ═══ TAB: STAMMDATEN ═══ */}
                {activeTab === "stammdaten" && (
                    <div className="space-y-6">
                        {/* Basisdaten */}
                        <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-6 pt-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-indigo-500" /> Basisdaten
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Familienname</label>
                                        <input className={inputCls} value={editFamilyName} onChange={e => setEditFamilyName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Aktenzeichen</label>
                                        <input className={inputCls} value={editCaseNumber} onChange={e => setEditCaseNumber(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Status</label>
                                        <select className={inputCls} value={editStatus} onChange={e => setEditStatus(e.target.value as "aktiv" | "inaktiv" | "beendet")}>
                                            <option value="aktiv">Aktiv</option>
                                            <option value="inaktiv">Inaktiv</option>
                                            <option value="beendet">Beendet</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Familienmitglieder */}
                        <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-6 pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" /> Familienmitglieder
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={addMember} className="gap-1">
                                        <Plus className="w-4 h-4" /> Hinzufügen
                                    </Button>
                                </div>
                                {editMembers.length === 0 && (
                                    <p className="text-sm text-gray-400 dark:text-slate-500 italic">Noch keine Mitglieder hinzugefügt.</p>
                                )}
                                <div className="space-y-3">
                                    {editMembers.map((m, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-3 bg-gray-50/30 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-white/5">
                                            <div>
                                                <label className={labelCls}>Vorname</label>
                                                <input className={inputCls} value={m.firstName} onChange={e => updateMember(idx, "firstName", e.target.value)} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Nachname</label>
                                                <input className={inputCls} value={m.lastName} onChange={e => updateMember(idx, "lastName", e.target.value)} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Beziehung</label>
                                                <select className={inputCls} value={m.relation} onChange={e => updateMember(idx, "relation", e.target.value)}>
                                                    {relations.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className={labelCls}>Geburtsdatum</label>
                                                    <input type="date" className={inputCls} value={m.birthDate || ""} onChange={e => updateMember(idx, "birthDate", e.target.value)} />
                                                </div>
                                                <button onClick={() => removeMember(idx)} className="self-end p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Entfernen">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ASD-Kontakt */}
                        <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-6 pt-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ASD-Kontakt</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={labelCls}>Name</label><input className={inputCls} value={editAsd.name} onChange={e => setEditAsd(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div><label className={labelCls}>Institution</label><input className={inputCls} value={editAsd.institution || ""} onChange={e => setEditAsd(p => ({ ...p, institution: e.target.value }))} /></div>
                                    <div><label className={labelCls}>E-Mail</label><input type="email" className={inputCls} value={editAsd.email || ""} onChange={e => setEditAsd(p => ({ ...p, email: e.target.value }))} /></div>
                                    <div><label className={labelCls}>Telefon</label><input className={inputCls} value={editAsd.phone || ""} onChange={e => setEditAsd(p => ({ ...p, phone: e.target.value }))} /></div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Kostenzusage */}
                        <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-6 pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kostenzusage</h2>
                                    {!editFunding && <Button variant="ghost" size="sm" onClick={() => setEditFunding({ hoursGranted: 0, startDate: "", endDate: "" })} className="gap-1"><Plus className="w-4 h-4" /> Hinzufügen</Button>}
                                </div>
                                {editFunding ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div><label className={labelCls}>Stunden</label><input type="number" className={inputCls} value={editFunding.hoursGranted} onChange={e => setEditFunding(p => p ? { ...p, hoursGranted: Number(e.target.value) } : null)} /></div>
                                        <div><label className={labelCls}>Startdatum</label><input type="date" className={inputCls} value={editFunding.startDate} onChange={e => setEditFunding(p => p ? { ...p, startDate: e.target.value } : null)} /></div>
                                        <div><label className={labelCls}>Enddatum</label><input type="date" className={inputCls} value={editFunding.endDate} onChange={e => setEditFunding(p => p ? { ...p, endDate: e.target.value } : null)} /></div>
                                        <div><label className={labelCls}>Stundensatz (€)</label><input type="number" step="0.01" className={inputCls} value={editFunding.hourlyRate || ""} onChange={e => setEditFunding(p => p ? { ...p, hourlyRate: Number(e.target.value) || undefined } : null)} /></div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 dark:text-slate-500 italic">Keine Kostenzusage hinterlegt.</p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button variant="primary" onClick={saveStammdaten} disabled={isSaving} className="gap-2 px-8">
                                <Save className="w-4 h-4" /> {isSaving ? "Wird gespeichert..." : "Stammdaten speichern"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ═══ TAB: HILFEPLANUNG ═══ */}
                {activeTab === "hilfeplanung" && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-500" /> Ziele & Skalierung
                            </h2>
                            <Button variant="primary" size="sm" onClick={() => { setGoalCategory(goalCategories[0]); setIsGoalModalOpen(true); }} className="gap-1">
                                <Plus className="w-4 h-4" /> Neues Ziel
                            </Button>
                        </div>

                        {(familyCase.goals || []).length === 0 && (
                            <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-8 text-center">
                                    <Target className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-slate-400">Noch keine Ziele definiert.</p>
                                </CardContent>
                            </Card>
                        )}

                        {(familyCase.goals || []).map(goal => (
                            <Card key={goal.id} className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-6 pt-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 mb-1.5">
                                                {goal.category}
                                            </span>
                                            <p className="text-gray-900 dark:text-white font-medium">{goal.description}</p>
                                        </div>
                                        <button onClick={() => removeGoal(goal.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-500 dark:text-slate-400">Aktuelle Skalierung</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{goal.currentValue} <span className="text-sm font-normal text-gray-400">/ {goal.targetValue}</span></span>
                                        </div>
                                        <div className="relative h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                                            <div className={`h-full rounded-full transition-all duration-300 ${getScaleColor(goal.currentValue)}`} style={{ width: `${(goal.currentValue / 10) * 100}%` }} />
                                        </div>
                                        <input
                                            type="range"
                                            min={1} max={10} step={1}
                                            value={goal.currentValue}
                                            onChange={e => updateGoalScale(goal.id, Number(e.target.value))}
                                            className="w-full accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>1</span><span>5</span><span>10</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Goal Modal */}
                        <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Neues Ziel hinzufügen">
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>Kategorie</label>
                                    <select className={inputCls} value={goalCategory} onChange={e => setGoalCategory(e.target.value)}>
                                        {goalCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Beschreibung</label>
                                    <textarea className={textareaCls} value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="Was soll erreicht werden?" />
                                </div>
                                <div>
                                    <label className={labelCls}>Zielwert (1-10)</label>
                                    <input type="range" min={1} max={10} value={goalTarget} onChange={e => setGoalTarget(Number(e.target.value))} className="w-full accent-indigo-600" />
                                    <p className="text-center text-sm font-medium text-gray-700 dark:text-slate-300 mt-1">{goalTarget}</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setIsGoalModalOpen(false)}>Abbrechen</Button>
                                    <Button variant="primary" onClick={addGoal} disabled={isSaving || !goalDescription.trim()}>
                                        {isSaving ? "Speichern..." : "Ziel hinzufügen"}
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {/* ═══ TAB: VERLAUF & ZEITERFASSUNG ═══ */}
                {activeTab === "verlauf" && (
                    <div className="space-y-6">
                        {/* Stunden-Übersicht */}
                        {budgetHours > 0 && (
                            <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-6 pt-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stundenübersicht</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Verbrauch</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {totalActualHours.toFixed(1)} <span className="text-base font-normal text-gray-400">von {budgetHours} Std.</span>
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                                {remainingPercent.toFixed(0)}% verbleibend
                                            </p>
                                            <div className="mt-3 h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${totalActualHours > budgetHours ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, (totalActualHours / budgetHours) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="h-40">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} barCategoryGap="30%">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="stunden" radius={[6, 6, 0, 0]}>
                                                        {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Journal-Einträge */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" /> Kontaktjournal
                            </h2>
                            <Button variant="primary" size="sm" onClick={openNewJournal} className="gap-1">
                                <Plus className="w-4 h-4" /> Neuer Eintrag
                            </Button>
                        </div>

                        {journalEntries.length === 0 ? (
                            <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                <CardContent className="p-8 text-center">
                                    <Clock className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-slate-400">Noch keine Einträge vorhanden.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {journalEntries.map(entry => {
                                    const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
                                    return (
                                        <Card key={entry.id} className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                            <CardContent className="p-4 pt-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {d.toLocaleDateString("de-DE")}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                                                                {entry.type}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                                                {entry.durationInHours} Std.
                                                            </span>
                                                            {entry.hasTimeEntry && (
                                                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Zeiterfassung</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{entry.notes}</p>
                                                    </div>
                                                    <div className="flex gap-1 ml-3">
                                                        <button onClick={() => openEditJournal(entry)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Bearbeiten">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => deleteJournal(entry.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Löschen">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Journal Modal */}
                        <Modal isOpen={isJournalModalOpen} onClose={() => setIsJournalModalOpen(false)} title={editingJournalId ? "Eintrag bearbeiten" : "Neuer Journal-Eintrag"}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div><label className={labelCls}>Datum</label><input type="date" className={inputCls} value={journalDate} onChange={e => setJournalDate(e.target.value)} /></div>
                                    <div><label className={labelCls}>Dauer (Std.)</label><input type="number" step="0.25" min="0" className={inputCls} value={journalDuration} onChange={e => setJournalDuration(e.target.value)} /></div>
                                    <div>
                                        <label className={labelCls}>Art</label>
                                        <select className={inputCls} value={journalType} onChange={e => setJournalType(e.target.value)}>
                                            {journalTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div><label className={labelCls}>Notizen</label><textarea className={textareaCls} value={journalNotes} onChange={e => setJournalNotes(e.target.value)} placeholder="Beschreibung der Tätigkeit..." /></div>
                                {!editingJournalId && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                                        <input type="checkbox" checked={journalCreateTime} onChange={e => setJournalCreateTime(e.target.checked)} className="rounded accent-indigo-600" />
                                        Auch in der Zeiterfassung eintragen
                                    </label>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setIsJournalModalOpen(false)}>Abbrechen</Button>
                                    <Button variant="primary" onClick={saveJournal} disabled={isSaving}>
                                        {isSaving ? "Speichern..." : "Speichern"}
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    </div>
                )}

                {/* ═══ TAB: VORLAGEN ═══ */}
                {activeTab === "vorlagen" && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" /> Vorlagen & Dokumentation
                        </h2>

                        {[
                            {
                                id: "anamnese", title: "Anamnese", icon: FileText,
                                fields: [
                                    { key: "familiensituation", label: "Familiensituation" },
                                    { key: "wohnsituation", label: "Wohnsituation" },
                                    { key: "gesundheit", label: "Gesundheitliche Situation" },
                                    { key: "sozialesUmfeld", label: "Soziales Umfeld" },
                                    { key: "bisherigeHilfen", label: "Bisherige Hilfen" },
                                ],
                            },
                            {
                                id: "hypothesen", title: "Arbeitshypothesen", icon: Target,
                                fields: [{ key: "hypothesen", label: "Arbeitshypothesen und Erklärungsansätze" }],
                            },
                            {
                                id: "interventionsplanung", title: "Interventionsplanung", icon: Edit2,
                                fields: [
                                    { key: "massnahmen", label: "Geplante Maßnahmen" },
                                    { key: "methodik", label: "Methodik" },
                                    { key: "zeitrahmen", label: "Zeitrahmen" },
                                ],
                            },
                            {
                                id: "evaluation", title: "Evaluation", icon: Target,
                                fields: [
                                    { key: "zielerreichung", label: "Zielerreichung" },
                                    { key: "reflexion", label: "Reflexion" },
                                    { key: "empfehlungen", label: "Empfehlungen" },
                                ],
                            },
                        ].map(tmpl => (
                            <Card key={tmpl.id} className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 overflow-hidden">
                                <button
                                    onClick={() => setOpenTemplates(p => ({ ...p, [tmpl.id]: !p[tmpl.id] }))}
                                    className="w-full flex items-center justify-between p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <tmpl.icon className="w-5 h-5 text-indigo-500" />
                                        <span className="text-base font-semibold text-gray-900 dark:text-white">{tmpl.title}</span>
                                    </div>
                                    {openTemplates[tmpl.id] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                {openTemplates[tmpl.id] && (
                                    <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                        {tmpl.fields.map(field => (
                                            <div key={field.key}>
                                                <label className={labelCls}>{field.label}</label>
                                                <textarea
                                                    className={textareaCls}
                                                    value={(templates[tmpl.id] as Record<string, string>)?.[field.key] || ""}
                                                    onChange={e => updateTemplateField(tmpl.id, field.key, e.target.value)}
                                                    rows={4}
                                                />
                                            </div>
                                        ))}
                                        <div className="flex justify-end">
                                            <Button variant="primary" size="sm" onClick={() => saveTemplate(tmpl.id)} disabled={isSaving} className="gap-1">
                                                <Save className="w-4 h-4" /> {isSaving ? "Speichern..." : "Vorlage speichern"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}

                {/* ═══ TAB: KRISENSCHUTZRAUM ═══ */}
                {activeTab === "krisenschutz" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Gefährdungseinschätzung nach § 8a SGB VIII
                        </h2>

                        {/* Neue Einschätzung */}
                        <Card className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                            <CardContent className="p-6 pt-6">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Neue Einschätzung</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Name des Bewertenden</label>
                                        <input className={inputCls} value={hazardAssessor} onChange={e => setHazardAssessor(e.target.value)} placeholder={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : ""} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Indikatoren-Checkliste</p>
                                        <div className="space-y-2">
                                            {HAZARD_INDICATORS.map(indicator => (
                                                <div key={indicator} className="flex items-center justify-between p-3 bg-gray-50/30 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-white/5">
                                                    <span className="text-sm text-gray-700 dark:text-slate-300">{indicator}</span>
                                                    <div className="flex gap-2">
                                                        {(["ja", "nein", "unklar"] as const).map(val => (
                                                            <button
                                                                key={val}
                                                                onClick={() => setHazardIndicators(p => ({ ...p, [indicator]: val }))}
                                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                                                    hazardIndicators[indicator] === val
                                                                        ? val === "ja" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300"
                                                                        : val === "nein" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-300"
                                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-300"
                                                                        : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                                                                }`}
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Ergriffene Maßnahmen</label>
                                        <textarea className={textareaCls} value={hazardActions} onChange={e => setHazardActions(e.target.value)} placeholder="Welche Maßnahmen wurden ergriffen?" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>Ergebnis der Einschätzung</label>
                                            <select className={inputCls} value={hazardResult} onChange={e => setHazardResult(e.target.value as "akut" | "latent" | "keine")}>
                                                <option value="keine">Keine Gefährdung</option>
                                                <option value="latent">Latente Gefährdung</option>
                                                <option value="akut">Akute Gefährdung</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Nächster Überprüfungstermin</label>
                                            <input type="date" className={inputCls} value={hazardNextReview} onChange={e => setHazardNextReview(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button variant="primary" onClick={saveHazardAssessment} disabled={isSaving} className="gap-2">
                                            <Shield className="w-4 h-4" /> {isSaving ? "Speichern..." : "Einschätzung speichern"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Historische Einschätzungen */}
                        {assessments.length > 0 && (
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Bisherige Einschätzungen</h3>
                                <div className="space-y-3">
                                    {assessments.map(a => {
                                        const d = a.date instanceof Date ? a.date : new Date(a.date);
                                        const resultColors: Record<string, string> = {
                                            akut: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                            latent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                            keine: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                        };
                                        return (
                                            <Card key={a.id} className="shadow-sm border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                                                <CardContent className="p-4 pt-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{d.toLocaleDateString("de-DE")}</span>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${resultColors[a.result]}`}>
                                                                {a.result === "akut" ? "Akute Gefährdung" : a.result === "latent" ? "Latente Gefährdung" : "Keine Gefährdung"}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">{a.assessorName}</span>
                                                    </div>
                                                    {a.actionsTaken && <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{a.actionsTaken}</p>}
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {Object.entries(a.indicators).filter(([, v]) => v === "ja").map(([key]) => (
                                                            <span key={key} className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg">{key}</span>
                                                        ))}
                                                    </div>
                                                    {a.nextReviewDate && (
                                                        <p className="text-xs text-gray-400 mt-2">Nächste Überprüfung: {a.nextReviewDate}</p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Leistungsnachweis PDF Modal */}
                <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="Leistungsnachweis exportieren">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-slate-400">Wählen Sie den Zeitraum für den monatlichen Leistungsnachweis.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Monat</label>
                                <select className={inputCls} value={pdfMonth} onChange={e => setPdfMonth(Number(e.target.value))}>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i} value={i}>{new Date(2024, i).toLocaleString("de-DE", { month: "long" })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Jahr</label>
                                <input type="number" className={inputCls} value={pdfYear} onChange={e => setPdfYear(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Abbrechen</Button>
                            <Button variant="primary" onClick={handleExportPerformanceRecord} className="gap-2">
                                <Download className="w-4 h-4" /> PDF herunterladen
                            </Button>
                        </div>
                    </div>
                </Modal>

            </div>
        </ProtectedRoute>
    );
}
