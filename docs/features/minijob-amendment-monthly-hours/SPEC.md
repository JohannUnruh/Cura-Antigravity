# 📋 SPEC: Minijob-Änderungsvereinbarung & Monatliche Arbeitszeitberechnung

## 1. Rechtliche Prüfung (Legal Assessment)

### 1.1 Fragestellung
Ist es nach deutschem Arbeitsrecht zulässig, für geringfügig Beschäftigte (Minijobber) Arbeitsverträge und Änderungsvereinbarungen digital (z. B. auf einem Tablet unterzeichnet und als PDF gespeichert/übermittelt) rechtswirksam abzuschließen?

### 1.2 Rechtliche Bewertung & Gesetzeslage

#### A. Grundsatz der Formfreiheit (§ 105 GewO, § 611a BGB)
Im deutschen Zivil- und Arbeitsrecht gilt für Arbeitsverträge der Grundsatz der **Formfreiheit**. Ein Arbeitsvertrag oder eine Vertragsänderung bedarf zu seiner zivilrechtlichen Wirksamkeit grundsätzlich keiner bestimmten Form; er kann mündlich, schriftlich, in Textform oder elektronisch geschlossen werden.

#### B. Gesetzliche Ausnahme: Befristungen (§ 14 Abs. 4 TzBfG)
Die Befristung eines Arbeitsverhältnisses bedarf zu ihrer Wirksamkeit der strengen **Schriftform** (§ 126 BGB mit eigenhändiger Namensunterschrift auf Papier).
* **Befund im vorliegenden Fall:** Die Verträge des Seelsorgevereins sind ausdrücklich **unbefristet** („unbegrenzt auf Zeit“).
* **Rechtsfolge:** Das Schriftformerfordernis des § 14 Abs. 4 TzBfG greift **nicht**.

#### C. Nachweisgesetz (NachwG) & Bürokratieentlastungsgesetz IV (BEG IV)
* **Rechtslage bis 31.12.2024:** Das Nachweisgesetz verlangte, dass die wesentlichen Vertragsbedingungen schriftlich (eigenhändig auf Papier unterzeichnet) ausgehändigt werden mussten. Ein Verstoß berührte zwar nicht die Wirksamkeit des Vertrages, konnte aber bußgeldbewehrt sein.
* **Rechtslage seit 01.01.2025 (Inkrafttreten des BEG IV):**
  Mit dem Vierten Bürokratieentlastungsgesetz (BEG IV) wurde § 2 Abs. 1 NachwG grundlegend reformiert:
  * Der Nachweis der wesentlichen Vertragsbedingungen kann nun in **elektronischer Form / Textform** (§ 126b BGB) erfolgen.
  * Voraussetzungen für die digitale Erteilung:
    1. Das Dokument muss für den Arbeitnehmer zugänglich sein.
    2. Es muss speicherbar und ausdruckbar sein (z. B. als PDF).
    3. Der Arbeitgeber fordert den Arbeitnehmer mit der Übermittlung auf, einen Empfangsnachweis zu erteilen.
  * **Ausnahmen nach § 2a SchwarzArbG:** Die Ausnahme für Wirtschaftsbereiche mit erhöhtem Schwarzarbeitsrisiko (Bau, Fleischwirtschaft, Gastronomie, Schausteller etc.) betrifft gemeinnützige Seelsorge- und Fördervereine nicht.
  * **Mitarbeiterrecht:** Der Mitarbeiter kann verlangen, dass ihm ein schriftlicher Nachweis auf Papier ausgehändigt wird.

#### D. Änderungsvereinbarungen (§ 3 NachwG)
Für Änderungen wesentlicher Vertragsbedingungen (wie Erhöhung des Stundenlohns, Anpassung der monatlichen Arbeitszeit oder Anhebung des Monatsgehalts) gilt nach § 3 NachwG dieselbe Formerleichterung: Die Unterzeichnung auf dem Tablet mit beiderseitigen Unterschriften und Erzeugung eines PDF-Dokuments erfüllt alle Anforderungen des BGB und des reformierten NachwG vollständig.

