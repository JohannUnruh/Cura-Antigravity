"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Presentation, Tent, Car, Settings, HandHeart, MessagesSquare, Clock, LogOut, Coffee, HistoryIcon, X } from "lucide-react";
import { cn } from "../ui/Card";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Historie", href: "/history", icon: HistoryIcon },
    { name: "Klienten", href: "/clients", icon: Users },
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <HandHeart className="text-white w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Cura</span>
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
                {navItems.map((item) => {
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
            <aside className={cn(
                "bg-white dark:bg-slate-950 w-64 h-full flex flex-col p-6 z-50 transition-transform duration-300 fixed inset-y-0 left-0 md:hidden",
                isOpen ? "translate-x-0 shadow-2xl border-r border-gray-200 dark:border-slate-800" : "-translate-x-full"
            )}>
                {navContent}
            </aside>
        </>
    );
}
