# 📋 SPEC: Mehrfachverträge & automatische Verhältnis-Erkennung

## 1. Auslöser

Johann (08.09.2026): „Ich kann bis dato nur **einen** Vertrag anlegen. Zum Beispiel kann ein
Minijobber keinen zusätzlichen Vertrag bekommen – ich bin mir nicht sicher, ob
Ehrenamtspauschale oder Übungsleiterpauschale. Bitte so einrichten, dass beim Vertrag-Auswählen
**abgeglichen wird, in welchem Verhältnis er gerade zu uns steht**, und dass ich **bestimmte
Verträge auswählen** kann, bevor ich sie über die Maske erstellen lasse."

## 2. Befund im Altcode

| Stelle | Problem |
|---|---|
| `UserProfile.contractType` | **Singular** – ein Mitglied konnte genau ein Rechtsverhältnis abbilden. |
| `openContractModal()` | Leitete **alle** Formularwerte aus `u.contractType` ab; keine Wahlmöglichkeit. |
| `handleGenerateContract()` | Hart `contractType: selectedUser.contractType \|\| "Ehrenamtlich"` – jedes weitere Dokument bekam zwangsläufig denselben Typ. |
| Profil-Schreibzugriff | `entryDate`, `hourlyRate`, `monthlyHours`, `weeklyHours`, `activityDescription` wurden **unbedingt** überschrieben. Ein Zusatzvertrag hätte die Gehaltsbasis des Minijobs verändert → Zahlungsfehler in der Abrechnung. |

`contractDocuments` war bereits ein Array (Historie) – es konnte dort also nur nie ein anderer Typ
stehen.

## 3. Rechtlicher Rahmen (Recherche, ohne neuen Vertragstext)

- **§ 3 Nr. 26 EStG** (Übungsleiterpauschale, bis 3.000 €/Jahr) und **§ 3 Nr. 26a EStG**
  (Ehrenamtspauschale, bis 840 €/Jahr) sind **unabhängig voneinander** anwendbar.
- Ein **Minijob** (§ 8 Abs. 1 S. 1 SGB IV, Verdienstgrenze 603 €/Monat) ist ein
  sozialversicherungsfreies, aber **arbeitnehmereigene** Beschäftigungsverhältnis – ein anderes
  Rechtsverhältnis als ein Pauschalvertrag.
- **Fazit:** Minijob **plus** Übungsleiter- **plus/oder** Ehrenamtspauschale bei derselben Person
  ist zulässig und im Vereinsalltag üblich. Die App muss das abbilden können.
- Die **Formulartexte** der vier Vorlagen bleiben unverändert; es wird nichts juristisch
  hinzugedichtet.

## 4. Akzeptanzkriterien

1. Ein Mitglied kann **mehrere Rechtsverhältnisse** gleichzeitig führen; das für die Abrechnung
   maßgebliche Verhältnis bleibt eindeutig (`contractType` = primär).
2. Der Vertrags-Wizard öffnet **zweistufig**: Schritt 1 Verhältnisübersicht + Vertragsart-Auswahl,
   Schritt 2 die (bereits vorhandene) typabhängige Maske mit Unterschriften.
3. Schritt 1 zeigt pro Vertragsart: erkanntes Verhältnis? primär? wie viele Verträge /
   Änderungsvereinbarungen vorhanden? Link zu den Dokumenten.
4. Die Maske wird je **gewählter** Art vorbelegt; Profilwerte (Stunden, Stundensatz, Tätigkeit)
   fließen nur für das primäre Verhältnis ein – sonst landet z. B. die Minijob-Monatsstundenzahl
   im Übungsleitervertrag.
5. **Abrechnungsschutz:** Ein Zusatzvertrag ändert **keine** abrechnungsrelevanten Profilfelder und
   ersetzt **nicht** den Abrechnungsbeleg `contractDocumentUrl`.
6. Eine Änderungsvereinbarung wirkt auf die **gewählte** Art (`AmendmentTemplates[type]`) und
   verändert das Eintrittsdatum nicht.
7. Altprofile ohne `contractTypes` funktionieren unverändert (lazy abgeleitet, **keine
   Datenmigration** an lebenden Profilen).
8. **Minijob wird niemals automatisch vorgeschlagen** – das ist eine ausdrückliche
   Vorstandsentscheidung.
9. `ProtectedRoute`/Admin-Funktionen bleiben erreichbar (kein Selbst-Ausschluss).
10. Reine Logik ist ohne React getestet; Gesamtsuite grün.

## 5. Nicht-Ziele

- Keine Lohn-/Gehaltsabrechnung, keine Steuerbescheinigung, keine DATEV-Exporte.
- Keine Verträge über den 31.12. des Folgejahres hinaus, keine Befristungslogik.
- Keine Änderung der PDF-Vorlagen und ihrer Rechtstexte.
