"use client";

import { Sidebar } from "./Sidebar";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, HandHeart } from "lucide-react";

export function MainLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isAuthPage = pathname?.startsWith("/login");

    if (isAuthPage) {
        return <main className="flex-1 overflow-y-auto">{children}</main>;
    }
    return (
        <div className="flex h-screen overflow-hidden p-0 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-1 overflow-hidden glass-main-wrapper relative w-full h-full max-w-screen-2xl mx-auto md:rounded-3xl shadow-2xl transition-all duration-300">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Mobile top nav with hamburger */}
                    <header className="md:hidden glass-panel m-4 p-4 flex items-center justify-between z-30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <HandHeart className="text-white w-5 h-5" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">Cura</span>
                        </div>
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-all active:scale-95"
                            aria-label="Menü öffnen"
                        >
                            <Menu className="w-6 h-6 text-gray-700 dark:text-slate-300" />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 md:p-8 lg:p-10">
                        <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
