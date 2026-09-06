# 🏗️ ARCHITECTURE: Minijob-Änderungsvereinbarung & Monatliche Arbeitszeit

## 1. Übersicht & Schichtenmodell

```
[UI: settings/page.tsx]
    │  ├─ UserCard (Buttons: Vertrag / Änderungsvereinbarung, Dokumentenliste)
    │  ├─ ContractModal (Segmented Control: Vertrag vs. Änderungsvereinbarung)
    │  └─ CalculationEngine (Monatsverdienst 603 € / Stundenlohn 16,75 € => 36,00 h/Monat)
    │
    ├──> [Service: generator.ts & templates.ts]
    │       ├─ ContractTemplates (Minijob mit Monatsstunden)
    │       ├─ AmendmentTemplates (Änderungsvereinbarung Minijob)
    │       └─ jsPDF (Header, Gradient, 2 Signaturen, Layout)
    │
    ├──> [Firebase Storage]
    │       └─ `contracts/{userId}/(Vertrag|Aenderungsvereinbarung)_{timestamp}.pdf`
    │
    └──> [Firestore: users/{userId}]
            ├─ `contractDocuments`: UserContractDocument[]
            ├─ `contractDocumentUrl`: string (latest)
            ├─ `monthlyHours`: number
            ├─ `weeklyHours`: number
            └─ `hourlyRate`: number
```

---

## 2. Datenmodell (`src/types/index.ts`)

### 2.1 Neue Typen & Erweiterungen

```typescript
export type DocumentKind = 'Vertrag' | 'Änderungsvereinbarung';

export interface UserContractDocument {
    id: string;
    documentKind: DocumentKind;
    contractType: ContractType;
    title: string;
    url: string;
    createdAt: string; // ISO 8601
    effectiveDate: string; // Startdatum bzw. Wirksamkeitsdatum
    monthlyHours?: number;
    weeklyHours?: number;
    hourlyRate?: number;
    lumpSumAmount?: number;
}

export interface UserProfile {
    // ... bestehende Felder ...
    monthlyHours?: number; // Monatliche Sollarbeitszeit
    contractDocuments?: UserContractDocument[]; // Historie aller Verträge & Änderungsvereinbarungen
    contractDocumentUrl?: string; // Neuestes Dokument (Abwärtskompatibilität)
}
```

---

## 3. Template- & Generator-Design (`src/lib/contracts/`)

### 3.1 `ContractData` Interface
```typescript
export interface ContractData {
    employerName: string;
    employerAddress: string;
    employerCity?: string;
    employeeName: string;
    employeeAddress: string;
    startDate: string; // Vertragsbeginn oder Inkrafttreten der Änderung
    endDate?: string;
    monthlyHours?: number; // NEU: Monatliche Arbeitszeit
    weeklyHours?: number;  // Hilfswert: Durchschnittliche Wochenstunden
    hourlyRate?: number;
    lumpSumAmount?: number;
    monthlyEarningsLimit?: number;
    vacationDaysPerYear?: number;
    contractType: ContractType;
    documentKind?: DocumentKind; // NEU: 'Vertrag' | 'Änderungsvereinbarung'
    boardSignatureUrl: string;
    employeeSignatureUrl: string;
}
```

### 3.2 Minijob-Vertragstext (§ 3 & § 4)
* **§ 3 Arbeitszeit:**
  `Die regelmäßige monatliche Arbeitszeit beträgt ${data.monthlyHours || 0} Stunden (dies entspricht durchschnittlich ca. ${data.weeklyHours || 0} Stunden wöchentlich). Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen und wird vom Arbeitgeber nach billigem Ermessen festgelegt.`
* **§ 4 Vergütung:**
  `Der/Die Arbeitnehmer/in erhält einen Bruttostundenlohn in Höhe von ${data.hourlyRate?.toFixed(2) || '0.00'} EUR. Bei einer regelmäßigen monatlichen Arbeitszeit von ${data.monthlyHours || 0} Stunden ergibt sich ein monatliches Bruttoentgelt von ${(data.lumpSumAmount || 0).toFixed(2)} EUR. Es handelt sich um eine geringfügige Beschäftigung (§ 8 Abs. 1 Nr. 1 SGB IV). Die monatliche Vergütung darf die gesetzliche Geringfügigkeitsgrenze (derzeit ${data.monthlyEarningsLimit?.toFixed(2) || '603.00'} EUR) im regelmäßigen Durchschnitt nicht überschreiten.`

### 3.3 Vorlage für Änderungsvereinbarungen
* Dedizierte Funktion `getAmendmentTemplate(data: ContractData)`
* Titel: `"Änderungsvereinbarung zum Arbeitsvertrag für geringfügig entlohnte Beschäftigte (Minijob)"`
* Struktur:
  - Parteien: Arbeitgeber & Arbeitnehmer
  - Präambel: Bezugnahme auf bestehendes Arbeitsverhältnis
  - § 1 Inkrafttreten
  - § 2 Monatliche Arbeitszeit
  - § 3 Vergütung (Stundenlohn & Monatsbrutto unter Einhaltung der Minijob-Grenze)
  - § 4 Urlaubsanspruch (falls angegeben)
  - § 5 Fortgeltung des bestehenden Vertrages (alle sonstigen Bestimmungen bleiben unverändert in Kraft)
  - § 6 Schlussbestimmungen (Textform)
  - Unterschriftsblöcke mit Datum & Ort

---

## 4. Berechnungs-Engine (UI)

* **Inputs:**
  * `Monatsgehalt / Verdienstgrenze (€)` (`lumpSumAmount`): Default `appSettings.monthlyEarningsLimit` (603 €)
  * `Stundenlohn (€)` (`hourlyRate`): Default `selectedUser.hourlyRate` oder `appSettings.minimumWage` oder `16.75`
* **Formel:**
  ```typescript
  const monthlyHours = hourlyRate > 0 
      ? Math.round((lumpSumAmount / hourlyRate) * 100) / 100 
      : 0;
  const weeklyHours = Math.round((monthlyHours / 4.33) * 100) / 100;
  ```
* **Beispielprobe:**
  - `lumpSumAmount = 603`
  - `hourlyRate = 16.75`
  - `monthlyHours = 603 / 16.75 = 36.00 Stunden`
  - `weeklyHours = 36 / 4.33 = 8.31 Stunden/Woche`
* **Manuelle Anpassung:** Wenn der Nutzer `monthlyHours` manuell eintippt (z.B. 36), kann der Stundenlohn automatisch gegengerechnet werden (`lumpSumAmount / monthlyHours = 16.75 €`).

---

## 5. Sicherheit & DSGVO
* Keine unverschlüsselten PII im Code oder Git.
* PDFs werden in geschütztem Firebase Storage abgelegt (`contracts/{userId}/...`).
* Signaturen werden als temporäre Base64-Strings in das PDF gerendert und nicht als separate Bilddateien persistiert.
