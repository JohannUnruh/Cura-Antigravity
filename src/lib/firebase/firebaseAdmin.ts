import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

if (!admin.apps.length) {
    const keyPath = path.join(process.cwd(), "functions", "service-account-key.json");
    if (fs.existsSync(keyPath)) {
        let projectId = "cura-ant";
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
            projectId = serviceAccount.project_id || projectId;
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized via service-account-key.json");
        } catch (error) {
            console.error("Failed to initialize Firebase Admin via key file:", error);
            admin.initializeApp({
                projectId: projectId
            });
        }
    } else {
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log("Firebase Admin initialized via applicationDefault");
        } catch (error) {
            console.warn("Failed to initialize Firebase Admin via applicationDefault, falling back to Project ID only:", error);
            // Fallback for building/compiling when credentials aren't available
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cura-ant"
            });
        }
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
