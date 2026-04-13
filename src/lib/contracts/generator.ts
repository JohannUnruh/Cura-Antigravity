import jsPDF from "jspdf";
import { ContractData, ContractTemplates } from "./templates";
import { storage } from "../firebase/config";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export async function generateAndUploadContract(data: ContractData, userId: string): Promise<string> {
    const template = ContractTemplates[data.contractType];
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
    drawGradientDeco(0, 6);

    // Add Logo
    try {
        const getBase64Image = async (url: string) => {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        };
        // Wir nehmen an, das Logo liegt als 'logo.png' im public-Ordner
        const logoBase64 = await getBase64Image("/logo.png");
        // Bild oben rechts: Seitenbreite ist 210, y=10, 32x24 (etwas kleiner, damit es nicht in die graue Linie übersteht)
        doc.addImage(logoBase64, 'PNG', 160, 10, 32, 24);
    } catch (error) {
        console.error("Could not load logo for PDF", error);
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800

    // Die maximale Breite für den Titel etwas verringern, damit er nicht in das Logo ragt
    const titleLines = doc.splitTextToSize(template.title, 120);
    doc.text(titleLines, 20, 25);

    // Thin separator line below title
    const titleHeight = titleLines.length * 10;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 18 + titleHeight, 190, 18 + titleHeight);

    // Body Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // Slate-700

    // Normalize newlines in text before splitting
    const normalizedText = textContent.replace(/\r\n/g, '\n');
    const lines = doc.splitTextToSize(normalizedText, 170);

    let y = 25 + titleHeight;
    const pageHeight = 297;
    const bottomMargin = 25;

    lines.forEach((line: string) => {
        if (y > pageHeight - bottomMargin) {
            drawGradientDeco(pageHeight - 6, 6); // footer on previous page
            doc.addPage();
            drawGradientDeco(0, 6); // header on new page
            y = 25;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(51, 65, 85);
        }

        const isPartyLine = line.includes(data.employerName) || line.includes(data.employeeName);

        // Slight bolding for section headers (e.g., "§ X") and party names
        if (line.trim().startsWith("§")) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42); // Slate-900
            y += 4; // Add a bit of space before sections
        } else if (isPartyLine) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42); // Slate-900
        } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
        }

        doc.text(line, 20, y);
        y += 6; // line height
    });

    // Signatures Section
    y += 15;
    if (y > 220) {
        drawGradientDeco(pageHeight - 6, 6);
        doc.addPage();
        drawGradientDeco(0, 6);
        y = 30;
    }

    const dateStr = new Date().toLocaleDateString('de-DE');
    const ortStr = data.employerCity || '________________';

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);

    doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, 20, y);
    doc.text(`Ort, Datum: ${ortStr}, den ${dateStr}`, 110, y);

    y += 10;

    // Board Signature
    if (data.boardSignatureUrl) {
        doc.addImage(data.boardSignatureUrl, 'PNG', 20, y, 50, 25);
    }
    // Employee Signature
    if (data.employeeSignatureUrl) {
        doc.addImage(data.employeeSignatureUrl, 'PNG', 110, y, 50, 25);
    }

    y += 30;

    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(20, y, 80, y);
    doc.line(110, y, 170, y);

    doc.text("Unterschrift Verein / Träger", 20, y + 5);
    doc.text("Unterschrift Vertragspartner", 110, y + 5);

    // Final page footer
    drawGradientDeco(pageHeight - 6, 6);

    // Convert to PDF string
    const pdfDataUri = doc.output('datauristring');
    const base64Content = pdfDataUri.split(',')[1]; // remove data:application/pdf;base64,

    // Upload to Firebase Storage
    const timestamp = new Date().getTime();
    const safeName = data.employeeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `contracts/${userId}/Vertrag_${data.contractType.replace(/\s/g, '_')}_${safeName}_${timestamp}.pdf`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, base64Content, 'base64', { contentType: 'application/pdf' });
    const downloadUrl = await getDownloadURL(storageRef);

    return downloadUrl;
}
