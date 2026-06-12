export interface FosterParent {
    firstName: string;
    lastName: string;
    birthDate?: string;
    email?: string;
    phone?: string;
    occupation?: string;
}

export interface FosterPreferences {
    ageMin: number;
    ageMax: number;
    genders?: ('Männlich' | 'Weiblich' | 'Divers')[];
    careTypes?: ('Vollzeitpflege' | 'Bereitschaftspflege' | 'Kurzzeitpflege')[];
}

export interface FosterFamily {
    id: string;
    parent1: FosterParent;
    parent2?: FosterParent;
    address: {
        street: string;
        zipCode: string;
        city: string;
    };
    status: 'aktiv' | 'inaktiv' | 'in_prüfung' | 'beendet';
    capacity: number;
    activePlacementsCount: number;
    preferences: FosterPreferences;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FosterChild {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: 'Männlich' | 'Weiblich' | 'Divers';
    custodyStatus: string;
    guardianName?: string;
    guardianContact?: string;
    originFamilyDetails?: string;
    placementStatus: 'unplaced' | 'placed' | 'beendet';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FosterPlacement {
    id: string;
    familyId: string;
    childId: string;
    startDate: Date;
    endDate?: Date;
    status: 'aktiv' | 'beendet';
    terminationReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FosterJournalEntry {
    id: string;
    familyId?: string;
    childId?: string;
    authorId: string;
    date: Date;
    durationInHours: number;
    type: 'Hausbesuch' | 'Gespräch' | 'Telefonat' | 'Sonstiges';
    notes: string;
    hasTimeEntry: boolean;
    timeEntryId?: string;
    createdAt: Date;
    updatedAt?: Date;
}
