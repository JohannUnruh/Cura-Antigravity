// @ts-expect-error vitest is provided at runtime
import { describe, it, expect } from "vitest";
import { normalizeForDeduplication, combineBaseAndSessionText, processVoiceCommands } from "../src/lib/utils/voiceCommands";

describe("Voice Processing & Deduplication", () => {
    it("normalizes text correctly by stripping punctuation, spaces, and casing", () => {
        expect(normalizeForDeduplication("Ich habe Personen X beraten.")).toBe("ichhabepersonenxberaten");
        expect(normalizeForDeduplication("  ich habe  personen x beraten  ")).toBe("ichhabepersonenxberaten");
    });

    it("replaces voice commands correctly for punctuation and linebreaks", () => {
        expect(processVoiceCommands("Ich habe Personen X beraten Punkt").text).toBe("Ich habe Personen X beraten.");
        expect(processVoiceCommands("Hallo Komma wie geht es dir Fragezeichen").text).toBe("Hallo, wie geht es dir?");
        expect(processVoiceCommands("Erster Satz Punkt nächste Zeile Zweiter Satz").text).toBe("Erster Satz.\nZweiter Satz");
        expect(processVoiceCommands("Abschnitt 1 Punkt nächster Absatz Abschnitt 2").text).toBe("Abschnitt 1.\n\nAbschnitt 2");
    });

    it("combines base text with session text without duplication", () => {
        const base = "Heute war ein Gespräch.";
        const session = "Ich habe Personen X beraten Punkt";
        const result = combineBaseAndSessionText(base, session);
        expect(result).toBe("Heute war ein Gespräch. Ich habe Personen X beraten.");
    });

    it("handles cumulative session updates cleanly", () => {
        const base = "";
        const sessionUpdate1 = "Ich habe Personen X beraten Punkt";
        const res1 = combineBaseAndSessionText(base, sessionUpdate1);
        expect(res1).toBe("Ich habe Personen X beraten.");

        const sessionUpdate2 = "Ich habe Personen X beraten Punkt nächster Absatz Wir haben ein Ziel vereinbart Punkt";
        const res2 = combineBaseAndSessionText(base, sessionUpdate2);
        expect(res2).toBe("Ich habe Personen X beraten.\n\nWir haben ein Ziel vereinbart.");
    });
});
