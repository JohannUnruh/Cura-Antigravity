import { describe, it, expect } from "./test-framework";
import {
    CONTRACT_BRAND_BAR_HEIGHT,
    CONTRACT_CONTENT_RIGHT_X,
    CONTRACT_LOGO_X,
    buildContractHeaderLayout
} from "@/lib/contracts/headerLayout";

/* Geometrie-Regression gegen den Layout-Befund vom 12.09.2026:
   1) Die Titel-Regel darf die Logo-Box nicht queren ("Strich durchs Herz").
   2) Das quadratische Quell-Logo darf nicht in eine Rechteck-Box gezwungen werden.
   3) Das Logo muss frei unterhalb des Markenbalkens stehen. */
describe("Contract PDF: Header-Geometrie (Befund 12.09.2026)", () => {
    it("rendert die Logo-Box quadratisch (Breite = Höhe)", () => {
        for (let lines = 1; lines <= 4; lines++) {
            const layout = buildContractHeaderLayout(lines);
            expect(layout.logoWidth).toBe(layout.logoHeight);
            expect(layout.logoWidth).toBeGreaterThan(0);
        }
    });

    it("platziert das Logo vollständig unterhalb des Markenbalkens mit klarer Luft", () => {
        const layout = buildContractHeaderLayout(1);
        expect(layout.brandBarHeight).toBe(CONTRACT_BRAND_BAR_HEIGHT);
        expect(layout.logoY).toBeGreaterThan(layout.brandBarHeight);
        expect(layout.logoY - layout.brandBarHeight).toBeGreaterThan(2);
    });

    it("richtet das Logo rechtsbündig an der Inhaltkante aus", () => {
        const layout = buildContractHeaderLayout(2);
        expect(layout.logoX).toBe(CONTRACT_LOGO_X);
        expect(layout.logoX + layout.logoWidth).toBe(CONTRACT_CONTENT_RIGHT_X);
    });

    it("lässt die Titel-Regel auf der Logo-Seite vor der Logo-Box enden", () => {
        for (let lines = 1; lines <= 4; lines++) {
            const layout = buildContractHeaderLayout(lines);
            expect(layout.titleRuleEndX).toBeLessThan(layout.logoX);
        }
    });

    it("erlaubt die volle Inhaltbreite nur auf Seiten ohne Logo", () => {
        const layout = buildContractHeaderLayout(1);
        expect(layout.fullRuleEndX).toBe(CONTRACT_CONTENT_RIGHT_X);
        expect(layout.fullRuleEndX).toBeGreaterThan(layout.titleRuleEndX);
    });

    it("legt die Regel unter die letzte Titelzeile und den Fließtext unter die Regel", () => {
        for (let lines = 1; lines <= 3; lines++) {
            const layout = buildContractHeaderLayout(lines);
            const lastBaseline = layout.titleFirstBaselineY + (lines - 1) * layout.titleLineHeight;
            expect(layout.titleRuleY).toBeGreaterThan(lastBaseline);
            expect(layout.bodyTopY).toBeGreaterThan(layout.titleRuleY);
        }
    });

    it("schiebt Regel und Fließtext mit jeder weiteren Titelzeile tiefer", () => {
        const one = buildContractHeaderLayout(1);
        const two = buildContractHeaderLayout(2);
        expect(two.titleRuleY).toBeGreaterThan(one.titleRuleY);
        expect(two.bodyTopY).toBeGreaterThan(one.bodyTopY);
        expect(two.titleRuleY - one.titleRuleY).toBe(two.titleLineHeight);
    });

    it("behandelt ungültige Zeilenzahlen wie eine einzige Titelzeile", () => {
        expect(buildContractHeaderLayout(0).titleRuleY).toBe(buildContractHeaderLayout(1).titleRuleY);
        expect(buildContractHeaderLayout(-3).bodyTopY).toBe(buildContractHeaderLayout(1).bodyTopY);
    });
});
