import React, { useState } from "react";
import { SkbConsultation } from "@/types";
import { Button } from "../ui/Button";
import { VoiceInput } from "../ui/VoiceInput";
import { PhotoUpload } from "../ui/PhotoUpload";
import { useSettings } from "@/contexts/SettingsContext";

interface SkbFormProps {
    clientId: string;
    initialData?: Partial<SkbConsultation>;
    onSubmit: (
        data: Partial<SkbConsultation>,
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday',
        trackHours?: boolean,
        customHours?: { date: Date; hours: number }[]
    ) => void;
    onCancel: () => void;
    loading?: boolean;
}

const getDaysRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const curr = new Date(start);
    curr.setHours(0, 0, 0, 0);
    const stop = new Date(end);
    stop.setHours(0, 0, 0, 0);
    
    let count = 0;
    while (curr <= stop && count < 100) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
        count++;
    }
    return dates;
};

const DEFAULT_CONFLICT_POINTS = [
    'Finanzielle Nöte',
    'Fehlende Unterstützung durch Partner',
    'Druck zur Abtreibung (durch Partner/Umfeld)',
    'Überforderung',
    'Wohnungsnot',
    'Ausbildungs-/Berufsgefährdung',
    'Medizinische Sorgen',
    'Ethische/Biblische Konflikte',
    'Innere Zerrissenheit/Angst',
];

const DEFAULT_INTERVENTIONS = [
    'Emotionale Stabilisierung',
    'Praktische Lebenshilfe (Wohnraum/Finanzen/Erstausstattung)',
    'Aufklärung über gesetzliche Hilfen',
    'Ermutigung aus biblischer Perspektive (Wert des Lebens)',
    'Gebetsunterstützung',
    'Begleitung bei Arzt-/Ämtergängen',
    'Vermittlung an externe Fachstellen',
];

const DEFAULT_COMPANIONS = ['Keine', 'Partner', 'Freundin', 'Elternteil', 'Sonstige'] as const;
const DEFAULT_CERTIFICATE_OPTIONS = ['Ja', 'Nein', 'Unbekannt', 'In Planung'] as const;

