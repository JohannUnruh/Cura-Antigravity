import { describe, it, expect } from "./test-framework";
import { normalizeForDeduplication, combineBaseAndSessionText, processVoiceCommands, removeOverlap, appendChunk } from "../src/lib/utils/voiceCommands";

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

    it("appends final chunks correctly with voice command processing", () => {
        let acc = "";
        acc = appendChunk(acc, "Ich habe Personen X beraten Punkt");
        expect(acc).toBe("Ich habe Personen X beraten.");

        acc = appendChunk(acc, "nächste Zeile Wir haben Ziele vereinbart Punkt");
        expect(acc).toBe("Ich habe Personen X beraten.\nWir haben Ziele vereinbart.");
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
        const session2Replay = "Ich habe Personen X beraten.";
        const result2 = combineBaseAndSessionText(baseAfterSession1, session2Replay);
        expect(result2).toBe("Ich habe Personen X beraten.");

        const session2Cumulative = "Ich habe Personen X beraten. Wir haben ein Ziel vereinbart.";
        const result3 = combineBaseAndSessionText(baseAfterSession1, session2Cumulative);
        expect(result3).toBe("Ich habe Personen X beraten. Wir haben ein Ziel vereinbart.");
    });

    it("simulates WebSpeech API stream with index tracking so prior final chunks are not duplicated during interim bursts", () => {
        let accumulated = "";
        let lastCommittedIndex = -1;

        const handleOnResult = (results: Array<{ transcript: string; isFinal: boolean }>) => {
            let hasNewFinal = false;
            let interimText = "";

            for (let i = 0; i < results.length; ++i) {
                const res = results[i];
                if (res.isFinal) {
                    if (i > lastCommittedIndex) {
                        const raw = res.transcript;
                        const normChunk = normalizeForDeduplication(raw);
                        const normAccumulated = normalizeForDeduplication(accumulated);
                        if (!normAccumulated.endsWith(normChunk)) {
                            accumulated = appendChunk(accumulated, raw);
                            hasNewFinal = true;
                        }
                        lastCommittedIndex = i;
                    }
                } else {
                    interimText += res.transcript;
                }
            }
            return { accumulated, interimText, hasNewFinal };
        };

        // 1. Satz 1 wird final
        handleOnResult([{ transcript: "Ich habe ein Gespräch gehabt.", isFinal: true }]);
        expect(accumulated).toBe("Ich habe ein Gespräch gehabt.");

        // 2. Pause und anschließendes Weitersprechen: 14 Interim-Events bei bereits finalem Satz 0
        for (let burst = 0; burst < 14; burst++) {
            const out = handleOnResult([
                { transcript: "Ich habe ein Gespräch gehabt.", isFinal: true },
                { transcript: "Das Gespräch dauerte zwei Stunden", isFinal: false }
            ]);
            expect(out.accumulated).toBe("Ich habe ein Gespräch gehabt.");
            expect(out.hasNewFinal).toBe(false);
            expect(out.interimText).toBe("Das Gespräch dauerte zwei Stunden");
        }

        // 3. Satz 2 wird final
        handleOnResult([
            { transcript: "Ich habe ein Gespräch gehabt.", isFinal: true },
            { transcript: "Das Gespräch dauerte zwei Stunden.", isFinal: true }
        ]);
        expect(accumulated).toBe("Ich habe ein Gespräch gehabt. Das Gespräch dauerte zwei Stunden.");
    });
});

