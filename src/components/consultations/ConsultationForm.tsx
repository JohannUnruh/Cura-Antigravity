import React, { useState } from "react";
import { ConsultationType, LifeStage, SmartCheck, Consultation } from "@/types";
import { Button } from "../ui/Button";
import { VoiceInput } from "../ui/VoiceInput";
import { PhotoUpload } from "../ui/PhotoUpload";

import { useSettings } from "@/contexts/SettingsContext";

interface ConsultationFormProps {
    clientId: string;
    initialData?: Partial<Consultation>;
    onSubmit: (
        data: Partial<Consultation>,
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

const CONSTS = {
    types: [
        'Ausbildung', 'Beratung', 'Ehe Vorbereitung',
        'Gebetshilfe (Stehcafé)', 'Gebetszeit für Frauen',
        'Glaubensstärkung (Stehcafé)', 'Glaubensstärkung',
        'Seelsorge Präsenz', 'Seelsorge telefonisch'
    ] as ConsultationType[],
    lifeStages: ['Erwachsener', 'junge Erwachsene/r', 'Kindheit', 'Teenager'] as LifeStage[],
    mockProblemOrigins: ['Familie', 'Arbeit', 'Gesundheit', 'Gemeinde', 'Vergangenheit'],
    mockSubProblems: ['Sucht', 'Ehekrise', 'Glaubenskrise', 'Depression', 'Finanzen'],
    mockGoalTypes: ['Wiederherstellung', 'Erkenntnis', 'Verhaltensänderung', 'Entlastung']
};

export function ConsultationForm({ clientId, initialData, onSubmit, onCancel, loading }: ConsultationFormProps) {
    const { settings } = useSettings();
    const isEdit = !!initialData?.id;
    const [formData, setFormData] = useState<Partial<Consultation>>(() => initialData || {
        clientId,
        type: 'Seelsorge Präsenz',
        lifeStage: 'Erwachsener',
        problemOriginId: '',
        goalTypeId: '',
        subProblemsIds: [],
        goalAgreement: '',
        causeFromCounselor: '',
        notes: '',
        unitsInHours: 1,
        prepTimeInHours: 0,
        dateFrom: new Date(),
        dateTo: new Date(),
        photoUrls: [],
    });

    React.useEffect(() => {
        if (!initialData && settings) {
            setFormData(prev => ({
                ...prev,
                problemOriginId: settings.problemOrigins[0] || '',
                goalTypeId: settings.goalTypes[0] || '',
                type: settings.consultationTypes[0] as ConsultationType || 'Seelsorge Präsenz',
                lifeStage: settings.lifeStages[0] as LifeStage || 'Erwachsener'
            }));
        }
    }, [initialData, settings]);

    const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'allday'>('morning');
    const [trackHours, setTrackHours] = useState(true);
    const [distributionType, setDistributionType] = useState<'equal' | 'custom'>('equal');
    const [customHoursMap, setCustomHoursMap] = useState<Record<string, number>>({});

    const dates = React.useMemo(() => {
        if (!formData.dateFrom || !formData.dateTo) return [];
        return getDaysRange(formData.dateFrom, formData.dateTo);
    }, [formData.dateFrom, formData.dateTo]);

    const isMultiDay = dates.length > 1;
    const totalHours = (formData.unitsInHours || 0) + (formData.prepTimeInHours || 0);

    React.useEffect(() => {
        if (distributionType === 'equal') {
            const count = dates.length;
            if (count > 0) {
                const hoursPerDay = Math.round((totalHours / count) * 100) / 100;
                const newMap: Record<string, number> = {};
                dates.forEach((d) => {
                    const key = d.toISOString().split('T')[0];
                    newMap[key] = hoursPerDay;
                });
                setCustomHoursMap(newMap);
            }
        }
    }, [dates, totalHours, distributionType]);

    const handleCustomHourChange = (dateKey: string, val: number) => {
        const newMap = { ...customHoursMap, [dateKey]: val };
        setCustomHoursMap(newMap);
        
        const sum = Object.values(newMap).reduce((acc, curr) => acc + curr, 0);
        const prep = formData.prepTimeInHours || 0;
        const newUnits = Math.max(0, sum - prep);
        setFormData(prev => ({ ...prev, unitsInHours: newUnits }));
    };

    const [smartCheck, setSmartCheck] = useState<SmartCheck>(() => initialData?.smartCheck || {
        specific: false,
        measurable: false,
        achievable: true,
        relevant: 3,
        timeBound: null
    });

    const handleChange = <K extends keyof Consultation>(field: K, value: Consultation[K]) => {
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

    const handleSmartChange = <K extends keyof SmartCheck>(field: K, value: SmartCheck[K]) => {
        setSmartCheck(prev => ({ ...prev, [field]: value }));
    };

    const toggleSubProblem = (problem: string) => {
        setFormData(prev => {
            const current = prev.subProblemsIds || [];
            if (current.includes(problem)) {
                return { ...prev, subProblemsIds: current.filter(p => p !== problem) };
            } else {
                return { ...prev, subProblemsIds: [...current, problem] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const customHoursList = distributionType === 'custom' && trackHours
            ? dates.map(d => {
                const key = d.toISOString().split('T')[0];
                return { date: d, hours: customHoursMap[key] || 0 };
              })
            : undefined;

        onSubmit({
            ...formData,
            smartCheck: smartCheck.timeBound ? smartCheck : undefined
        }, timeOfDay, trackHours, customHoursList);
    };

    const handleVoiceInput = (field: keyof Consultation, text: string) => {
        handleChange(field, (formData[field] as string || "") + " " + text);
    };

    // Helper formatting for date inputs
    const formatDate = (date: Date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 10);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dates */}
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Datum Von</label>
                    <input
                        type="date"
                        required
                        value={formData.dateFrom ? formatDate(new Date(formData.dateFrom)) : ''}
                        onChange={(e) => handleDateFromChange(new Date(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Datum Bis</label>
                    <input
                        type="date"
                        required
                        value={formData.dateTo ? formatDate(new Date(formData.dateTo)) : ''}
                        onChange={(e) => handleDateToChange(new Date(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Tagesabschnitt</label>
                    <select
                        title="Tagesabschnitt"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value as 'morning' | 'afternoon' | 'evening' | 'allday')}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="morning">Vormittags (ab 08:00)</option>
                        <option value="afternoon">Nachmittags (ab 15:00)</option>
                        <option value="evening">Abends (ab 18:00)</option>
                        <option value="allday">Ganztägig</option>
                    </select>
                </div>

                {/* Dropdowns */}
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Gesprächsart</label>
                    <select
                        required
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value as ConsultationType)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {Array.from(new Set(settings?.consultationTypes || CONSTS.types)).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Lebensabschnitt (Problem Herkunft)</label>
                    <select
                        required
                        value={formData.lifeStage}
                        onChange={(e) => handleChange('lifeStage', e.target.value as LifeStage)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {Array.from(new Set(settings?.lifeStages || CONSTS.lifeStages)).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Problem-Herkunft</label>
                    <select
                        value={formData.problemOriginId}
                        onChange={(e) => handleChange('problemOriginId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {Array.from(new Set(settings?.problemOrigins || CONSTS.mockProblemOrigins)).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* Multi-Select Sub-Problems */}
            <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">Folge-Probleme</label>
                <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(settings?.subProblems || CONSTS.mockSubProblems)).map(problem => {
                        const isSelected = formData.subProblemsIds?.includes(problem);
                        return (
                            <button
                                key={problem}
                                type="button"
                                onClick={() => toggleSubProblem(problem)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${isSelected
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {problem}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Durations */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Einheiten in Std.</label>
                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        required
                        value={formData.unitsInHours}
                        onChange={(e) => handleChange('unitsInHours', parseFloat(e.target.value) || 0)}
                        readOnly={distributionType === 'custom' && trackHours && isMultiDay && !isEdit}
                        className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 ${
                            distributionType === 'custom' && trackHours && isMultiDay && !isEdit
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-50'
                        }`}
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Vorbereitung in Std.</label>
                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={formData.prepTimeInHours}
                        onChange={(e) => handleChange('prepTimeInHours', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {/* Zeiterfassung Widget */}
            {!isEdit && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-base font-semibold text-gray-900">Zeiterfassung</h4>
                            <p className="text-xs text-gray-500">Stunden automatisch in die Zeiterfassung übernehmen</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={trackHours}
                                onChange={(e) => setTrackHours(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {trackHours && isMultiDay && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                                <span className="text-sm font-medium text-gray-700">Stundenverteilung</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDistributionType('equal')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            distributionType === 'equal'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-600 border border-gray-200'
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
                                                : 'bg-white text-gray-600 border border-gray-200'
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
                                            <div key={key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                                <span className="text-sm text-gray-600 font-medium">{formattedDate}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        value={customHoursMap[key] || 0}
                                                        onChange={(e) => handleCustomHourChange(key, parseFloat(e.target.value) || 0)}
                                                        className="w-20 px-2 py-1 text-right border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <span className="text-xs text-gray-500">Std.</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="text-right text-xs text-gray-500 pt-1">
                                        Gesamtsumme: <span className="font-semibold text-gray-700">{totalHours} Std.</span> (inkl. Vorbereitung)
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500">
                                    Die gesamten {totalHours} Std. (inkl. Vorbereitung) werden gleichmäßig auf {dates.length} Tage verteilt ({Math.round((totalHours / dates.length) * 100) / 100} Std./Tag).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}



            {/* Text Fields with Voice Input */}
            <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Zieltyp</label>
                    <select
                        value={formData.goalTypeId}
                        onChange={(e) => handleChange('goalTypeId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {Array.from(new Set(settings?.goalTypes || CONSTS.mockGoalTypes)).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-base font-semibold text-gray-900">Zielvereinbarung</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('goalAgreement', text)} />
                    </div>
                    <textarea
                        rows={3}
                        value={formData.goalAgreement}
                        onChange={(e) => handleChange('goalAgreement', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        placeholder="Was wurde als Ziel verabredet?"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Zieltermin</label>
                    <input
                        type="date"
                        value={(() => {
                            if (!smartCheck.timeBound) return '';
                            try {
                                let d = smartCheck.timeBound as unknown;
                                if (d && typeof d === 'object' && 'toDate' in d) {
                                    d = (d as { toDate: () => Date }).toDate();
                                } else {
                                    d = new Date(d as string | number | Date);
                                }
                                return isNaN((d as Date).getTime()) ? '' : (d as Date).toISOString().split('T')[0];
                            } catch { return ''; }
                        })()}
                        onChange={(e) => handleSmartChange('timeBound', e.target.value ? new Date(e.target.value) : null)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-base font-semibold text-gray-900">Ursache aus Seelsorger-Sicht</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('causeFromCounselor', text)} />
                    </div>
                    <textarea
                        rows={3}
                        value={formData.causeFromCounselor}
                        onChange={(e) => handleChange('causeFromCounselor', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-base font-semibold text-gray-900">Notizen</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('notes', text)} />
                    </div>
                    <textarea
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                </div>
            </div>



            {/* Foto-Upload */}
            <div className="mt-6">
                <PhotoUpload
                    existingPhotos={formData.photoUrls || []}
                    onPhotosChange={(urls) => setFormData({ ...formData, photoUrls: urls })}
                    folder="consultations"
                    itemId={initialData?.id}
                />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
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
