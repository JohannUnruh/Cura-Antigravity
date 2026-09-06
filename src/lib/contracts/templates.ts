import { ContractType, DocumentKind } from "@/types";

export interface ContractData {
    employerName: string;
    employerAddress: string;
    employerCity?: string; // Vereinssitz für Ort im Vertrag
    employeeName: string;
    employeeAddress: string;
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
        title: "Vereinbarung über ehrenamtliche Tätigkeit",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Verein/Träger“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Ehrenamtliche/r“ genannt –
wird folgende Ehrenamtsvereinbarung geschlossen:

§ 1 Gegenstand der ehrenamtlichen Tätigkeit
Der/Die Ehrenamtliche übernimmt ab dem ${data.startDate} ehrenamtliche Aufgaben für den Verein/Träger. Die Tätigkeit erfolgt freiwillig und unentgeltlich. Ein Arbeitsverhältnis jeder Art wird hierdurch ausdrücklich nicht begründet.

§ 2 Unentgeltlichkeit
Die Parteien sind sich darüber einig, dass der/die Ehrenamtliche für die geleisteten Dienste keine Vergütung im arbeitsrechtlichen Sinne erhält. Damit sind sämtliche Vergütungs- und Schadensersatzansprüche nach Arbeitsrecht ausgeschlossen.

§ 3 Kostenerstattung
Soweit dem/der Ehrenamtlichen im Rahmen der Tätigkeit tatsächlich nachgewiesene Auslagen entstehen (z.B. Fahrtkosten), können diese gegen Vorlage der Originalbelege und nach vorheriger Absprache vom Verein/Träger erstattet werden. Ein genereller Anspruch ohne Belege besteht nicht.

§ 4 Beendigung
Die ehrenamtliche ehrenamtliche Tätigkeit erfolgt auf unbestimmte Zeit und kann von beiden Seiten jederzeit ohne Angabe von Gründen fristlos beendet werden. Ein Rechtsanspruch auf Weiterbeschäftigung oder Abfindung besteht nicht.

§ 5 Datenschutz und Verschwiegenheit
Der/Die Ehrenamtliche verpflichtet sich, über alle im Rahmen der Tätigkeit bekannt gewordenen internen Angelegenheiten, insbesondere über personenbezogene Daten von Klienten und Mitgliedern, striktes Stillschweigen zu bewahren. Diese Verpflichtung besteht auch nach Beendigung der Tätigkeit fort.

§ 6 Haftungsbeschränkung
Eine gesetzliche Haftung des/der Ehrenamtlichen für Schäden, die bei der Ausübung der Tätigkeit leicht fahrlässig verursacht werden, ist nach Maßgabe des § 31a BGB ausgeschlossen. Eine Haftung besteht nur bei Vorsatz oder grober Fahrlässigkeit.

§ 7 Schlussbestimmungen
Beide Seiten bestätigen, dass mündliche Nebenabreden nicht getroffen wurden. Änderungen und Ergänzungen bedürfen der Schriftform.
`
    },
    'Ehrenamtspauschale': {
        title: "Vereinbarung über ehrenamtliche Tätigkeit (Ehrenamtspauschale gem. § 3 Nr. 26a EStG)",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Verein/Träger“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Ehrenamtliche/r“ genannt –
wird folgende Vereinbarung geschlossen:

§ 1 Art und Beginn der Tätigkeit
Der/Die Ehrenamtliche ist ab dem ${data.startDate} im ideellen Bereich bzw. Zweckbetrieb des Trägers tätig. 
Die Parteien sind sich einig, dass hierdurch kein Arbeitsverhältnis und kein steuerpflichtiges Dienstverhältnis begründet werden soll.

§ 2 Aufwandsentschädigung (Ehrenamtspauschale)
Für die ehrenamtliche Tätigkeit erhält der/die Ehrenamtliche zur Abgeltung seines/ihres entstandenen Aufwands eine pauschale Aufwandsentschädigung in Höhe von derzeit ${data.lumpSumAmount?.toFixed(2) || '0.00'} EUR monatlich/jährlich (entsprechend der Auszahlung).
Diese Entschädigung wird als Ehrenamtspauschale im Sinne des § 3 Nr. 26a EStG gezahlt und ist bis zum gesetzlichen Maximalbetrag (derzeit 840,00 Euro pro Jahr) steuer- und sozialversicherungsfrei. 

§ 3 Erklärung des/der Ehrenamtlichen
Der/Die Ehrenamtliche erklärt ausdrücklich, dass er/sie den steuerfreien Freibetrag nach § 3 Nr. 26a EStG in Höhe von insgesamt 840 Euro im laufenden Kalenderjahr noch nicht bei einem anderen Verein oder einer anderen Institution ausgeschöpft hat. Sollte durch die Zahlung des Vereins/Trägers der Freibetrag überschritten werden, ist der/die Ehrenamtliche für die Versteuerung des übersteigenden Betrages selbst verantwortlich. Entsprechende Nachforderungen von Finanzamt oder Sozialversicherungsträgern gehen vollumfänglich zu Lasten des/der Ehrenamtlichen.

§ 4 Beendigung
Die Vereinbarung ist von beiden Seiten jederzeit ohne Wahrung einer Frist kündbar. Mit der Beendigung endet der Anspruch auf die Ehrenamtspauschale anteilig.

§ 5 Datenschutz und Verschwiegenheitspflicht
Über alle internen und insbesondere personenbezogenen Klientendaten ist zwingend Verschwiegenheit zu wahren. Die Pflicht zur Einhaltung datenschutzrechtlicher Vorgaben bleibt über das Ende dieser Vereinbarung hinaus bestehen.

§ 6 Haftungsausschluss (§ 31a BGB)
Der/Die Ehrenamtliche haftet gegenüber dem Verein/Träger sowie gegenüber Dritten für Schäden, die er/sie im Rahmen der ehrenamtlichen Tätigkeit verursacht hat, nur bei Vorsatz oder grober Fahrlässigkeit. Ein Anspruch aus mangelhafter Leistungserbringung im arbeitsrechtlichen Sinne ist ausgeschlossen.

§ 7 Schlussbestimmungen
Nachträgliche Änderungen bedürfen zu ihrer Wirksamkeit der Schriftform.
`
    },
    'Übungsleiterpauschale': {
        title: "Vertrag über nebenberufliche Tätigkeit (Übungsleiterpauschale gem. § 3 Nr. 26 EStG)",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Auftraggeber“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Auftragnehmer/in“ genannt –
wird folgende Vereinbarung geschlossen:

§ 1 Tätigkeit und Rechtsstellung
Der/Die Auftragnehmer/in übernimmt ab dem ${data.startDate} im Auftrag des Auftraggebers nebenberufliche Betreuungs-, Ausbildungs-, Lehr- oder vergleichbare Tätigkeiten.
Die Tätigkeit wird als selbstständige Tätigkeit bzw. steuerbegünstigte nebenberufliche Tätigkeit im Sinne des § 3 Nr. 26 EStG ausgeübt. Ein abhängiges Arbeitsverhältnis oder sozialversicherungspflichtiges Beschäftigungsverhältnis wird hierdurch ausdrücklich nicht begründet.

§ 2 Vergütung
Als pauschalen Aufwendungsersatz und für die erbrachte Leistung erhält der/Die Auftragnehmer/in eine pauschale Vergütung in Höhe von ${data.lumpSumAmount?.toFixed(2) || '0.00'} EUR.
Die Vergütung ist gemäß § 3 Nr. 26 EStG (Übungsleiterfreibetrag) bis zur gesetzlichen Höchstgrenze von derzeit 3.000,00 Euro im Jahr steuer- und sozialversicherungsfrei.

§ 3 Steuerrechtliche Eigenverantwortung
Der/Die Auftragnehmer/in versichert, den Freibetrag von 3.000,00 Euro pro Kalenderjahr bei keinem anderen Träger bereits voll ausgeschöpft zu haben. Die Versteuerung von Beträgen, die diesen Freibetrag übersteigen, sowie die Abführung eventuell anfallender Sozialabgaben obliegen ausschließlich dem/der Auftragnehmer/in. Der Auftraggeber wird von jeglichen Nachzahlungsansprüchen Dritter (Finanzamt, Rentenversicherung etc.) vollumfänglich freigestellt. Sollte nachträglich ein abhängiges Beschäftigungsverhältnis rechtlich festgestellt werden, verzichtet der/die Auftragnehmer/in auf sämtliche hieraus resultierenden arbeitnehmerähnliche Ansprüche (Urlaub, Entgeltfortzahlung, Kündigungsschutz).

§ 4 Beendigung
Die Vereinbarung kann von beiden Parteien jederzeit ohne Angabe von Gründen und ohne Einhaltung einer Frist gekündigt werden. Ersatz- oder Abfindungsansprüche entstehen im Fall der Vertragsauflösung nicht.

§ 5 Datenschutz und Verschwiegenheit
Sämtliche als vertraulich gekennzeichneten Unterlagen und die personenbezogenen Daten zu Klienten unterliegen der strengsten Geheimhaltungspflicht. Eine Speicherung der Daten auf privaten Geräten bedarf der ausdrücklichen Genehmigung.

§ 6 Schlussbestimmungen
Mündliche Nebenabreden bestehen nicht. Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein, bleibt die Gültigkeit des Vertrages im Übrigen unberührt.
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
${data.employerAddress}
– nachfolgend „Verein/Träger“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Ehrenamtliche/r“ genannt –
wird in Abänderung der bestehenden Vereinbarung folgende Änderungsvereinbarung geschlossen:

§ 1 Inkrafttreten
Die nachfolgende Anpassung tritt mit Wirkung zum ${data.startDate} in Kraft.

§ 2 Aufwandsentschädigung (Ehrenamtspauschale)
Die pauschale Aufwandsentschädigung wird ab dem genannten Zeitpunkt auf ${data.lumpSumAmount?.toFixed(2) || '0.00'} EUR angepasst. Die Entschädigung wird als Ehrenamtspauschale im Sinne des § 3 Nr. 26a EStG gezahlt und ist bis zum gesetzlichen Freibetrag steuer- und sozialversicherungsfrei.

§ 3 Fortgeltung
Alle übrigen Bestimmungen der bestehenden Vereinbarung bleiben unverändert in Kraft. Änderungen bedürfen der Textform.
`
    },
    'Übungsleiterpauschale': {
        title: "Änderungsvereinbarung (Übungsleiterpauschale gem. § 3 Nr. 26 EStG)",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Auftraggeber“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Auftragnehmer/in“ genannt –
wird in Abänderung der bestehenden Vereinbarung folgende Änderungsvereinbarung geschlossen:

§ 1 Inkrafttreten
Die nachfolgende Anpassung tritt mit Wirkung zum ${data.startDate} in Kraft.

§ 2 Vergütung
Die pauschale Vergütung wird ab dem genannten Zeitpunkt auf ${data.lumpSumAmount?.toFixed(2) || '0.00'} EUR angepasst. Die Vergütung ist gemäß § 3 Nr. 26 EStG bis zur gesetzlichen Höchstgrenze steuer- und sozialversicherungsfrei.

§ 3 Fortgeltung
Alle übrigen Bestimmungen der bestehenden Vereinbarung bleiben unberührt und gelten unverändert fort. Änderungen bedürfen der Textform.
`
    },
    'Ehrenamtlich': {
        title: "Änderungsvereinbarung zur Ehrenamtsvereinbarung",
        text: (data) => `Zwischen
${data.employerName}
${data.employerAddress}
– nachfolgend „Verein/Träger“ genannt –
und
Herrn/Frau ${data.employeeName}
${data.employeeAddress}
– nachfolgend „Ehrenamtliche/r“ genannt –
wird mit Wirkung zum ${data.startDate} folgende Anpassung der ehrenamtlichen Tätigkeit vereinbart:

§ 1 Anpassung der Vereinbarung
Die Parteien vereinbaren mit Wirkung zum ${data.startDate} eine Anpassung der Rahmenbedingungen der ehrenamtlichen Tätigkeit. Die Tätigkeit erfolgt weiterhin freiwillig und unentgeltlich.

§ 2 Fortgeltung
Alle übrigen Bestimmungen der bestehenden Ehrenamtsvereinbarung bleiben unverändert in Kraft.
`
    }
};

export function getContractTemplate(data: ContractData): { title: string; text: (data: ContractData) => string } {
    if (data.documentKind === 'Änderungsvereinbarung') {
        return AmendmentTemplates[data.contractType] || AmendmentTemplates['Minijob'];
    }
    return ContractTemplates[data.contractType] || ContractTemplates['Ehrenamtlich'];
}

