"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '@/lib/firebase/services/userService';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user, userProfile } = useAuth();
    const [fallbackTheme, setFallbackTheme] = useState<Theme>(() => {
        if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "dark";
        }
        return "light";
    });
    const theme = userProfile?.theme ?? fallbackTheme;

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const setTheme = async (newTheme: Theme) => {
        setFallbackTheme(newTheme);
        if (user && userProfile) {
            try {
                await userService.saveUserProfile({
                    ...userProfile,
                    theme: newTheme
                });
            } catch (error) {
                console.error("Error saving theme preference:", error);
            }
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
