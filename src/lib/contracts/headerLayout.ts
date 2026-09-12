/**
 * Reine Header-Geometrie der Vertrags-PDFs (alle Maße in mm, A4 = 210 × 297).
 *
 * Befund vom 12.09.2026 (Johanns Screenshots, alle Vertragstypen):
 *  - Die Titel-Regel lief bis x = 190 und querte damit die Logo-Box
 *    (x 160–192, y 10–34). Bei einzeiligem Titel lag sie auf y ≈ 23,5 –
 *    sichtbar mitten durch die Herz-Oberkante.
 *  - Das quadratische Quell-Logo (public/zefabiko_logo.png, 822 × 828 px)
 *    wurde in eine 32 × 24-mm-Box gezwungen und wirkte dadurch horizontal
 *    gestaucht und matschig.
 *
 * Deshalb gilt jetzt:
 *  - Logo quadratisch ( Breite = Höhe ), rechtsbündig an der Inhaltkante und
 *    vollständig unterhalb des Markenbalkens mit klarer Luft dazwischen.
 *  - Die Titel-Regel der ersten Seite endet VOR der Logo-Box.
 *  - Auf Seiten ohne Logo (Folgeseiten) dürfte eine Regel über die volle
 *    Inhaltbreite laufen (`fullRuleEndX`); Folgeseiten zeichnen bewusst gar
 *    keine Titel-Regel, weil dort auch kein Titel steht – beide Fälle bleiben
 *    damit konsistent: Regel nur dort, wo ein Titel sitzt, und dann niemals
 *    durch das Logo.
 *
 * Die Funktion ist frei von jsPDF, damit die Geometrie in
 * `tests/contractHeaderLayout.test.ts` ohne PDF-Erzeugung geprüft werden kann.
 */

/** Breite eines A4-Blatts in mm. */
export const CONTRACT_PAGE_WIDTH = 210;
/** Linker und rechter Seitenrand in mm. */
export const CONTRACT_MARGIN_X = 20;
/** Rechte Inhaltkante in mm (Seitenbreite - Rand). */
export const CONTRACT_CONTENT_RIGHT_X = CONTRACT_PAGE_WIDTH - CONTRACT_MARGIN_X;
/** Höhe des farbigen Markenbalkens (oben und unten) in mm. */
export const CONTRACT_BRAND_BAR_HEIGHT = 5;

/** Kantenlänge der quadratischen Logo-Box – das Quell-PNG ist quadratisch. */
export const CONTRACT_LOGO_SIZE = 30;
/** Luft zwischen Markenbalken und Logo, damit das Herz frei steht. */
export const CONTRACT_LOGO_GAP_BELOW_BAR = 4;
/** Linke Kante der Logo-Box: rechtsbündig an der Inhaltkante. */
export const CONTRACT_LOGO_X = CONTRACT_CONTENT_RIGHT_X - CONTRACT_LOGO_SIZE;
/** Obere Kante der Logo-Box: Balken + Luft. */
export const CONTRACT_LOGO_Y = CONTRACT_BRAND_BAR_HEIGHT + CONTRACT_LOGO_GAP_BELOW_BAR;

/** Linke Kante des Titels. */
export const CONTRACT_TITLE_X = CONTRACT_MARGIN_X;
/** Maximale Textbreite des Titels in mm (wie bisher, endet vor dem Logo). */
export const CONTRACT_TITLE_MAX_WIDTH = 135;
/** Grundlinie der ersten Titelzeile – bewusst tiefer als der alte Wert 22. */
export const CONTRACT_TITLE_FIRST_BASELINE_Y = 26;
/** Durchschuss einer Titelzeile (18 pt) in mm. */
export const CONTRACT_TITLE_LINE_HEIGHT = 7.5;
/** Abstand zwischen letzter Titel-Grundlinie und der Titel-Regel in mm. */
export const CONTRACT_TITLE_RULE_GAP = 2;
/** Sicherheitsabstand zwischen Regel-Ende und linker Logo-Kante in mm. */
export const CONTRACT_RULE_GAP_TO_LOGO = 5;
/** Abstand zwischen Titel-Regel und erster Fließtextzeile in mm. */
export const CONTRACT_BODY_GAP_AFTER_RULE = 6;
/** Fließtext-Start auf Folgeseiten (ohne Titel, ohne Logo) in mm. */
export const CONTRACT_CONTINUATION_BODY_TOP_Y = 22;

export interface ContractHeaderLayout {
    /** Höhe des Markenbalkens in mm. */
    brandBarHeight: number;
    /** Linke Kante der Logo-Box in mm. */
    logoX: number;
    /** Obere Kante der Logo-Box in mm. */
    logoY: number;
    /** Breite der Logo-Box in mm. */
    logoWidth: number;
    /** Höhe der Logo-Box in mm – identisch zu `logoWidth` (quadratisch). */
    logoHeight: number;
    /** Linke Kante des Titels in mm. */
    titleX: number;
    /** Maximale Textbreite des Titels in mm. */
    titleMaxWidth: number;
    /** Grundlinie der ersten Titelzeile in mm. */
    titleFirstBaselineY: number;
    /** Durchschuss einer Titelzeile in mm. */
    titleLineHeight: number;
    /** y-Koordinate der Titel-Regel in mm, abhängig von der Titel-Zeilenzahl. */
    titleRuleY: number;
    /** Ende der Titel-Regel auf der Seite MIT Logo in mm – vor der Logo-Box. */
    titleRuleEndX: number;
    /** Ende einer Regel auf Seiten OHNE Logo in mm (volle Inhaltbreite). */
    fullRuleEndX: number;
    /** Fließtext-Start auf der Titelseite in mm. */
    bodyTopY: number;
    /** Fließtext-Start auf Folgeseiten in mm. */
    continuationBodyTopY: number;
}

/**
 * Berechnet die Header-Geometrie für einen Titel mit `titleLineCount` Zeilen.
 * Ungültige Zeilenzahlen (< 1) werden wie eine Zeile behandelt.
 */
export function buildContractHeaderLayout(titleLineCount: number): ContractHeaderLayout {
    const lines = Number.isFinite(titleLineCount) && titleLineCount >= 1
        ? Math.floor(titleLineCount)
        : 1;
    const lastBaselineY = CONTRACT_TITLE_FIRST_BASELINE_Y + (lines - 1) * CONTRACT_TITLE_LINE_HEIGHT;
    const titleRuleY = lastBaselineY + CONTRACT_TITLE_RULE_GAP;

    return {
        brandBarHeight: CONTRACT_BRAND_BAR_HEIGHT,
        logoX: CONTRACT_LOGO_X,
        logoY: CONTRACT_LOGO_Y,
        logoWidth: CONTRACT_LOGO_SIZE,
        logoHeight: CONTRACT_LOGO_SIZE,
        titleX: CONTRACT_TITLE_X,
        titleMaxWidth: CONTRACT_TITLE_MAX_WIDTH,
        titleFirstBaselineY: CONTRACT_TITLE_FIRST_BASELINE_Y,
        titleLineHeight: CONTRACT_TITLE_LINE_HEIGHT,
        titleRuleY,
        titleRuleEndX: CONTRACT_LOGO_X - CONTRACT_RULE_GAP_TO_LOGO,
        fullRuleEndX: CONTRACT_CONTENT_RIGHT_X,
        bodyTopY: titleRuleY + CONTRACT_BODY_GAP_AFTER_RULE,
        continuationBodyTopY: CONTRACT_CONTINUATION_BODY_TOP_Y
    };
}
