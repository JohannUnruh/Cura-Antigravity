import { ContractType, DocumentKind } from "@/types";

export interface ContractData {
    employerName: string;
    employerAddress: string;
    employerCity?: string; // Vereinssitz für Ort im Vertrag
    employeeName: string;
    employeeAddress: string;
    employeeBirthDate?: string; // z. B. "23.02.1985"
    startDate: string; // Vertragsbeginn oder Inkrafttreten
    endDate?: string; // unbefristet, if empty
    weeklyHours?: number;
    monthlyHours?: number; // Monatliche Arbeitszeit
    hourlyRate?: number;
    lumpSumAmount?: number; // Pauschalbetrag / Monatsvergütung
    monthlyEarningsLimit?: number; // Dynamische Verdienstgrenze aus App-Einstellungen
    vacationDaysPerYear?: number;
    contractType: ContractType;
    documentKind?: DocumentKind; // 'Vertrag' | 'Änderungsvereinbarung'
    activityDescription?: string; // Freitext-Rolle, z. B. "Leitung des Kinderchors"; leer = geschlechtsneutraler Vorlagen-Default
    tasksDescription?: string; // Aufgabenliste bei Ehrenamtlichen
    boardSignatureUrl: string; // the base64 png
    employeeSignatureUrl: string; // the base64 png
}

export const formatCurrencyDE = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0,00 EUR';
    return amount.toFixed(2).replace('.', ',') + ' EUR';
};

export const formatHoursDE = (hours?: number): string => {
    if (hours === undefined || hours === null || isNaN(hours)) return '0';
    return hours.toString().replace('.', ',');
};

