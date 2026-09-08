import { describe, it, expect } from "./test-framework";
import {
    buildAnonymousAssociationStats,
    isAssociationViewAllowed,
    scopeRecords,
    scopeToOwner
} from "@/lib/utils/dataScope";

/**
 * Test-Fixtures für die Privatsphären-Prüfung des Dashboards.
 *
 * Die Namen, IDs und Freitexte unten sind absichtlich "sensibel": Sie dürfen in der
 * anonymisierten Verbandsstatistik an keiner Stelle wieder auftauchen.
 * Die festen Jahresangaben sind reine Fixture-Werte (kein Debug-Referenzdatum im Produktcode).
 */
const OWN_UID = "uid-eigene-beraterin";
const FOREIGN_UID = "uid-anderer-berater";
const CLIENT_ID = "client-geheim-001";
const CLIENT_NAME = "Erika Mustermann";
const GOAL_TEXT = "Gemeinsames Gebet mit Erika Mustermann bis zum Sommer";
const LEGACY_TOPIC = "Erstgespräch Familie Mustermann, Vertraulich";

const consultations = [
    {
        authorId: OWN_UID,
        clientId: CLIENT_ID,
        dateFrom: new Date("2025-02-10"),
        unitsInHours: 1.5,
        prepTimeInHours: 0.5,
        problemOriginId: "0",
        goalAgreement: GOAL_TEXT,
        notes: `Notiz mit ${CLIENT_NAME}`
    },
    {
        authorId: FOREIGN_UID,
        clientId: "client-anderer-002",
        dateFrom: new Date("2025-05-04"),
        unitsInHours: 2,
        prepTimeInHours: 1,
        problemOriginId: "1",
        goalAgreement: "Fremde Zielvereinbarung",
        notes: "Fremde Notiz"
    }
];

const legacyConsultations = [
    {
        authorId: OWN_UID,
        dateFrom: new Date("2024-11-02"),
        durationInHours: 3,
        prepTimeInHours: 1,
        consultationType: "Beratung",
        topic: LEGACY_TOPIC
    }
];

const lectures = [
    {
        authorId: OWN_UID,
        dateFrom: new Date("2025-03-01"),
        durationInHours: 2,
        prepTimeInHours: 1,
        participantCount: 25,
        lectureType: "Vortrag",
        topic: "Öffentlicher Vortragstitel"
    }
];

const retreats = [
    {
        authorId: FOREIGN_UID,
        dateFrom: new Date("2025-07-15"),
        durationInHours: 8,
        prepTimeInHours: 2,
        participantCount: 30,
        retreatType: "Kinderfreizeit",
        title: "Sommerfreizeit"
    }
];

const statsInput = {
    consultations,
    legacyConsultations,
    lectures,
    retreats
};

describe("Dashboard Data-Scope: Eigentümer-Filter (Defense in Depth)", () => {
    it("lässt bei scopeToOwner nur die eigenen Datensätze durch", () => {
        const scoped = scopeToOwner(consultations, OWN_UID);
        expect(scoped.length).toBe(1);
        expect(scoped[0].authorId).toBe(OWN_UID);
    });

    it("verwirft Datensätze ohne authorId (im Zweifel gegen die Anzeige)", () => {
        const mixed = [
            { authorId: OWN_UID, id: "a" },
            { id: "b" },
            { authorId: undefined, id: "c" }
        ];
        expect(scopeToOwner(mixed, OWN_UID).length).toBe(1);
    });

    it("liefert ohne uid gar nichts zurück", () => {
        expect(scopeToOwner(consultations, "").length).toBe(0);
    });

    it("gibt Nicht-Admins im Modus 'all' trotzdem nur eigene Datensätze", () => {
        const roles = ["Mitarbeiter", "Kassenwart", undefined] as const;
        roles.forEach(role => {
            const scoped = scopeRecords(consultations, { uid: OWN_UID, viewMode: 'all', role });
            expect(scoped.length).toBe(1);
            expect(scoped[0].authorId).toBe(OWN_UID);
        });
    });

    it("lässt Admins im Modus 'all' die Verbandsdaten sehen", () => {
        const scoped = scopeRecords(consultations, { uid: OWN_UID, viewMode: 'all', role: 'Admin' });
        expect(scoped.length).toBe(2);
    });

    it("hält Admins im Modus 'own' auf den eigenen Daten", () => {
        const scoped = scopeRecords(consultations, { uid: OWN_UID, viewMode: 'own', role: 'Admin' });
        expect(scoped.length).toBe(1);
        expect(scoped[0].authorId).toBe(OWN_UID);
    });

    it("erlaubt die Verbandsansicht ausschließlich für Admin + 'all'", () => {
        expect(isAssociationViewAllowed({ uid: OWN_UID, viewMode: 'all', role: 'Admin' })).toBe(true);
        expect(isAssociationViewAllowed({ uid: OWN_UID, viewMode: 'own', role: 'Admin' })).toBe(false);
        expect(isAssociationViewAllowed({ uid: OWN_UID, viewMode: 'all', role: 'Mitarbeiter' })).toBe(false);
        expect(isAssociationViewAllowed({ uid: OWN_UID, viewMode: 'all' })).toBe(false);
    });
});

