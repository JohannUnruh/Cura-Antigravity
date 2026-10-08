"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "./Card";

interface InfoTooltipProps {
    /** Erklärungstext (1–2 Sätze), angezeigt im Popover */
    text: string;
    /** optionale zusätzliche Klassen für den Wrapper */
    className?: string;
    /** Accessible Label des Icon-Buttons */
    label?: string;
}

/**
 * Wiederverwendbares Info-Tooltip-Primitiv (Usability-Bericht 08.10.2026).
 *
 * Kleines `Info`-Icon (lucide), das per Hover, Tastatur-Fokus oder Tap
 * (Touch) ein kurzes Popover mit dem Erklärungstext zeigt. Dark-Mode-
 * kompatibel. Kein Emoji, kein Dauerhinweis — nur bei Bedarf.
 *
 * Verwendung direkt neben einem FormLabel:
 * ```tsx
 * <div className="flex items-center gap-1.5">
 *     <FormLabel htmlFor="x">Label</FormLabel>
 *     <InfoTooltip text="Erklärung …" />
 * </div>
 * ```
 */
export function InfoTooltip({ text, className, label = "Hinweis zu diesem Feld" }: InfoTooltipProps) {
    const [open, setOpen] = useState(false);

    return (
        <span className={cn("relative inline-flex items-center", className)}>
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                onClick={(e) => {
                    // Tap/Toggle auf Touch-Geräten; preventDefault verhindert,
                    // dass ein umschließendes <label> den Fokus weiterreicht.
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                className="inline-flex p-0.5 rounded-full text-gray-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
                <Info className="w-4 h-4" />
            </button>
            {open && (
                <span
                    role="tooltip"
                    className="absolute left-0 top-full mt-1.5 z-50 w-64 p-2.5 text-xs font-normal leading-relaxed text-left text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150"
                >
                    {text}
                </span>
            )}
        </span>
    );
}
