"use client";

import React, { useState, useCallback, useEffect } from "react";

interface TagInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

export function TagInput({ value, onChange, placeholder = "Einträge durch Komma trennen...", rows = 3 }: TagInputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync local value with prop value when it changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Parse the value into tags
    const tags = localValue
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    // Handle adding tags when user types comma
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    }, [onChange]);

    // Handle blur - auto-format the list
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Auto-format: ensure one space after each comma
        const formatted = tags.join(', ');
        if (formatted !== localValue) {
            setLocalValue(formatted);
            onChange(formatted);
        }
    }, [tags, localValue, onChange]);

    // Handle key press - allow Enter to add tag
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentValue = localValue;
            // Add comma if not already ending with one
            if (!currentValue.endsWith(',') && !currentValue.endsWith(', ')) {
                const newValue = currentValue + ', ';
                setLocalValue(newValue);
                onChange(newValue);
            }
        }
    }, [localValue, onChange]);

    return (
        <div className="w-full">
            <textarea
                rows={rows}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-sm text-gray-900 dark:text-white resize-none"
            />

            {isFocused && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                    💡 Tipp: Mit <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-xs">Enter</kbd> kannst du einen Eintrag hinzufügen
                </p>
            )}
        </div>
    );
}
