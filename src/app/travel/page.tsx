"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { travelService } from "@/lib/firebase/services/travelService";
import { useSettings } from "@/contexts/SettingsContext";
import { userService } from "@/lib/firebase/services/userService";
import { TravelExpense, UserProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Car, Plus, Calendar, MapPin, CheckCircle2, XCircle, Clock3, RefreshCcw, AlertCircle, QrCode, User, FileText } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TravelPage() {
    const { user, userProfile } = useAuth();
    const { settings } = useSettings();
    const [expenses, setExpenses] = useState<TravelExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState<TravelExpense | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [qrCodeExpense, setQrCodeExpense] = useState<TravelExpense | null>(null);
    const [qrCodeUser, setQrCodeUser] = useState<UserProfile | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [lastCalculatedOneWayKm, setLastCalculatedOneWayKm] = useState<number | null>(null);
    const [isManualKm, setIsManualKm] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

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
            isRoundTrip: false,
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

            if (userProfile?.role === 'Kassenwart' || userProfile?.role === 'Admin') {
                const allUsers = await userService.getAllUsers();
                const uMap: Record<string, UserProfile> = {};
                allUsers.forEach(u => {
                    uMap[u.id] = u;
                });
                setUsersMap(uMap);
            }
        } finally {
            setLoading(false);
        }
    }, [user, userProfile]);

    useEffect(() => { loadData(); }, [loadData]);

    const openNew = () => {
        setSelected(null);
        setForm(getEmptyForm(userProfile));
        setLastCalculatedOneWayKm(null);
        setIsManualKm(false);
        setSubmitError(null);
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
            isRoundTrip: item.isRoundTrip || false,
        });
        const oneWay = (item.kmEnd - item.kmStart) / (item.isRoundTrip ? 2 : 1);
        setLastCalculatedOneWayKm(Math.round(oneWay));
        setIsManualKm(false);
        setSubmitError(null);
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
                    setLastCalculatedOneWayKm(distanceKm);
                    const multiplier = form.isRoundTrip ? 2 : 1;
                    setForm(prev => ({
                        ...prev,
                        kmEnd: prev.kmStart + (distanceKm * multiplier)
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

    const handleRoundTripChange = (checked: boolean) => {
        setForm(prev => {
            const nextRoundTrip = checked;
            let nextKmEnd = prev.kmEnd;
            if (lastCalculatedOneWayKm !== null) {
                const multiplier = nextRoundTrip ? 2 : 1;
                nextKmEnd = prev.kmStart + (lastCalculatedOneWayKm * multiplier);
            }
            return {
                ...prev,
                isRoundTrip: nextRoundTrip,
                kmEnd: nextKmEnd,
            };
        });
    };

    const handleShowQrCode = async (expense: TravelExpense) => {
        setQrCodeExpense(expense);
        
        let targetProfile: UserProfile | null = null;
        if (expense.authorId === user?.uid) {
            targetProfile = userProfile;
        } else {
            targetProfile = usersMap[expense.authorId] || null;
        }
        
        setQrCodeUser(targetProfile);
        
        if (targetProfile?.bankDetails?.iban && targetProfile?.bankDetails?.accountHolder) {
            try {
                const purpose = `Fahrtkosten ${new Date(expense.startDate).toLocaleDateString("de-DE")} ${expense.startLocation.substring(0, 15)}...`;
                const qrText = [
                    "BCD",
                    "002",
                    "1",
                    "SCT",
                    targetProfile.bankDetails.bic || "",
                    targetProfile.bankDetails.accountHolder.substring(0, 70),
                    targetProfile.bankDetails.iban.replace(/\s+/g, ""),
                    `EUR${(expense.calculatedAmount ?? 0).toFixed(2)}`,
                    "",
                    "",
                    purpose.substring(0, 140),
                    ""
                ].join("\n");
                
                const url = await QRCode.toDataURL(qrText, {
                    width: 250,
                    margin: 2,
                    color: {
                        dark: "#0f172a",
                        light: "#ffffff"
                    }
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error("Error creating QR Code:", err);
                setQrCodeUrl(null);
            }
        } else {
            setQrCodeUrl(null);
        }
        
        setIsQrModalOpen(true);
    };

    const handleExportPDF = async (expense: TravelExpense) => {
        const doc = new jsPDF();
        
        let creator: UserProfile | null = null;
        if (expense.authorId === user?.uid) {
            creator = userProfile;
        } else {
            creator = usersMap[expense.authorId] || null;
        }
        
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}`.trim() : "Unbekannter Mitarbeiter";
        const lastName = creator ? creator.lastName : "Berater";
        const safeLastName = lastName.replace(/[^a-zA-Z0-9]/g, "");
        const dateObj = new Date(expense.startDate);
        const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const amountStr = (expense.calculatedAmount ?? 0).toFixed(2).replace(".", "_");
        
        const fileName = `Fahrtkosten_${amountStr}_${yearMonth}_${safeLastName}.pdf`;

        try {
            const getBase64Image = async (url: string) => {
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            };
            const logoBase64 = await getBase64Image("/zefabiko_logo.png");
            doc.addImage(logoBase64, 'PNG', 14, 12, 16, 16);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Fahrtkostenabrechnung", 34, 23);
        } catch (error) {
            console.error("Could not load logo for PDF", error);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Fahrtkostenabrechnung", 14, 20);
        }

        // Header info
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Metadata / Date
        doc.text(`Erstellungsdatum: ${new Date().toLocaleDateString("de-DE")}`, 140, 20);
        doc.text(`Status: ${expense.status}`, 140, 25);
        
        // Divider line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(14, 32, 196, 32);

        // Submitter details
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Angaben zum Mitarbeiter:", 14, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Name: ${creatorName}`, 14, 46);
        doc.text(`Vertragstyp: ${creator?.contractType || "Ehrenamtlich"}`, 14, 51);
        doc.text(`Anschrift: ${creator?.address?.street || ""}, ${creator?.address?.zipCode || ""} ${creator?.address?.city || ""}`, 14, 56);
        
        // Bank details if available
        if (creator?.bankDetails?.iban) {
            doc.text(`Kontoinhaber: ${creator.bankDetails.accountHolder}`, 110, 46);
            doc.text(`IBAN: ${creator.bankDetails.iban}`, 110, 51);
            if (creator.bankDetails.bic) {
                doc.text(`BIC: ${creator.bankDetails.bic}`, 110, 56);
            }
        } else {
            doc.text("Bankverbindung: Keine hinterlegt", 110, 46);
        }

        // Divider line
        doc.line(14, 63, 196, 63);

        // Details of the trip
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Details der Fahrt:", 14, 71);
        doc.setFont("helvetica", "normal");
        
        const tableColumn = ["Parameter", "Wert"];
        const tableRows = [
            ["Datum der Fahrt", new Date(expense.startDate).toLocaleDateString("de-DE")],
            ["Startort", expense.startLocation],
            ["Zielort", expense.endLocation],
            ["Fahrttyp", expense.isRoundTrip ? "Hin- und Rückfahrt" : "Einfache Fahrt"],
            ["Kilometerstand Start", `${expense.kmStart.toLocaleString("de-DE")} km`],
            ["Kilometerstand Ende", `${expense.kmEnd.toLocaleString("de-DE")} km`],
            ["Gefahrene Distanz", `${expense.kmDriven.toLocaleString("de-DE")} km`],
            ["Erstattungssatz", `${(settings?.travelExpenseRate || 0.30).toFixed(2).replace(".", ",")} €/km`],
        ];

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 77,
            theme: 'striped',
            headStyles: { fillColor: [14, 165, 233] }, // sky-500
            styles: { fontSize: 10 }
        });

        // Get final Y after table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable?.finalY || 130;

        // Reimbursement amount summary
        doc.setDrawColor(14, 165, 233); // sky-500
        doc.setFillColor(240, 249, 255); // sky-50
        doc.rect(14, finalY + 8, 182, 16, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(3, 105, 161); // sky-700
        doc.text("Erstattungsbetrag Gesamt:", 18, finalY + 18);
        doc.text(`${(expense.calculatedAmount ?? 0).toFixed(2).replace(".", ",")} €`, 150, finalY + 18);
        doc.setTextColor(0, 0, 0); // reset to black

        // Signature area
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        doc.line(14, finalY + 45, 80, finalY + 45);
        doc.text("Unterschrift Mitarbeiter", 14, finalY + 50);

        doc.line(110, finalY + 45, 176, finalY + 45);
        doc.text("Freigabe (Kassenwart/Vorstand)", 110, finalY + 50);

        doc.save(fileName);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSubmitError(null);

        // Plausibilitätsprüfung
        if (form.kmEnd <= form.kmStart) {
            setSubmitError("Der Kilometerstand am Ende muss größer sein als der Kilometerstand am Start.");
            setIsSaving(false);
            return;
        }

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
        } catch (error) {
            console.error("Error saving expense:", error);
            setSubmitError("Fehler beim Speichern der Fahrtkostenabrechnung. Bitte versuche es erneut.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: TravelExpense["status"]) => {
        try {
            await travelService.updateExpense(id, { status });
            await loadData();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Fehler beim Aktualisieren des Status.");
        }
    };

    const statusConfig = {
        Eingereicht: { label: "Eingereicht", icon: Clock3, color: "bg-yellow-100 text-yellow-700" },
        Genehmigt: { label: "Genehmigt", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
        Abgelehnt: { label: "Abgelehnt", icon: XCircle, color: "bg-red-100 text-red-700" },
    };

    return (
        <ProtectedRoute requiredPermission="hasTravelAccess">
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
                            const creator = item.authorId === user?.uid ? userProfile : (usersMap[item.authorId] || null);
                            const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : null;
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
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                                    {creatorName && (
                                                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-0.5 rounded-full">
                                                            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                            {creatorName}
                                                        </span>
                                                    )}
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
                                            <div className="flex items-center gap-3 shrink-0">
                                                {item.status !== "Abgelehnt" && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleShowQrCode(item)}
                                                        className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 gap-2 shrink-0 text-sm flex items-center bg-white dark:bg-slate-900"
                                                        title="Überweisungs-QR-Code (GiroCode) anzeigen"
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                        <span className="hidden sm:inline">GiroCode</span>
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="secondary"
                                                    onClick={() => handleExportPDF(item)}
                                                    className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/20 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 gap-2 shrink-0 text-sm flex items-center bg-white dark:bg-slate-900"
                                                    title="PDF Abrechnung herunterladen"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    <span className="hidden sm:inline">PDF</span>
                                                </Button>

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
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Datum</label>
                            <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Startort</label>
                                <input type="text" required value={form.startLocation}
                                    onChange={e => setForm({ ...form, startLocation: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="z.B. Musterstr. 1, 70173 Stuttgart" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Zielort</label>
                                <input type="text" required value={form.endLocation}
                                    onChange={e => setForm({ ...form, endLocation: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="z.B. Zielstr. 42, 80331 München" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-white/10">
                            <input
                                id="isRoundTrip"
                                type="checkbox"
                                checked={form.isRoundTrip}
                                onChange={e => handleRoundTripChange(e.target.checked)}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded dark:bg-slate-900 dark:border-white/10"
                            />
                            <label htmlFor="isRoundTrip" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                                Hin- und Rückfahrt berechnen (berechnete Distanz verdoppeln)
                            </label>
                        </div>

                        <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-white/10">
                            <input
                                id="isManualKm"
                                type="checkbox"
                                checked={isManualKm}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    setIsManualKm(checked);
                                    if (!checked && lastCalculatedOneWayKm !== null) {
                                        const multiplier = form.isRoundTrip ? 2 : 1;
                                        setForm(prev => ({ ...prev, kmEnd: prev.kmStart + (lastCalculatedOneWayKm * multiplier) }));
                                    }
                                }}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded dark:bg-slate-900 dark:border-white/10"
                            />
                            <label htmlFor="isManualKm" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                                Kilometerstand manuell eingeben
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kilometerstand Start</label>
                                <input type="number" min="0" required value={form.kmStart}
                                    onChange={e => setForm({ ...form, kmStart: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500/20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    {isManualKm ? "Kilometerstand Ende (Manuell)" : "Kilometerstand Ende (Auto-Berechnung)"}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={form.kmEnd}
                                    readOnly={!isManualKm}
                                    onChange={isManualKm ? (e => setForm({ ...form, kmEnd: parseInt(e.target.value) || 0 })) : undefined}
                                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500/20 ${
                                        !isManualKm ? "focus:outline-none cursor-not-allowed text-gray-500 dark:text-slate-400" : ""
                                    }`}
                                />
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

                        {submitError && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Abbrechen</Button>
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? "Wird eingereicht..." : "Einreichen"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* QR Code Modal */}
                <Modal 
                    isOpen={isQrModalOpen} 
                    onClose={() => {
                        setIsQrModalOpen(false);
                        setQrCodeUrl(null);
                        setQrCodeExpense(null);
                        setQrCodeUser(null);
                    }} 
                    title="GiroCode für Überweisung"
                >
                    <div className="flex flex-col items-center justify-center p-4 space-y-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Scanne diesen EPC-QR-Code (GiroCode) mit deiner Banking-App auf dem Smartphone, um die Überweisung direkt auszuführen.
                        </p>

                        {qrCodeUrl ? (
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrCodeUrl} alt="GiroCode" className="w-[250px] h-[250px]" />
                            </div>
                        ) : (
                            <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl text-amber-800 dark:text-amber-300 text-sm flex flex-col items-center gap-3">
                                <AlertCircle className="w-8 h-8 text-amber-600" />
                                <div>
                                    <p className="font-semibold mb-1">Keine Bankverbindung hinterlegt</p>
                                    <p className="text-xs opacity-90">
                                        Der einreichende Mitarbeiter ({qrCodeUser ? `${qrCodeUser.firstName} ${qrCodeUser.lastName}` : "Unbekannt"}) hat keine IBAN oder keinen Kontoinhaber in seinem Benutzerprofil eingetragen. Der QR-Code kann daher nicht generiert werden.
                                    </p>
                                </div>
                            </div>
                        )}

                        {qrCodeExpense && qrCodeUser && qrCodeUser.bankDetails?.iban && (
                            <div className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-left space-y-2 text-sm text-gray-900 dark:text-white">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-slate-400">Empfänger:</span>
                                    <span className="font-medium">{qrCodeUser.bankDetails.accountHolder}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-slate-400">IBAN:</span>
                                    <span className="font-mono font-medium">{qrCodeUser.bankDetails.iban}</span>
                                </div>
                                {qrCodeUser.bankDetails.bic && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-slate-400">BIC:</span>
                                        <span className="font-mono font-medium">{qrCodeUser.bankDetails.bic}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 font-semibold">
                                    <span className="text-gray-500 dark:text-slate-400">Betrag:</span>
                                    <span className="text-sky-600 dark:text-sky-400">{(qrCodeExpense.calculatedAmount ?? 0).toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                                    <span>Verwendungszweck:</span>
                                    <span className="truncate max-w-[200px]" title={`Fahrtkosten ${new Date(qrCodeExpense.startDate).toLocaleDateString("de-DE")} ${qrCodeExpense.startLocation.substring(0, 15)}...`}>
                                        Fahrtkosten {new Date(qrCodeExpense.startDate).toLocaleDateString("de-DE")} ...
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                                setIsQrModalOpen(false);
                                setQrCodeUrl(null);
                                setQrCodeExpense(null);
                                setQrCodeUser(null);
                            }}
                            className="w-full"
                        >
                            Schließen
                        </Button>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
