# Anweisungen für Gemini

## Verhalten
- Antworte immer auf Deutsch in Textform
- Handle autonom – nicht jedes Detail rückfragen
- Vorschläge und Entscheidungen sind erwünscht

## Projektstruktur & Dokumentation

Die Projektdokumentation folgt einer strikten Struktur. **Bevor du arbeitest**, lies die relevanten Dateien:

| Datei | Zweck |
|-------|-------|
| [`AGENTS.md`](./AGENTS.md) | Root-Konfiguration – Befehle, Konventionen, Übersicht |
| [`docs/architecture.md`](./docs/architecture.md) | Systemdesign, Tech Stack, Verzeichnisstruktur |
| [`docs/security.md`](./docs/security.md) | Authentifizierung, Security Rules, Secrets |
| [`docs/deployment.md`](./docs/deployment.md) | Deployment, CI/CD, Logs |
| [`PUSH_NOTIFICATIONS.md`](./PUSH_NOTIFICATIONS.md) | Push-Benachrichtigungen (separat, temporär) |

### Agent Skills
Firebase-spezifisches Wissen liegt in `.agents/skills/` – bei Firebase-Fragen die jeweilige `SKILL.md` konsultieren.
