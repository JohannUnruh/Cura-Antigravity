"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AppSettings } from "@/types";
import { settingsService } from "@/lib/firebase/services/settingsService";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsContextType {
    settings: AppSettings | null;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        try {
            const settingsData = await settingsService.getSettings();
            setSettings(settingsData);
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSettings = async () => {
        if (!user) return;
        setLoading(true);
        await loadSettings();
    };

    useEffect(() => {
        if (user) {
            loadSettings();
        } else {
            setSettings(null);
            setLoading(false);
        }
    }, [user]);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