export const ContractTemplates: Record<ContractType, { title: string, text: (data: ContractData) => string }> = {
    'Minijob': {
        title: "Arbeitsvertrag für geringfügig entlohnte Beschäftigte (Minijob)",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Arbeitgeber“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Arbeitnehmer/in“ genannt –
wird folgender Arbeitsvertrag geschlossen:

§ 1 Beginn des Arbeitsverhältnisses
Das Arbeitsverhältnis beginnt am ${data.startDate}. ${data.endDate ? `Das Arbeitsverhältnis ist befristet bis zum ${data.endDate}.` : 'Das Arbeitsverhältnis wird auf unbestimmte Zeit geschlossen.'}
Die ersten 6 Monate gelten als Probezeit, in der das Arbeitsverhältnis mit einer Frist von zwei Wochen gekündigt werden kann.

§ 2 Tätigkeit
Der/Die Arbeitnehmer/in wird als Mitarbeiter/in eingestellt und erbringt die zugewiesenen Aufgaben nach besten Kräften. Der Arbeitgeber behält sich das Recht vor, dem/der Arbeitnehmer/in andere, gleichwertige Tätigkeiten zuzuweisen, sofern dies betrieblich erforderlich und zumutbar ist.

§ 3 Arbeitszeit
Die regelmäßige monatliche Arbeitszeit beträgt ${formatHoursDE(data.monthlyHours ?? (data.weeklyHours ? Math.round(data.weeklyHours * 4.33 * 10) / 10 : 0))} Stunden${data.weeklyHours ? ` (entspricht durchschnittlich ca. ${formatHoursDE(data.weeklyHours)} Stunden wöchentlich)` : ''}. Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen und wird vom Arbeitgeber nach billigem Ermessen festgelegt. 

§ 4 Vergütung
Der/Die Arbeitnehmer/in erhält einen Bruttostundenlohn in Höhe von ${formatCurrencyDE(data.hourlyRate)}.
Bei einer regelmäßigen monatlichen Arbeitszeit von ${formatHoursDE(data.monthlyHours ?? 0)} Stunden ergibt sich eine monatliche Vergütung in Höhe von ${formatCurrencyDE(data.lumpSumAmount || ((data.monthlyHours || 0) * (data.hourlyRate || 0)))}.
Es handelt sich um eine geringfügige Beschäftigung (§ 8 Abs. 1 Nr. 1 SGB IV). Die monatliche Vergütung darf die gesetzliche Geringfügigkeitsgrenze (derzeit ${formatCurrencyDE(data.monthlyEarningsLimit || 603)}) im regelmäßigen Durchschnitt nicht überschreiten. 

§ 5 Urlaub und Krankheit
Der/Die Arbeitnehmer/in hat Anspruch auf ${data.vacationDaysPerYear || 0} Urlaubstage pro Kalenderjahr. Im Übrigen gelten die gesetzlichen Vorschriften (insbesondere das Bundesurlaubsgesetz und Entgeltfortzahlungsgesetz).

§ 6 Verschwiegenheitspflicht und Haftung
Der/Die Arbeitnehmer/in verpflichtet sich, über alle betrieblichen Angelegenheiten und Daten der Klienten, die ihm/ihr im Rahmen der Tätigkeit bekannt werden, absolutes Stillschweigen zu bewahren (§ 203 StGB, DSGVO). Dies gilt auch nach Beendigung des Arbeitsverhältnisses.

§ 7 Sonstige Bestimmungen
Es bestehen keine mündlichen Nebenabreden. Tarifverträge, Betriebsvereinbarungen oder sonstige kollektivrechtliche Regelungen finden auf dieses Arbeitsverhältnis keine Anwendung. Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Rechtswirksamkeit der Textform.
Etwaige übergesetzliche Ansprüche entstehen nicht durch betriebliche Übung, sondern stellen stets eine freiwillige, jederzeit widerrufliche Leistung dar.
`
    },
    'Ehrenamtlich': {
        title: "Vertrag für „ehrenamtliche“ Mitarbeiter",
        text: (data) => {
            const tasksFormatted = data.tasksDescription
                ? data.tasksDescription.split('\n').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('•') ? t : `• ${t}`).join('\n')
                : `• Beratung und Seelsorge\n• Organisation und Unterstützung bei Freizeiten und Vorträgen\n• Allgemeine ehrenamtliche Mitarbeit`;

            const compensationText = data.lumpSumAmount && data.lumpSumAmount > 0
                ? `Als Aufwandsentschädigung erhält die tätige Person ${formatCurrencyDE(data.lumpSumAmount)} steuer- und sozialversicherungsfrei gemäß § 3 Nr. 26a EStG.`
                : `Die Tätigkeit erfolgt ehrenamtlich und unentgeltlich. Ein Anspruch auf Vergütung besteht nicht.`;

            return `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird folgendes vereinbart:

§ 1 Tätigkeit und Beginn
Die tätige Person nimmt für die Einrichtung ab dem ${data.startDate} eine ehrenamtliche Tätigkeit als ${data.activityDescription || 'ehrenamtliche/r Mitarbeiter/in des Vereins'} wahr.

§ 2 Aufgaben
Die tätige Person hat folgende Aufgaben:
${tasksFormatted}

§ 3 Unentgeltlichkeit und Aufwandsentschädigung
${compensationText}

§ 4 Höchstgrenze und Mitteilungspflicht
Da die sog. Pauschale für ehrenamtliche Mitarbeiter derzeit jährlich maximal 840,00 EUR betragen darf, teilt die tätige Person der Einrichtung die Aufnahme jeder weiteren nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26a EStG vorab und so früh wie möglich, spätestens aber eine Woche vorher mit.

§ 5 Verschwiegenheit und Datenschutz
Die tätige Person hat über sämtliche vertrauliche Angelegenheiten und personenbezogene Daten, die ihr im Rahmen ihrer Tätigkeit bekannt werden, sowie über sämtliche Angelegenheiten, deren Geheimhaltung von der Einrichtung angeordnet ist, Verschwiegenheit zu bewahren. Dies gilt auch über die Beendigung dieser Vereinbarung hinaus.

§ 6 Vertragsdauer und Kündigung
Diese Vereinbarung wird für unbestimmte Dauer abgeschlossen. Sie kann von jedem Vereinbarungspartner mit einer Frist von vier Wochen zum 15. oder zum Ende eines Kalendermonats in Textform gekündigt werden.

Erklärung der tätigen Person zur Inanspruchnahme der sog. Ehrenamtspauschale
Ich versichere, dass ich neben der in obiger Vereinbarung geregelten nebenberuflichen Tätigkeit im Sinn des § 3 Nr. 26a EStG:
[X] im laufenden Kalenderjahr noch keine Einnahmen aus einer anderen nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26a EStG erzielt habe.
[X] derzeit weder für eine andere Einrichtung zur Förderung gemeinnütziger, mildtätiger oder kirchlicher Zwecke noch für eine juristische Person des öffentlichen Rechts nebenberuflich tätig im Sinne des § 3 Nr. 26a EStG bin und das in absehbarer Zeit auch nicht vorhabe.
`;
        }
    },
    'Ehrenamtspauschale': {
        title: "Vertrag für „ehrenamtliche“ Mitarbeiter",
        text: (data) => {
            const tasksFormatted = data.tasksDescription
                ? data.tasksDescription.split('\n').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('•') ? t : `• ${t}`).join('\n')
                : `• Kassenprüfung\n• Organisation der Unterkünfte bei Freizeiten und Vorträgen\n• Beratende Funktion`;

            const compensationText = data.lumpSumAmount && data.lumpSumAmount > 0
                ? `Als Aufwandsentschädigung erhält die tätige Person ${formatCurrencyDE(data.lumpSumAmount)} steuer- und sozialversicherungsfrei gemäß § 3 Nr. 26a EStG.`
                : `Die Tätigkeit erfolgt ehrenamtlich und unentgeltlich.`;

            // Geschlechtsneutraler Rollen-Default (Vorgabe Product Owner, 09.09.2026):
            // Sachform statt weiblicher Rollenbezeichnung („Kassenprüferin"). Freitext-
            // eingaben der Nutzer:innen werden unverändert mit „als …" eingesetzt.
            const activityPhrase = data.activityDescription
                ? `als ${data.activityDescription}`
                : 'in der Kassenprüfung und Organisation des Vereins';

            return `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird folgendes vereinbart:

§ 1 Tätigkeit und Beginn
Die tätige Person nimmt für die Einrichtung ab dem ${data.startDate} eine nebenberufliche Tätigkeit ${activityPhrase} wahr.

§ 2 Aufgaben
Die tätige Person hat folgende Aufgaben:
${tasksFormatted}

§ 3 Aufwandsentschädigung (Ehrenamtspauschale gem. § 3 Nr. 26a EStG)
${compensationText}

§ 4 Höchstgrenze und Mitteilungspflicht
Da die sog. Pauschale für ehrenamtliche Mitarbeiter derzeit jährlich maximal 840,00 EUR betragen darf, teilt die tätige Person der Einrichtung die Aufnahme jeder weiteren nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26a EStG vorab und so früh wie möglich, spätestens aber eine Woche vorher mit.

§ 5 Verschwiegenheit und Datenschutz
Die tätige Person hat über sämtliche vertrauliche Angelegenheiten und personenbezogene Daten, die ihr im Rahmen ihrer Tätigkeit bekannt werden, sowie über sämtliche Angelegenheiten, deren Geheimhaltung von der Einrichtung angeordnet ist, Verschwiegenheit zu bewahren. Dies gilt auch über die Beendigung dieser Vereinbarung hinaus.

§ 6 Vertragsdauer und Kündigung
Diese Vereinbarung wird für unbestimmte Dauer abgeschlossen. Sie kann von jedem Vereinbarungspartner mit einer Frist von vier Wochen zum 15. oder zum Ende eines Kalendermonats in Textform gekündigt werden.

Erklärung der tätigen Person zur Inanspruchnahme der sog. Ehrenamtspauschale
Ich versichere, dass ich neben der in obiger Vereinbarung geregelten nebenberuflichen Tätigkeit im Sinn des § 3 Nr. 26a EStG:
[X] im laufenden Kalenderjahr noch keine Einnahmen aus einer anderen nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26a EStG erzielt habe.
[X] derzeit weder für eine andere Einrichtung zur Förderung gemeinnütziger, mildtätiger oder kirchlicher Zwecke noch für eine juristische Person des öffentlichen Rechts nebenberuflich tätig im Sinne des § 3 Nr. 26a EStG bin und das in absehbarer Zeit auch nicht vorhabe.
`;
        }
    },
    'Übungsleiterpauschale': {
        title: "Vertrag für „Übungsleiter“",
        text: (data) => `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird folgendes vereinbart:

§ 1 Tätigkeit und Beginn
Die tätige Person nimmt für die Einrichtung ab dem ${data.startDate} eine nebenberufliche Tätigkeit ${data.activityDescription ? `als ${data.activityDescription}` : 'in der Kassenprüfung und Organisation des Vereins'} wahr.

§ 2 Arbeitszeit
Die tätige Person arbeitet ${formatHoursDE(data.monthlyHours ?? 8.6)} Stunden im Monat.

§ 3 Aufwandsentschädigung (§ 3 Nr. 26 EStG)
Als Aufwandsentschädigung erhält die tätige Person monatlich ${formatCurrencyDE(data.lumpSumAmount || 125)} steuer- und sozialversicherungsfrei gemäß § 3 Nr. 26 EStG. Die Aufwandsentschädigung wird jeweils spätestens am Ende des laufenden Monats auf das von der tätigen Person schriftlich angegebene Konto überwiesen.

§ 4 Höchstgrenze und Mitteilungspflicht
Da die sog. Übungsleiterpauschale derzeit jährlich maximal 3.000,00 EUR betragen darf, teilt die tätige Person der Einrichtung die Aufnahme jeder weiteren nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26 EStG vorab und so früh wie möglich, spätestens aber eine Woche vorher mit.

§ 5 Verschwiegenheit und Datenschutz
Die tätige Person hat über sämtliche vertrauliche Angelegenheiten und personenbezogene Daten, die ihr im Rahmen ihrer Tätigkeit bekannt werden, sowie über sämtliche Angelegenheiten, deren Geheimhaltung von der Einrichtung angeordnet ist, Verschwiegenheit zu bewahren. Dies gilt auch über die Beendigung dieser Vereinbarung hinaus.

§ 6 Vertragsdauer und Kündigung
Diese Vereinbarung wird für unbestimmte Dauer abgeschlossen. Sie kann von jedem Vereinbarungspartner mit einer Frist von vier Wochen zum 15. oder zum Ende eines Kalendermonats in Textform gekündigt werden.

Erklärung der tätigen Person zur Inanspruchnahme der sog. Übungsleiterpauschale
Ich versichere, dass ich neben der in obiger Vereinbarung geregelten nebenberuflichen Tätigkeit im Sinn des § 3 Nr. 26 EStG:
[X] im laufenden Kalenderjahr noch keine Einnahmen aus einer anderen nebenberuflichen Tätigkeit im Sinne des § 3 Nr. 26 EStG erzielt habe.
[X] derzeit weder für eine andere Einrichtung zur Förderung gemeinnütziger, mildtätiger oder kirchlicher Zwecke noch für eine juristische Person des öffentlichen Rechts nebenberuflich tätig im Sinne des § 3 Nr. 26 EStG bin und das in absehbarer Zeit auch nicht vorhabe.
`
    }
};

export const AmendmentTemplates: Record<ContractType, { title: string, text: (data: ContractData) => string }> = {
    'Minijob': {
        title: "Änderungsvereinbarung zum Arbeitsvertrag (Minijob)",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Arbeitgeber“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Arbeitnehmer/in“ genannt –
wird in Ergänzung und Abänderung des bestehenden Arbeitsvertrages folgendes vereinbart:

§ 1 Inkrafttreten
Die nachfolgenden Vereinbarungen treten mit Wirkung zum ${data.startDate} in Kraft. Das Arbeitsverhältnis wird unverändert auf unbestimmte Zeit fortgeführt.

§ 2 Arbeitszeit
Die regelmäßige monatliche Arbeitszeit beträgt ab dem vorgenannten Zeitpunkt ${formatHoursDE(data.monthlyHours ?? 0)} Stunden${data.weeklyHours ? ` (dies entspricht durchschnittlich ca. ${formatHoursDE(data.weeklyHours)} Stunden wöchentlich)` : ''}. Die zeitliche Lage und Verteilung der Arbeitszeit richtet sich weiterhin nach den betrieblichen Erfordernissen und wird vom Arbeitgeber nach billigem Ermessen festgelegt.

§ 3 Vergütung
Der/Die Arbeitnehmer/in erhält ab dem vorgenannten Zeitpunkt einen Bruttostundenlohn in Höhe von ${formatCurrencyDE(data.hourlyRate)}.
Bei einer regelmäßigen monatlichen Arbeitszeit von ${formatHoursDE(data.monthlyHours ?? 0)} Stunden beträgt das monatliche Bruttoentgelt ${formatCurrencyDE(data.lumpSumAmount || ((data.monthlyHours || 0) * (data.hourlyRate || 0)))}.
Das Arbeitsverhältnis wird unverändert als geringfügige Beschäftigung im Sinne des § 8 Abs. 1 Nr. 1 SGB IV geführt. Die monatliche Vergütung darf die gesetzliche Geringfügigkeitsgrenze (derzeit ${formatCurrencyDE(data.monthlyEarningsLimit || 603)}) im regelmäßigen Durchschnitt nicht überschreiten.

${data.vacationDaysPerYear ? `§ 4 Erholungsurlaub\nDer Anspruch auf bezahlten Erholungsurlaub beträgt ${data.vacationDaysPerYear} Urlaubstage pro Kalenderjahr.\n` : ''}
§ ${data.vacationDaysPerYear ? '5' : '4'} Fortgeltung der übrigen Vertragsbestimmungen
Alle weiteren Bestimmungen und Vereinbarungen des bisherigen Arbeitsvertrages bleiben von dieser Änderungsvereinbarung unberührt und gelten unverändert fort.

§ ${data.vacationDaysPerYear ? '6' : '5'} Schlussbestimmungen
Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen dieser Vereinbarung bedürfen zu ihrer Rechtswirksamkeit der Textform.
`
    },
    'Ehrenamtspauschale': {
        title: "Änderungsvereinbarung (Ehrenamtspauschale gem. § 3 Nr. 26a EStG)",
        text: (data) => `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird in Abänderung der bestehenden Vereinbarung für ehrenamtliche Mitarbeiter folgendes vereinbart:

§ 1 Inkrafttreten
Die nachfolgende Anpassung tritt mit Wirkung zum ${data.startDate} in Kraft. Die Vereinbarung wird im Übrigen unverändert auf unbestimmte Zeit fortgeführt.

§ 2 Aufwandsentschädigung (Ehrenamtspauschale gem. § 3 Nr. 26a EStG)
Die pauschale Aufwandsentschädigung wird ab dem genannten Zeitpunkt auf ${formatCurrencyDE(data.lumpSumAmount || 840)} angepasst. Die Entschädigung wird als Ehrenamtspauschale im Sinne des § 3 Nr. 26a EStG gezahlt und ist bis zum gesetzlichen Freibetrag von derzeit 840,00 EUR pro Kalenderjahr steuer- und sozialversicherungsfrei.

§ 3 Fortgeltung der übrigen Bestimmungen
Alle übrigen Bestimmungen der bestehenden Vereinbarung bleiben unberührt und gelten unverändert fort. Änderungen bedürfen der Textform.
`
    },
    'Übungsleiterpauschale': {
        title: "Änderungsvereinbarung (Übungsleiterpauschale gem. § 3 Nr. 26 EStG)",
        text: (data) => `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird in Abänderung und Ergänzung der bestehenden Vereinbarung für Übungsleiter folgendes vereinbart:

§ 1 Inkrafttreten
Die nachfolgenden Anpassungen treten mit Wirkung zum ${data.startDate} in Kraft. Die Vereinbarung wird im Übrigen unverändert auf unbestimmte Zeit fortgeführt.

§ 2 Arbeitszeit und Aufwandsentschädigung
Die monatliche Arbeitszeit beträgt ab dem vorgenannten Zeitpunkt ${formatHoursDE(data.monthlyHours ?? 8.6)} Stunden im Monat.
Als monatliche Aufwandsentschädigung erhält die tätige Person ${formatCurrencyDE(data.lumpSumAmount || 125)} steuer- und sozialversicherungsfrei gemäß § 3 Nr. 26 EStG (bis maximal 3.000,00 EUR jährlich).

§ 3 Fortgeltung der übrigen Vertragsbestimmungen
Alle weiteren Bestimmungen und Pflichten (insbesondere zur Verschwiegenheit, Höchstgrenzen-Mitteilung und Kündigung) bleiben von dieser Änderungsvereinbarung unberührt und gelten unverändert fort.

§ 4 Schlussbestimmungen
Änderungen und Ergänzungen bedürfen zu ihrer Rechtswirksamkeit der Textform.
`
    },
    'Ehrenamtlich': {
        title: "Änderungsvereinbarung zur Ehrenamtsvereinbarung",
        text: (data) => `Zwischen
${data.employerName}
– im Weiteren „Einrichtung“ genannt –
und
Frau/Herrn ${data.employeeName}${data.employeeBirthDate ? `, geb. am ${data.employeeBirthDate}` : ''}
– im Weiteren „tätige Person“ genannt –
wird mit Wirkung zum ${data.startDate} folgende Anpassung der ehrenamtlichen Tätigkeit vereinbart:

§ 1 Inkrafttreten & Anpassung der Rahmenbedingungen
Die Parteien vereinbaren mit Wirkung zum ${data.startDate} eine Anpassung der Rahmenbedingungen der ehrenamtlichen Tätigkeit${data.activityDescription ? ` als ${data.activityDescription}` : ''}. Die Tätigkeit erfolgt weiterhin freiwillig und unentgeltlich.

§ 2 Fortgeltung
Alle übrigen Bestimmungen der bestehenden Ehrenamtsvereinbarung bleiben unverändert in Kraft. Änderungen bedürfen der Textform.
`
    }
};

export function getContractTemplate(data: ContractData): { title: string; text: (data: ContractData) => string } {
    if (data.documentKind === 'Änderungsvereinbarung') {
        return AmendmentTemplates[data.contractType] || AmendmentTemplates['Minijob'];
    }
    return ContractTemplates[data.contractType] || ContractTemplates['Ehrenamtlich'];
}

