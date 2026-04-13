"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, Unsubscribe, MessagePayload } from "firebase/messaging";
import { useAuth } from "./AuthContext";
import { reminderService } from "@/lib/firebase/services/reminderService";
import { firebaseConfig } from "@/lib/firebase/config";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface PushNotificationState {
    isSupported: boolean;
    permission: NotificationPermission;
    isInitialized: boolean;
    isSending: boolean;
    isRegistering: boolean;
    error: string | null;
}

interface PushNotificationContextType extends PushNotificationState {
    requestPermission: () => Promise<boolean>;
    registerToken: () => Promise<void>;
    sendTestNotification: () => Promise<void>;
    refreshRegistration: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────────

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export const usePushNotification = () => {
    const context = useContext(PushNotificationContext);
    if (!context) {
        throw new Error("usePushNotification must be used within PushNotificationProvider");
    }
    return context;
};

// ──────────────────────────────────────────────────────────────────────────────
// Provider Component
// ──────────────────────────────────────────────────────────────────────────────

export const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        permission: 'default',
        isInitialized: false,
        isSending: false,
        isRegistering: false,
        error: null,
    });

    const [isRegistering, setIsRegistering] = useState(false);

    // VAPID Key aus Firebase Console
    // HINWEIS: Dieser Key muss in der Firebase Console unter Project Settings → Cloud Messaging generiert werden
    const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    // ──────────────────────────────────────────────────────────────────────────
    // Initialize: Prüfen ob Push unterstützt wird
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const isSupported = 
            typeof window !== 'undefined' && 
            'Notification' in window && 
            'serviceWorker' in navigator && 
            'PushManager' in window;

        setState(prev => ({
            ...prev,
            isSupported,
            permission: isSupported ? Notification.permission : 'denied',
        }));

        if (isSupported) {
            // Bestehende Berechtigung prüfen
            console.log("[Push] Push-Benachrichtigungen werden unterstützt");
        } else {
            console.warn("[Push] Push-Benachrichtigungen werden NICHT unterstützt");
        }
    }, []);

    // ──────────────────────────────────────────────────────────────────────────
    // FCM Token registrieren
    // ──────────────────────────────────────────────────────────────────────────

    const registerToken = useCallback(async () => {
        if (!user || !state.isSupported) {
            console.warn("[Push] User oder Support fehlt:", { hasUser: !!user, isSupported: state.isSupported });
            return;
        }

        // Prüfen ob VAPID Key konfiguriert ist
        if (!VAPID_KEY) {
            console.error("[Push] NEXT_PUBLIC_FIREBASE_VAPID_KEY nicht gesetzt");
            setState(prev => ({
                ...prev,
                error: "VAPID Key nicht konfiguriert. Siehe PUSH_NOTIFICATIONS.md",
            }));
            return;
        }

        setIsRegistering(true);
        setState(prev => ({ ...prev, error: null }));

        try {
            console.log("[Push] Starte Registrierung...");
            console.log("[Push] VAPID Key:", VAPID_KEY.substring(0, 10) + "...");

            // Firebase App initialisieren (falls noch nicht geschehen)
            const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
            console.log("[Push] Firebase App:", app.name);

            // Messaging initialisieren
            const messaging = getMessaging(app);
            console.log("[Push] Messaging initialisiert");

            // Service Worker registrieren
            console.log("[Push] Registriere Service Worker...");
            const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
                scope: "/",
            });
            console.log("[Push] Service Worker registriert:", registration.scope);

            // Warten bis der SW aktiv ist
            if (registration.installing) {
                console.log("[Push] Warte auf SW Installation...");
                await new Promise<void>((resolve) => {
                    registration.installing?.addEventListener("statechange", (e) => {
                        const target = e.target as ServiceWorker | null;
                        if (target?.state === "activated") resolve();
                    });
                });
            }

            // FCM Token anfordern
            console.log("[Push] Fordere FCM Token an...");
            const fcmToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (!fcmToken) {
                console.warn("[Push] Kein FCM Token erhalten");
                setState(prev => ({ ...prev, error: "Kein FCM Token erhalten. Prüfe VAPID Key." }));
                setIsRegistering(false);
                return;
            }

            console.log("[Push] FCM Token erhalten:", fcmToken.substring(0, 20) + "...");

            // Token in Firestore speichern
            const deviceInfo = {
                browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
                         navigator.userAgent.includes('Firefox') ? 'Firefox' :
                         navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
                platform: navigator.platform,
                userAgent: navigator.userAgent,
            };

            await reminderService.saveFcmToken(user.uid, fcmToken, deviceInfo);
            console.log("[Push] Token in Firestore gespeichert");

            setState(prev => ({
                ...prev,
                isInitialized: true,
                error: null,
            }));
            setIsRegistering(false);

        } catch (error) {
            console.error("[Push] Fehler beim Registrieren:", error);
            const message = error instanceof Error ? error.message : "Unbekannter Fehler";
            setState(prev => ({
                ...prev,
                error: message,
            }));
            setIsRegistering(false);
        }
    }, [user, state.isSupported, VAPID_KEY]);

    // ──────────────────────────────────────────────────────────────────────────
    // Permission anfordern
    // ──────────────────────────────────────────────────────────────────────────

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!state.isSupported) {
            setState(prev => ({ ...prev, error: "Push-Benachrichtigungen werden nicht unterstützt" }));
            return false;
        }

        try {
            console.log("[Push] Frage Berechtigung an...");
            
            const permission = await Notification.requestPermission();
            
            setState(prev => ({ ...prev, permission }));

            if (permission === 'granted') {
                console.log("[Push] Berechtigung erteilt");
                // Nach Berechtigung Token registrieren
                await registerToken();
                return true;
            } else if (permission === 'denied') {
                console.warn("[Push] Berechtigung verweigert");
                setState(prev => ({ ...prev, error: "Berechtigung verweigert" }));
            } else {
                console.log("[Push] Berechtigung ausstehend");
            }

            return false;

        } catch (error) {
            console.error("[Push] Fehler bei Berechtigung:", error);
            setState(prev => ({ 
                ...prev, 
                error: error instanceof Error ? error.message : "Unbekannter Fehler" 
            }));
            return false;
        }
    }, [state.isSupported, registerToken]);

    // ──────────────────────────────────────────────────────────────────────────
    // Test-Benachrichtigung senden
    // ──────────────────────────────────────────────────────────────────────────

    const sendTestNotification = useCallback(async () => {
        if (!user) {
            setState(prev => ({ ...prev, error: "Nicht eingeloggt" }));
            return;
        }

        setState(prev => ({ ...prev, isSending: true, error: null }));

        try {
            // Lokale Browser-Benachrichtigung als Test
            if (Notification.permission === 'granted') {
                new Notification("🔔 Cura Erinnerung", {
                    body: "Test-Benachrichtigung erfolgreich!",
                    icon: "/favicon.ico",
                    badge: "/favicon.ico",
                });
                
                console.log("[Push] Test-Benachrichtigung angezeigt");
            }

            setState(prev => ({ ...prev, isSending: false }));

        } catch (error) {
            console.error("[Push] Fehler beim Senden:", error);
            setState(prev => ({ 
                ...prev, 
                isSending: false,
                error: error instanceof Error ? error.message : "Unbekannter Fehler" 
            }));
        }
    }, [user]);

    // ──────────────────────────────────────────────────────────────────────────
    // Registration aktualisieren
    // ──────────────────────────────────────────────────────────────────────────

    const refreshRegistration = useCallback(async () => {
        if (!user || !state.isSupported) return;
        await registerToken();
    }, [user, state.isSupported, registerToken]);

    // ──────────────────────────────────────────────────────────────────────────
    // Foreground Message Handler
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!user || !state.isInitialized) return;

        let unsubscribe: Unsubscribe | undefined;

        const setupForegroundHandler = async () => {
            try {
                const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
                const messaging = getMessaging(app);

                // Handler für Nachrichten wenn App im Vordergrund ist
                unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
                    console.log("[Push] Nachricht im Vordergrund erhalten:", payload);

                    const { title, body } = payload.notification || {};
                    
                    if (title && body && Notification.permission === 'granted') {
                        new Notification(title, {
                            body,
                            icon: "/favicon.ico",
                            badge: "/favicon.ico",
                            data: payload.data,
                        });
                    }
                });

                console.log("[Push] Foreground Handler eingerichtet");

            } catch (error) {
                console.error("[Push] Fehler beim Einrichten des Foreground Handlers:", error);
            }
        };

        setupForegroundHandler();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user, state.isInitialized]);

    // ──────────────────────────────────────────────────────────────────────────
    // Auto-Register beim Login
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (user && state.isSupported && state.permission === 'granted' && !state.isInitialized) {
            registerToken();
        }
    }, [user, state.isSupported, state.permission, state.isInitialized, registerToken]);

    // ──────────────────────────────────────────────────────────────────────────
    // Context Value
    // ──────────────────────────────────────────────────────────────────────────

    const contextValue: PushNotificationContextType = {
        isSupported: state.isSupported,
        permission: state.permission,
        isInitialized: state.isInitialized,
        isSending: state.isSending,
        isRegistering,
        error: state.error,
        requestPermission,
        registerToken,
        sendTestNotification,
        refreshRegistration,
    };

    return (
        <PushNotificationContext.Provider value={contextValue}>
            {children}
        </PushNotificationContext.Provider>
    );
};
