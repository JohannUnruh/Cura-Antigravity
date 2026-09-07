# 🏗️ ARCHITECTURE: Übungsleiter- und Ehrenamtsvertragsvorlagen

## 1. Datenmodell & Typdefinitionen (`src/types/index.ts` & `src/lib/contracts/templates.ts`)

### 1.1 `ContractType`
Die bestehenden Typen bleiben voll rückwärtskompatibel erhalten:
```typescript
export type ContractType = 'Ehrenamtlich' | 'Ehrenamtspauschale' | 'Übungsleiterpauschale' | 'Minijob';
```
* `'Übungsleiterpauschale'`: Generiert den `Vertrag für „Übungsleiter“` gem. § 3 Nr. 26 EStG.
* `'Ehrenamtspauschale'` & `'Ehrenamtlich'`: Generiert den `Vertrag für „ehrenamtliche“ Mitarbeiter` (bei Aufwandsentschädigung gem. § 3 Nr. 26a EStG, bei 0 EUR unentgeltlich).

### 1.2 Erweiterung von `ContractData`
```typescript
export interface ContractData {
    employerName: string;
    employerAddress: string;
    employerCity?: string;
    employeeName: string;
    employeeAddress: string;
    employeeBirthDate?: string;       // z. B. "23.02.1985" (für "geb. am ...")
    employeeGender?: 'Männlich' | 'Weiblich';
    startDate: string;                 // Vertragsbeginn
    endDate?: string;                  // Unbefristet wenn leer
    weeklyHours?: number;
    monthlyHours?: number;             // Monatliche Arbeitszeit (z. B. 8,6 Std.)
    hourlyRate?: number;
    lumpSumAmount?: number;            // z. B. 125 € (Übungsleiter) oder 840 € bzw. 440 € (Ehrenamt)
    monthlyEarningsLimit?: number;
    vacationDaysPerYear?: number;
    contractType: ContractType;
    documentKind?: DocumentKind;        // 'Vertrag' | 'Änderungsvereinbarung'
    activityDescription?: string;      // z. B. "Organisationsbeauftragte und Kassenprüferin"
    tasksDescription?: string;         // Aufgabenliste bei Ehrenamtlichen
    boardSignatureUrl: string;
    employeeSignatureUrl: string;
}
```

---

## 2. Template-Engine (`src/lib/contracts/templates.ts`)

### 2.1 Übungsleitervertrag (`ContractTemplates['Übungsleiterpauschale']`)
* Titel: `Vertrag für „Übungsleiter“`
* Wording exakt nach `Vorlage Vertrag Übungsleiter.docx`:
  * Parteien: Verein („Einrichtung“) vs. tätige Person mit optionalem Geburtsdatum.
  * § 1 Tätigkeit & Beginn (`ab dem ${startDate} eine nebenberufliche Tätigkeit als ${activityDescription}`)
  * § 2 Arbeitszeit (`arbeitet ${monthlyHours} Stunden im Monat`)
  * § 3 Aufwandsentschädigung (`monatlich ${lumpSumAmount} € steuer- und sozialversicherungsfrei gemäß § 3 Nr. 26 EStG`)
  * § 4 Höchstgrenze (`maximal 3.000 € betragen darf...`)
  * § 5 Verschwiegenheit & Datenschutz
  * § 6 Unbestimmte Dauer & Kündigungsfrist (vier Wochen zum 15. oder Monatsende)
  * Selbsterklärung der tätigen Person zur Inanspruchnahme der Übungsleiterpauschale

### 2.2 Ehrenamtsvertrag (`ContractTemplates['Ehrenamtlich']` & `ContractTemplates['Ehrenamtspauschale']`)
* Titel: `Vertrag für „ehrenamtliche“ Mitarbeiter`
* Wording exakt nach `Vorlage Vertrag ehrenamtliche.docx`:
  * Parteien: Einrichtung vs. tätige Person
  * § 1 Tätigkeit & Beginn
  * § 2 Aufgaben (Aufzählung von Aufgaben)
  * § 3 Aufwandsentschädigung gem. § 3 Nr. 26a EStG bis 840 € bzw. unentgeltlich
  * § 4 Höchstgrenze (maximal 840 €) & Mitteilungspflicht
  * § 5 Verschwiegenheit & Datenschutz
  * § 6 Dauer & Kündigungsfrist
  * Selbsterklärung der tätigen Person zur Inanspruchnahme der Ehrenamtspauschale

### 2.3 Änderungsvereinbarungen (`AmendmentTemplates`)
* Aktualisierung der Änderungsvereinbarungen für Übungsleiter und Ehrenamtliche mit Bezug auf die jeweiligen Vorlagentexte.

---

## 3. UI-Integration (`src/app/settings/page.tsx`)

* Das Modal `isContractModalOpen` blendet formularspezifische Felder kontextbezogen ein:
  * **Bei Übungsleiterpauschale:**
    * Monatliche Arbeitszeit (Std./Monat, Default: `8.6`)
    * Monatliche Aufwandsentschädigung (€/Monat, Default: `125`)
    * Tätigkeit (Default: `Organisationsbeauftragte und Kassenprüferin` oder Benutzerrolle)
    * Geburtsdatum (optional)
  * **Bei Ehrenamtlich / Ehrenamtspauschale:**
    * Aufwandsentschädigung (€, z. B. `840` oder `440`, `0` für rein unentgeltlich)
    * Tätigkeit (Default: `ehrenamtliche/r Mitarbeiter/in des Vereins`)
    * Aufgabenbereich (mehrzeiliges Textfeld mit vorausgefüllten Standardaufgaben)
    * Geburtsdatum (optional)
  * **Bei Minijob:**
    * Unverändert: Stundenlohn, Monatsgehalt (603 €), automatischer Monatsstundenrechner (36 h).

---

## 4. PDF-Generator (`src/lib/contracts/generator.ts`)

* Auswertung von Zwischenüberschriften und Erklärungen (`§` und `Erklärung der tätigen Person`) mit Fettschrift und angepasstem Spacing.
* DIN-5008-konforme Beträge und saubere Zeilenumbrüche für Aufzählungszeichen (`•`, `[X]`).
* Unterschriftenbereich und Gradient-Design bleiben einheitlich.
