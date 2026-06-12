export interface FamilyMember {
    firstName: string;
    lastName: string;
    birthDate?: string;
    relation: string;
}

export interface AsdContact {
    name: string;
    email?: string;
    phone?: string;
    institution?: string;
}

export interface FundingCommitment {
    hoursGranted: number;
    startDate: string;
    endDate: string;
    hourlyRate?: number;
}

export interface FamilyGoal {
    id: string;
    category: string;
    description: string;
    targetValue: number;
    currentValue: number;
    createdAt: Date;
    updatedAt?: Date;
}

export interface FamilyJournalEntry {
    id: string;
    date: Date;
    durationInHours: number;
    type: string;
    notes: string;
    hasTimeEntry: boolean;
    timeEntryId?: string;
}

export interface HazardAssessment8a {
    id: string;
    date: Date;
    assessorName: string;
    indicators: { [key: string]: 'ja' | 'nein' | 'unklar' };
    actionsTaken: string;
    result: 'akut' | 'latent' | 'keine';
    nextReviewDate?: string;
}

export interface FamilyCase {
    id?: string;
    familyName: string;
    caseNumber: string;
    assignedWorkerId: string;
    status: 'aktiv' | 'inaktiv' | 'beendet';
    members: FamilyMember[];
    asdContact?: AsdContact;
    fundingCommitment?: FundingCommitment;
    goals?: FamilyGoal[];
    createdAt: Date;
    updatedAt?: Date;
}
