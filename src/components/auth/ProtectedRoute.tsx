"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
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

    return <>{children}</>;
}