describe("Dashboard Data-Scope: anonymisierte Verbandsstatistik", () => {
    it("aggregiert Stunden, Fälle, Teilnehmer und Aktivitäten", () => {
        const stats = buildAnonymousAssociationStats(statsInput);

        expect(stats.consultationHours).toBe(9);   // (1,5+0,5) + (2+1) + (3+1)
        expect(stats.consultationCount).toBe(3);   // 2 Beratungen + 1 Legacy
        expect(stats.lectureHours).toBe(3);
        expect(stats.lectureCount).toBe(1);
        expect(stats.lectureParticipants).toBe(25);
        expect(stats.retreatHours).toBe(10);
        expect(stats.retreatCount).toBe(1);
        expect(stats.retreatParticipants).toBe(30);
        expect(stats.activityCount).toBe(5);
    });

    it("enthält weder Namen, IDs noch Freitexte aus den Quelldaten", () => {
        const stats = buildAnonymousAssociationStats(statsInput, {
            problemOriginLabels: ["Ehe", "Beruf"]
        });
        const serialized = JSON.stringify(stats);

        expect(serialized).not.toContain(CLIENT_NAME);
        expect(serialized).not.toContain(CLIENT_ID);
        expect(serialized).not.toContain(OWN_UID);
        expect(serialized).not.toContain(FOREIGN_UID);
        expect(serialized).not.toContain(GOAL_TEXT);
        expect(serialized).not.toContain(LEGACY_TOPIC);
        expect(serialized).not.toContain("Mustermann");
        expect(serialized).not.toContain("client-anderer-002");
    });

    it("nutzt für Legacy-Daten die Kategorie und nicht das Freitext-Topic", () => {
        const stats = buildAnonymousAssociationStats(statsInput, {
            problemOriginLabels: ["Ehe", "Beruf"]
        });
        const names = stats.problemData.map(entry => entry.name);

        expect(names).toContain("Beratung");
        expect(names).toContain("Ehe");
        expect(names).toContain("Beruf");
        expect(names.some(name => name.includes("Mustermann"))).toBe(false);
    });

    it("löst Problemkategorien über die globalen Dropdown-Listen auf", () => {
        const stats = buildAnonymousAssociationStats(statsInput, {
            problemOriginLabels: ["Ehe", "Beruf"]
        });
        expect(stats.problemData.find(entry => entry.name === "Ehe")?.value).toBe(1);
        expect(stats.problemData.find(entry => entry.name === "Beruf")?.value).toBe(1);
    });

    it("begrenzt die Kennzahlen über den Jahresfilter", () => {
        const stats2025 = buildAnonymousAssociationStats(statsInput, { year: "2025" });

        expect(stats2025.consultationHours).toBe(5); // Legacy aus 2024 fällt weg
        expect(stats2025.consultationCount).toBe(2);
        expect(stats2025.activityCount).toBe(4);
        expect(stats2025.lectureParticipants).toBe(25);
        expect(stats2025.retreatParticipants).toBe(30);

        const stats2024 = buildAnonymousAssociationStats(statsInput, { year: "2024" });
        expect(stats2024.consultationCount).toBe(1);
        expect(stats2024.consultationHours).toBe(4);
        expect(stats2024.activityCount).toBe(1);
    });

    it("zählt Vortrags- und Freizeitarten als Kategorien", () => {
        const stats = buildAnonymousAssociationStats(statsInput);
        expect(stats.lectureTypeData.length).toBe(1);
        expect(stats.lectureTypeData[0].name).toBe("Vortrag");
        expect(stats.retreatTypeData[0].name).toBe("Kinderfreizeit");
    });

    it("fällt bei fehlender Kategorie auf 'Sonstige' zurück", () => {
        const stats = buildAnonymousAssociationStats({
            consultations: [],
            legacyConsultations: [],
            lectures: [{ dateFrom: new Date("2025-03-01"), durationInHours: 1 }],
            retreats: [{ dateFrom: new Date("2025-07-15"), durationInHours: 1 }]
        });
        expect(stats.lectureTypeData[0].name).toBe("Sonstige");
        expect(stats.retreatTypeData[0].name).toBe("Sonstige");
    });

    it("liefert bei leeren Daten Nullwerte statt erfundener Kennzahlen", () => {
        const stats = buildAnonymousAssociationStats({
            consultations: [],
            legacyConsultations: [],
            lectures: [],
            retreats: []
        });
        expect(stats.activityCount).toBe(0);
        expect(stats.consultationHours).toBe(0);
        expect(stats.problemData.length).toBe(0);
    });
});
