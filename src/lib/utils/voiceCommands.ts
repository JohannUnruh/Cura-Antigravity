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
const VOICE_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
    // Absatz → Leerzeile (zwei Zeilenumbrüche)
    [/\b(nächste[rn]?\s+absatz|neue[rn]?\s+absatz|nächste[rn]?\s+abschnitt|neue[rn]?\s+abschnitt)\b\.?/gi, "\n\n"],
    // Zeilenumbruch → eine neue Zeile
    [/\b(nächste[rn]?\s+zeile|neue[rn]?\s+zeile|zeilenumbruch|neue[rn]?\s+linie)\b\.?/gi, "\n"],

    // Satzzeichen (Punktierung)
    [/\s+\bpunkt\b\.?/gi, "."],
    [/\s+\bkomma\b\.?/gi, ","],
    [/\s+\bfragezeichen\b\.?/gi, "?"],
    [/\s+\bausrufezeichen\b\.?/gi, "!"],
    [/\s+\bdoppelpunkt\b\.?/gi, ":"],
    [/\s+\bgedankenstrich\b\.?/gi, " —"],
];

/**
 * Wandelt Sprachbefehle im Transkript in Whitespace um.
 * Führt auch eine leichte Bereinigung von umgebenden Leerzeichen durch,
 * sodass keine überflüssigen Leerzeichen vor Zeilenumbrüchen entstehen.
 */
export function processVoiceCommands(rawTranscript: string): ProcessedVoiceCommand {
    let text = rawTranscript;
    let hadCommand = false;

    for (const [pattern, replacement] of VOICE_COMMANDS) {
        if (pattern.test(text)) {
            hadCommand = true;
            text = text.replace(pattern, replacement);
        }
        // Reset lastIndex, da Regex mit /g-Flag stateful sein kann
        pattern.lastIndex = 0;
    }

    // Leerzeichen direkt vor Zeilenumbrüchen entfernen (wird sonst
    // von whitespace-pre-wrap zwar ignoriert, sieht aber in der
    // gespeicherten Rohfassung sauberer aus).
    text = text.replace(/[ \t]+\n/g, "\n");

    return { text, hadCommand };
}

/**
 * Kapitalisiert Satzanfänge im transkribierten Text basierend auf dem vorhergehenden Text.
 */
export function capitalizeSentences(text: string, precedingText: string = ""): string {
    if (!text) return "";

    let result = text;

    // 1. Prüfen, ob der allererste Buchstabe großgeschrieben werden muss
    const cleanPreceding = precedingText.trim();
    const shouldCapitalizeStart = 
        cleanPreceding === "" || 
        /[.!?]$/.test(cleanPreceding) || 
        precedingText.endsWith("\n");

    if (shouldCapitalizeStart) {
        // Finde den ersten Kleinbuchstaben (inkl. Umlauten) und mache ihn groß
        result = result.replace(/^(\s*[a-zäöüß])/, (match) => match.toUpperCase());
    }

    // 2. Sätze innerhalb des neuen Texts kapitalisieren (nach ., !, ?, \n gefolgt von Leerzeichen)
    result = result.replace(/([.!?\n]\s+)([a-zäöüß])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    // Spezialfall: Nach einem Zeilenumbruch direkt (ohne Leerzeichen danach)
    result = result.replace(/(\n)([a-zäöüß])/g, (_, p1, p2) => p1 + p2.toUpperCase());

    return result;
}
