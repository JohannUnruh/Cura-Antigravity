import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getGeminiApiKey(): Promise<string | null> {
    // 1. Environment variable (e.g. from .env.local or App Hosting secrets)
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }

    // 2. Firestore fallback: settings/secrets
    try {
        const { adminDb } = await import("@/lib/firebase/firebaseAdmin");
        const docSnap = await adminDb.collection("settings").doc("secrets").get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data?.geminiApiKey) {
                return data.geminiApiKey;
            }
        }
    } catch (e) {
        console.warn("Could not fetch geminiApiKey from Firestore settings/secrets:", e);
    }

    return null;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
    const models = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
    let lastError: Error | null = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${res.status}`;

                // Bei ungültigem API-Key direkt abbrechen
                if (res.status === 401) {
                    throw new Error(`Gemini API Authentication error: ${errMsg}`);
                }

                // Bei 404 (Not Found), 410 (Gone), 400 (Bad/Deprecated Model) oder Server-Fehler: nächstes Modell versuchen
                console.warn(`Gemini Model ${model} returned ${res.status}: ${errMsg}. Attempting fallback...`);
                lastError = new Error(`Gemini API error (${model}): ${errMsg}`);
                continue;
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                console.warn(`Gemini Model ${model} returned empty response. Attempting fallback...`);
                lastError = new Error(`Empty response from Gemini API (${model})`);
                continue;
            }
            return text;
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message.includes("Authentication error")) {
                throw error;
            }
            console.warn(`Gemini Model ${model} call failed:`, error.message);
            lastError = error;
            continue;
        }
    }

    throw lastError || new Error("Failed to generate content with Gemini");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mode, freitext, settings } = body;

        if (!freitext || typeof freitext !== "string" || !freitext.trim()) {
            return NextResponse.json(
                { error: "Gesprächsnotizen dürfen nicht leer sein." },
                { status: 400 }
            );
        }

        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            console.error("Gemini API key is not configured in environment or Firestore.");
            return NextResponse.json(
                { error: "Kein Gemini API-Schlüssel konfiguriert." },
                { status: 500 }
            );
        }

        let prompt = "";
        const currentDate = new Date().toISOString().slice(0, 10);

        if (mode === "consultation") {
            const consultationTypes = settings?.consultationTypes || [];
            const lifeStages = settings?.lifeStages || [];
            const problemOrigins = settings?.problemOrigins || [];
            const subProblems = settings?.subProblems || [];
            const goalTypes = settings?.goalTypes || [];

            prompt = `Du bist ein Assistent für Seelsorge-Dokumentation. Analysiere die folgenden Gesprächsnotizen und extrahiere strukturierte Daten für ein Beratungsformular.

WICHTIG: Du darfst NUR die folgenden vorgegebenen Optionen verwenden. Erfinde KEINE neuen Werte!

Verfügbare Gesprächsarten: ${JSON.stringify(consultationTypes)}
Verfügbare Lebensabschnitte (der Problemherkunft, NICHT des Klienten!): ${JSON.stringify(lifeStages)}
Verfügbare Problemherkünfte: ${JSON.stringify(problemOrigins)}
Verfügbare Folgeprobleme (Mehrfachauswahl möglich): ${JSON.stringify(subProblems)}
Verfügbare Zieltypen: ${JSON.stringify(goalTypes)}

REGELN:
- "lifeStage" beschreibt den Lebensabschnitt, AUS DEM DAS PROBLEM HERKOMMT, nicht das aktuelle Alter des Klienten.
- Wähle für type, lifeStage, problemOriginId, goalTypeId und subProblemsIds NUR aus den oben genannten Listen.
- Wenn keine passende Option gefunden wird, lasse das Feld leer (null).
- Formuliere eine konkrete Zielvereinbarung (goalAgreement), die SMART-Kriterien folgt.
- Bewerte im smartCheck-Objekt, ob die Zielvereinbarung spezifisch, messbar, erreichbar ist. "relevant" ist 1-5 (wie relevant das Ziel ist). "timeBound" ist ein ISO-Datum falls zeitlich gebunden, sonst null.
- Alles, was du nicht zuordnen kannst, kommt in "notes".
- Datumsangaben als ISO-Strings (YYYY-MM-DD). Heutiges Datum: ${currentDate}.

Gesprächsnotizen:
---
${freitext}
---

Antworte mit einem JSON-Objekt mit folgenden Feldern:
{ "dateFrom", "dateTo", "type", "lifeStage", "problemOriginId", "subProblemsIds", "goalTypeId", "goalAgreement", "causeFromCounselor", "unitsInHours", "prepTimeInHours", "smartCheck": { "specific", "measurable", "achievable", "relevant", "timeBound" }, "notes" }`;
        } else if (mode === "skb") {
            const defaultConflictPoints = [
                'Finanzielle Nöte', 'Fehlende Unterstützung durch Partner',
                'Druck zur Abtreibung (durch Partner/Umfeld)', 'Überforderung',
                'Wohnungsnot', 'Ausbildungs-/Berufsgefährdung', 'Medizinische Sorgen',
                'Psychische Belastung', 'Sozialer Druck', 'Minderjährigkeit'
            ];
            const defaultInterventions = [
                'Beratung / Information', 'Stärkung der Eigenverantwortung',
                'Beziehungsklärung', 'Psychosoziale Unterstützung',
                'Finanzielle Beratung', 'Vermittlung an externe Fachstellen'
            ];
            const defaultCompanions = ['Keine', 'Partner', 'Freundin', 'Elternteil', 'Sonstige'];
            const defaultCertificateOptions = ['Ja', 'Nein', 'Unbekannt', 'In Planung'];

            const conflictPoints = settings?.skbConflictPoints || defaultConflictPoints;
            const interventions = settings?.skbInterventions || defaultInterventions;
            const companions = settings?.skbCompanions || defaultCompanions;
            const certificateOptions = settings?.skbCertificateOptions || defaultCertificateOptions;

            prompt = `Du bist ein Assistent für Schwangerschaftskonfliktberatung (SKB). Analysiere die folgenden Gesprächsnotizen und extrahiere strukturierte Daten.

WICHTIG: Du darfst NUR die folgenden vorgegebenen Optionen verwenden!

Verfügbare Konfliktpunkte (Mehrfachauswahl): ${JSON.stringify(conflictPoints)}
Verfügbare Interventionen (Mehrfachauswahl): ${JSON.stringify(interventions)}
Verfügbare Begleitpersonen: ${JSON.stringify(companions)}
Bescheinigungsstatus-Optionen: ${JSON.stringify(certificateOptions)}

Heutiges Datum: ${currentDate}.

Gesprächsnotizen:
---
${freitext}
---

Antworte mit einem JSON-Objekt:
{ "dateFrom", "dateTo", "durationInHours", "companion", "pregnancyWeek", "expectedDeliveryDate", "certificateStatus", "conflictPointsIds", "interventionsIds", "goalAgreement", "notes" }`;
        } else {
            return NextResponse.json(
                { error: "Ungültiger Analyse-Modus (erlaubt: 'consultation' oder 'skb')." },
                { status: 400 }
            );
        }

        const rawJsonText = await callGemini(apiKey, prompt);
        const parsedData = JSON.parse(rawJsonText);

        return NextResponse.json({ success: true, data: parsedData });
    } catch (error: unknown) {
        console.error("AI Analysis route error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "KI-Analyse fehlgeschlagen.",
            },
            { status: 500 }
        );
    }
}
