# Backlog

Hier werden Aufgaben gesammelt, die der **Night Agent** autonom abarbeitet.

## Format

Jeder Eintrag folgt diesem Schema:

```markdown
### [Priorität] Aufgaben-Titel
- **Status:** pending | in-progress | done | blocked
- **Beschreibung:** Kurze, klare Beschreibung der Aufgabe
- **Akzeptanzkriterien:** Woran erkennt man, dass die Aufgabe erledigt ist?
- **Betroffene Dateien:** Welche Dateien sind relevant?
- **Hinweise:** Zusätzliche Infos, Fallstricke, Kontext
```

### Prioritäten

| Priorität | Bedeutung |
|-----------|-----------|
| `P0` | Kritisch – sofort erledigen |
| `P1` | Hoch – wichtige Funktion, bald erledigen |
| `P2` | Mittel – kann in späteren Zyklen kommen |
| `P3` | Niedrig – wenn Zeit übrig ist |

---

## Backlog

<!-- Trage hier neue Aufgaben ein. Der Night Agent arbeitet sie der Priorität nach ab. -->

### Beispiel: P2 – Lesezeichen-Funktion für Klienten
- **Status:** pending
- **Beschreibung:** Nutzer sollen Klienten als Favorit markieren können
- **Akzeptanzkriterien:** Stern-Icon im Klienten-Profil, Favoriten-Liste in der Sidebar, Persistenz in Firestore
- **Betroffene Dateien:** `src/app/clients/page.tsx`, `src/components/ui/ClientCard.tsx`, Firestore Collection `users/{uid}/favorites`
- **Hinweise:** Firestore Security Rules für die neue Collection nicht vergessen

---

## Abgeschlossene Aufgaben

<!-- Der Night Agent verschiebt erledigte Aufgaben hierher mit Datum -->

<!--
### [P1] Beispiel-Aufgabe – ✅ 2026-04-13
- **Status:** done
- **Beschreibung:** ...
-->
