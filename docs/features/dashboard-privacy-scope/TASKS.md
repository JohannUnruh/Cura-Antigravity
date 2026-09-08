# ✅ TASKS: Privatsphären-Scope im Dashboard

## Phase 1 – SPEC
- [x] Befund verifiziert (UI-Gating auf `role === 'Admin'`, Rules mit `|| isAdmin()`)
- [x] Personenbezogene Blöcke im `all`-Modus inventarisiert
- [x] Akzeptanzkriterien festgehalten

## Phase 2 – ARCHITECTURE & PLAN
- [x] Schichtmodell definiert: Filterung zwischen Service und State
- [x] Typparantie der Aggregations-Eingabe beschlossen
- [x] Konsequenzen für `firestore.rules` bewertet → bewusst keine Änderung (`DECISIONS.md`)

## Phase 3 – IMPLEMENT
- [x] `src/lib/utils/dataScope.ts` neu (reine, testbare Funktionen)
- [x] `src/app/page.tsx`: Verbandszweig ohne Klientenladen, `scopeRecords()` vor jedem `setData`
- [x] Personenbezogene Blöcke an `!isAssociationView` gebunden
- [x] Kachel „Eigene Klienten" → „Erfasste Beratungen" (Kennzahl statt Personenwert)
- [x] Titel/Untertitel/Info-Text auf „Anonymisierte Verbandsstatistik" umgestellt
- [x] Kein toter Code, keine halbfertigen Pflegetexte

## Phase 4 – VERIFY
- [x] `tests/dataScope.test.ts` (15 Fälle) in `tests/run-tests.ts` registriert
- [x] Gesamtsuite grün: 112/112
- [x] `npm run lint`: 0 Fehler, 0 Warnungen
- [x] `npm run build`: fehlerfrei
- [x] Grep auf hartkodierte Datumsliterale: in dieser Änderung **leer** (einziger Bestandstreffer
      `family-helper/[caseId]/page.tsx` = Monatsnamenliste, nicht angefasst)
- [ ] **Manueller Online-Test durch Johann** (Admin-Account): Verbandsansicht zeigt keine Namen
      und keine Detail-Links; eigene Ansicht unverändert

## Phase 5 – REVIEW
- [x] Diff-Review durch Alfons (Qwen Code) unabhängig vom Implementierer
- [x] Doku vervollständigt (SPEC/ARCHITECTURE/TASKS/DECISIONS)
- [ ] Folge-Sprint „Aggregation aus `time_entries`" bei gewünschter Rules-Verschärfung
