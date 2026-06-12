# E2E Test Infra: Cura SPFH (Familienhilfe) Module

## Test Philosophy
- Opaque-box, integrations- und anforderungsgesteuert.
- Ausführung in einer Headless-Umgebung ohne Browser-Fenster über einen benutzerdefinierten Test-Runner auf Service- und API-Ebene.
- Methodik: Category-Partition (Äquivalenzklassen), Boundary Value Analysis (BVA), Pairwise Combinatorial Testing und Real-World Workloads.

## Feature Inventory
| # | Feature | Quelle (Anforderung) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-world) |
|---|---------|---------------------|:----------------:|:-----------------:|:-----------------:|:------------------:|
| 1 | Datatypes & AppSettings | PROJECT.md §M1 / Interface Contracts | 5 | 5 | ✓ | ✓ |
| 2 | Administrative Settings | PROJECT.md §M2 / settingsService | 5 | 5 | ✓ | ✓ |
| 3 | familyHelperService CRUD | PROJECT.md §M3 / CRUD & Time coupling | 5 | 5 | ✓ | ✓ |
| 4 | Case Dashboard | PROJECT.md §M4 / Dashboard logic | 5 | 5 | ✓ | ✓ |
| 5 | Case Details Tabs | PROJECT.md §M5 / Tabs navigation & data | 5 | 5 | ✓ | ✓ |
| 6 | PDF Export | PROJECT.md §M6 / jsPDF integration | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Ein benutzerdefiniertes Node.js-Testskript unter `tests/run-tests.ts`. Es führt alle Testsuiten aus, validiert die Testergebnisse und liefert einen sauberen Exit-Code (0 bei Erfolg, 1 bei Fehlern).
- **Test-Dateien**: Abgelegt im Ordner `tests/spfh/` (z. B. `tests/spfh/datatypes.test.ts`, `tests/spfh/settings.test.ts`, etc.).
- **Firebase/Service Mocking & Real Mode**: Da wir in einer Headless-Umgebung testen, unterstützt der Runner zwei Modi:
  - `MOCK`-Modus: Testet die logischen Abläufe, Validierungen und Zustandskopplungen gegen eine In-Memory-Mock-Implementierung der Services. Dies stellt sicher, dass die Tests auch ohne laufende Firebase-Instanz oder vor der vollständigen Implementierung des Services gebaut, gelintet und verifiziert werden können.
  - `LIVE`-Modus: Verbindet sich mit dem tatsächlichen Firebase Emulator oder der Live-Datenbank (sobald der Service implementiert ist), um die echten Firestore-Operationen zu verifizieren.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Fallerstellung & Erst-Konfiguration | Admin-Einstellungen, CRUD-Case, Datentypen | Medium |
| 2 | Dokumentation einer Betreuungswoche | CRUD-Case, Journal-Einträge, Zeitkopplung | High |
| 3 | Krisenintervention & 8a-Risikoanalyse | HazardAssessment8a, Fall-Status-Update, Journal | High |
| 4 | Monatsbericht-Generierung & PDF-Export | CRUD-Case, Journal-Einträge, PDF-Export | High |
| 5 | Fallabschluss & Archivierung | CRUD-Case, Settings, finaler PDF-Export | Medium |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: Mindestens 5 Testfälle pro Feature (Insgesamt >= 30 Testfälle).
- **Tier 2 (Boundary & Corner Cases)**: Mindestens 5 Grenzfälle pro Feature (Insgesamt >= 30 Testfälle).
- **Tier 3 (Cross-Feature Combinations)**: Testet die Interaktion zwischen Features (z. B. Koppelung von Journal-Einträgen mit Arbeitszeiteinträgen, Auswirkung von Einstellungsänderungen auf Dropdowns).
- **Tier 4 (Real-World Scenarios)**: Mindestens 5 komplexe Abläufe, die typische Arbeitsabläufe eines Familienhelfers simulieren.
