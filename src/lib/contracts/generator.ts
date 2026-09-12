import jsPDF from "jspdf";
import { ContractData, getContractTemplate } from "./templates";
import { storage } from "../firebase/config";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import {
    CONTRACT_MARGIN_X,
    CONTRACT_TITLE_MAX_WIDTH,
    buildContractHeaderLayout,
    fitLogoBox
} from "./headerLayout";

/* ── Seitenraster (alle Maße in mm) ───────────────────────────────────
   Ein gemeinsames Raster für alle vier Vertragstypen und die
   Änderungsvereinbarungen: jede Textzeile, jeder Absatzabstand und jeder
   Abschnittsabstand folgt denselben Konstanten, damit kein Vertragstyp
   anders "atmet" als der andere.
   Vorgabe des Product Owners vom 09.09.2026: Luftigkeit schlägt Seitenzahl.
   Verträge dürfen auf 2 Seiten umbrechen, statt Abstände zusammenzurücken;
   nur der Unterschriftsblock darf niemals allein auf einer Seite stehen. */
const PAGE_HEIGHT = 297;
const MARGIN_X = CONTRACT_MARGIN_X;
const CONTENT_WIDTH = 170;
const BOTTOM_MARGIN = 22;
const LINE_HEIGHT = 4.9;          // Durchschuss einer Fließtextzeile (10 pt, ~1,4-fach)
const PARAGRAPH_GAP = 6.0;        // Absatzabstand, deutlich mehr als eine Leerzeile
const SECTION_GAP = 5.2;          // Zusatzabstand vor einer Überschrift (§ / Erklärung)
const HEADING_GAP_AFTER = 1.4;    // Zusatzabstand zwischen Überschrift und folgendem Text
const LIST_INDENT = 6;            // Einrückung der Aufzählungspunkte
const LIST_GAP_BEFORE = 2.8;      // Abstand vor dem ersten Punkt einer Liste
const LIST_LEADING = 1.5;         // Zusatzabstand zwischen zwei Punkten
const CHECK_INDENT = 6;           // linke Kante des Ankreuzkästchens
const CHECK_BOX_SIZE = 3.4;       // Kantenlänge des Kästchens
const CHECK_TEXT_INDENT = 13;     // Textspalte hinter dem Kästchen
const CHECK_GAP_BEFORE = 3.4;     // Abstand vor jeder Ankreuzzeile
const SIGNATURE_GAP = 10;         // Abstand zwischen letzter Textzeile und Unterschriftsblock
const SIGNATURE_BLOCK_HEIGHT = 36;

/* ── ZEFABIKO-Farbwelt (aus public/zefabiko_logo.png gemessen) ─────────
   Herz/Hand: Ziegelrot-Verlauf #650200 → #8D0E02 → #CE1F04
   Schriftzug: Petrolblau-Verlauf #0A3C56 → #026CA3 → #0077B6
   Der Deko-Balken nutzt definierte Zwischenstopps über die dunklen
   Logo-Töne, damit die Mitte nicht ins Violett kippt. */
const BRAND_BAR_STOPS: { at: number; rgb: [number, number, number] }[] = [
    { at: 0.0, rgb: [141, 14, 2] },    // #8D0E02 Ziegelrot (Logo-Median)
    { at: 0.42, rgb: [101, 2, 0] },    // #650200 dunkles Maronenrot (Logo-Schatten)
    { at: 0.5, rgb: [51, 17, 13] },    // #33110D neutraler dunkler Umbruchpunkt
    { at: 0.58, rgb: [10, 60, 86] },   // #0A3C56 dunkles Petrol (Schriftzug-Anfang)
    { at: 1.0, rgb: [0, 119, 182] }    // #0077B6 helles Blau (Schriftzug-Ende)
];

