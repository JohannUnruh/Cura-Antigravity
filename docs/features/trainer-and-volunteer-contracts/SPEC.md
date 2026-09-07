# 📋 SPEC: Vertragsvorlagen für Übungsleiter & Ehrenamtliche Mitarbeiter

## 1. Problemstellung & Kontext

In der Cura App (Projekt `zefabiko-cura` des Seelsorgevereins „Zentrum für Familienberatung nach biblischen Konzepten e.V.“) wurde am 06.09.2026 die Vertragsgenerierung für Minijobs inkl. monatlicher Arbeitszeit und Änderungsvereinbarungen produktiv geschaltet.

Für die beiden weiteren tragenden Säulen der gemeinnützigen Vereinsarbeit:
1. **Übungsleiter** (nebenberufliche Betreuung/Lehre gem. § 3 Nr. 26 EStG bis 3.000 € steuerfrei jährlich)
2. **Ehrenamtliche Mitarbeiter** (Tätigkeiten gem. § 3 Nr. 26a EStG bis 840 € Ehrenamtspauschale jährlich sowie unentgeltliche Ehrenämter)

fehlten bisher die echten, rechtssicheren Vereinsvorlagen. Johann hat am 07.09.2026 die beiden verbindlichen Word-Vorlagen des Vereins bereitgestellt:
* `Vorlage Vertrag Übungsleiter.docx`
* `Vorlage Vertrag ehrenamtliche.docx`

Diese müssen vollständig, mit allen rechtlichen Klauseln, Aufgaben, Freibetrags-Erklärungen und flexiblen Parametern (Monatsstunden, Aufwandsentschädigung, Aufgaben, Geburtsdatum) in das digitale Vertragssystem der Cura App integriert werden.

---

## 2. Rechtliche Grundlagen & Compliance

### 2.1 Übungsleitervertrag (§ 3 Nr. 26 EStG)
* **Rechtsnatur:** Nebenberufliche Tätigkeit für eine gemeinnützige Körperschaft zur Förderung gemeinnütziger, mildtätiger oder kirchlicher Zwecke.
* **Steuer- & Sozialversicherungsfreiheit:** Bis zu **3.000 EUR pro Kalenderjahr** (Übungsleiterfreibetrag).
* **Pflichtangaben:** 
  * Monatliche Arbeitszeit (z. B. 8,6 Stunden/Monat)
  * Monatliche Aufwandsentschädigung (z. B. 125,00 EUR)
  * Mitteilungspflicht bei weiteren Tätigkeiten (§ 3 Nr. 26 EStG)
  * Verschwiegenheitspflicht über vertrauliche Daten und Seelsorgegeheimnis
  * Kündigungsfrist (vier Wochen zum 15. oder Monatsende)
  * **Erklärung der tätigen Person:** Verbindliche Selbsterklärung über die Nicht-Ausschöpfung des Freibetrags bei anderen Trägern.

### 2.2 Ehrenamtsvertrag / Ehrenamtspauschale (§ 3 Nr. 26a EStG)
* **Rechtsnatur:** Ehrenamtliche nebenberufliche Mitarbeit für den Verein (z. B. Kassenprüfung, Freizeiten-Organisation, Beratung).
* **Steuer- & Sozialversicherungsfreiheit:** Bis zu **840 EUR pro Kalenderjahr** (Ehrenamtsfreibetrag gem. § 3 Nr. 26a EStG).
* **Pflichtangaben:**
  * Konkrete Aufgabenbereiche (Aufgabenliste)
  * Aufwandsentschädigung (z. B. 440 EUR einmalig + 400 EUR bis Jahresende bzw. pauschal/monatlich/jährlich; bei 0 EUR unentgeltlich)
  * Mitteilungspflicht bei Überschreitung / weiteren Tätigkeiten
  * Verschwiegenheitspflicht und Datenschutz
  * Kündigungsfrist
  * **Erklärung der tätigen Person:** Bestätigung der Inanspruchnahme der Ehrenamtspauschale.

### 2.3 Schriftform vs. Textform (BEG IV & NachwG)
* Da es sich bei beiden Vertragsarten um **unbefristete nebenberufliche Tätigkeiten** (ohne Befristung nach TzBfG § 14 Abs. 4) bzw. Auftrags-/Ehrenamtsverhältnisse handelt, gilt nach BGB § 126b die **Textform**.
* Die beidseitige digitale Signatur (Vorstand + tätige Person auf dem Tablet) mit manipulationssicherer PDF-Ablage im Firebase Storage erfüllt alle rechtlichen Vorgaben.

---

## 3. User Stories & Akzeptanzkriterien

### User Story 1: Übungsleitervertrag generieren
* **Als** Admin/Vorstand
* **möchte ich** für einen Mitarbeiter mit Vertragsart `Übungsleiterpauschale` direkt aus den Einstellungen einen Vertrag generieren,
* **damit** die monatliche Arbeitszeit (z. B. 8,6 Std.), die monatliche Aufwandsentschädigung (z. B. 125 €), die Tätigkeit und die gesetzliche Freibetrags-Erklärung (§ 3 Nr. 26 EStG) automatisch in das ZeFabiKo-Layout gerendert und beidseitig unterzeichnet werden können.

### User Story 2: Vertrag für ehrenamtliche Mitarbeiter generieren
* **Als** Admin/Vorstand
* **möchte ich** für einen ehrenamtlichen Mitarbeiter einen Vertrag generieren,
* **damit** die konkreten Aufgaben (z. B. Kassenprüfung, Freizeiten-Organisation), die Aufwandsentschädigung (§ 3 Nr. 26a EStG bis 840 €) und die Freibetrags-Erklärung im offiziellen Vereinswortlaut als PDF erstellt werden.

### User Story 3: Änderungsvereinbarungen für beide Arten
* **Als** Admin/Vorstand
* **möchte ich** auch für Übungsleiter und Ehrenamtliche bei Anpassung von Stunden oder Aufwandsentschädigung eine schlanke Änderungsvereinbarung erstellen können.

---

## 4. Akzeptanzkriterien

1. **Vorlage Übungsleiter:**
   * Text entspricht 1:1 der bereitgestellten Vorlage `Vorlage Vertrag Übungsleiter.docx`.
   * Ausweisung von Monatstunden, monatlicher Aufwandsentschädigung (§ 3 Nr. 26 EStG), 3.000 € Höchstgrenze, Verschwiegenheit und Selbsterklärung.
2. **Vorlage Ehrenamtliche:**
   * Text entspricht 1:1 der Vorlage `Vorlage Vertrag ehrenamtliche.docx`.
   * Ausweisung von Aufgaben, Aufwandsentschädigung (§ 3 Nr. 26a EStG bis 840 € bzw. unentgeltlich), Verschwiegenheit und Selbsterklärung.
3. **UI / Modal:**
   * Formular im Modal passt sich intelligent an den Vertragstyp an (Monatsstunden & Aufwandsentschädigung bei Übungsleiter; Aufgaben & Aufwandsentschädigung bei Ehrenamtlichen).
   * Optionales Geburtsdatum (`geb. am TT.MM.JJJJ`) und Tätigkeitsbezeichnung.
4. **PDF-Layout:**
   * Saubere Formatierung mit Header- und Footer-Gradient, DIN-5008-Währungsangaben, Unterschriftenfeldern und Erklärung.
5. **QA & Regression:**
   * 100 % Bestehen aller bestehenden Tests (83/83) + neue Unit-Tests für beide Vertragsvorlagen.
   * `npm run lint` 0 Fehler, `npm run build` fehlerfrei.
   * Keine Datums-Hardcodings im Code.
