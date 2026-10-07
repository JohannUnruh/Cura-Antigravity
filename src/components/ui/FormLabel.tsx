"use client";

import * as React from "react";
import { cn } from "./Card"; // Reusing cn utility for now

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    htmlFor?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

/**
 * Einheitliches Label-Primitive für Formulare.
 * `required` fügt ein rotes Sternchen hinzu — Pflichtfelder sind so
 * überall in der App visuell konsistent markiert (Workshop-Backlog P3-⑦).
 */
export function FormLabel({ htmlFor, required, children, className, ...props }: FormLabelProps) {
    return (
        <label
            htmlFor={htmlFor}
            className={cn("block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1", className)}
            {...props}
        >
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    );
}