#### E. Fazit der Rechtsprüfung
👉 **Ergebnis:** Das digitale Anlegen, Unterzeichnen auf dem Tablet und Speichern von **unbefristeten Minijob-Arbeitsverträgen sowie Änderungsvereinbarungen** ist in der Cura App **rechtlich uneingeschränkt zulässig und rechtswirksam**.

---

## 2. Fachliche Anforderungen (Business Requirements)

### 2.1 Umstellung von Wochenstunden auf monatliche Arbeitszeit
* **Bisher:** Eingabe von Monatsgehalt und Stundenlohn errechnete wöchentliche Stunden: `(lumpSum / hourlyRate) / 4.33`.
* **Neu:**
  * Primäre Rechengröße und Vertragsangabe ist die **monatliche Arbeitszeit**.
  * **Formel:** `monatliche Arbeitszeit = Monatsverdienst / Stundenlohn`
  * **Berechnungsbeispiel:** 
    * Verdienstgrenze / Monatsgehalt: `603,00 €`
    * Stundenlohn: `16,75 €`
    * Monatliche Arbeitszeit: `603 / 16,75 = 36,00 Stunden/Monat`
  * Ergänzende informative Anzeige der wöchentlichen Arbeitszeit (`monatliche Arbeitszeit / 4.33 ≈ 8,31 Std./Woche`).
  * Im Vertragstext für Minijobs (§ 3 und § 4) wird die monatliche Arbeitszeit verbindlich ausgewiesen.

### 2.2 Einführung der „Änderungsvereinbarung“
* **Dokumentenart:** Umschaltbar zwischen `Arbeitsvertrag` und `Änderungsvereinbarung`.
* **Direktzugriff im UI:**
  * Auf der Benutzer-Karte unter *Moduleinstellungen > Benutzer*: Buttons für `Vertrag` und `Änderungsvereinbarung`.
  * Im Modal: Segmentierter Umschalter (`Arbeitsvertrag` vs. `Änderungsvereinbarung`).
* **Inhalt der Änderungsvereinbarung für Minijob:**
  * Titel: *Änderungsvereinbarung zum Arbeitsvertrag für geringfügig entlohnte Beschäftigte (Minijob)*
  * Wirksamkeitsdatum (Startdatum der Änderung)
  * Bezug auf bestehendes Arbeitsverhältnis
  * Neuregelung der monatlichen Arbeitszeit (§ 2)
  * Neuregelung von Stundenlohn und Monatsgehalt unter Beachtung der Minijob-Grenze (§ 3)
  * Fortgeltung aller sonstigen Bestimmungen des bestehenden Vertrages
  * Schlussbestimmungen (Textform)
  * Beiderseitige Unterschriften auf dem Tablet (Vorstand / Träger und Mitarbeiter)
* **Dokumenten-Historie:**
  * Bestehende Verträge werden nicht überschrieben, sondern in einer Dokumentenliste (`contractDocuments`) chronologisch abgelegt.
  * Volle Abwärtskompatibilität über `contractDocumentUrl`.
  * Anzeige und Download aller Dokumente (Vertrag + Nachträge) direkt in der Benutzerkarte.

---

## 3. Akzeptanzkriterien
1. **Rechtssicherheit:** Die generierten PDFs enthalten alle nach BGB und NachwG notwendigen Mindestbestandteile für unbefristete Minijobs und Änderungsvereinbarungen.
2. **Berechnung:** Bei Eingabe von `603,00 €` Monatsgehalt und `16,75 €` Stundenlohn resultiert eine monatliche Arbeitszeit von exakt `36,00` Stunden.
3. **Template & PDF:** 
   * Vertrag weist monatliche Arbeitszeit aus.
   * Änderungsvereinbarung wird als eigenständiges, formvollendetes PDF mit Logo, Parteien, Text und beiden Unterschriften generiert.
4. **UX & Tablet:** Beide Unterschriftenfelder funktionieren per Touch/Stylus auf dem Tablet; Validierung verhindert Speichern ohne Unterschriften.
5. **Multi-Dokumenten-Verwaltung:** Mitarbeiter mit ursprünglichem Vertrag und nachfolgender Änderungsvereinbarung behalten Zugriff auf beide Dokumente.
6. **Code-Qualität & Zero Tolerance:** `npm run lint` und `npm run build` laufen fehlerfrei durch; keine Datums-Hardcodings im Produktivcode.
