# 📋 SPEC: Privatsphären-Scope im Dashboard-Filter „Gesamt-Verein"

## 1. Auslöser (Finding)

Johann hat am 08.09.2026 im produktiv genutzten Cura-Dashboard festgestellt: Schaltet er den
Ansichtsfilter auf „Gesamt-Verein", sieht er **Einträge anderer Mitglieder** – inklusive
Klientennamen und Link auf die Klientendetailseite.

**Präzisierung des Befunds (wichtig):** Es handelt sich **nicht** um ein kaputtes Access Control
gegenüber normalen Mitgliedern. Der Umschalter wird in `src/app/page.tsx` nur gerendert, wenn
`userProfile.role === 'Admin'`, und `firestore.rules` gewährt dem Admin gezielt Lesezugriff
(`|| isAdmin()`). Wirksam wurde also ein **bewusst eingebautes Admin-Recht** – das Johann für
diesen Anwendungsfall nicht will.

## 2. Warum das ein echtes Problem ist

Im `all`-Modus wurden geladen und gerendert:

| Block | Inhalt | Einstufung |
|---|---|---|
| Klienten-Karten | `client.name`, Link `/clients/[id]` | Art. 9 DSGVO (seelsorgerlich/therapeutisch) |
| Überfällige Zieltermine | Klientenname + `goalAgreement`-Freitext | Art. 9 DSGVO |
| Personengruppen-Chart | Verteilung über Klientendaten | Art. 9 DSGVO |

Seelsorge- und Beratungsdaten Dritter sind die sensibelste Datenkategorie der App. Ein
Verbands-Frontend, das sie mit Namen und Detaillinks darstellt, ist auch dann datenschutzrechtlich
schwierig, wenn der Zugriff formal vom Admin-Recht gedeckt ist.

## 3. Anforderung (Johann, wörtlich)

> „Der Filter darf die Einträge, die mir angezeigt werden, nicht vom gesamten Verein anzeigen.
> Nur meine eigenen. Da es hier um sensible Daten geht, will ich das nicht sehen."

## 4. Akzeptanzkriterien

1. Im „Gesamt-Verein"-Modus erscheint **keine** Personenkennung: kein Klientenname, kein
   Mitgliedername, keine Einzel-Datensatzzeile, kein Link auf eine Detailroute.
2. Der Modus liefert ausschließlich **aggregierte Kennzahlen** (Stunden, Fallzahlen,
   Teilnehmerzahlen, Kategorien) – ehrlich berechnet aus tatsächlich geladenen Daten (kein Fake-UI).
3. Klientendaten werden in diesem Modus **gar nicht erst angefragt** (`getAllClients()` entfällt).
4. Personenbezogene Blöcke (überfällige Zieltermine, Personengruppen, Klientenkarten) bleiben in
   der **eigenen** Ansicht unverändert erhalten.
5. **Defense in Depth:** Fremde Datensätze werden vor `setData(...)` aussortiert, sofern nicht
   explizit Verbandsansicht + Admin. Ein fremder Datensatz erreicht die UI nicht mehr.
6. Nicht-Admins sehen ausnahmslos nur eigene Daten – unabhängig davon, welcher Service wie viel
   zurückliefert.
7. Beschriftung: „Anonymisierte Verbandsstatistik" + **ein** kurzer Untertitel. Keine weiteren
   Warnhinweise im UI.
8. Bestehende Tests bleiben grün; neue Scope-Logik ist ohne React testbar abgedeckt.

## 5. Nicht-Ziele

- Keine Änderung der `firestore.rules` (Produktions deployment = Entscheidung des Vorstands,
  siehe `DECISIONS.md`).
- Kein Rollen-Refactoring, keine neue Berechtigungsfahne.
- Keine Anonymisierung anderer Module (Zeiterfassung, Reisen, Familie, Pflegekinder).
