"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastMessage {
    type: ToastType;
    text: string;
}

/**
 * Gemeinsames Toast-Primitiv (Usability-Bericht 08.10.2026, U-002/U-019).
 *
 * Ausgelagert aus dem bisherigen Info-Toast der Zeiterfassung, damit alle
 * Schreib-Flows (Klienten, Beratungen, Kurzgespräche, Familienhilfe,
 * Zeiterfassung) eine sichtbare Rückmeldung für Erfolg und Fehler bekommen —
 * kein lautloses Speichern mehr.
 *
 * Verwendung:
 * ```tsx
 * const { toast, showToast, dismissToast } = useToast();
 * …
 * showToast('success', 'Klient gespeichert.');
 * …
 * <ToastContainer toast={toast} onDismiss={dismissToast} />
 * ```
 */
export function useToast(durationMs = 5000) {
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismissToast = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast(null);
    }, []);

    const showToast = useCallback(
        (type: ToastType, text: string) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setToast({ type, text });
            timeoutRef.current = setTimeout(() => {
                setToast(null);
                timeoutRef.current = null;
            }, durationMs);
        },
        [durationMs]
    );

    // Timeout beim Unmount aufräumen
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { toast, showToast, dismissToast };
}

interface ToastContainerProps {
    toast: ToastMessage | null;
    onDismiss: () => void;
}

/**
 * Rendert den Toast unten rechts (fixed). Muss einmal pro Seite/Flow
 * innerhalb des Layouts stehen.
 */
export function ToastContainer({ toast, onDismiss }: ToastContainerProps) {
    if (!toast) return null;

    const colorClasses =
        toast.type === "success"
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
            : toast.type === "warning"
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                : toast.type === "error"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";

    return (
        <div
            className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300"
            role="status"
            aria-live="polite"
        >
            <div className={`px-6 py-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-md ${colorClasses}`}>
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {toast.type === "warning" && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {toast.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {toast.type === "info" && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-medium">{toast.text}</p>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Meldung schließen"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
