/**
 * Währungs- und Zahlenformatierung für Cura.
 */

/**
 * Formatiert einen Betrag im deutschen Währungsformat (z. B. "1.250,00 €").
 */
export function formatEuro(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return "0,00 €";
    }
    return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/**
 * Berechnet das bewilligte Gesamtbudget in Euro (Stunden * Stundensatz).
 */
export function calculateTotalBudget(hoursGranted?: number | null, hourlyRate?: number | null): number | null {
    if (!hoursGranted || !hourlyRate || hoursGranted <= 0 || hourlyRate <= 0) {
        return null;
    }
    return Math.round(hoursGranted * hourlyRate * 100) / 100;
}

/**
 * Berechnet das verbrauchte Budget in Euro (Ist-Stunden * Stundensatz).
 */
export function calculateSpentBudget(actualHours?: number | null, hourlyRate?: number | null): number | null {
    if (!actualHours || !hourlyRate || actualHours <= 0 || hourlyRate <= 0) {
        return 0;
    }
    return Math.round(actualHours * hourlyRate * 100) / 100;
}
