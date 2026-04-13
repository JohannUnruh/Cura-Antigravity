"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/lib/firebase/services/userService";
import { settingsService } from "@/lib/firebase/services/settingsService";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TagInput } from "@/components/ui/TagInput";
import { UserProfile, Role, AppSettings, ContractType } from "@/types";
import { Settings, User, MapPin, CreditCard, ShieldCheck, Users, Key, AppWindow, Plus, Pencil, Trash2, FileSignature, Moon, Sun, Cloud } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { usePushNotification } from "@/contexts/PushNotificationContext";
import { updatePassword } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { generateAndUploadContract } from "@/lib/contracts/generator";
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { firebaseConfig, db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { getMonthlyBillingInfo, type CloudBillingSummary } from "@/app/actions/billing";
import { ReminderList } from "@/components/ui/ReminderList";
import { Bell, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function SettingsPage() {
    const { user, userProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const { refreshSettings } = useSettings();
    const push = usePushNotification();
    const [activeTab, setActiveTab] = useState<'profil' | 'benutzer' | 'app' | 'benachrichtigungen'>('profil');
    const [isSaving, setIsSaving] = useState(false);

    // -- Benachrichtigungszeit --
    const [notifHour, setNotifHour] = useState(userProfile?.notificationHour ?? 9);
    const [notifMinute, setNotifMinute] = useState(userProfile?.notificationMinute ?? 0);
    const [notifDayOfWeek, setNotifDayOfWeek] = useState(userProfile?.notificationDayOfWeek ?? 1); // Montag
    const [isNotifSaving, setIsNotifSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // -- Profile Tab State --
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        role: "Mitarbeiter" as Role,
        contractType: "Ehrenamtlich" as ContractType,
        address: { street: "", zipCode: "", city: "" },
        bankDetails: { iban: "", bic: "", accountHolder: "" }
    });
    const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

    // -- Users Tab State --
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "Mitarbeiter" as Role, contractType: "Ehrenamtlich" as ContractType, vacationDaysPerYear: 24 });
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [editUserForm, setEditUserForm] = useState({ firstName: "", lastName: "", role: "Mitarbeiter" as Role, contractType: "Ehrenamtlich" as ContractType, vacationDaysPerYear: 24 });
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractForm, setContractForm] = useState({
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        weeklyHours: 0,
        hourlyRate: 12.41,
        lumpSumAmount: 250,
        boardSignatureUrl: "",
        employeeSignatureUrl: ""
    });

    // -- App Settings Tab State --
    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const [appForm, setAppForm] = useState<AppSettings>({
        travelExpenseRate: 0.30,
        consultationTypes: [],
        lifeStages: [],
        personGroups: [],
        problemOrigins: [],
        subProblems: [],
        goalTypes: [],
        hoursPerVacationDay: 8,
    });
    
    // -- Cloud Billing --
    const [billingData, setBillingData] = useState<CloudBillingSummary | null>(null);
    const [isBillingLoading, setIsBillingLoading] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setForm({
                firstName: userProfile.firstName || "",
                lastName: userProfile.lastName || "",
                role: userProfile.role || "Mitarbeiter",
                contractType: userProfile.contractType || "Ehrenamtlich",
                address: userProfile.address || { street: "", zipCode: "", city: "" },
                bankDetails: userProfile.bankDetails || { iban: "", bic: "", accountHolder: "" }
            });
            setNotifHour(userProfile.notificationHour ?? 9);
            setNotifMinute(userProfile.notificationMinute ?? 0);
            setNotifDayOfWeek(userProfile.notificationDayOfWeek ?? 1);
        }

        if (userProfile?.role === 'Admin') {
            userService.getAllUsers().then(setUsers);
            settingsService.getSettings().then(res => {
                setAppSettings(res);
                setAppForm(prev => ({
                    ...prev,
                    ...res,
                    hoursPerVacationDay: res.hoursPerVacationDay ?? 8,
                }));
            });
            
            if (activeTab === 'app' && !billingData) {
                setIsBillingLoading(true);
                getMonthlyBillingInfo().then(res => {
                    setBillingData(res);
                }).finally(() => {
                    setIsBillingLoading(false);
                });
            }
        }
    }, [userProfile, activeTab, billingData]);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const profileToSave: UserProfile = {
                id: user.uid,
                firstName: form.firstName,
                lastName: form.lastName,
                role: form.role,
                address: form.address,
                bankDetails: form.bankDetails,
                createdAt: userProfile?.createdAt || new Date(),
            };
            await userService.saveUserProfile(profileToSave);

            if (passwordForm.newPassword) {
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    showMessage('error', 'Passwörter stimmen nicht überein.');
                    setIsSaving(false);
                    return;
                }
                await updatePassword(user, passwordForm.newPassword);
                setPasswordForm({ newPassword: "", confirmPassword: "" });
            }

            showMessage('success', 'Profil erfolgreich gespeichert.');
        } catch (error) {
            console.error(error);
            showMessage('error', 'Fehler beim Speichern. (Evtl. kürzlicher Login nötig für Passwort-Änderung)');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserForm.email, newUserForm.password);
            const newUid = userCredential.user.uid;

            // Display-Name in Firebase Auth setzen (für Kalendereinträge etc.)
            await updateProfile(userCredential.user, {
                displayName: `${newUserForm.firstName} ${newUserForm.lastName}`,
            });

            const profileToSave: UserProfile = {
                id: newUid,
                firstName: newUserForm.firstName,
                lastName: newUserForm.lastName,
                role: newUserForm.role,
                contractType: newUserForm.contractType,
                vacationDaysPerYear: newUserForm.contractType === 'Minijob' ? newUserForm.vacationDaysPerYear : null,
                address: { street: "", zipCode: "", city: "" },
                bankDetails: { iban: "", bic: "", accountHolder: "" },
                createdAt: new Date(),
            };

            // Save direct to db to avoid auth confusion
            await setDoc(doc(db, "users", newUid), { ...profileToSave, updatedAt: new Date() }, { merge: true });
            await signOut(secondaryAuth);

            // Fetch to ensure we got everything or just append
            const updatedUsers = await userService.getAllUsers();

            // Re-check locally if it takes a bit for firestore
            const newlyCreated = updatedUsers.find(u => u.id === newUid);
            if (!newlyCreated) {
                updatedUsers.push(profileToSave);
            }

            setUsers(updatedUsers);
            setIsUserModalOpen(false);
            setNewUserForm({ email: "", password: "", firstName: "", lastName: "", role: "Mitarbeiter", contractType: "Ehrenamtlich", vacationDaysPerYear: 24 });
            showMessage('success', 'Benutzer erfolgreich angelegt.');
        } catch (err: unknown) {
            const error = err as { code?: string };
            if (error.code === 'auth/email-already-in-use') {
                showMessage('error', 'Fehler: Diese E-Mail-Adresse ist bereits registriert.');
            } else if (error.code === 'auth/weak-password') {
                showMessage('error', 'Fehler: Das Passwort muss mindestens 6 Zeichen lang sein.');
            } else {
                console.error(err); // Only log unexpected errors
                showMessage('error', 'Fehler beim Anlegen des Benutzers.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const profileToSave: UserProfile = { ...selectedUser, firstName: editUserForm.firstName, lastName: editUserForm.lastName, role: editUserForm.role, contractType: editUserForm.contractType, vacationDaysPerYear: editUserForm.contractType === 'Minijob' ? editUserForm.vacationDaysPerYear : null };
            await setDoc(doc(db, "users", selectedUser.id), { ...profileToSave, updatedAt: new Date() }, { merge: true });
            setUsers(users.map(u => u.id === selectedUser.id ? profileToSave : u));
            setIsEditUserModalOpen(false);
            showMessage('success', 'Benutzer erfolgreich aktualisiert.');
        } catch (err) {
            console.error(err);
            showMessage('error', 'Fehler beim Aktualisieren des Benutzers.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            await userService.deleteUserProfile(selectedUser.id);
            setUsers(users.filter(u => u.id !== selectedUser.id));
            setIsDeleteUserModalOpen(false);
            showMessage('success', 'Benutzer erfolgreich gelöscht.');
        } catch (err) {
            console.error(err);
            showMessage('error', 'Fehler beim Löschen des Benutzers.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        if (!appSettings) {
            showMessage('error', 'App-Einstellungen (Vereinsdaten) fehlen. Bitte im Tab "App" hinterlegen.');
            return;
        }
        if (!contractForm.boardSignatureUrl || !contractForm.employeeSignatureUrl) {
            showMessage('error', 'Bitte beide Unterschriften hinzufügen.');
            return;
        }

        setIsSaving(true);
        try {
            const url = await generateAndUploadContract({
                employerName: appSettings.clubName || "Vereinsname nicht gesetzt",
                employerAddress: `${appSettings.address?.street || ""}, ${appSettings.address?.zipCode || ""} ${appSettings.address?.city || ""}`,
                employerCity: appSettings.address?.city || "",
                employeeName: `${selectedUser.firstName} ${selectedUser.lastName}`,
                employeeAddress: `${selectedUser.address?.street || ""}, ${selectedUser.address?.zipCode || ""} ${selectedUser.address?.city || ""}`,
                startDate: new Date(contractForm.startDate).toLocaleDateString("de-DE"),
                endDate: contractForm.endDate ? new Date(contractForm.endDate).toLocaleDateString("de-DE") : undefined,
                weeklyHours: contractForm.weeklyHours,
                hourlyRate: contractForm.hourlyRate,
                lumpSumAmount: contractForm.lumpSumAmount,
                monthlyEarningsLimit: appSettings.monthlyEarningsLimit || 538,
                vacationDaysPerYear: selectedUser.vacationDaysPerYear ?? undefined,
                contractType: selectedUser.contractType || "Ehrenamtlich",
                boardSignatureUrl: contractForm.boardSignatureUrl,
                employeeSignatureUrl: contractForm.employeeSignatureUrl
            }, selectedUser.id);

            const updatedProfile = { ...selectedUser, contractDocumentUrl: url, entryDate: contractForm.startDate };
            await userService.saveUserProfile(updatedProfile);
            setUsers(users.map(u => u.id === selectedUser.id ? updatedProfile : u));

            setIsContractModalOpen(false);
            showMessage('success', 'Vertrag erfolgreich generiert und gespeichert!');
        } catch (error) {
            console.error(error);
            showMessage('error', 'Fehler beim Generieren des Vertrages.');
        } finally {
            setIsSaving(false);
            setContractForm(f => ({ ...f, boardSignatureUrl: "", employeeSignatureUrl: "" }));
        }
    };

    const handleNotificationTimeSave = async () => {
        if (!user || !userProfile) return;
        setIsNotifSaving(true);
        try {
            const profileToSave: UserProfile = {
                ...userProfile,
                notificationHour: notifHour,
                notificationMinute: notifMinute,
                notificationDayOfWeek: notifDayOfWeek,
            };
            await userService.saveUserProfile(profileToSave);
            showMessage('success', `Benachrichtigungen jetzt jeden ${wochentagName(notifDayOfWeek)} um ${String(notifHour).padStart(2, '0')}:${String(notifMinute).padStart(2, '0')} Uhr.`);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Fehler beim Speichern der Benachrichtigungszeit.');
        } finally {
            setIsNotifSaving(false);
        }
    };

    const wochentagName = (day: number) => {
        const namen = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        return namen[day] || 'Montag';
    };

    const handleAppSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await settingsService.saveSettings(appForm);
            setAppSettings(appForm);
            await refreshSettings();
            showMessage('success', 'App-Einstellungen erfolgreich gespeichert.');
        } catch (err) {
            console.error(err);
            showMessage('error', 'Fehler beim Speichern der App-Einstellungen.');
        } finally {
            setIsSaving(false);
        }
    };

    const getListString = (arr: string[] | undefined) => (arr || []).join(", ");
    const setListString = (field: keyof AppSettings, val: string) => {
        const arr = val.split(',').map(s => s.trim()).filter(Boolean);
        setAppForm({ ...appForm, [field]: arr });
    };

    return (
        <ProtectedRoute>
            <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6 max-w-4xl mx-auto w-full pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2.5 rounded-xl">
                                <Settings className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            Einstellungen
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-2">Verwalte dein Profil und App-Konfigurationen.</p>
                    </div>
                    {userProfile?.role === 'Admin' && (
                        <div className="flex bg-gray-50 dark:bg-slate-900/40 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 w-full md:w-auto overflow-x-auto">
                            <button onClick={() => setActiveTab('profil')} className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'profil' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 dark:hover:bg-white/5 hover:bg-gray-100'} rounded-lg transition-all text-sm font-medium whitespace-nowrap`}>
                                <User className="w-4 h-4" /> Profil
                            </button>
                            <button onClick={() => setActiveTab('benutzer')} className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'benutzer' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 dark:hover:bg-white/5 hover:bg-gray-100'} rounded-lg transition-all text-sm font-medium whitespace-nowrap`}>
                                <Users className="w-4 h-4" /> Benutzer
                            </button>
                            <button onClick={() => setActiveTab('app')} className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'app' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 dark:hover:bg-white/5 hover:bg-gray-100'} rounded-lg transition-all text-sm font-medium whitespace-nowrap`}>
                                <AppWindow className="w-4 h-4" /> Dropdowns & App
                            </button>
                            <button onClick={() => setActiveTab('benachrichtigungen')} className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'benachrichtigungen' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 dark:hover:bg-white/5 hover:bg-gray-100'} rounded-lg transition-all text-sm font-medium whitespace-nowrap`}>
                                <Bell className="w-4 h-4" /> Benachrichtigungen
                            </button>
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`p-4 rounded-xl font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                {/* --- PROFIL TAB --- */}
                {activeTab === 'profil' && (
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        {userProfile?.role === 'Admin' && (
                            <Card className="border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm">
                                <CardContent className="p-5 flex items-start gap-4">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1" />
                                    <div>
                                        <h3 className="font-bold text-indigo-900 dark:text-indigo-200">Admin-Modus aktiv</h3>
                                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                                            Du hast globale Administratorrechte.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 blur-2xl opacity-50"></div>
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-500" />
                                    Persönliche Daten
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="profile-firstName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Vorname</label>
                                        <input id="profile-firstName" type="text" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="profile-lastName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nachname</label>
                                        <input id="profile-lastName" type="text" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-Mail (Aktuell)</label>
                                        <input id="profile-email" type="email" value={user?.email || ""} readOnly
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="profile-role" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rolle</label>
                                        <select id="profile-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                                            disabled={userProfile?.role !== 'Admin'}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 dark:disabled:bg-slate-900/20 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                                        >
                                            <option value="Mitarbeiter">Mitarbeiter</option>
                                            <option value="Kassenwart">Kassenwart</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/50 shadow-sm overflow-hidden">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Moon className="w-5 h-5 text-indigo-500" />
                                    Darstellung & Design
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-indigo-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-yellow-500">
                                                <Sun className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900 dark:text-white">Hell</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-400">Standard Design</div>
                                            </div>
                                        </div>
                                        {theme === 'light' && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-indigo-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-900 p-2 rounded-lg shadow-sm text-indigo-400">
                                                <Moon className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900 dark:text-white">Dunkel</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-400">Augenschonend</div>
                                            </div>
                                        </div>
                                        {theme === 'dark' && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm relative overflow-hidden">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-indigo-500" />
                                    Passwort ändern
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Neues Passwort</label>
                                        <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                            placeholder="Leer lassen für keine Änderung"
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Passwort bestätigen</label>
                                        <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                            placeholder="Neues Passwort bestätigen"
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-indigo-500" />
                                    Adressdaten (für automatische Fahrtkosten)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="profile-street" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Straße & Hausnummer</label>
                                        <input id="profile-street" type="text" value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="profile-zipCode" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">PLZ</label>
                                        <input id="profile-zipCode" type="text" value={form.address.zipCode} onChange={e => setForm(f => ({ ...f, address: { ...f.address, zipCode: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="profile-city" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Wohnort (Wird für Fahrtkosten verwendet)</label>
                                        <input id="profile-city" type="text" required value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                    Bankverbindung
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="profile-accountHolder" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kontoinhaber</label>
                                        <input id="profile-accountHolder" type="text" value={form.bankDetails.accountHolder} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountHolder: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="profile-iban" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">IBAN</label>
                                        <input id="profile-iban" type="text" value={form.bankDetails.iban} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, iban: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="profile-bic" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">BIC</label>
                                        <input id="profile-bic" type="text" value={form.bankDetails.bic} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, bic: e.target.value } }))}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="submit" variant="primary" disabled={isSaving} className="min-w-[150px]">
                                {isSaving ? "Speichert..." : "Speichern"}
                            </Button>
                        </div>
                    </form>
                )
                }

                {/* --- BENUTZER VERWALTUNG TAB --- */}
                {
                    activeTab === 'benutzer' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-4 rounded-xl shadow-sm border border-white/60 dark:border-white/10 backdrop-blur-sm">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                    Alle Benutzer ({users.length})
                                </h2>
                                <Button variant="primary" size="sm" onClick={() => setIsUserModalOpen(true)} className="gap-2">
                                    <Plus className="w-4 h-4" /> Benutzer anlegen
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.map(u => (
                                    <Card key={u.id} className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{u.firstName} {u.lastName}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full font-medium ${u.role === 'Admin' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : u.role === 'Kassenwart' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-slate-300'}`}>
                                                            {u.role}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                                            {u.contractType || 'Ehrenamtlich'}
                                                        </span>
                                                    </p>
                                                </div>
                                                {u.contractDocumentUrl && (
                                                    <a href={u.contractDocumentUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center pr-3 group border border-rose-100" title="Vertrag ansehen">
                                                        <FileSignature className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(u);
                                                        const hourlyRate = appSettings?.minimumWage || 12.41;
                                                        const monthlyEarningsLimit = appSettings?.monthlyEarningsLimit || 538;
                                                        const lumpSumAmount = u.contractType === 'Minijob' ? monthlyEarningsLimit : 250;
                                                        let weeklyHours = 0;
                                                        if (u.contractType === 'Minijob') {
                                                            // Korrekte Berechnung: Monatsverdienst / Stundenlohn = Stunden pro Monat
                                                            // Stunden pro Monat / 4.33 (Wochen pro Monat) = Stunden pro Woche
                                                            weeklyHours = Math.round(((lumpSumAmount / hourlyRate) / 4.33) * 100) / 100;
                                                        }
                                                        setContractForm({
                                                            startDate: new Date().toISOString().slice(0, 10),
                                                            endDate: "",
                                                            weeklyHours,
                                                            hourlyRate,
                                                            lumpSumAmount,
                                                            boardSignatureUrl: "",
                                                            employeeSignatureUrl: ""
                                                        });
                                                        setIsContractModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 shadow-sm text-gray-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-2 font-medium"
                                                    title="Vertrag generieren"
                                                >
                                                    <FileSignature className="w-4 h-4 text-rose-500" />
                                                    Vertrag
                                                </button>
                                                <div className="flex-1"></div>
                                                <button
                                                    onClick={() => { setSelectedUser(u); setEditUserForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, contractType: u.contractType || 'Ehrenamtlich', vacationDaysPerYear: u.vacationDaysPerYear || 24 }); setIsEditUserModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                    title="Bearbeiten"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {u.id !== user?.uid && (
                                                    <button
                                                        onClick={() => { setSelectedUser(u); setIsDeleteUserModalOpen(true); }}
                                                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Löschen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Neuen Benutzer anlegen">
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4 text-sm text-blue-800">
                                        Mit diesem Formular wird ein neues Benutzerkonto angelegt. Das Einmalpasswort erhält der Benutzer von dir und er sollte es nach dem ersten Login ändern.
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="newUser-firstName" className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                                            <input id="newUser-firstName" type="text" required value={newUserForm.firstName} onChange={e => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        <div>
                                            <label htmlFor="newUser-lastName" className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                                            <input id="newUser-lastName" type="text" required value={newUserForm.lastName} onChange={e => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="newUser-role" className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                                            <select id="newUser-role" value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="Mitarbeiter">Mitarbeiter</option>
                                                <option value="Kassenwart">Kassenwart</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vertragsart</label>
                                            <select title="Vertragsart auswählen" value={newUserForm.contractType} onChange={e => setNewUserForm({ ...newUserForm, contractType: e.target.value as ContractType })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="Ehrenamtlich">Ehrenamtlich</option>
                                                <option value="Ehrenamtspauschale">Ehrenamtspauschale</option>
                                                <option value="Übungsleiterpauschale">Übungsleiterpauschale</option>
                                                <option value="Minijob">Minijob</option>
                                            </select>
                                        </div>
                                    </div>
                                    {newUserForm.contractType === 'Minijob' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Urlaubstage (pro Jahr)</label>
                                            <input type="number" title="Urlaubstage" step="1" required value={newUserForm.vacationDaysPerYear} onChange={e => setNewUserForm({ ...newUserForm, vacationDaysPerYear: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                    )}
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Login E-Mail</label>
                                        <input type="email" title="Login E-Mail" required value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Einmalpasswort (Login)</label>
                                        <input type="text" title="Einmalpasswort (Login)" required value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                            placeholder="Min. 6 Zeichen" minLength={6}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)}>Abbrechen</Button>
                                        <Button type="submit" variant="primary" disabled={isSaving}>Anlegen</Button>
                                    </div>
                                </form>
                            </Modal>

                            <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Benutzer bearbeiten">
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                                            <input type="text" title="Vorname" required value={editUserForm.firstName} onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                                            <input type="text" title="Nachname" required value={editUserForm.lastName} onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                                            <select title="Rolle auswählen" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value as Role })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="Mitarbeiter">Mitarbeiter</option>
                                                <option value="Kassenwart">Kassenwart</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vertragsart</label>
                                            <select title="Vertragsart bearbeiten" value={editUserForm.contractType} onChange={e => setEditUserForm({ ...editUserForm, contractType: e.target.value as ContractType })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="Ehrenamtlich">Ehrenamtlich</option>
                                                <option value="Ehrenamtspauschale">Ehrenamtspauschale</option>
                                                <option value="Übungsleiterpauschale">Übungsleiterpauschale</option>
                                                <option value="Minijob">Minijob</option>
                                            </select>
                                        </div>
                                    </div>
                                    {editUserForm.contractType === 'Minijob' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Urlaubstage (pro Jahr)</label>
                                            <input type="number" title="Urlaubstage" step="1" required value={editUserForm.vacationDaysPerYear} onChange={e => setEditUserForm({ ...editUserForm, vacationDaysPerYear: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setIsEditUserModalOpen(false)}>Abbrechen</Button>
                                        <Button type="submit" variant="primary" disabled={isSaving}>Speichern</Button>
                                    </div>
                                </form>
                            </Modal>

                            <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Benutzer löschen">
                                <div className="space-y-4">
                                    <p className="text-gray-600">
                                        Möchtest du den Benutzer <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                    </p>
                                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                                        Hinweis: Die zugehörigen Daten des Benutzers bleiben erhalten, der Login wird jedoch in diese Ansicht nicht mehr übernommen.
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <Button type="button" variant="ghost" onClick={() => setIsDeleteUserModalOpen(false)}>Abbrechen</Button>
                                        <Button type="button" variant="danger" disabled={isSaving} onClick={handleDeleteUser}>
                                            {isSaving ? "Wird gelöscht..." : "Unwiderruflich löschen"}
                                        </Button>
                                    </div>
                                </div>
                            </Modal>

                            <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title={`Vertrag generieren: ${selectedUser?.contractType || 'Ehrenamtlich'}`}>
                                <form onSubmit={handleGenerateContract} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                                            <input type="date" title="Startdatum" required value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum (optional)</label>
                                            <input type="date" title="Enddatum" value={contractForm.endDate} onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        {selectedUser?.contractType === 'Minijob' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stundenlohn (€)</label>
                                                    <input type="number" title="Stundenlohn" step="0.01" required value={contractForm.hourlyRate}
                                                        onChange={e => {
                                                            const newRate = parseFloat(e.target.value) || 0;
                                                            const weekly = newRate > 0 && contractForm.lumpSumAmount > 0 ? (contractForm.lumpSumAmount / newRate) / 4.33 : 0;
                                                            setContractForm({ ...contractForm, hourlyRate: newRate, weeklyHours: Math.round(weekly * 100) / 100 });
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monatsgehalt (€)</label>
                                                    <input type="number" title="Monatsgehalt" step="1" required value={contractForm.lumpSumAmount}
                                                        onChange={e => {
                                                            const newSalary = parseFloat(e.target.value) || 0;
                                                            const weekly = contractForm.hourlyRate > 0 && newSalary > 0 ? (newSalary / contractForm.hourlyRate) / 4.33 : 0;
                                                            setContractForm({ ...contractForm, lumpSumAmount: newSalary, weeklyHours: Math.round(weekly * 100) / 100 });
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Errechnete Wochenstunden (automatisch)</label>
                                                    <input type="number" title="Wochenstunden" step="0.5" required value={contractForm.weeklyHours} onChange={e => setContractForm({ ...contractForm, weeklyHours: parseFloat(e.target.value) })}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-gray-50" />
                                                </div>
                                            </>
                                        )}
                                        {(selectedUser?.contractType === 'Ehrenamtspauschale' || selectedUser?.contractType === 'Übungsleiterpauschale') && (
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Pauschale (gesamt, €)</label>
                                                <input type="number" title="Pauschale" step="10" required value={contractForm.lumpSumAmount} onChange={e => setContractForm({ ...contractForm, lumpSumAmount: parseFloat(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-gray-100 pt-4 space-y-4">
                                        <SignaturePad
                                            label="Unterschrift Vorstand / Verein"
                                            onSave={(url) => setContractForm(f => ({ ...f, boardSignatureUrl: url }))}
                                            onClear={() => setContractForm(f => ({ ...f, boardSignatureUrl: "" }))}
                                        />
                                        <SignaturePad
                                            label={`Unterschrift Vertragspartner (${selectedUser?.firstName})`}
                                            onSave={(url) => setContractForm(f => ({ ...f, employeeSignatureUrl: url }))}
                                            onClear={() => setContractForm(f => ({ ...f, employeeSignatureUrl: "" }))}
                                        />
                                    </div>
                                    {(!contractForm.boardSignatureUrl || !contractForm.employeeSignatureUrl) && (
                                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                            Bitte beide Parteien im jeweiligen Feld unterschreiben.
                                        </p>
                                    )}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <Button type="button" variant="ghost" onClick={() => setIsContractModalOpen(false)}>Abbrechen</Button>
                                        <Button type="submit" variant="primary" disabled={isSaving || !contractForm.boardSignatureUrl || !contractForm.employeeSignatureUrl}>
                                            {isSaving ? "Generiert..." : "Generieren & Speichern"}
                                        </Button>
                                    </div>
                                </form>
                            </Modal>
                        </div>
                    )
                }

                {/* --- APP EINSTELLUNGEN TAB --- */}
                {activeTab === 'app' && (
                    <div className="space-y-6">
                        {userProfile?.role === 'Admin' && (
                            <Card className="border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900/80 dark:to-slate-900/40 shadow-sm relative overflow-hidden">
                                <CardContent className="p-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Cloud className="w-5 h-5 text-blue-500" />
                                        Google Cloud Kosten (Dieser Monat)
                                    </h2>
                                    {isBillingLoading ? (
                                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 pt-2 pb-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium">Lade Echtzeitkosten aus BigQuery...</span>
                                        </div>
                                    ) : billingData?.error ? (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-700/30 text-sm">
                                            {billingData.error}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row items-center gap-4">
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-center items-center px-10 min-w-[200px]">
                                                <span className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">Summe aktuell</span>
                                                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                                                    {billingData?.currentMonthTotal.toFixed(2).replace('.', ',')} {billingData?.currency}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-slate-300 flex-1 leading-relaxed">
                                                Die angezeigten Kosten umfassen alle Cloud-Dienste (Hosting, Datenbank, KI) für dein Projekt <b className="text-gray-900 dark:text-white">cura-ant</b> im aktuellen Kalendermonat. <br />
                                                <span className="text-xs mt-2 block text-gray-500 dark:text-slate-400">Hinweis: Die Daten werden automatisch mehrmals täglich von Google in dein BigQuery "gcp_billing" Dataset exportiert. Dadurch kann es zu einer leichten Verzögerung von bis zu 24h bei neuen Gebühren kommen.</span>
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <form onSubmit={handleAppSettingsSubmit} className="space-y-6">
                                <Card className="border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm relative overflow-hidden">
                                    <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <AppWindow className="w-5 h-5 text-indigo-500" />
                                    App-Dropdowns und globale Werte
                                </h2>
                                <p className="text-sm text-gray-500 mb-6">
                                    Passe die Listen und Dropdown-Menüs der Applikation an. Trenne die einzelnen Einträge durch ein Komma (z.B. &quot;Wert 1, Wert 2, Wert 3&quot;).
                                </p>

                                <div className="space-y-6">
                                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                                        <h3 className="text-md font-bold text-gray-800 dark:text-white mb-4">Vereinsdaten (für generierte Verträge)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label htmlFor="app-clubName" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Name des Vereins / Trägers</label>
                                                <input id="app-clubName" type="text" value={appForm.clubName || ""} onChange={e => setAppForm({ ...appForm, clubName: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="app-street" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Straße und Hausnummer</label>
                                                <input id="app-street" type="text" value={appForm.address?.street || ""} onChange={e => setAppForm({ ...appForm, address: { street: e.target.value, zipCode: appForm.address?.zipCode || "", city: appForm.address?.city || "" } })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label htmlFor="app-zipCode" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">PLZ</label>
                                                <input id="app-zipCode" type="text" value={appForm.address?.zipCode || ""} onChange={e => setAppForm({ ...appForm, address: { street: appForm.address?.street || "", zipCode: e.target.value, city: appForm.address?.city || "" } })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label htmlFor="app-city" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Ort</label>
                                                <input id="app-city" type="text" value={appForm.address?.city || ""} onChange={e => setAppForm({ ...appForm, address: { street: appForm.address?.street || "", zipCode: appForm.address?.zipCode || "", city: e.target.value } })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Fahrtkostenpauschale (€ pro km)</label>
                                            <input type="number" title="Fahrtkostenpauschale" step="0.01" min="0" required
                                                value={appForm.travelExpenseRate}
                                                onChange={e => setAppForm({ ...appForm, travelExpenseRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Gesetzlicher Mindestlohn pro Stunde (€)</label>
                                            <input type="number" title="Mindestlohn pro Stunde" step="0.01" min="0" required
                                                value={appForm.minimumWage || 12.41}
                                                onChange={e => setAppForm({ ...appForm, minimumWage: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Verdienstgrenze monatlich (Minijob, €)</label>
                                            <input type="number" title="Verdienstgrenze monatlich" step="1" min="0" required
                                                value={appForm.monthlyEarningsLimit || 538}
                                                onChange={e => setAppForm({ ...appForm, monthlyEarningsLimit: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Stunden pro Urlaubstag (h)</label>
                                            <input type="number" title="Stunden pro Urlaubstag" step="0.5" min="0" required
                                                value={appForm.hoursPerVacationDay ?? 8}
                                                onChange={e => setAppForm({ ...appForm, hoursPerVacationDay: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Gesprächsarten <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(Consultations)</span></label>
                                            <TagInput value={getListString(appForm.consultationTypes)} onChange={(val) => setListString('consultationTypes', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Lebensabschnitte</label>
                                            <TagInput value={getListString(appForm.lifeStages)} onChange={(val) => setListString('lifeStages', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Personengruppen</label>
                                            <TagInput value={getListString(appForm.personGroups)} onChange={(val) => setListString('personGroups', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Problem-Herkunft</label>
                                            <TagInput value={getListString(appForm.problemOrigins)} onChange={(val) => setListString('problemOrigins', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Folge-Probleme</label>
                                            <TagInput value={getListString(appForm.subProblems)} onChange={(val) => setListString('subProblems', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Zieltypen</label>
                                            <TagInput value={getListString(appForm.goalTypes)} onChange={(val) => setListString('goalTypes', val)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Vortragsarten <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(Vorträge-Modul)</span></label>
                                            <TagInput value={getListString(appForm.lectureTypes)} onChange={(val) => setListString('lectureTypes', val)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Freizeiten-Arten <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(Freizeiten-Modul)</span></label>
                                            <TagInput value={getListString(appForm.retreatTypes)} onChange={(val) => setListString('retreatTypes', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">SKB - Begleitpersonen</label>
                                            <TagInput value={getListString(appForm.skbCompanions)} onChange={(val) => setListString('skbCompanions', val)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">SKB - Externer Beratungsschein</label>
                                            <TagInput value={getListString(appForm.skbCertificateOptions)} onChange={(val) => setListString('skbCertificateOptions', val)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">SKB - Haupt-Konfliktpunkte</label>
                                            <TagInput value={getListString(appForm.skbConflictPoints)} onChange={(val) => setListString('skbConflictPoints', val)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">SKB - Intervention & Hilfsangebote</label>
                                            <TagInput value={getListString(appForm.skbInterventions)} onChange={(val) => setListString('skbInterventions', val)} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="submit" variant="primary" disabled={isSaving} className="min-w-[150px]">
                                {isSaving ? "Speichert..." : "App Parameter Speichern"}
                            </Button>
                        </div>
                    </form>
            </div>
          )}

          {/* --- BENACHRICHTIGUNGEN TAB (nur für Admin) --- */}
          {userProfile?.role === 'Admin' && activeTab === 'benachrichtigungen' && (
              <div className="space-y-6">
                  <Card className="border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm">
                      <CardContent className="p-5 flex items-start gap-4">
                          <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1" />
                          <div>
                              <h3 className="font-bold text-indigo-900 dark:text-indigo-200">Push-Benachrichtigungen</h3>
                              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                                  Erhalte wöchentliche Erinnerungen für Gebetsanliegen und andere wichtige Termine.
                              </p>
                          </div>
                      </CardContent>
                  </Card>

                  {/* Push-Status */}
                  <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                      <CardContent className="p-6">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                              Benachrichtigungs-Einstellungen
                          </h2>

                          <div className="space-y-4">
                              {/* Status */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10">
                                  <div className="flex items-center gap-3">
                                      {push.isSupported ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      ) : (
                                          <AlertCircle className="w-5 h-5 text-amber-600" />
                                      )}
                                      <div>
                                          <div className="font-medium text-gray-900 dark:text-white">
                                              {push.isSupported ? 'Push wird unterstützt' : 'Push nicht unterstützt'}
                                          </div>
                                          <div className="text-sm text-gray-500 dark:text-slate-400">
                                              {push.isSupported 
                                                  ? 'Dein Browser unterstützt Push-Benachrichtigungen' 
                                                  : 'Dein Browser unterstützt keine Push-Benachrichtigungen'}
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Permission Status */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10">
                                  <div className="flex items-center gap-3">
                                      {push.permission === 'granted' ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      ) : push.permission === 'denied' ? (
                                          <AlertCircle className="w-5 h-5 text-red-600" />
                                      ) : (
                                          <AlertCircle className="w-5 h-5 text-amber-600" />
                                      )}
                                      <div>
                                          <div className="font-medium text-gray-900 dark:text-white">
                                              Berechtigung: {push.permission === 'granted' ? 'Erteilt' : push.permission === 'denied' ? 'Verweigert' : 'Ausstehend'}
                                          </div>
                                          <div className="text-sm text-gray-500 dark:text-slate-400">
                                              {push.permission === 'granted' 
                                                  ? 'Benachrichtigungen sind aktiviert' 
                                                  : push.permission === 'denied'
                                                  ? 'Benachrichtigungen sind blockiert (in Browser-Einstellungen änderbar)'
                                                  : 'Keine Berechtigung erteilt'}
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3 pt-2">
                                  {push.permission !== 'granted' && push.isSupported && (
                                      <Button
                                          type="button"
                                          variant="primary"
                                          onClick={push.requestPermission}
                                      >
                                          🔔 Berechtigung erteilen
                                      </Button>
                                  )}

                                  {push.permission === 'granted' && !push.isInitialized && push.isSupported && (
                                      <Button
                                          type="button"
                                          variant="primary"
                                          onClick={() => {
                                              console.log("[UI] Gerät registrieren geklickt");
                                              push.registerToken();
                                          }}
                                          disabled={push.isRegistering}
                                      >
                                          {push.isRegistering ? '⏳ Registriere...' : '📱 Gerät registrieren'}
                                      </Button>
                                  )}

                                  {push.isInitialized && (
                                      <Button
                                          type="button"
                                          variant="secondary"
                                          onClick={push.sendTestNotification}
                                          disabled={push.isSending}
                                      >
                                          {push.isSending ? 'Sende...' : '📬 Test-Benachrichtigung'}
                                      </Button>
                                  )}

                                  {push.isInitialized && (
                                      <Button
                                          type="button"
                                          variant="ghost"
                                          onClick={push.refreshRegistration}
                                      >
                                          🔄 Aktualisieren
                                      </Button>
                                  )}
                              </div>

                              {/* Info: VAPID Key fehlt */}
                              {push.permission === 'granted' && !push.isInitialized && !push.error && (
                                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                                      <strong>Hinweis:</strong> Klicke auf „Gerät registrieren" um Push zu aktivieren.
                                  </div>
                              )}

                              {/* Error Message */}
                              {push.error && (
                                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                      {push.error}
                                  </div>
                              )}

                              {/* Info */}
                              {!push.isSupported && (
                                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                                      <strong>Hinweis:</strong> Push-Benachrichtigungen werden von deinem Browser nicht unterstützt. 
                                      Bitte verwende Chrome, Edge oder Firefox auf Desktop oder Android. 
                                      Auf iOS funktioniert Push nur in einer installierten PWA (ab iOS 16.4).
                                  </div>
                              )}
                          </div>
                      </CardContent>
                  </Card>

                  {/* Erinnerungsliste */}
                  {user && push.isInitialized && (
                      <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                          <CardContent className="p-6">
                              <ReminderList userId={user.uid} />
                          </CardContent>
                      </Card>
                  )}

                  {/* Benachrichtigungszeit */}
                  {push.isInitialized && (
                      <Card className="border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                          <CardContent className="p-6">
                              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-indigo-500" />
                                  Benachrichtigungszeit
                              </h2>
                              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                                  Lege fest, wann du deine wöchentlichen Erinnerungen erhalten möchtest.
                              </p>

                              <div className="flex flex-wrap items-center gap-4">
                                  {/* Wochentag */}
                                  <div>
                                      <label htmlFor="notif-day" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Wochentag</label>
                                      <select
                                          id="notif-day"
                                          value={notifDayOfWeek}
                                          onChange={e => setNotifDayOfWeek(parseInt(e.target.value))}
                                          className="px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                      >
                                          <option value={1}>Montag</option>
                                          <option value={2}>Dienstag</option>
                                          <option value={3}>Mittwoch</option>
                                          <option value={4}>Donnerstag</option>
                                          <option value={5}>Freitag</option>
                                          <option value={6}>Samstag</option>
                                          <option value={0}>Sonntag</option>
                                      </select>
                                  </div>

                                  {/* Uhrzeit */}
                                  <div className="flex items-end gap-2">
                                      <div>
                                          <label htmlFor="notif-hour" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Stunde</label>
                                          <select
                                              id="notif-hour"
                                              value={notifHour}
                                              onChange={e => setNotifHour(parseInt(e.target.value))}
                                              className="px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white w-20"
                                          >
                                              {Array.from({ length: 24 }, (_, i) => (
                                                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <span className="text-2xl font-bold text-gray-700 dark:text-slate-300 pb-1">:</span>
                                      <div>
                                          <label htmlFor="notif-minute" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Minute</label>
                                          <select
                                              id="notif-minute"
                                              value={notifMinute}
                                              onChange={e => setNotifMinute(parseInt(e.target.value))}
                                              className="px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white w-20"
                                          >
                                              {Array.from({ length: 60 }, (_, i) => (
                                                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </div>

                                  {/* Speichern Button */}
                                  <Button
                                      type="button"
                                      variant="primary"
                                      onClick={handleNotificationTimeSave}
                                      disabled={isNotifSaving}
                                      className="self-end"
                                  >
                                      {isNotifSaving ? '⏳ Speichert...' : '💾 Zeit speichern'}
                                  </Button>
                              </div>

                              {/* Aktuelle Einstellung anzeigen */}
                              <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
                                  Aktuell: Jeden <strong className="text-gray-900 dark:text-white">{wochentagName(notifDayOfWeek)}</strong> um{' '}
                                  <strong className="text-gray-900 dark:text-white">{String(notifHour).padStart(2, '0')}:{String(notifMinute).padStart(2, '0')} Uhr</strong>
                              </p>
                          </CardContent>
                      </Card>
                  )}

                  {!push.isInitialized && push.isSupported && push.permission === 'granted' && (
                      <Card className="border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10 shadow-sm">
                          <CardContent className="p-5 flex items-center gap-4">
                              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                              <div>
                                  <h3 className="font-bold text-amber-900 dark:text-amber-200">
                                      Registrierung ausstehend
                                  </h3>
                                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                      Bitte erteile die Berechtigung und registriere dein Gerät, um Erinnerungen zu erhalten.
                                  </p>
                              </div>
                          </CardContent>
                      </Card>
                  )}
              </div>
          )}
        </div>
      </ProtectedRoute>
    );
}
