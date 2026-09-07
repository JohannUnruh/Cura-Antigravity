# 📝 TASKS: Übungsleiter- und Ehrenamtsvertragsvorlagen

- [x] **Task 1: Typen & Datenmodell erweitern**
  - [x] `ContractData` in `src/lib/contracts/templates.ts` um `employeeBirthDate`, `activityDescription`, `tasksDescription` erweitern
  - [x] `UserProfile` in `src/types/index.ts` optional um `birthDate`, `activityDescription` erweitern (rückwärtskompatibel)

- [x] **Task 2: Vertragstemplates nach den Word-Vorlagen implementieren**
  - [x] `ContractTemplates['Übungsleiterpauschale']` mit dem vollständigen Wortlaut aus `Vorlage Vertrag Übungsleiter.docx` ausstatten (Monatsstunden, Aufwandsentschädigung § 3 Nr. 26 EStG, 3.000 € Höchstgrenze, Verschwiegenheit, Kündigung, Selbsterklärung)
  - [x] `ContractTemplates['Ehrenamtlich']` & `ContractTemplates['Ehrenamtspauschale']` mit dem Wortlaut aus `Vorlage Vertrag ehrenamtliche.docx` ausstatten (Aufgabenliste, Aufwandsentschädigung § 3 Nr. 26a EStG / unentgeltlich, 840 € Höchstgrenze, Verschwiegenheit, Kündigung, Selbsterklärung)
  - [x] `AmendmentTemplates` für Übungsleiter und Ehrenamtliche entsprechend synchronisieren

- [x] **Task 3: PDF-Generator anpassen**
  - [x] Zwischenüberschriften (`§` und `Erklärung...`) und Aufzählungen (`•`, `[X]`) in `src/lib/contracts/generator.ts` typografisch hervorheben

- [x] **Task 4: UI & Modal in `src/app/settings/page.tsx` anpassen**
  - [x] Formularzustand `contractForm` um die neuen Felder (`activityDescription`, `tasksDescription`, `birthDate`) erweitern
  - [x] Formularfelder im Modal je nach ausgewähltem Vertragstyp dynamisch einblenden (Übungsleiter: Monatsstunden + Aufwandsentschädigung + Tätigkeit; Ehrenamt: Aufgaben + Aufwandsentschädigung + Tätigkeit)
  - [x] Vorbelegung in `openContractModal` intelligent steuern (z. B. 8,6 Std. & 125 € bei Übungsleiter, Standardaufgaben bei Ehrenamt)

- [x] **Task 5: Automatisierte Tests schreiben & Regression prüfen**
  - [x] Neue Tests in `tests/contracts.test.ts` für Übungsleiter- und Ehrenamtsverträge hinzufügen
  - [x] Testlauf via `npx tsx tests/run-tests.ts` ausführen (86/86 Tests grün)
  - [x] `npm run lint` & `npm run build` verifizieren (0 Fehler, 0 Warnungen)
  - [x] Grep auf hartkodierte Datums-Literale (0 Treffer in `src/`)

- [ ] **Task 6: Git Commit & Push**
  - [ ] Sauberen Git-Commit mit semantischer Message erstellen
  - [ ] Git Push auf `origin/main` ausführen

- [ ] **Task 7: Dokumentation & Benachrichtigung**
  - [ ] Antwortnotiz für Johann in `00_Inbox_Alfons/Antwort/` erstellen
  - [ ] Daily Log `2026-09-07.md` anlegen / aktualisieren
  - [ ] System herunterfahren wie beauftragt
