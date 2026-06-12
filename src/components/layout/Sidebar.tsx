"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Presentation, Tent, Car, Settings, MessagesSquare, Clock, LogOut, Coffee, X, Star, HeartHandshake, Baby } from "lucide-react";
import { cn } from "../ui/Card";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { clientService } from "@/lib/firebase/services/clientService";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Klienten", href: "/clients", icon: Users },
    { name: "Familienhilfe", href: "/family-helper", icon: HeartHandshake },
    { name: "Pflegefamilien", href: "/foster-care", icon: Baby },
    { name: "Beratungen", href: "/consultations", icon: MessagesSquare },
    { name: "Kurzgespräche", href: "/short-consultations", icon: Coffee },
    { name: "Vorträge", href: "/lectures", icon: Presentation },
    { name: "Freizeiten", href: "/retreats", icon: Tent },
    { name: "Zeiterfassung", href: "/time-tracking", icon: Clock },
    { name: "Fahrtkosten", href: "/travel", icon: Car },
    { name: "Einstellungen", href: "/settings", icon: Settings },
];


interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const [favorites, setFavorites] = useState<{ clientId: string; name: string }[]>([]);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !onClose) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }

            if (e.key === "Tab" && sidebarRef.current) {
                const focusableElements = sidebarRef.current.querySelectorAll(
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
        document.addEventListener("keydown", handleKeyDown);

        // Auto-focus the close button or first element inside mobile sidebar
        setTimeout(() => {
            if (sidebarRef.current) {
                const focusableElements = sidebarRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    (focusableElements[0] as HTMLElement).focus();
                }
            }
        }, 50);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (previouslyActiveElement && typeof previouslyActiveElement.focus === "function") {
                previouslyActiveElement.focus();
            }
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = clientService.subscribeFavorites(
            user.uid,
            (list) => {
                setFavorites(list);
            },
            (error) => {
                console.error("Sidebar: Fehler beim Laden der Favoriten:", error);
            }
        );
        return () => unsubscribe();
    }, [user?.uid]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
            if (onClose) onClose();
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
        }
    };

    const navContent = (
        <>
            <div className="flex items-center justify-between mb-12 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/zefabiko_logo.png" alt="ZeFabiKo Logo" className="w-9 h-9 object-contain" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white block leading-none">Cura</span>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 block mt-0.5">ZeFabiKo</span>
                    </div>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all md:hidden"
                        aria-label="Menü schließen"
                    >
                        <X className="w-6 h-6 text-gray-500 dark:text-slate-400" />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                 {navItems
                    .filter((item) => {
                        const role = userProfile?.role;
                        const isAdmin = role === 'Admin';
                        if (item.href === "/family-helper") {
                            return userProfile?.hasFamilyHelperAccess === true || isAdmin;
                        }
                        if (item.href === "/foster-care") {
                            return userProfile?.hasFosterCareAccess === true || isAdmin;
                        }
                        if (item.href === "/clients") {
                            return userProfile?.hasClientAccess !== false || isAdmin;
                        }
                        if (item.href === "/consultations") {
                            return userProfile?.hasConsultationAccess !== false || isAdmin;
                        }
                        if (item.href === "/short-consultations") {
                            return userProfile?.hasShortConsultationAccess !== false || isAdmin;
                        }
                        if (item.href === "/lectures") {
                            return userProfile?.hasLectureAccess !== false || isAdmin;
                        }
                        if (item.href === "/retreats") {
                            return userProfile?.hasRetreatAccess !== false || isAdmin;
                        }
                        if (item.href === "/travel") {
                            return userProfile?.hasTravelAccess !== false || isAdmin;
                        }
                        if (item.href === "/time-tracking" || item.href === "/overtime-pool") {
                            return userProfile?.hasTimeTrackingAccess !== false || isAdmin;
                        }
                        return true;
                    })
                    .map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const iconActiveColor = "text-indigo-600 dark:text-white";
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-4 px-5 py-3.5 transition-all duration-200",
                                isActive ? "nav-pill-active" : "nav-pill-inactive"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? iconActiveColor : "text-gray-500 dark:text-slate-400")} />
                            <span className={cn(isActive ? "" : "text-gray-700 dark:text-slate-300")}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {favorites.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <span className="px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Favoriten
                    </span>
                    <div className="space-y-1 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                        {favorites.map((fav) => {
                            const isFavActive = pathname === `/clients/${fav.clientId}`;
                            return (
                                <Link
                                    key={fav.clientId}
                                    href={`/clients/${fav.clientId}`}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center gap-3 px-5 py-2 text-sm rounded-xl transition-all duration-200",
                                        isFavActive 
                                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-semibold" 
                                            : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span className="truncate">{fav.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-auto px-5 pt-4 border-t border-gray-100 dark:border-white/5">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-4 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Abmelden</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Desktop Sidebar */}
            <aside className="bg-white dark:bg-slate-950 border-r border-gray-200/50 dark:border-slate-800/50 w-64 h-full flex flex-col p-6 hidden md:flex">
                {navContent}
            </aside>

            {/* Mobile Sidebar Overlay */}
            <aside 
                ref={sidebarRef}
                className={cn(
                    "bg-white dark:bg-slate-950 w-64 h-full flex flex-col p-6 z-50 transition-transform duration-300 fixed inset-y-0 left-0 md:hidden",
                    isOpen ? "translate-x-0 shadow-2xl border-r border-gray-200 dark:border-slate-800" : "-translate-x-full"
                )}
            >
                {navContent}
            </aside>
        </>
    );
}
