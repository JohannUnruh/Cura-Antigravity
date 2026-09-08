# ✅ TASKS: Mehrfachverträge & Verhältnis-Erkennung

## Phase 1 – SPEC
- [x] Anforderung von Johann aufgenommen (Verhältnis-Abgleich + gezielte Vertragsauswahl)
- [x] Befund im Altcode dokumentiert (singularer `contractType`, unbedingter Profil-Schreibzugriff)
- [x] Rechtsrahmen recherchiert (§ 3 Nr. 26 / 26a EStG独立, Minijob als eigenes Verhältnis)
- [x] Akzeptanzkriterien + Nicht-Ziele festgelegt

## Phase 2 – ARCHITECTURE & PLAN
- [x] Zweiteiliges Modell beschlossen (`contractType` primär + `contractTypes` alle)
- [x] Begründet, warum **keine** Datenmigration an lebenden Profilen
- [x] Schutzregel für abrechnungsrelevante Felder definiert
- [x] Wizard-Zweistufigkeit und Vorauswahl-Logie entworfen
- [ ] Folge-Idee: Vertragsart je Zeiterfassungs-Kontingent (heute: alles über das Primärverhältnis)

## Phase 3 – IMPLEMENT
- [x] `src/types/index.ts`: `contractTypes?`, `UserContractDocument.tasksDescription?`, `.primary?`
- [x] `src/lib/contracts/relationships.ts` neu (reine Logik, 12 Exporte)
- [x] `settings/page.tsx`: Schritt-1-Kacheln, `selectContractType()`, Deckungshinweise,
      Doku-Links je Art, Badge-Zeile auf den Benutzerkarten
- [x] `handleGenerateContract()` auf `buildContractDocument()` + `buildContractProfileUpdate()` umgestellt
- [x] Vorbelegung `buildContractFormDefaults()` typgeführt (Profilwerte nur für den Primärtyp)
- [x] Rechtstexte der Vorlagen **unverändert** gelassen
- [x] Kein toter Code, keine halbfertigen Pflegetexte

## Phase 4 – VERIFY
- [x] Suite „Multi-Contract: Rechtsverhältnisse & Abrechnungsschutz" (11 Fälle) ergänzt
- [x] Gesamtsuite grün: 112/112 (vorher 86 → +15 Scope, +11 Multi-Contract)
- [x] `npm run lint`: 0 Fehler, 0 Warnungen
- [x] `npm run build`: fehlerfrei
- [x] Grep auf hartkodierte Datumsliterale: in dieser Änderung **leer** (einziger Bestandstreffer
      `family-helper/[caseId]/page.tsx` = Monatsnamenliste, nicht angefasst)
- [ ] **Manueller Online-Test durch Johann:** Minijobberin bekommt zusätzlich einen
      Übungsleitervertrag → zwei Dokumente, Minijob-Stundensatz und -Beleg unverändert

## Phase 5 – REVIEW
- [x] Unabhängiges Diff-Review durch Alfons (Qwen Code) – dabei gefunden und behoben:
      fehlende Tests für die neue Logik (10 Lint-Warnungen wegen unbenutzter Importe)
- [x] Doku SPEC/ARCHITECTURE/TASKS vervollständigt (der beauftragte Agent war vor der Doku
      abgebrochen)
- [ ] Nach Johanns Online-Test: `firestore.rules`-Frage aus `dashboard-privacy-scope/DECISIONS.md`
      entscheiden
