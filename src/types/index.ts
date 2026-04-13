export type Role = 'Mitarbeiter' | 'Kassenwart' | 'Admin';
export type ContractType = 'Ehrenamtlich' | 'Ehrenamtspauschale' | 'Übungsleiterpauschale' | 'Minijob';

export interface UserProfile {
    id: string; // The Firebase Auth UID
    firstName: string;
    lastName: string;
    role: Role;
    contractType?: ContractType;
    entryDate?: string;
    contractDocumentUrl?: string; // Links to Firebase Storage for the signed copy
    hourlyRate?: number;
    weeklyHours?: number;
    vacationDaysPerYear?: number | null;
    address: {
        street: string;
        zipCode: string;
        city: string; // Used as default start location for travel
    };
    bankDetails: {
        iban: string;
        bic: string;
        accountHolder: string;
    };
    createdAt: Date;
    updatedAt?: Date;
    theme?: 'light' | 'dark';

    // Push-Benachrichtigungen: Bevorzugte Sendezeit
    notificationHour?: number;    // 0-23
    notificationMinute?: number;  // 0-59
    notificationDayOfWeek?: number; // 0-6 (0=Sonntag, 1=Montag, ...)
}

export interface AppSettings {
    clubName?: string;
    minimumWage?: number; // Added for automatic hour calculation
    monthlyEarningsLimit?: number; // Added for Minijob limit calculation
    hoursPerVacationDay?: number; // Stunden pro Urlaubstag für Zeiterfassung
    address?: {
        street: string;
        zipCode: string;
        city: string;
    };
    travelExpenseRate: number;
    consultationTypes: string[];
    lifeStages: string[];
    personGroups: string[];
    problemOrigins: string[];
    subProblems: string[];
    goalTypes: string[];
    skbConflictPoints?: string[];
    skbInterventions?: string[];
    skbCompanions?: string[];
    skbCertificateOptions?: string[];
    lectureTypes?: string[];
    retreatTypes?: string[];
}


export type PersonGroup =
    | 'Ehepaar' | 'Erwachsene' | 'Familie' | 'Jugendliche'
    | 'Teeny' | 'Kind' | 'Paar' | 'Senior' | 'Verwitwet';

export interface Client {
    id: string;
    authorId: string;
    name: string;
    personGroup: PersonGroup;
    gender: 'Männlich' | 'Weiblich';
    isChurchMember: boolean;
    createdAt: Date;
}

export type ConsultationType =
    | 'Ausbildung' | 'Beratung' | 'Ehe Vorbereitung'
    | 'Gebetshilfe (Stehcafé)' | 'Gebetszeit für Frauen'
    | 'Glaubensstärkung (Stehcafé)' | 'Glaubensstärkung'
    | 'Seelsorge Präsenz' | 'Seelsorge telefonisch';

export type LifeStage = 'Erwachsener' | 'junge Erwachsene/r' | 'Kindheit' | 'Teenager';

export interface SmartCheck {
    specific: boolean;
    measurable: boolean;
    achievable: boolean;
    relevant: number; // 1-5
    timeBound: Date | null;
}

export interface Consultation {
    id: string;
    clientId: string;
    authorId: string;
    dateFrom: Date;
    dateTo: Date;
    type: ConsultationType;
    problemOriginId: string; // from global settings
    lifeStage: LifeStage;
    subProblemsIds: string[]; // multi-select from global settings
    goalTypeId: string; // from global settings
    goalAgreement: string;
    smartCheck?: SmartCheck;
    causeFromCounselor: string;
    unitsInHours: number;
    prepTimeInHours: number;
    notes: string;
    photoUrls?: string[]; // URLs zu Fotos im Firebase Storage
    createdAt: Date;
}

export interface SkbConsultation {
    id: string;
    clientId: string;
    authorId: string;
    dateFrom: Date;
    dateTo: Date;
    durationInHours: number;
    isAnonymous: boolean; // if true, client name hidden/replaced by ID
    companion: 'Keine' | 'Partner' | 'Freundin' | 'Elternteil' | 'Sonstige';
    pregnancyWeek: number;
    expectedDeliveryDate: Date;
    certificateStatus: 'Ja' | 'Nein' | 'Unbekannt' | 'In Planung';
    conflictPointsIds: string[]; // Multi-Select
    interventionsIds: string[]; // Multi-Select
    goalAgreement: string;
    notes: string;
    photoUrls?: string[]; // URLs zu Fotos im Firebase Storage
    createdAt: Date;
}

