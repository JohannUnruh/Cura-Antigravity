"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
    requiredPermission?: 'hasFamilyHelperAccess' | 'hasFosterCareAccess' | 'hasClientAccess' | 'hasConsultationAccess' | 'hasShortConsultationAccess' | 'hasLectureAccess' | 'hasRetreatAccess' | 'hasTravelAccess' | 'hasTimeTrackingAccess';
}

export function ProtectedRoute({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not logged in, redirect to login
                router.replace("/login");
            } else if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
                // Logged in but insufficient permissions
                router.replace("/"); // or a dedicated "Unauthorized" page
            }
        }
    }, [user, userProfile, loading, router, pathname, allowedRoles]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // If we require roles and the user profile isn't loaded yet
    if (allowedRoles && !userProfile) {
        return null; // Will redirect in useEffect
    }

    if (!user) {
        return null; // Will redirect
    }

    // Check custom permissions if provided
    if (requiredPermission && userProfile && userProfile.role !== "Admin") {
        const hasPermission = requiredPermission === 'hasFamilyHelperAccess' || requiredPermission === 'hasFosterCareAccess'
            ? userProfile[requiredPermission] === true
            : userProfile[requiredPermission] !== false; // standard permissions default to true (backward compatibility)

        if (!hasPermission) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-slate-950 p-4">
                    <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl text-center border border-red-100 dark:border-red-950/30">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Zugriff verweigert</h1>
                        <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm">
                            Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen. Bitte wenden Sie sich an einen Administrator.
                        </p>
                        <button
                            onClick={() => router.replace("/")}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md text-sm"
                        >
                            Zurück zum Dashboard
                        </button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
