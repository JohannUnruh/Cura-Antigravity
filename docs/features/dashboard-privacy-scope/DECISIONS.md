# ⚖️ DECISIONS: Privatsphären-Scope im Dashboard

## Entscheidung 1: `firestore.rules` bleiben unverändert (kein Deploy)

**Kontext:** Die Rules gewähren Admins vereinsweites Lesen u. a. auf `clients`, `consultations`,
`skb_consultations`, `legacy_consultations`, `short_consultations` (`allow read: if … || isAdmin();`).
Damit könnte man das Problem auch netzwerkseitig lösen.

**Entscheidung:** Bewusst **nicht** geändert. Gründe:
1. Regeln sind Produktivkonfiguration. Ein `firebase deploy --only firestore:rules` ohne Freigabe
   des Vorstands kann laufenden Betrieb beschädigen (AGENTS.md: Selbst-Sperr-Schutz).
2. Admin-Lesezugriff wird für legitime Vereinsaufgaben gebraucht (Abrechnung, Nachweise,
   Datenschutz-Auskunft).
3. Ohne Aggregat-Rechenschaft (Cloud Function oder Zähler-Collections) würde ein Entzug des
   Admin-Lesens die Verbandsstatistik komplett leer laufen lassen – kaputt statt sicher.

**Empfehlung an Johann (bewusste Folgeentscheidung, wenn gewünscht):**
`|| isAdmin()` **nur** für die seelsorgerlichen Collections verschärfen, also für
`clients`, `consultations`, `skb_consultations`, `legacy_consultations`, `short_consultations`
und `meeting_notes`. Behalten sollte Admin es für `users`, `time_entries`, `travel_expenses`,
`settings`, `external_reminders`. Preis dafür: die anonyme Verbandsstatistik muss dann aus
`time_entries` (Stunden je Aktivität, ohne Klientenbezug) gerechnet werden – ein kleiner,
abgrenzbarer Folge-Sprint. Vorher: Rules-Emulator + Kopie des Projekts.

## Entscheidung 2: Verbandsansicht bleibt Admin vorbehalten, aber anonymisiert

Vollständige deletion des Filters wäre einfacher gewesen, hätte Johann aber die
Vorstands-Berichtsfähigkeit (Stunden-/Teilnehmerentwicklung) genommen. Gewählt: **gleicher
Einstieg, weniger Inhalt** – Kennzahlen ja, Personenbezug nein.

## Entscheidung 3: Datensätze ohne `authorId` werden verworfen

Im Zweifel gegen die Anzeige. Ein Dokument ohne Eigentümer ist ein Datenqualitätsproblem, kein
Anzeigegrund. Bestehende Dokumente, die ein Mitglied sehen kann, haben zwingend `authorId == uid`
– die Rules erzwingen das bereits, es droht also kein Datenverlust.

## Entscheidung 4: Personenbedingte Reduktion statt Warnhinweis-Flut

Ein Untertitel („Aggregierte Kennzahlen ohne personenbezogene Daten.") statt drei Info-Boxen.

## Bekannte kosmetische Grenze

`getContractCoverage()` wertet die **Historie** (`contractDocuments`). Altprofile, die nur
`contractDocumentUrl` besitzen, zeigen in Schritt 1 des Vertrags-Wizards daher „0 Dokumente",
obwohl der alte Beleg verlinkt ist. Beim ersten neuen Dokument wird der Ursprungsbeleg
automatisch nachgezogen (`ensureContractHistory`). Bewusst in Kauf genommen, um keine
Datenmigration an lebenden Profilen zu fahren.
