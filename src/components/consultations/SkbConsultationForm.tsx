import React, { useState } from "react";
import { SkbConsultation } from "@/types";
import { Button } from "../ui/Button";
import { VoiceInput } from "../ui/VoiceInput";
import { PhotoUpload } from "../ui/PhotoUpload";
import { useSettings } from "@/contexts/SettingsContext";

interface SkbFormProps {
    clientId: string;
    initialData?: Partial<SkbConsultation>;
    onSubmit: (data: Partial<SkbConsultation>, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'allday') => void;
    onCancel: () => void;
    loading?: boolean;
}

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
    
    const conflictPoints = settings?.skbConflictPoints || DEFAULT_CONFLICT_POINTS;
    const interventions = settings?.skbInterventions || DEFAULT_INTERVENTIONS;
    const companions = settings?.skbCompanions || DEFAULT_COMPANIONS;
    const certificateOptions = settings?.skbCertificateOptions || DEFAULT_CERTIFICATE_OPTIONS;

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

    const formatDate = (date: Date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 10);
    };

    const handleChange = (field: keyof SkbConsultation, value: string | number | boolean | Date | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
        onSubmit(formData, timeOfDay);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Dates + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Dauer (Std.)</label>
                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        required
                        value={formData.durationInHours}
                        onChange={(e) => handleChange('durationInHours', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>



            {/* Companion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Begleitperson</label>
                    <select
                        value={formData.companion}
                        onChange={(e) => handleChange('companion', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {companions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Row 3: Pregnancy Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Schwangerschaftswoche (SSW)</label>
                    <input
                        type="number"
                        min="0"
                        max="42"
                        value={formData.pregnancyWeek || 0}
                        onChange={(e) => handleChange('pregnancyWeek', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Voraussichtl. Entbindungstermin</label>
                    <input
                        type="date"
                        value={formData.expectedDeliveryDate ? formatDate(new Date(formData.expectedDeliveryDate)) : ''}
                        onChange={(e) => handleChange('expectedDeliveryDate', e.target.value ? new Date(e.target.value) : null)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <div>
                    <label className="block text-base font-semibold text-gray-900 mb-1">Externer Beratungsschein</label>
                    <select
                        value={formData.certificateStatus}
                        onChange={(e) => handleChange('certificateStatus', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {certificateOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            </div>

            {/* Conflict Points */}
            <div className="border-t border-gray-100 pt-4">
                <label className="block text-base font-semibold text-gray-900 mb-2">Haupt-Konfliktpunkte</label>
                <div className="flex flex-wrap gap-2">
                    {conflictPoints.map(point => {
                        const isSelected = formData.conflictPointsIds?.includes(point);
                        return (
                            <button
                                key={point}
                                type="button"
                                onClick={() => toggleMulti('conflictPointsIds', point)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {point}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Interventions */}
            <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">Intervention & Hilfsangebote</label>
                <div className="flex flex-wrap gap-2">
                    {interventions.map(item => {
                        const isSelected = formData.interventionsIds?.includes(item);
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleMulti('interventionsIds', item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {item}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Text Fields */}
            <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-base font-semibold text-gray-900">Zielvereinbarung / Nächste Schritte</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('goalAgreement', text)} />
                    </div>
                    <textarea
                        rows={3}
                        value={formData.goalAgreement}
                        onChange={(e) => handleChange('goalAgreement', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        placeholder="Was sind die konkreten nächsten Schritte für Klientin und Berater?"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-base font-semibold text-gray-900">Notizen / Fazit</label>
                        <VoiceInput onResult={(text) => handleVoiceInput('notes', text)} />
                    </div>
                    <textarea
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
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
