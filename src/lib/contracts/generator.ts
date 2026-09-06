import jsPDF from "jspdf";
import { ContractData, getContractTemplate } from "./templates";
import { storage } from "../firebase/config";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export function createContractPdf(data: ContractData, logoBase64?: string): jsPDF {
    const template = getContractTemplate(data);
    const textContent = template.text(data);

    const doc = new jsPDF();

    // Helper: Draw a gradient from Reddish to Blue
    const drawGradientDeco = (yPos: number, height: number) => {
        const startColor = { r: 220, g: 38, b: 38 }; // Red
        const endColor = { r: 59, g: 130, b: 246 };   // Blue
        const steps = 210; // Document width approx 210mm
        const rectWidth = 210 / steps;

        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
            const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
            const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

            doc.setFillColor(r, g, b);
            doc.rect(i * rectWidth, yPos, rectWidth + 0.5, height, 'F');
        }
    };

    // First page deco
    drawGradientDeco(0, 5);

    // Add Logo if provided
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', 160, 10, 32, 24);
        } catch (error) {
            console.error("Could not render logo in PDF", error);
        }
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // Slate-800

    const titleLines = doc.splitTextToSize(template.title, 135);
    doc.text(titleLines, 20, 22);

    // Thin separator line below title
    const titleHeight = titleLines.length * 7.5;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 16 + titleHeight, 190, 16 + titleHeight);

    // Body Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700

    const normalizedText = textContent.replace(/\r\n/g, '\n');
    const rawLines = normalizedText.split('\n');

    let y = 22 + titleHeight;
    const pageHeight = 297;
    const bottomMargin = 22;

    for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (trimmed === '') {
            y += 3; // compact spacing for paragraph break
            continue;
        }

        const isSection = trimmed.startsWith('§');
        const isPartyLine = trimmed.includes(data.employerName) || trimmed.includes(data.employeeName);

        if (isSection) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42); // Slate-900
            y += 2.5; // subtle breathing room before section
        } else if (isPartyLine) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
        } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
        }

        const wrappedLines = doc.splitTextToSize(trimmed, 170);
        for (const line of wrappedLines) {
            if (y > pageHeight - bottomMargin) {
                drawGradientDeco(pageHeight - 5, 5); // footer on previous page
                doc.addPage();
                drawGradientDeco(0, 5); // header on new page
                y = 22;
                if (isSection || isPartyLine) {
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(15, 23, 42);
                } else {
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(51, 65, 85);
                }
            }
            doc.text(line, 20, y);
            y += 4.8;
        }
    }

    // Signatures Section
    y += 5;
    if (y > 245) {
        drawGradientDeco(pageHeight - 5, 5);
        doc.addPage();
        drawGradientDeco(0, 5);
        y = 25;
    }

    const dateStr = data.startDate && /^\d{2}\.\d{2}\.\d{4}$/.test(data.startDate) 
        ? data.startDate 
        : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const ortStr = data.employerCity || '________________';

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);

    doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, 20, y);
    doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, 110, y);

    y += 6;

    // Board Signature
    if (data.boardSignatureUrl) {
        try {
            doc.addImage(data.boardSignatureUrl, 'PNG', 20, y, 50, 20);
        } catch {
            // Ignore signature rendering error if dummy image
        }
    }
    // Employee Signature
    if (data.employeeSignatureUrl) {
        try {
            doc.addImage(data.employeeSignatureUrl, 'PNG', 110, y, 50, 20);
        } catch {
            // Ignore signature rendering error if dummy image
        }
    }

    y += 24;

    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(20, y, 80, y);
    doc.line(110, y, 170, y);

    doc.setFontSize(9);
    doc.text("Unterschrift Verein / Träger", 20, y + 4.5);
    doc.text("Unterschrift Vertragspartner", 110, y + 4.5);

    // Final page footer & page numbers (only if multi-page)
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawGradientDeco(pageHeight - 5, 5);
        if (totalPages > 1) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate-400
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
