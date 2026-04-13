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
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.body.style.overflow = "unset";
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="min-h-min p-4 pt-8 flex items-start justify-center w-full">
                <div
                    ref={modalRef}
                    className="glass-panel w-full max-w-3xl bg-white/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 relative my-8"
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/50">
                        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-black/5 transition-colors text-gray-500"
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