const COLOR_TITLE: [number, number, number] = [30, 41, 59];      // Slate-800
const COLOR_HEADING: [number, number, number] = [15, 23, 42];     // Slate-900
const COLOR_BODY: [number, number, number] = [51, 65, 85];        // Slate-700
const COLOR_META: [number, number, number] = [71, 85, 105];       // Slate-600
const COLOR_RULE: [number, number, number] = [226, 232, 240];     // Slate-200
const COLOR_LINE: [number, number, number] = [203, 213, 225];     // Slate-300
const COLOR_BOX: [number, number, number] = [100, 116, 139];      // Slate-500
const COLOR_PAGENO: [number, number, number] = [148, 163, 184];   // Slate-400

function brandBarColor(ratio: number): [number, number, number] {
    const t = Math.min(1, Math.max(0, ratio));
    for (let i = 1; i < BRAND_BAR_STOPS.length; i++) {
        const from = BRAND_BAR_STOPS[i - 1];
        const to = BRAND_BAR_STOPS[i];
        if (t <= to.at) {
            const span = to.at - from.at;
            const local = span === 0 ? 0 : (t - from.at) / span;
            return [
                Math.round(from.rgb[0] + (to.rgb[0] - from.rgb[0]) * local),
                Math.round(from.rgb[1] + (to.rgb[1] - from.rgb[1]) * local),
                Math.round(from.rgb[2] + (to.rgb[2] - from.rgb[2]) * local)
            ];
        }
    }
    return BRAND_BAR_STOPS[BRAND_BAR_STOPS.length - 1].rgb;
}

/** Liest die Pixelmaße eines PNG-Data-URLs aus dem IHDR-Chunk. */
function readPngSize(dataUrl: string): { width: number; height: number } | null {
    if (!dataUrl.startsWith("data:image/png")) return null;
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    try {
        const bin = atob(dataUrl.slice(comma + 1));
        if (bin.length < 24) return null;
        const u32 = (offset: number) =>
            ((bin.charCodeAt(offset) << 24) |
                (bin.charCodeAt(offset + 1) << 16) |
                (bin.charCodeAt(offset + 2) << 8) |
                bin.charCodeAt(offset + 3)) >>> 0;
        const width = u32(16);
        const height = u32(20);
        return width > 0 && height > 0 ? { width, height } : null;
    } catch {
        return null;
    }
}

