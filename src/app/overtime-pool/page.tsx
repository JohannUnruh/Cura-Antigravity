"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Diese Seite wurde zugunsten der Integration in die Zeiterfassung entfernt.
 * Weiterleitung zur Zeiterfassung mit Pool-Ansicht.
 */
export default function OvertimePoolRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/time-tracking?view=pool");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
            <div className="text-center">
                <p className="text-gray-600 dark:text-slate-400 mb-4">Überstundenpool wird geladen...</p>
                <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
            </div>
        </div>
    );
}
