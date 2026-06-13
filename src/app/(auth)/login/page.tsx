"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err) {
            console.error(err);
            setError("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        if (!email.trim()) {
            setError("Bitte gib deine E-Mail-Adresse ein.");
            return;
        }
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSuccessMessage("Ein Link zum Zurücksetzen deines Passworts wurde an deine E-Mail-Adresse gesendet. Bitte überprüfe auch deinen Spam-Ordner.");
        } catch (err) {
            console.error(err);
            const firebaseError = err as { code?: string };
            if (firebaseError.code === "auth/user-not-found") {
                setError("Unter dieser E-Mail-Adresse wurde kein Benutzer gefunden.");
            } else if (firebaseError.code === "auth/invalid-email") {
                setError("Die eingegebene E-Mail-Adresse ist ungültig.");
            } else {
                setError("Fehler beim Senden der Zurücksetzungs-E-Mail. Bitte versuche es später erneut.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/zefabiko_logo.png" alt="ZeFabiKo Logo" className="w-12 h-12 object-contain" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">Cura</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-1">ZeFabiKo</span>
                        </div>
                    </div>
                </div>

                <Card className="shadow-2xl border-white/60">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl text-center">
                            {forgotMode ? "Passwort zurücksetzen" : "Willkommen"}
                        </CardTitle>
                        <p className="text-sm text-center text-gray-500 dark:text-slate-400">
                            {forgotMode 
                                ? "Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen deines Passworts zu erhalten." 
                                : "Bitte melde dich mit deinen Zugangsdaten an."}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {forgotMode ? (
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="email">
                                        E-Mail
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all"
                                        placeholder="name@beispiel.de"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="p-3 rounded bg-emerald-50 text-emerald-600 text-sm">
                                        {successMessage}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full mt-4"
                                    disabled={loading}
                                >
                                    {loading ? "Wird gesendet..." : "Zurücksetzungs-Link senden"}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotMode(false);
                                        setError("");
                                        setSuccessMessage("");
                                    }}
                                    className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 mt-4 focus:outline-none cursor-pointer"
                                >
                                    Zurück zum Login
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="email">
                                        E-Mail
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all"
                                        placeholder="name@beispiel.de"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="password">
                                            Passwort
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForgotMode(true);
                                                setError("");
                                                setSuccessMessage("");
                                            }}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none cursor-pointer"
                                        >
                                            Passwort vergessen?
                                        </button>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full mt-4"
                                    disabled={loading}
                                >
                                    {loading ? "Wird angemeldet..." : "Anmelden"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
