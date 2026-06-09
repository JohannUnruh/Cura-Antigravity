"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }

            if (e.key === "Tab" && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        const previouslyActiveElement = document.activeElement as HTMLElement;

        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", handleKeyDown);
            
            // Focus trap: auto focus the first element inside the modal
            setTimeout(() => {
                if (modalRef.current) {
                    const focusableElements = modalRef.current.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    if (focusableElements.length > 0) {
                        (focusableElements[0] as HTMLElement).focus();
                    }
                }
            }, 50);
        }

        return () => {
            document.body.style.overflow = "unset";
            document.removeEventListener("keydown", handleKeyDown);
            if (previouslyActiveElement && typeof previouslyActiveElement.focus === "function") {
                previouslyActiveElement.focus();
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="min-h-min p-4 pt-8 flex items-start justify-center w-full">
                <div
                    ref={modalRef}
                    className="glass-panel w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 relative my-8"
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/50 dark:border-white/10">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-slate-400"
                            title="Schließen"
                            aria-label="Schließen"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