export function SkbConsultationForm({ clientId, initialData, onSubmit, onCancel, loading }: SkbFormProps) {
    const { settings } = useSettings();
    const isEdit = !!initialData?.id;
    
    const conflictPoints = Array.from(new Set(settings?.skbConflictPoints || DEFAULT_CONFLICT_POINTS));
    const interventions = Array.from(new Set(settings?.skbInterventions || DEFAULT_INTERVENTIONS));
    const companions = Array.from(new Set(settings?.skbCompanions || DEFAULT_COMPANIONS));
    const certificateOptions = Array.from(new Set(settings?.skbCertificateOptions || DEFAULT_CERTIFICATE_OPTIONS));

    const [formData, setFormData] = useState<Partial<SkbConsultation>>(() => initialData || {
        clientId,
        isAnonymous: false,
        companion: 'Keine',
        pregnancyWeek: 0,
        certificateStatus: 'Unbekannt',
        conflictPointsIds: [],
        interventionsIds: [],
        goalAgreement: '',
        notes: '',
        durationInHours: 1,
        dateFrom: new Date(),
        dateTo: new Date(),
        photoUrls: [],
    });

    const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'allday'>('morning');
    const [trackHours, setTrackHours] = useState(true);
    const [distributionType, setDistributionType] = useState<'equal' | 'custom'>('equal');
    const [customHoursMap, setCustomHoursMap] = useState<Record<string, number>>({});
    const [customHoursStrMap, setCustomHoursStrMap] = useState<Record<string, string>>({});
    const [durationStr, setDurationStr] = useState(formData.durationInHours?.toString() ?? "1");

    const dates = React.useMemo(() => {
        if (!formData.dateFrom || !formData.dateTo) return [];
        return getDaysRange(formData.dateFrom, formData.dateTo);
    }, [formData.dateFrom, formData.dateTo]);

    const isMultiDay = dates.length > 1;
    const totalHours = formData.durationInHours || 0;

    React.useEffect(() => {
        if (distributionType === 'equal') {
            const count = dates.length;
            if (count > 0) {
                const hoursPerDay = Math.round((totalHours / count) * 100) / 100;
                const newMap: Record<string, number> = {};
                const newStrMap: Record<string, string> = {};
                dates.forEach((d) => {
                    const key = d.toISOString().split('T')[0];
                    newMap[key] = hoursPerDay;
                    newStrMap[key] = hoursPerDay.toString();
                });
                setCustomHoursMap(newMap);
                setCustomHoursStrMap(newStrMap);
            }
        }
    }, [dates, totalHours, distributionType]);

    React.useEffect(() => {
        if (formData.durationInHours !== undefined && parseFloat(durationStr) !== formData.durationInHours) {
            setDurationStr(formData.durationInHours.toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.durationInHours]);

    const handleCustomHourChange = (dateKey: string, valStr: string) => {
        const normalizedStr = valStr.replace(',', '.');
        setCustomHoursStrMap(prev => ({ ...prev, [dateKey]: normalizedStr }));

        const parsed = parseFloat(normalizedStr);
        const valNum = !isNaN(parsed) ? parsed : 0;

        const newMap = { ...customHoursMap, [dateKey]: valNum };
        setCustomHoursMap(newMap);
        
        const sum = Object.values(newMap).reduce((acc, curr) => acc + curr, 0);
        setFormData(prev => ({ ...prev, durationInHours: sum }));
    };

    const formatDate = (date: Date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 10);
    };

    const handleChange = (field: keyof SkbConsultation, value: string | number | boolean | Date | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDateFromChange = (date: Date) => {
        setFormData(prev => {
            const updated = { ...prev, dateFrom: date };
            if (prev.dateTo && date.getTime() > prev.dateTo.getTime()) {
                updated.dateTo = date;
            }
            return updated;
        });
    };

    const handleDateToChange = (date: Date) => {
        setFormData(prev => {
            const updated = { ...prev, dateTo: date };
            if (prev.dateFrom && date.getTime() < prev.dateFrom.getTime()) {
                updated.dateTo = prev.dateFrom;
            }
            return updated;
        });
    };

    const toggleMulti = (field: 'conflictPointsIds' | 'interventionsIds', item: string) => {
        setFormData(prev => {
            const current = (prev[field] as string[]) || [];
            if (current.includes(item)) {
                return { ...prev, [field]: current.filter(i => i !== item) };
            }
            return { ...prev, [field]: [...current, item] };
        });
    };

    const handleVoiceInput = (field: keyof SkbConsultation, text: string) => {
        handleChange(field, ((formData[field] as string) || "") + " " + text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const customHoursList = distributionType === 'custom' && trackHours
            ? dates.map(d => {
                const key = d.toISOString().split('T')[0];
                return { date: d, hours: customHoursMap[key] || 0 };
              })
            : undefined;

        onSubmit(formData, timeOfDay, trackHours, customHoursList);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Dates + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="dateFrom" className="block text-base font-semibold text-gray-900 dark:text-white mb-1">Datum Von</label>
                    <input
                        type="date"
                        id="dateFrom"
                        required
                        value={formData.dateFrom ? formatDate(new Date(formData.dateFrom)) : ''}
                        onChange={(e) => {
                            if (!e.target.value) {
                                setFormData(prev => ({ ...prev, dateFrom: undefined }));
                                return;
                            }
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) {
                                handleDateFromChange(d);
                            }
                        }}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label htmlFor="dateTo" className="block text-base font-semibold text-gray-900 dark:text-white mb-1">Datum Bis</label>
                    <input
                        type="date"
                        id="dateTo"
                        required
                        value={formData.dateTo ? formatDate(new Date(formData.dateTo)) : ''}
                        onChange={(e) => {
                            if (!e.target.value) {
                                setFormData(prev => ({ ...prev, dateTo: undefined }));
                                return;
                            }
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) {
                                handleDateToChange(d);
                            }
                        }}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label htmlFor="timeOfDay" className="block text-base font-semibold text-gray-900 dark:text-white mb-1">Tagesabschnitt</label>
                    <select
                        id="timeOfDay"
                        title="Tagesabschnitt"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value as 'morning' | 'afternoon' | 'evening' | 'allday')}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="morning">Vormittags (ab 08:00)</option>
                        <option value="afternoon">Nachmittags (ab 15:00)</option>
                        <option value="evening">Abends (ab 18:00)</option>
                        <option value="allday">Ganztägig</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="durationInHours" className="block text-base font-semibold text-gray-900 dark:text-white mb-1">Dauer (Std.)</label>
                    <input
                        type="text"
                        id="durationInHours"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        required
                        value={durationStr}
                        onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            setDurationStr(val);
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed)) {
                                handleChange('durationInHours', parsed);
                            } else if (val === '') {
                                handleChange('durationInHours', 0);
                            }
                        }}
                        readOnly={distributionType === 'custom' && trackHours && isMultiDay && !isEdit}
                        className={`w-full px-3 py-2 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 ${
                            distributionType === 'custom' && trackHours && isMultiDay && !isEdit
                                ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-50 dark:bg-slate-800'
                        }`}
                    />
                </div>
            </div>

            {/* Zeiterfassung Widget */}
            {!isEdit && (
                <div className="border-t border-gray-100 dark:border-white/10 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Zeiterfassung</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Stunden automatisch in die Zeiterfassung übernehmen</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={trackHours}
                                onChange={(e) => setTrackHours(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {trackHours && isMultiDay && (
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200/60 dark:border-white/10 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/10 pb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Stundenverteilung</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDistributionType('equal')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            distributionType === 'equal'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        Gleichmäßig
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDistributionType('custom')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            distributionType === 'custom'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        Individuell
                                    </button>
                                </div>
                            </div>

                            {distributionType === 'custom' ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {dates.map((date) => {
                                        const key = date.toISOString().split('T')[0];
                                        const formattedDate = date.toLocaleDateString('de-DE', {
                                            weekday: 'short',
                                            day: '2-digit',
                                            month: '2-digit',
                                        });
                                        return (
                                            <div key={key} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">{formattedDate}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9]*[.,]?[0-9]*"
                                                        value={customHoursStrMap[key] ?? (customHoursMap[key]?.toString() ?? '0')}
                                                        onChange={(e) => handleCustomHourChange(key, e.target.value)}
                                                        className="w-20 px-2 py-1 text-right border border-gray-200 dark:border-white/10 dark:text-white bg-gray-50 dark:bg-slate-900 rounded focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-slate-400">Std.</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="text-right text-xs text-gray-500 dark:text-slate-400 pt-1">
                                        Gesamtsumme: <span className="font-semibold text-gray-700 dark:text-white">{totalHours} Std.</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Die gesamten {totalHours} Std. werden gleichmäßig auf {dates.length} Tage verteilt ({Math.round((totalHours / dates.length) * 100) / 100} Std./Tag).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Companion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/10">
                <div>
                    <label htmlFor="companion" className="block text-base font-semibold text-gray-900 dark:text-white mb-1">Begleitperson</label>
                    <select
                        id="companion"
                        value={formData.companion}
                        onChange={(e) => handleChange('companion', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {companions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Row 3: Pregnancy Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 dark:border-white/10 pt-4">
                <div>
                    <label htmlFor="pregnancyWeek" className="block text-base font-semibold text-gray-900 dark:text-white mb-1 min-h-[3rem] flex items-end pb-1">Schwangerschaftswoche (SSW)</label>
                    <input
                        type="number"
                        id="pregnancyWeek"
                        min="0"
                        max="42"
                        value={formData.pregnancyWeek !== undefined && formData.pregnancyWeek !== null ? formData.pregnancyWeek : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                handleChange('pregnancyWeek', null);
                            } else {
                                const parsed = parseInt(val);
                                handleChange('pregnancyWeek', isNaN(parsed) ? null : parsed);
                            }
                        }}
                        className="w-full h-10 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label htmlFor="expectedDeliveryDate" className="block text-base font-semibold text-gray-900 dark:text-white mb-1 min-h-[3rem] flex items-end pb-1">Voraussichtl. Entbindungstermin</label>
                    <input
                        type="date"
                        id="expectedDeliveryDate"
                        value={formData.expectedDeliveryDate ? formatDate(new Date(formData.expectedDeliveryDate)) : ''}
                        onChange={(e) => {
                            if (!e.target.value) {
                                handleChange('expectedDeliveryDate', null);
                                return;
                            }
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) {
                                handleChange('expectedDeliveryDate', d);
                            }
                        }}
                        className="w-full h-10 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label htmlFor="certificateStatus" className="block text-base font-semibold text-gray-900 dark:text-white mb-1 min-h-[3rem] flex items-end pb-1">Externer Beratungsschein</label>
                    <select
                        id="certificateStatus"
                        value={formData.certificateStatus}
                        onChange={(e) => handleChange('certificateStatus', e.target.value)}
                        className="w-full h-10 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {certificateOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            </div>

            {/* Conflict Points */}
            <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-2">Haupt-Konfliktpunkte</label>
                <div className="flex flex-wrap gap-2">
                    {conflictPoints.map(point => {
                        const isSelected = formData.conflictPointsIds?.includes(point);
                        return (
                            <button
                                key={point}
                                type="button"
                                onClick={() => toggleMulti('conflictPointsIds', point)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                    ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {point}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Interventions */}
            <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-2">Intervention & Hilfsangebote</label>
                <div className="flex flex-wrap gap-2">
                    {interventions.map(item => {
                        const isSelected = formData.interventionsIds?.includes(item);
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleMulti('interventionsIds', item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {item}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Text Fields */}
            <div className="space-y-4 border-t border-gray-100 dark:border-white/10 pt-4">
                <div>
                    <div className="flex justify-between mb-1">
                        <label htmlFor="goalAgreement" className="block text-base font-semibold text-gray-900 dark:text-white">Zielvereinbarung / Nächste Schritte</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('goalAgreement', text)} />
                    </div>
                    <textarea
                        id="goalAgreement"
                        rows={3}
                        value={formData.goalAgreement}
                        onChange={(e) => handleChange('goalAgreement', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        placeholder="Was sind die konkreten nächsten Schritte für Klientin und Berater?"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label htmlFor="notes" className="block text-base font-semibold text-gray-900 dark:text-white">Notizen / Fazit</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('notes', text)} />
                    </div>
                    <textarea
                        id="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        placeholder="Gesprächsverlauf und Fazit..."
                    />
                </div>
            </div>

            {/* Foto-Upload */}
            <div className="mt-6">
                <PhotoUpload
                    existingPhotos={formData.photoUrls || []}
                    onPhotosChange={(urls) => setFormData({ ...formData, photoUrls: urls })}
                    folder="skb-consultations"
                    itemId={initialData?.id}
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-white/10">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Abbrechen
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                >
                    {loading ? "Wird gespeichert..." : "Speichern"}
                </Button>
            </div>
        </form>
    );
}
