import { describe, it, expect } from "./test-framework";
import { normalizeForDeduplication, appendDeduplicatedText } from "../src/lib/utils/voiceCommands";

describe("Voice Deduplication", () => {
    it("normalizes text correctly by stripping punctuation, spaces, and casing", () => {
        expect(normalizeForDeduplication("Ich habe Personen X beraten.")).toBe("ichhabepersonenxberaten");
        expect(normalizeForDeduplication("  ich habe  personen x beraten  ")).toBe("ichhabepersonenxberaten");
        expect(normalizeForDeduplication("Ich habe Personen X beraten")).toBe("ichhabepersonenxberaten");
    });

    it("prevents duplicate sentences when appended to existing text", () => {
        const existing = "Heute war ein Gespräch. Ich habe Personen X beraten.";
        const incoming = "Ich habe Personen X beraten.";
        const result = appendDeduplicatedText(existing, incoming);
        expect(result).toBe(existing);
    });

    it("prevents duplicates with slight variations in whitespace or trailing punctuation", () => {
        const existing = "Heute war ein Gespräch. Ich habe Personen X beraten.";
        const incoming = " ich habe personen x beraten ";
        const result = appendDeduplicatedText(existing, incoming);
        expect(result).toBe(existing);
    });

    it("appends new unique sentences correctly", () => {
        const existing = "Heute war ein Gespräch. Ich habe Personen X beraten.";
        const incoming = "Wir haben nächste Schritte vereinbart.";
        const result = appendDeduplicatedText(existing, incoming);
        expect(result).toBe("Heute war ein Gespräch. Ich habe Personen X beraten. Wir haben nächste Schritte vereinbart.");
    });
});
