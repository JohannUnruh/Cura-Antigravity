import React, { useState } from "react";
import { ConsultationType, LifeStage, SmartCheck, Consultation } from "@/types";
import { Button } from "../ui/Button";
import { VoiceInput } from "../ui/VoiceInput";
import { PhotoUpload } from "../ui/PhotoUpload";

import { useSettings } from "@/contexts/SettingsContext";

interface ConsultationFormProps {
    clientId: string;
    initialData?: Partial<Consultation>;
    onSubmit: (data: Partial<Consultation>, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday') => void;
    onCancel: () => void;
    loading?: boolean;
}

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
        onSubmit({
            ...formData,
            smartCheck: smartCheck.timeBound ? smartCheck : undefined
        }, timeOfDay);
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
                        onChange={(e) => handleChange('dateFrom', new Date(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Datum Bis</label>
                    <input
                        type="date"
                        required
                        value={formData.dateTo ? formatDate(new Date(formData.dateTo)) : ''}
                        onChange={(e) => handleChange('dateTo', new Date(e.target.value))}
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
                        {(settings?.consultationTypes || CONSTS.types).map(t => <option key={t} value={t}>{t}</option>)}
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
                        {(settings?.lifeStages || CONSTS.lifeStages).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Problem-Herkunft</label>
                    <select
                        value={formData.problemOriginId}
                        onChange={(e) => handleChange('problemOriginId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {(settings?.problemOrigins || CONSTS.mockProblemOrigins).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* Multi-Select Sub-Problems */}
            <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">Folge-Probleme</label>
                <div className="flex flex-wrap gap-2">
                    {(settings?.subProblems || CONSTS.mockSubProblems).map(problem => {
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
                        onChange={(e) => handleChange('unitsInHours', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Vorbereitung in Std.</label>
                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={formData.prepTimeInHours}
                        onChange={(e) => handleChange('prepTimeInHours', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>



            {/* Text Fields with Voice Input */}
            <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Zieltyp</label>
                    <select
                        value={formData.goalTypeId}
                        onChange={(e) => handleChange('goalTypeId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {(settings?.goalTypes || CONSTS.mockGoalTypes).map(g => <option key={g} value={g}>{g}</option>)}
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
