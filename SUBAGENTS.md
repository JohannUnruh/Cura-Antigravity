# 🤖 Subagents in Cura-Antigravity

Diese Datei beschreibt die Verwendung von Subagents innerhalb des Antigravity-Frameworks für das Cura-Projekt. Subagents helfen dabei, komplexe, zeitaufwendige oder klar abgegrenzte Aufgaben parallel und fokussiert im Hintergrund abzuarbeiten.

---

## 📌 Standard-Subagents (System)

Diese Subagents sind im Framework vordefiniert und immer direkt einsatzbereit.

### 1. `research`
* **Rolle**: Codebase Researcher
* **Beschreibung**: Besitzt ausschließlich Lese-Werkzeuge. Ideal, um die Codebase zu analysieren, Querverbindungen zu suchen oder Dokumentationen zu lesen, ohne das Risiko von Codeänderungen.
* **Typischer Prompt**: *"Finde alle Stellen im Projekt, an denen `ClientCard` importiert oder gerendert wird und liste die Props auf."*

### 2. `self`
* **Rolle**: Eigenes Duplikat (Vollwertiger Agent)
* **Beschreibung**: Erbt die gesamte Konfiguration des Hauptagenten (inklusive Schreibrechten und Befehlsausführung). Perfekt, um langwierige Aufgaben (wie einen Test-Build) auszulagern, während der Hauptagent weiterarbeitet.

---

## 🛠️ Benutzerdefinierte Subagents (Rezepte)

Diese Subagents können vom KI-Agenten zur Laufzeit über das Tool `define_subagent` deklariert und danach via `invoke_subagent` gestartet werden.

### 1. `TypescriptFixer`
* **Rolle**: TypeScript & Linter Specialist
* **Berechtigungen**: Schreibrechte aktiv (`enable_write_tools: true`)
* **System-Prompt**:
  > Du bist ein Spezialist für die Behebung von TypeScript- und ESLint-Fehlern in Next.js-Anwendungen. Dein Ziel ist es, Typenfehler und Linter-Warnungen auf eine saubere, typensichere Weise zu beheben. Verwende niemals `any` als Typisierung, sondern nutze präzise Schnittstellen oder das Pattern `as unknown as { ... }` für Firebase-Typen, falls nötig. Führe nach jeder Änderung `npm run lint` aus, um die Korrektheit zu prüfen.

### 2. `FirebaseValidator`
* **Rolle**: Firebase Security & Rule Auditor
* **Berechtigungen**: Leserechte aktiv
* **System-Prompt**:
  > Du prüfst Änderungen an Firestore- und Cloud Storage-Sicherheitsregeln. Du verifizierst, dass alle Zugriffe authentifiziert sind und Schreibrechte nur für die eigenen Dokumente der Nutzer existieren. Du analysierst die `firestore.rules` und `storage.rules` im Vergleich zu den Datenmodellen in `src/types/index.ts`.

### 3. `DeploymentAssistant`
* **Rolle**: Release & Deployment Validator
* **Berechtigungen**: Schreibrechte aktiv (`enable_write_tools: true`)
* **System-Prompt**:
  > Du bereitest das Deployment für Firebase App Hosting und Firebase Cloud Functions vor. Du stellst sicher, dass `npm run lint` und `npm run build` fehlerfrei durchlaufen, dass `tsconfig.json` das Verzeichnis `functions/` korrekt ausschließt, und baust die Functions im `functions/`-Ordner separat.

---

## 🔄 Wie funktioniert die Arbeit mit Subagents?

1. **Autonome Steuerung durch die KI**: Als menschlicher Benutzer musst du diese Subagents **nicht** selbst initialisieren, konfigurieren oder über Befehle aufrufen.
2. **Dein Workflow**: Du gibst mir (dem Hauptagenten) einfach deinen Auftrag (z. B. *"Setze Ticket P1 um"* oder *"Recherchiere das Problem und behebe es"*).
3. **Delegation**: Wenn die Aufgabe groß oder komplex ist, entscheide ich autonom im Hintergrund, ob ich einen Subagenten definiere (`define_subagent`) und ihn mit der Teilaufgabe beauftrage (`invoke_subagent`).
4. **Berichterstattung**: Der Subagent arbeitet autark, und ich erhalte eine Benachrichtigung, sobald er fertig ist oder Zwischenergebnisse hat, die ich dann in unsere Konversation einfließen lasse.
