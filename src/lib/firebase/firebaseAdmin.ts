import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

if (!admin.apps.length) {
    let initialized = false;

    // 1. Primär: Umgebungsvariable (als JSON-String)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT environment variable");
            initialized = true;
        } catch (error) {
            console.error("Failed to initialize Firebase Admin via FIREBASE_SERVICE_ACCOUNT environment variable:", error);
        }
    }

    // 2. Sekundär: Lokale Key-Datei (für lokale Entwicklung)
    if (!initialized) {
        const keyPath = path.join(process.cwd(), "functions", "service-account-key.json");
        if (fs.existsSync(keyPath)) {
            try {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("Firebase Admin initialized via service-account-key.json file");
                initialized = true;
            } catch (error) {
                console.error("Failed to initialize Firebase Admin via local key file:", error);
            }
        }
    }

    // 3. Tertiär: Application Default Credentials (ADC) oder fallback auf Project ID
    if (!initialized) {
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log("Firebase Admin initialized via applicationDefault");
        } catch (error) {
            console.warn("Failed to initialize Firebase Admin via applicationDefault, falling back to Project ID only:", error);
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cura-ant"
            });
        }
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
