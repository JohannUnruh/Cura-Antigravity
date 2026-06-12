import { describe, it, expect, beforeEach } from "./test-framework";
import { fosterCareService, setFosterCareMockMode, clearFosterCareMockDb } from "@/lib/firebase/services/fosterCareService";
import { setTimeTrackingMockMode, clearMockTimeEntries, getMockTimeEntries } from "@/lib/firebase/services/timeTrackingService";



describe("Foster Care Backend Service Tests", () => {
    beforeEach(() => {
        // Mock-Modus für beide Services aktivieren und Datenbanken bereinigen
        setFosterCareMockMode(true);
        clearFosterCareMockDb();
        setTimeTrackingMockMode(true);
        clearMockTimeEntries();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FosterFamily Tests
    // ─────────────────────────────────────────────────────────────────────────
    it("sollte eine Pflegefamilie erstellen, abrufen und löschen können", async () => {
        const familyData = {
            parent1: {
                firstName: "Hans",
                lastName: "Müller",
                birthDate: "1980-05-15",
                email: "hans.mueller@test.de",
                phone: "0123-456789"
            },
            address: {
                street: "Hauptstraße 12",
                zipCode: "12345",
                city: "Musterstadt"
            },
            status: "aktiv" as const,
            capacity: 2,
            preferences: {
                ageMin: 2,
                ageMax: 10,
                genders: ["Männlich" as const, "Weiblich" as const],
                careTypes: ["Vollzeitpflege" as const]
            }
        };

        // 1. Erstellen
        const familyId = await fosterCareService.createFamily(familyData);
        expect(familyId).toBeDefined();

        // 2. Abrufen
        const family = await fosterCareService.getFamilyById(familyId);
        expect(family).toBeDefined();
        expect(family!.parent1.lastName).toBe("Müller");
        expect(family!.activePlacementsCount).toBe(0);

        // 3. Liste abrufen
        const families = await fosterCareService.getFamilies();
        expect(families.length).toBe(1);
        expect(families[0].id).toBe(familyId);

        // 4. Aktualisieren
        await fosterCareService.updateFamily(familyId, {
            status: "inaktiv",
            capacity: 3
        });
        const updatedFamily = await fosterCareService.getFamilyById(familyId);
        expect(updatedFamily!.status).toBe("inaktiv");
        expect(updatedFamily!.capacity).toBe(3);

        // 5. Löschen
        await fosterCareService.deleteFamily(familyId);
        const deletedFamily = await fosterCareService.getFamilyById(familyId);
        expect(deletedFamily).toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FosterChild Tests
    // ─────────────────────────────────────────────────────────────────────────
    it("sollte ein Pflegekind erstellen, abrufen und löschen können", async () => {
        const childData = {
            firstName: "Lukas",
            lastName: "Schmidt",
            birthDate: new Date("2018-04-10"),
            gender: "Männlich" as const,
            custodyStatus: "Jugendamt",
            guardianName: "Herr Vormund",
            guardianContact: "0987-654321",
            originFamilyDetails: "Herkunftseltern nicht erziehungsfähig"
        };

        // 1. Erstellen
        const childId = await fosterCareService.createChild(childData);
        expect(childId).toBeDefined();

        // 2. Abrufen
        const child = await fosterCareService.getChildById(childId);
        expect(child).toBeDefined();
        expect(child!.firstName).toBe("Lukas");
        expect(child!.placementStatus).toBe("unplaced");

        // 3. Liste abrufen
        const children = await fosterCareService.getChildren();
        expect(children.length).toBe(1);

        // 4. Aktualisieren
        await fosterCareService.updateChild(childId, {
            custodyStatus: "Gemeinsam"
        });
        const updatedChild = await fosterCareService.getChildById(childId);
        expect(updatedChild!.custodyStatus).toBe("Gemeinsam");

        // 5. Löschen
        await fosterCareService.deleteChild(childId);
        const deletedChild = await fosterCareService.getChildById(childId);
        expect(deletedChild).toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FosterPlacement Tests (Kombination von Familie und Kind)
    // ─────────────────────────────────────────────────────────────────────────
    it("sollte Platzierungen erstellen, beenden und löschen und die Kapazitäten aktualisieren", async () => {
        // Familie anlegen (Kapazität: 2)
        const familyId = await fosterCareService.createFamily({
            parent1: { firstName: "Sabine", lastName: "Müller" },
            address: { street: "Weg 1", zipCode: "12345", city: "Stadt" },
            status: "aktiv",
            capacity: 2,
            preferences: { ageMin: 0, ageMax: 18 }
        });

        // Kinder anlegen
        const childId1 = await fosterCareService.createChild({
            firstName: "Lukas",
            lastName: "Müller",
            birthDate: new Date("2018-01-01"),
            gender: "Männlich",
            custodyStatus: "Jugendamt"
        });

        const childId2 = await fosterCareService.createChild({
            firstName: "Lena",
            lastName: "Müller",
            birthDate: new Date("2020-01-01"),
            gender: "Weiblich",
            custodyStatus: "Jugendamt"
        });

        // 1. Erste Platzierung erstellen
        const placementId1 = await fosterCareService.createPlacement({
            familyId,
            childId: childId1,
            startDate: new Date("2026-01-01")
        });

        // Familie und Kind prüfen
        let family = await fosterCareService.getFamilyById(familyId);
        let child1 = await fosterCareService.getChildById(childId1);
        expect(family!.activePlacementsCount).toBe(1);
        expect(child1!.placementStatus).toBe("placed");

        // 2. Zweite Platzierung erstellen
        const placementId2 = await fosterCareService.createPlacement({
            familyId,
            childId: childId2,
            startDate: new Date("2026-02-01")
        });

        family = await fosterCareService.getFamilyById(familyId);
        let child2 = await fosterCareService.getChildById(childId2);
        expect(family!.activePlacementsCount).toBe(2);
        expect(child2!.placementStatus).toBe("placed");

        // 3. Platzierungen für Familie abrufen
        const familyPlacements = await fosterCareService.getPlacementsByFamily(familyId);
        expect(familyPlacements.length).toBe(2);

        // 4. Erste Platzierung beenden
        await fosterCareService.endPlacement(placementId1, new Date("2026-06-01"), "Rückkehr zur Herkunftsfamilie");
        
        family = await fosterCareService.getFamilyById(familyId);
        child1 = await fosterCareService.getChildById(childId1);
        const placement1 = await fosterCareService.getPlacementById(placementId1);

        expect(family!.activePlacementsCount).toBe(1);
        expect(child1!.placementStatus).toBe("unplaced"); // Wieder freigegeben
        expect(placement1!.status).toBe("beendet");
        expect(placement1!.terminationReason).toBe("Rückkehr zur Herkunftsfamilie");

        // 5. Platzierung löschen
        await fosterCareService.deletePlacement(placementId2);
        family = await fosterCareService.getFamilyById(familyId);
        child2 = await fosterCareService.getChildById(childId2);

        expect(family!.activePlacementsCount).toBe(0);
        expect(child2!.placementStatus).toBe("unplaced");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FosterJournalEntry Tests & Zeiterfassungs-Koppelung
    // ─────────────────────────────────────────────────────────────────────────
    it("sollte Journal-Einträge erstellen und optional mit der Zeiterfassung koppeln", async () => {
        const familyId = await fosterCareService.createFamily({
            parent1: { firstName: "Sabine", lastName: "Müller" },
            address: { street: "Weg 1", zipCode: "12345", city: "Stadt" },
            status: "aktiv",
            capacity: 2,
            preferences: { ageMin: 0, ageMax: 18 }
        });

        const authorId = "counselor_1";

        // 1. Normalen Journaleintrag erstellen (ohne Zeiterfassung)
        const journalId1 = await fosterCareService.createJournalEntry({
            familyId,
            authorId,
            date: new Date("2026-06-01"),
            durationInHours: 1.5,
            type: "Hausbesuch",
            notes: "Regulärer Hausbesuch"
        }, false);

        const entry1 = await fosterCareService.getJournalEntryById(journalId1);
        expect(entry1).toBeDefined();
        expect(entry1!.hasTimeEntry).toBeFalsy();
        expect(entry1!.timeEntryId).toBe(undefined);


        // 2. Journaleintrag mit Zeiterfassung erstellen
        const journalId2 = await fosterCareService.createJournalEntry({
            familyId,
            authorId,
            date: new Date("2026-06-02"),
            durationInHours: 2.0,
            type: "Gespräch",
            notes: "Fachberatung am Telefon"
        }, true, authorId);

        const entry2 = await fosterCareService.getJournalEntryById(journalId2);
        expect(entry2).toBeDefined();
        expect(entry2!.hasTimeEntry).toBeTruthy();
        expect(entry2!.timeEntryId).toBeDefined();

        // Zeiteintrag in Zeiterfassungs-Mock-DB prüfen
        const timeEntries = getMockTimeEntries();
        expect(timeEntries.length).toBe(1);
        expect(timeEntries[0].id).toBe(entry2!.timeEntryId!);
        expect(timeEntries[0].durationInHours).toBe(2.0);
        expect(timeEntries[0].description).toBe("Pflegefamilien Journal: Familie Müller");

        // 3. Journaleintrag aktualisieren (Dauer ändert sich -> gekoppelter Zeiteintrag muss sich ändern)
        await fosterCareService.updateJournalEntry(journalId2, {
            durationInHours: 3.5,
            notes: "Fachberatung am Telefon (verlängert)"
        });

        const updatedEntry2 = await fosterCareService.getJournalEntryById(journalId2);
        expect(updatedEntry2!.durationInHours).toBe(3.5);

        const updatedTimeEntries = getMockTimeEntries();
        expect(updatedTimeEntries[0].durationInHours).toBe(3.5);

        // 4. Journaleintrag löschen (gekoppelter Zeiteintrag muss ebenfalls gelöscht werden)
        await fosterCareService.deleteJournalEntry(journalId2);
        const deletedEntry2 = await fosterCareService.getJournalEntryById(journalId2);
        expect(deletedEntry2).toBeNull();

        const timeEntriesAfterDelete = getMockTimeEntries();
        expect(timeEntriesAfterDelete.length).toBe(0);


    });
});
