/**
 * Reiner Helfer für KI-Prefill-Daten (Crash-Fix 05.10.2026).
 *
 * Hintergrund: Die KI-Analyse (`/api/ai/analyze`) weist Gemini ausdrücklich an,
 * fehlende optionale Felder als `null` zurückzugeben („lasse das Feld leer
 * (null)"). Das Ergebnis wird über die URL (`?aiPrefill=...&data=...`) fast
 * unverändert als `initialData` in die Beratungsformulare getragen
 * (clients/[id]/page.tsx → ConsultationForm / SkbConsultationForm).
 *
 * `null`-Felder sind dort gefährlich: Die Sync-Effekte der Stunden-Inputs
 * prüften nur auf `!== undefined` und crashen dann mit
 * `TypeError: Cannot read properties of null (reading 'toString')`
 * (Produktiv-Befund 05.10.2026, Max-Mustermann-Workshop).
 *
 * Deshalb: null-Felder werden hier an der EINZIGEN Einspeisestelle entfernt
 * (inkl. verschachtelter Objekte wie `smartCheck` und null-Elemente in Arrays).
 * Die Formulare fallen danach über ihre Defaults bzw. `?.toString() ?? ...`
 * sicher zurück. Reine Funktion (kein React, kein Firestore) und damit direkt
 * in `tests/aiPrefill.test.ts` prüfbar — Muster: `dataScope.ts`.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    );
}

/**
 * Entfernt rekursiv alle `null`/`undefined`-Werte aus einem KI-Ergebnisobjekt.
 *
 * - Objekt-Felder mit `null`/`undefined` entfallen komplett (→ Formular-Defaults greifen).
 * - `null`-Elemente in Arrays (z. B. `subProblemsIds`) werden herausgefiltert.
 * - Alle anderen Werte (inkl. `0`, `false`, `""`) bleiben unverändert erhalten.
 */
export function sanitizeAiPrefill<T>(parsed: T): T {
    if (Array.isArray(parsed)) {
        return parsed
            .filter(item => item !== null && item !== undefined)
            .map(item => sanitizeAiPrefill(item)) as unknown as T;
    }
    if (isPlainObject(parsed)) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (value === null || value === undefined) continue;
            result[key] = sanitizeAiPrefill(value);
        }
        return result as T;
    }
    return parsed;
}
