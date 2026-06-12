import { UserProfile } from "@/types";
import { FamilyCase } from "@/types/familyHelper";

export type DetailTab = 'stammdaten' | 'mitglieder' | 'ziele' | 'journal' | 'risikoanalyse';

export function canAccessSpfh(user: UserProfile): boolean {
    return !!(user.hasFamilyHelperAccess || user.role === 'Admin');
}

export function canManage8a(user: UserProfile, caseObj: FamilyCase): boolean {
    if (!canAccessSpfh(user)) return false;
    
    // Admins dürfen immer
    if (user.role === 'Admin') return true;
    
    // Kassenwart darf keine 8a verwalten (nur Admins und zugewiesene Mitarbeiter)
    if (user.role === 'Kassenwart') return false;

    // Mitarbeiter dürfen verwalten, wenn sie dem Fall zugewiesen sind
    return caseObj.assignedWorkerId === user.id;
}
