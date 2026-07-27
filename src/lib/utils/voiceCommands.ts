/**
 * Verarbeitung von Sprachbefehlen im Diktat-Transkript.
 *
 * Die Web Speech API liefert rohen Text. Wenn der Nutzer beim Diktieren
 * explizit Steuerungsanweisungen spricht (z. B. "nächster Absatz"), werden
 * diese hier in die entsprechenden Whitespace-Zeichen übersetzt, damit
 * Absätze und Zeilenumbrüche direkt im Notiz-Text landen.
 *
 * Die Erkennung ist bewusst großzügig (verschiedene Formulierungen,
 * Groß-/Kleinschreibung egal), damit sie im Sprechfluss robust funktioniert.
 * Gleichzeitig sind die Phrasen spezifisch genug, um normale Rede nicht
 * versehentlich in Zeilenumbrüche zu verwandeln.
 */

export type ProcessedVoiceCommand = {
    /** Bereinigter Text mit ersetzten Steuerbefehlen. */
    text: string;
    /** Wurde mindestens ein Befehl erkannt? */
    hadCommand: boolean;
};

/**
 * Erkannte Sprachbefehle (Regex) und ihre Ersetzung.
 * Reihenfolge: längste/spezifischste Phrasen zuerst, damit z. B.
 * "nächster Absatz" nicht schon durch "nächste Zeile" erfasst wird.
 */
/**
 * Erkannte Sprachbefehle (Regex) und ihre Ersetzung.
 * Reihenfolge: spezifischste Phrasen zuerst.
 */
const VOICE_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
    // Absatz → Leerzeile (zwei Zeilenumbrüche)
    [/\s*\b(nächste[rn]?\s+absatz|neue[rn]?\s+absatz|nächste[rn]?\s+abschnitt|neue[rn]?\s+abschnitt)\b[.?!]*/gi, "\n\n"],
    // Zeilenumbruch → eine neue Zeile
    [/\s*\b(nächste[rn]?\s+zeile|neue[rn]?\s+zeile|zeilenumbruch|neue[rn]?\s+linie)\b[.?!]*/gi, "\n"],

    // Satzzeichen (Punktierung)
    [/\s*\bpunkt\b[.?!]*/gi, "."],
    [/\s*\bkomma\b[.?!]*/gi, ","],
    [/\s*\bfragezeichen\b[.?!]*/gi, "?"],
    [/\s*\bausrufezeichen\b[.?!]*/gi, "!"],
    [/\s*\bdoppelpunkt\b[.?!]*/gi, ":"],
    [/\s*\bgedankenstrich\b[.?!]*/gi, " —"],
];

/**
 * Wandelt Sprachbefehle im Transkript in Whitespace und Satzzeichen um.
 */
export function processVoiceCommands(rawTranscript: string): ProcessedVoiceCommand {
    let text = rawTranscript;
    let hadCommand = false;

    for (const [pattern, replacement] of VOICE_COMMANDS) {
        if (pattern.test(text)) {
            hadCommand = true;
            text = text.replace(pattern, replacement);
        }
        pattern.lastIndex = 0;
    }

    // Leerzeichen direkt vor Satzzeichen entfernen ("beraten ." → "beraten.")
    text = text.replace(/\s+([.,!?:])/g, "$1");

    // Mehrfache Punkte vermeiden (".." → ".")
    text = text.replace(/\.{2,}/g, ".");

    // Leerzeichen direkt vor/nach Zeilenumbrüchen entfernen
    text = text.replace(/[ \t]+\n/g, "\n");
    text = text.replace(/\n[ \t]+/g, "\n");

    return { text, hadCommand };
}

/**
 * Kapitalisiert Satzanfänge im transkribierten Text basierend auf dem vorhergehenden Text.
 */
export function capitalizeSentences(text: string, precedingText: string = ""): string {
    if (!text) return "";

    let result = text;

    const cleanPreceding = precedingText.trim();
    const shouldCapitalizeStart = 
        cleanPreceding === "" || 
        /[.!?]$/.test(cleanPreceding) || 
        precedingText.endsWith("\n");

    if (shouldCapitalizeStart) {
        result = result.replace(/^(\s*[a-zäöüß])/, (match) => match.toUpperCase());
    }

    result = result.replace(/([.!?\n]\s+)([a-zäöüß])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    result = result.replace(/(\n)([a-zäöüß])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    return result;
}

/**
 * Normalisiert einen Text für den Duplikats-Vergleich:
 * Wandelt in Kleinbuchstaben um und entfernt Satzzeichen sowie Whitespace.
 */
export function normalizeForDeduplication(text: string): string {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[.,!?:;\s\-–—"']/g, "");
}

/**
 * Entfernt Überlappungen zwischen dem Ende von base und dem Anfang von session.
 * Verhindert Verdopplungen bei Replays durch mobile Sprach-Engines oder Auto-Restarts.
 */
export function removeOverlap(base: string, session: string): string {
    const normBase = normalizeForDeduplication(base);
    const normSession = normalizeForDeduplication(session);

    if (!normBase || !normSession) return session;

    // 1. Exakter Treffer oder base endet bereits mit der gesamten Session
    if (normBase.endsWith(normSession)) {
        return "";
    }

    // 2. Größte Überlappung (Suffix von normBase = Präfix von normSession) finden
    let maxOverlapLen = 0;
    const maxCheckLen = Math.min(normBase.length, normSession.length);

    for (let len = maxCheckLen; len >= 3; len--) {
        const baseSuffix = normBase.slice(-len);
        const sessionPrefix = normSession.slice(0, len);
        if (baseSuffix === sessionPrefix) {
            maxOverlapLen = len;
            break;
        }
    }

    if (maxOverlapLen > 0) {
        // Schneide die überlappenden alpha-nummerischen Zeichen vom Anfang von session ab
        let normCount = 0;
        let cutIndex = session.length;

        for (let i = 0; i < session.length; i++) {
            const char = session[i];
            if (/[a-zA-Z0-9äöüÄÖÜß]/.test(char)) {
                normCount++;
            }
            if (normCount === maxOverlapLen) {
                cutIndex = i + 1;
                break;
            }
        }

        return session.slice(cutIndex).replace(/^[.,!?:;\s]+/, "").trimStart();
    }

    return session;
}

/**
 * Kombiniert den Basis-Text vor der Aufnahme mit dem aktuellen Session-Transkript.
 * Entfernt Überlappungen, wendet Sprachbefehle und Satzanfangs-Kapitalisierung an.
 */
export function combineBaseAndSessionText(baseText: string, sessionText: string): string {
    const trimmedSession = sessionText.trimStart();
    if (!trimmedSession) return baseText;

    // 1. Sprachbefehle verarbeiten
    const { text: processedSession } = processVoiceCommands(trimmedSession);

    if (!baseText.trim()) {
        return capitalizeSentences(processedSession, "");
    }

    // 2. Überlappungen mit dem Basis-Text strikt entfernen
    const newSessionText = removeOverlap(baseText, processedSession);
    if (!newSessionText.trim()) {
        return baseText;
    }

    // 3. Kapitalisieren und anfügen
    const capitalizedSession = capitalizeSentences(newSessionText, baseText);
    const isNewline = capitalizedSession.startsWith("\n");
    const separator = baseText.endsWith("\n") || baseText.endsWith(" ") || isNewline ? "" : " ";

    return baseText + separator + capitalizedSession;
}

/**
 * Hilfsfunktion zum Abgleichen und Anfügen von Transkripten.
 */
export function appendDeduplicatedText(existing: string, incoming: string): string {
    return combineBaseAndSessionText(existing, incoming);
}



