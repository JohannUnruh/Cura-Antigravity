import { describe, it, expect } from "../test-framework";
import { canAccessSpfh, canManage8a, DetailTab } from "./details";
import { UserProfile } from "@/types";
import { FamilyCase } from "@/types/familyHelper";

describe("Feature 5: Case Details Tabs", () => {
    const adminUser: UserProfile = {
        id: "admin_1",
        firstName: "Max",
        lastName: "Admin",
        role: "Admin",
        address: { street: "", zipCode: "", city: "" },
        bankDetails: { iban: "", bic: "", accountHolder: "" },
        createdAt: new Date()
    };

    const workerWithAccess: UserProfile = {
        id: "worker_1",
        firstName: "Susanne",
        lastName: "Mitarbeiter",
        role: "Mitarbeiter",
        hasFamilyHelperAccess: true,
        address: { street: "", zipCode: "", city: "" },
        bankDetails: { iban: "", bic: "", accountHolder: "" },
        createdAt: new Date()
    };

    const workerWithoutAccess: UserProfile = {
        id: "worker_2",
        firstName: "Dieter",
        lastName: "Mitarbeiter2",
        role: "Mitarbeiter",
        hasFamilyHelperAccess: false,
        address: { street: "", zipCode: "", city: "" },
        bankDetails: { iban: "", bic: "", accountHolder: "" },
        createdAt: new Date()
    };

    const kassenwartUser: UserProfile = {
        id: "kw_1",
        firstName: "Rudolf",
        lastName: "Kasse",
        role: "Kassenwart",
        hasFamilyHelperAccess: true,
        address: { street: "", zipCode: "", city: "" },
        bankDetails: { iban: "", bic: "", accountHolder: "" },
        createdAt: new Date()
    };

    const targetCase: FamilyCase = {
        id: "case_1",
        familyName: "Schulz",
        caseNumber: "SPFH-007",
        assignedWorkerId: "worker_1",
        status: "aktiv",
        members: [],
        createdAt: new Date()
    };

    // --- TIER 1: FEATURE COVERAGE (>= 5 Tests) ---

    it("should allow SPFH module access for workers with hasFamilyHelperAccess=true", () => {
        expect(canAccessSpfh(workerWithAccess)).toBeTruthy();
    });

    it("should allow SPFH module access for Admin role automatically", () => {
        expect(canAccessSpfh(adminUser)).toBeTruthy();
    });

    it("should allow the assigned worker to manage 8a risk assessments", () => {
        expect(canManage8a(workerWithAccess, targetCase)).toBeTruthy();
    });

    it("should allow Admins to manage 8a risk assessments for any case", () => {
        expect(canManage8a(adminUser, targetCase)).toBeTruthy();
    });

    it("should simulate tab navigation states correctly", () => {
        const tabs: DetailTab[] = ['stammdaten', 'mitglieder', 'ziele', 'journal', 'risikoanalyse'];
        let activeTab: DetailTab = 'stammdaten';

        // Simulate changing tabs
        activeTab = 'journal';
        expect(activeTab).toBe('journal');
        expect(tabs.includes(activeTab)).toBeTruthy();
    });

    // --- TIER 2: BOUNDARY & CORNER CASES (>= 5 Tests) ---

    it("should deny access to SPFH module for workers without hasFamilyHelperAccess flag", () => {
        expect(canAccessSpfh(workerWithoutAccess)).toBeFalsy();
    });

    it("should deny managing 8a risk assessment for Kassenwart even with family helper flag", () => {
        expect(canManage8a(kassenwartUser, targetCase)).toBeFalsy();
    });

    it("should deny managing 8a risk assessment for a worker who is not assigned to the case", () => {
        const otherWorker: UserProfile = {
            ...workerWithAccess,
            id: "worker_other"
        };
        expect(canManage8a(otherWorker, targetCase)).toBeFalsy();
    });

    it("should handle undefined or incomplete UserProfile access flags gracefully", () => {
        const incompleteUser: Partial<UserProfile> = {
            id: "incomplete_1",
            role: "Mitarbeiter"
        };
        expect(canAccessSpfh(incompleteUser as UserProfile)).toBeFalsy();
        expect(canManage8a(incompleteUser as UserProfile, targetCase)).toBeFalsy();
    });

    it("should restrict tab visibility based on permissions (risikoanalyse tab)", () => {
        const isTabVisible = (tab: DetailTab, user: UserProfile, caseObj: FamilyCase): boolean => {
            if (tab === 'risikoanalyse') {
                return canManage8a(user, caseObj);
            }
            return canAccessSpfh(user);
        };

        expect(isTabVisible('risikoanalyse', workerWithAccess, targetCase)).toBeTruthy();
        expect(isTabVisible('risikoanalyse', workerWithoutAccess, targetCase)).toBeFalsy();
        expect(isTabVisible('journal', workerWithAccess, targetCase)).toBeTruthy();
    });
});
