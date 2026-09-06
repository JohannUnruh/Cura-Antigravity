import { describe, it } from "./test-framework";
import { getContractTemplate, ContractData } from "@/lib/contracts/templates";

describe("Contracts & Amendment Agreements (Minijob & Monthly Hours)", () => {
    it("calculates monthly hours correctly for 603 EUR and 16.75 EUR hourly rate", () => {
        const lumpSum = 603.0;
        const hourlyRate = 16.75;
        const monthlyHours = Math.round((lumpSum / hourlyRate) * 100) / 100;
        const weeklyHours = Math.round((monthlyHours / 4.33) * 100) / 100;

        if (monthlyHours !== 36) {
            throw new Error(`Expected monthlyHours to be 36, got ${monthlyHours}`);
        }
        if (weeklyHours !== 8.31) {
            throw new Error(`Expected weeklyHours to be 8.31, got ${weeklyHours}`);
        }
    });

    it("generates Minijob employment contract with monthly working hours", () => {
        const data: ContractData = {
            employerName: "Musterverein e.V.",
            employerAddress: "Musterstraße 1, 12345 Musterstadt",
            employerCity: "Musterstadt",
            employeeName: "Max Mustermann",
            employeeAddress: "Beispielweg 2, 12345 Musterstadt",
            startDate: "01.10.2026",
            monthlyHours: 36,
            weeklyHours: 8.31,
            hourlyRate: 16.75,
            lumpSumAmount: 603,
            monthlyEarningsLimit: 603,
            vacationDaysPerYear: 24,
            contractType: "Minijob",
            documentKind: "Vertrag",
            boardSignatureUrl: "data:image/png;base64,board",
            employeeSignatureUrl: "data:image/png;base64,employee"
        };

        const template = getContractTemplate(data);
        if (template.title !== "Arbeitsvertrag für geringfügig entlohnte Beschäftigte (Minijob)") {
            throw new Error(`Unexpected title: ${template.title}`);
        }

        const text = template.text(data);
        if (!text.includes("regelmäßige monatliche Arbeitszeit beträgt 36 Stunden")) {
            throw new Error("Text does not include monthly working hours in § 3");
        }
        if (!text.includes("Bruttostundenlohn in Höhe von 16.75 EUR")) {
            throw new Error("Text does not include hourly rate in § 4");
        }
        if (!text.includes("monatliche Vergütung in Höhe von 603.00 EUR")) {
            throw new Error("Text does not include monthly salary in § 4");
        }
        if (!text.includes("derzeit 603.00 EUR")) {
            throw new Error("Text does not include 603.00 EUR earnings limit in § 4");
        }
    });

    it("generates Minijob amendment agreement with all legal requirements", () => {
        const data: ContractData = {
            employerName: "Musterverein e.V.",
            employerAddress: "Musterstraße 1, 12345 Musterstadt",
            employerCity: "Musterstadt",
            employeeName: "Max Mustermann",
            employeeAddress: "Beispielweg 2, 12345 Musterstadt",
            startDate: "01.10.2026",
            monthlyHours: 36,
            weeklyHours: 8.31,
            hourlyRate: 16.75,
            lumpSumAmount: 603,
            monthlyEarningsLimit: 603,
            vacationDaysPerYear: 24,
            contractType: "Minijob",
            documentKind: "Änderungsvereinbarung",
            boardSignatureUrl: "data:image/png;base64,board",
            employeeSignatureUrl: "data:image/png;base64,employee"
        };

        const template = getContractTemplate(data);
        if (template.title !== "Änderungsvereinbarung zum Arbeitsvertrag (Minijob)") {
            throw new Error(`Unexpected amendment title: ${template.title}`);
        }

        const text = template.text(data);
        if (!text.includes("Änderungsvereinbarung")) {
            throw new Error("Missing Änderungsvereinbarung heading");
        }
        if (!text.includes("§ 1 Inkrafttreten")) {
            throw new Error("Missing § 1 Inkrafttreten");
        }
        if (!text.includes("Wirkung zum 01.10.2026")) {
            throw new Error("Missing effective date in § 1");
        }
        if (!text.includes("monatliche Arbeitszeit beträgt ab dem vorgenannten Zeitpunkt 36 Stunden")) {
            throw new Error("Missing § 2 Arbeitszeit with monthly hours");
        }
        if (!text.includes("Bruttostundenlohn in Höhe von 16.75 EUR")) {
            throw new Error("Missing § 3 hourly rate");
        }
        if (!text.includes("monatliche Bruttoentgelt 603.00 EUR")) {
            throw new Error("Missing § 3 monthly compensation");
        }
        if (!text.includes("Fortgeltung der übrigen Vertragsbestimmungen")) {
            throw new Error("Missing continuation clause");
        }
        if (!text.includes("Textform")) {
            throw new Error("Missing text form clause in final section");
        }
    });

    it("supports amendment agreements for Ehrenamtspauschale and Übungsleiterpauschale", () => {
        const ehrenamtData: ContractData = {
            employerName: "Musterverein e.V.",
            employerAddress: "Musterstraße 1",
            employeeName: "Erika Muster",
            employeeAddress: "Weg 1",
            startDate: "01.10.2026",
            lumpSumAmount: 70,
            contractType: "Ehrenamtspauschale",
            documentKind: "Änderungsvereinbarung",
            boardSignatureUrl: "sig1",
            employeeSignatureUrl: "sig2"
        };

        const template = getContractTemplate(ehrenamtData);
        if (!template.title.includes("Ehrenamtspauschale")) {
            throw new Error(`Unexpected title for Ehrenamtspauschale amendment: ${template.title}`);
        }
        const text = template.text(ehrenamtData);
        if (!text.includes("70.00 EUR")) {
            throw new Error("Lump sum amount missing in Ehrenamtspauschale text");
        }
    });
});
