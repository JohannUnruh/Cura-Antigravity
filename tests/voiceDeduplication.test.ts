// @ts-expect-error vitest is provided at runtime
import { describe, it, expect } from "vitest";
import { normalizeForDeduplication, combineBaseAndSessionText, processVoiceCommands, removeOverlap } from "../src/lib/utils/voiceCommands";

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

    it("removes overlap between base text and replayed session text", () => {
        const base = "Ich habe Personen X beraten.";
        const replay = "Ich habe Personen X beraten.";
        expect(removeOverlap(base, replay)).toBe("");

        const cumulative = "Ich habe Personen X beraten. Wir haben ein Ziel vereinbart.";
        expect(removeOverlap(base, cumulative)).toBe("Wir haben ein Ziel vereinbart.");
    });

    it("prevents repetition during auto-restart cycles on mobile", () => {
        const baseAfterSession1 = "Ich habe Personen X beraten.";
        // Mobile Speech Engine restarts and re-sends the last sentence
        const session2Replay = "Ich habe Personen X beraten.";
        const result2 = combineBaseAndSessionText(baseAfterSession1, session2Replay);
        expect(result2).toBe("Ich habe Personen X beraten.");

        // Mobile Speech Engine sends previous sentence + new sentence
        const session2Cumulative = "Ich habe Personen X beraten. Wir haben ein Ziel vereinbart.";
        const result3 = combineBaseAndSessionText(baseAfterSession1, session2Cumulative);
        expect(result3).toBe("Ich habe Personen X beraten. Wir haben ein Ziel vereinbart.");
    });
});
