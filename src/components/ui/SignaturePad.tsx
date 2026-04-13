import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './Button';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onClear?: () => void;
    label: string;
}

export function SignaturePad({ onSave, onClear, label }: SignaturePadProps) {
    const padRef = useRef<SignatureCanvas>(null);

    const handleClear = () => {
        padRef.current?.clear();
        onClear?.();
    };

    const handleSave = () => {
        if (padRef.current && !padRef.current.isEmpty()) {
            onSave(padRef.current.getTrimmedCanvas().toDataURL('image/png'));
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden h-[150px] touch-none">
                <SignatureCanvas
                    ref={padRef}
                    penColor="black"
                    canvasProps={{ className: "w-full h-full" }}
                    onEnd={handleSave}
                />
            </div>
            <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-xs">
                    Löschen
                </Button>
            </div>
        </div>
    );
}