export function createContractPdf(data: ContractData, logoBase64?: string): jsPDF {
    const template = getContractTemplate(data);
    const textContent = template.text(data);

    const doc = new jsPDF();

    // Deko-Balken in den ZEFABIKO-Tönen, mit definiertem Zwischenstopp
    const drawBrandBar = (yPos: number, height: number) => {
        const steps = 210; // Dokumentbreite ≈ 210 mm
        const rectWidth = 210 / steps;
        for (let i = 0; i < steps; i++) {
            const [r, g, b] = brandBarColor(i / steps);
            doc.setFillColor(r, g, b);
            doc.rect(i * rectWidth, yPos, rectWidth + 0.5, height, 'F');
        }
    };

    const applyStyle = (kind: "heading" | "party" | "body") => {
        if (kind === "body") {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLOR_BODY);
        } else {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLOR_HEADING);
        }
    };

    // Titelzeilen zuerst zerlegen: die Header-Geometrie hängt an der Zeilenzahl.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...COLOR_TITLE);
    const titleLines = doc.splitTextToSize(template.title, CONTRACT_TITLE_MAX_WIDTH) as string[];
    const header = buildContractHeaderLayout(titleLines.length);

    // Erste Seite: Kopfbalken + frei stehendes Logo, seitenverhältnistreu
    drawBrandBar(0, header.brandBarHeight);
    if (logoBase64) {
        try {
            const px = readPngSize(logoBase64);
            const box = fitLogoBox(px?.width, px?.height, header.logoWidth, header.logoHeight);
            doc.addImage(logoBase64, 'PNG', header.logoX + box.offsetX, header.logoY, box.width, box.height);
        } catch (error) {
            console.error("Could not render logo in PDF", error);
        }
    }

    // Titel
    doc.text(titleLines, header.titleX, header.titleFirstBaselineY);
    doc.setDrawColor(...COLOR_RULE);
    doc.setLineWidth(0.5);
    // Die Titel-Regel endet vor der Logo-Box – sonst quert sie das Herz.
    doc.line(MARGIN_X, header.titleRuleY, header.titleRuleEndX, header.titleRuleY);

    // Fließtext mit einheitlichem Raster
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_BODY);

    const normalizedText = textContent.replace(/\r\n/g, '\n');
    const rawLines = normalizedText.split('\n');

    // Der Textbereich reicht auf JEDER Seite bis zum normalen unteren Rand.
    // Nur die Seite, die am Ende tatsächlich den Unterschriftsblock trägt,
    // wird entsprechend geplant (siehe Umbruchplanung unten) – statt präventiv
    // alle Seiten um die Blockhöhe zu verkürzen und halbvolle Seiten zu erzeugen.
    const bodyBottom = PAGE_HEIGHT - BOTTOM_MARGIN;

    let y = header.bodyTopY;

    const newContentPage = () => {
        doc.addPage();
        drawBrandBar(0, header.brandBarHeight);
        y = header.continuationBodyTopY;
    };

    const classify = (trimmed: string) => {
        const isSection = trimmed.startsWith('§') || trimmed.startsWith('Erklärung');
        const isBullet = trimmed.startsWith('•');
        const isCheckbox = /^\[[Xx\s]?\]/.test(trimmed);
        const isPartyLine = !isSection && !isBullet && !isCheckbox &&
            (trimmed.includes(data.employerName) || trimmed.includes(data.employeeName));
        return { isSection, isBullet, isCheckbox, isPartyLine };
    };

    const wrappedFor = (trimmed: string, c: ReturnType<typeof classify>) => {
        if (c.isCheckbox) {
            const label = trimmed.replace(/^\[[Xx\s]?\]\s*/, '');
            return doc.splitTextToSize(label, CONTENT_WIDTH - CHECK_TEXT_INDENT) as string[];
        }
        const indent = c.isBullet ? LIST_INDENT : 0;
        return doc.splitTextToSize(trimmed, CONTENT_WIDTH - indent) as string[];
    };

    // Absätze = Blöcke (durch Leerzeilen getrennt). Ein Block wird als Ganzes
    // umgebrochen, damit kein Satz und keine Ankreuzgruppe über die
    // Seitengrenze reißt.
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (trimmed === '') {
            if (currentGroup.length) {
                groups.push(currentGroup);
                currentGroup = [];
            }
            continue;
        }
        currentGroup.push(trimmed);
    }
    if (currentGroup.length) groups.push(currentGroup);

    const blockHeight = (lines: string[]) => {
        let h = 0;
        let prevList = false;
        let prevSection = false;
        for (const line of lines) {
            const c = classify(line);
            if (c.isSection) {
                h += SECTION_GAP;
                prevList = false;
            } else if (c.isBullet) {
                h += prevList ? LIST_LEADING : LIST_GAP_BEFORE;
                prevList = true;
            } else if (c.isCheckbox) {
                h += CHECK_GAP_BEFORE;
                prevList = true;
            } else {
                if (prevSection) h += HEADING_GAP_AFTER;
                prevList = false;
            }
            prevSection = c.isSection;
            h += wrappedFor(line, c).length * LINE_HEIGHT;
        }
        return h;
    };

    const usableHeight = bodyBottom - header.continuationBodyTopY;
    const SIGNATURE_HEIGHT = SIGNATURE_GAP + SIGNATURE_BLOCK_HEIGHT;

    // ── Umbruchplanung (Pass 1) ─────────────────────────────────────────
    // Jede Seite darf bis zum normalen unteren Rand gefüllt werden. Der
    // Unterschriftsblock wird als unteilbare Schlusseinheit geplant: passt er
    // nicht mehr auf die letzte Textseite, zieht er den letzten vollständigen
    // Absatz mit auf die neue Seite – so steht er niemals allein.
    type PlannedBlock = { kind: "group"; index: number } | { kind: "signature" };
    const plannedPages: PlannedBlock[][] = [[]];
    let planY = header.bodyTopY;
    const openPlannedPage = () => {
        plannedPages.push([]);
        planY = header.continuationBodyTopY;
    };

    groups.forEach((lines, groupIndex) => {
        const height = blockHeight(lines);
        const firstOnPage = plannedPages[plannedPages.length - 1].length === 0;
        const gap = firstOnPage ? 0 : PARAGRAPH_GAP;
        // Absätze bleiben als Ganzes beisammen (Keep-together). Blöcke, die
        // höher als eine Seite wären (kommt in den Vorlagen nicht vor), fallen
        // beim Zeichnen auf den zeilenweisen Notumbruch zurück.
        if (planY + gap + height > bodyBottom && height <= usableHeight) {
            openPlannedPage();
        } else {
            planY += gap;
        }
        plannedPages[plannedPages.length - 1].push({ kind: "group", index: groupIndex });
        planY += height;
    });

    if (planY + SIGNATURE_HEIGHT > bodyBottom) openPlannedPage();
    plannedPages[plannedPages.length - 1].push({ kind: "signature" });

    // Unterschrift allein auf ihrer Seite? Dann wandert der letzte vollständige
    // Absatz mit hinüber (Keep-together mit dem Block).
    if (plannedPages[plannedPages.length - 1].every(block => block.kind === "signature")) {
        const previousPage = plannedPages[plannedPages.length - 2];
        if (previousPage && previousPage.length > 0) {
            const moved = previousPage[previousPage.length - 1];
            previousPage.pop();
            plannedPages[plannedPages.length - 1].unshift(moved);
            if (previousPage.length === 0) plannedPages.splice(plannedPages.length - 2, 1);
        }
    }

    // ── Unterschriftsblock (Zeichner) ────────────────────────────────────
    const drawSignatureBlock = (sigY: number) => {
        const dateStr = data.startDate && /^\d{2}\.\d{2}\.\d{4}$/.test(data.startDate)
            ? data.startDate
            : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const ortStr = data.employerCity || '________________';

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...COLOR_META);
        doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, MARGIN_X, sigY);
        doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, 110, sigY);

        const lineY = sigY + 26;

        // Signaturen maßstabsgetreu und oberhalb der Signaturlinie platzieren
        const drawSignature = (signatureUrl: string, colX: number) => {
            if (!signatureUrl) return;
            const colWidth = 60;
            const maxW = 56;
            const maxH = 18;
            const size = readPngSize(signatureUrl);
            let w = maxW;
            let h = maxH;
            if (size) {
                const scale = Math.min(maxW / size.width, maxH / size.height);
                w = size.width * scale;
                h = size.height * scale;
            }
            try {
                doc.addImage(signatureUrl, 'PNG', colX + (colWidth - w) / 2, lineY - 1.5 - h, w, h);
            } catch {
                // Ignore signature rendering error if dummy image
            }
        };
        drawSignature(data.boardSignatureUrl, MARGIN_X);
        drawSignature(data.employeeSignatureUrl, 110);

        doc.setDrawColor(...COLOR_LINE);
        doc.setLineWidth(0.3);
        doc.line(MARGIN_X, lineY, 80, lineY);
        doc.line(110, lineY, 170, lineY);

        doc.setFontSize(9);
        doc.setTextColor(...COLOR_META);
        doc.text("Unterschrift Verein / Träger", MARGIN_X, lineY + 4.5);
        doc.text("Unterschrift Vertragspartner", 110, lineY + 4.5);
    };

    // ── Zeichnen (Pass 2) ────────────────────────────────────────────────
    plannedPages.forEach((blocks, pageIndex) => {
        if (pageIndex > 0) newContentPage();

        blocks.forEach((block, blockPos) => {
            if (block.kind === "signature") {
                y += SIGNATURE_GAP;
                drawSignatureBlock(y);
                return;
            }

            if (blockPos > 0) y += PARAGRAPH_GAP;
            const lines = groups[block.index];

            let prevList = false;
            let prevSection = false;
            for (const trimmed of lines) {
                const c = classify(trimmed);
                if (c.isSection) {
                    y += SECTION_GAP;
                    prevList = false;
                } else if (c.isBullet) {
                    y += prevList ? LIST_LEADING : LIST_GAP_BEFORE;
                    prevList = true;
                } else if (c.isCheckbox) {
                    y += CHECK_GAP_BEFORE;
                    prevList = true;
                } else {
                    if (prevSection) y += HEADING_GAP_AFTER;
                    prevList = false;
                }
                prevSection = c.isSection;

                if (c.isCheckbox) {
                    const checked = /^\[[Xx]\]/.test(trimmed);
                    const wrapped = wrappedFor(trimmed, c);
                    for (let i = 0; i < wrapped.length; i++) {
                        if (y > bodyBottom) newContentPage();
                        if (i === 0) {
                            doc.setDrawColor(...COLOR_BOX);
                            doc.setLineWidth(0.35);
                            doc.rect(MARGIN_X + CHECK_INDENT, y - CHECK_BOX_SIZE + 0.8, CHECK_BOX_SIZE, CHECK_BOX_SIZE, 'S');
                            if (checked) {
                                doc.setLineWidth(0.5);
                                const bx = MARGIN_X + CHECK_INDENT;
                                doc.line(bx + 0.7, y - 1.3, bx + 1.4, y - 0.5);
                                doc.line(bx + 1.4, y - 0.5, bx + 2.7, y - 2.5);
                            }
                        }
                        applyStyle("body");
                        doc.text(wrapped[i], MARGIN_X + CHECK_TEXT_INDENT, y);
                        y += LINE_HEIGHT;
                    }
                    continue;
                }

                const indent = c.isBullet ? LIST_INDENT : 0;
                const kind: "heading" | "party" | "body" =
                    c.isSection || c.isPartyLine ? "heading" : "body";
                const wrapped = wrappedFor(trimmed, c);
                for (const line of wrapped) {
                    if (y > bodyBottom) newContentPage();
                    applyStyle(kind);
                    doc.text(line, MARGIN_X + indent, y);
                    y += LINE_HEIGHT;
                }
            }
        });
    });

    // Fußbalken + Seitenzahlen auf allen Seiten
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawBrandBar(PAGE_HEIGHT - 5, 5);
        if (totalPages > 1) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...COLOR_PAGENO);
            doc.text(`Seite ${i} von ${totalPages}`, 190, 288, { align: 'right' });
        }
    }

    return doc;
}

export async function generateAndUploadContract(data: ContractData, userId: string): Promise<string> {
    let logoBase64: string | undefined;
    if (typeof window !== "undefined" && typeof fetch !== "undefined") {
        try {
            const res = await fetch("/logo.png");
            if (res.ok) {
                const blob = await res.blob();
                logoBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
        } catch (error) {
            console.error("Could not load logo for PDF", error);
        }
    }

    const doc = createContractPdf(data, logoBase64);

    // Convert to PDF string
    const pdfDataUri = doc.output('datauristring');
    const base64Content = pdfDataUri.split(',')[1]; // remove data:application/pdf;base64,

    // Upload to Firebase Storage
    const timestamp = new Date().getTime();
    const safeName = data.employeeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const docPrefix = data.documentKind === 'Änderungsvereinbarung' ? 'Aenderungsvereinbarung' : 'Vertrag';
    const fileName = `contracts/${userId}/${docPrefix}_${data.contractType.replace(/\s/g, '_')}_${safeName}_${timestamp}.pdf`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, base64Content, 'base64', { contentType: 'application/pdf' });
    const downloadUrl = await getDownloadURL(storageRef);

    return downloadUrl;
}
