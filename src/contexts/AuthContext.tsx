"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { UserProfile } from "@/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let unsubscribeSnapshot: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch custom user profile from Firestore with realtime updates
                unsubscribeSnapshot = onSnapshot(doc(db, "users", firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data() as UserProfile);
                    } else {
                        console.warn("User profile not found in Firestore");
                        setUserProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile snapshot:", error);
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const logout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
