/**
 * Reine, testbare Hilfsfunktionen zur Serialisierung von Werten für Firestore.
 *
 * Hintergrund (Bug 12.09.2026): Der AuthContext übernimmt `userDoc.data()`
 * unkonvertiert, `createdAt` bleibt dann ein Firestore-`Timestamp`-Objekt.
 * Das alte `cleanFirestoreData` hat jedes Objekt, das kein `Date` ist, über
 * `Object.entries()` als Map geschrieben – ein `Timestamp` wurde so zu
 * `{ seconds, nanoseconds }` plattgedrückt. Beim nächsten Lesen entstand aus
 * dieser Map via `new Date(map)` ein Invalid Date, das `setDoc` mit
 * `RangeError: Invalid time value` (Date.toISOString) zum Absturz brachte.
 *
 * Diese Funktionen sind frei von Firebase-Importen und damit ohne Emulator
 * testbar (`tests/firestoreValues.test.ts`).
 */

/** Erkennt Werte, die als Datum gemeint sind (Date, Timestamp, Legacy-Map). */
export function isDateLike(value: unknown): boolean {
    if (value instanceof Date) return true;
    if (value === null || typeof value !== "object") return false;
    const candidate = value as { toDate?: unknown; seconds?: unknown; nanoseconds?: unknown };
    if (typeof candidate.toDate === "function") return true;
    // Legacy-Map: genau { seconds, nanoseconds } (Zahlen oder Strings).
    if (candidate.seconds !== undefined && candidate.nanoseconds !== undefined) {
        return Object.keys(candidate).length <= 2;
    }
    return false;
}

/**
 * Wandelt Date | Firestore-Timestamp | Legacy-Map {seconds,nanoseconds} |
 * ISO-String | Epoch-Zahl in ein valides `Date` um. Nicht interpretierbar
 * oder Invalid Date => `null` (niemals ein kaputtes Date zurückgeben).
 */
export function toFirestoreDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "object") {
        const candidate = value as {
            toDate?: () => Date;
            seconds?: number | string;
            nanoseconds?: number | string;
        };
        if (typeof candidate.toDate === "function") {
            const converted = candidate.toDate();
            return converted && !isNaN(converted.getTime()) ? converted : null;
        }
        if (candidate.seconds !== undefined && candidate.nanoseconds !== undefined) {
            const seconds = Number(candidate.seconds);
            const nanoseconds = Number(candidate.nanoseconds);
            if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
                const restored = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
                return isNaN(restored.getTime()) ? null : restored;
            }
            return null;
        }
        return null;
    }

    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

/**
 * Entfernt `undefined`-Werte rekursiv und normalisiert Datums-Werte, sodass
 * nur Firestore-taugliche Typen in `setDoc` landen. `Date`-Instanzen bleiben
 * erhalten; `Timestamp`-Objekte und Legacy-Maps werden zu `Date` normalisiert
 * (und damit als nativer Timestamp geschrieben); Invalid Dates => `null`.
 */
export function cleanFirestoreData(value: unknown): unknown {
    if (value === null || value === undefined) return null;

    if (isDateLike(value)) return toFirestoreDate(value);

    if (Array.isArray(value)) {
        return value
            .filter(item => item !== undefined)
            .map(item => cleanFirestoreData(item));
    }

    if (typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (entry !== undefined) {
                result[key] = cleanFirestoreData(entry);
            }
        }
        return result;
    }

    return value;
}