export type ShortConsultationType = 'Glaubensstärkung (Stehcafé)' | 'Gebetshilfe (Stehcafé)' | 'Glaubensstärkung' | 'Gebetszeit für Frauen';

export interface ShortConsultation {
    id: string;
    authorId: string;
    date: Date;
    durationInHours: number;
    type: ShortConsultationType;
    notes: string;
    timeOfDay?: 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig';
    createdAt: Date;
}

export interface Lecture {
    id: string;
    authorId: string;
    dateFrom: Date;
    dateTo: Date;
    topic: string;
    lectureType?: string;
    location?: string;
    church?: string;
    participantCount?: number;
    notes?: string;
    durationInHours: number;
    prepTimeInHours: number;
    photoUrls?: string[]; // URLs zu Fotos im Firebase Storage
    createdAt: Date;
}

export interface Retreat {
    id: string;
    authorId: string;
    dateFrom: Date;
    dateTo: Date;
    title: string;
    retreatType?: string;
    location: string;
    church?: string;
    participantCount?: number;
    notes?: string;
    durationInHours: number;
    prepTimeInHours: number;
    photoUrls?: string[]; // URLs zu Fotos im Firebase Storage
    createdAt: Date;
}

export interface TravelExpense {
    id: string;
    authorId: string;
    startDate: Date;
    startLocation: string;
    endLocation: string;
    kmStart: number;
    kmEnd: number;
    kmDriven: number;
    calculatedAmount?: number;
    status: 'Eingereicht' | 'Genehmigt' | 'Abgelehnt';
    createdAt: Date;
}

export type TimeEntryType = 'Beratung' | 'Büro' | 'Fahrt' | 'Vortrag' | 'Freizeit' | 'Urlaub' | 'Sonstiges';

export interface TimeEntry {
    id: string;
    authorId: string;
    date: Date;
    timeOfDay?: 'Vormittags' | 'Nachmittags' | 'Abends' | 'Ganztägig';
    description: string;
    durationInHours: number;
    type: TimeEntryType;
    referenceId?: string; // ID of the consultation, lecture, or retreat if auto-generated
    status: 'active' | 'overtime-pool'; // Status: aktiv oder im Überstundenpool
    originalMonth?: string; // "YYYY-MM" des ursprünglichen Eintrags wenn im Pool
    transferredFrom?: string; // "YYYY-MM" wenn aus anderem Monat übertragen
    transferredAt?: Date; // Zeitpunkt der Übertragung
    transferredBy?: string; // userId der übertragen hat
    createdAt: Date;
}

export interface OvertimeTransfer {
    id: string;
    authorId: string;
    hours: number;
    sourceMonth: string; // "YYYY-MM"
    targetMonth: string; // "YYYY-MM"
    entryIds: string[]; // IDs der übertragenen TimeEntries
    transferredBy: string; // userId
    transferredAt: Date;
    createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Push-Benachrichtigungen & Erinnerungen
// ─────────────────────────────────────────────────────────────────────────────

export type ReminderFrequency = 'once' | 'weekly' | 'monthly';

export type ReminderType = 
    | 'consultation-goal'    // Erinnerung für Gebetsanliegen/Zieltermin aus Beratung
    | 'client-birthday'      // Geburtstag eines Klienten
    | 'custom'               // Benutzerdefinierte Erinnerung

export interface Reminder {
    id: string;
    userId: string;           // Empfänger der Erinnerung (Firebase Auth UID)
    authorId: string;         // Ersteller der Erinnerung (kann userId sein)
    type: ReminderType;
    title: string;            // Kurztitel (z.B. "Achtung, bete dafür")
    message: string;          // Detaillierte Nachricht
    relatedId?: string;       // Referenz zu Consultation, Client, etc.
    relatedType?: 'consultation' | 'client' | 'skbConsultation';
    scheduledDate: Date;      // Startdatum für Erinnerungen
    frequency: ReminderFrequency;
    dayOfWeek?: number;       // 0-6 (für weekly: 0=Sonntag, 1=Montag, ...)
    dayOfMonth?: number;      // 1-31 (für monthly)
    isActive: boolean;
    lastSentAt?: Date;        // Wann wurde die letzte Benachrichtigung gesendet?
    nextScheduledAt?: Date;   // Nächstes geplantes Senden (für weekly/monthly)
    createdAt: Date;
    updatedAt?: Date;
}

export interface FcmToken {
    id: string;
    userId: string;
    token: string;
    deviceInfo?: {
        browser?: string;
        platform?: string;
        userAgent?: string;
    };
    isValid: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
}
