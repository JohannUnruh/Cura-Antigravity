import type { Metadata } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PushNotificationProvider } from "@/contexts/PushNotificationContext";

export const metadata: Metadata = {
  title: "Cura - Vereins- und Seelsorgeverwaltung",
  description: "Sichere, moderne Web-App für christliche Vereins- und Seelsorgeverwaltung.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen text-gray-800">
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider>
              <PushNotificationProvider>
                <MainLayout>
                  {children}
                </MainLayout>
              </PushNotificationProvider>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
