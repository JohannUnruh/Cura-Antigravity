import { FamilyCase } from "@/types/familyHelper";

export interface FilterOptions {
    status?: 'aktiv' | 'inaktiv' | 'beendet' | 'alle';
    search?: string;
    assignedWorkerId?: string;
    sortBy?: 'familyNameAsc' | 'familyNameDesc' | 'createdAtAsc' | 'createdAtDesc';
}

export function filterCases(cases: FamilyCase[], options: FilterOptions): FamilyCase[] {
    let result = [...cases];

    // Filter by status
    if (options.status && options.status !== 'alle') {
        result = result.filter(c => c.status === options.status);
    }

    // Filter by worker
    if (options.assignedWorkerId) {
        result = result.filter(c => c.assignedWorkerId === options.assignedWorkerId);
    }

    // Text search (familyName, caseNumber)
    if (options.search && options.search.trim() !== '') {
        const query = options.search.toLowerCase().trim();
        result = result.filter(c => 
            c.familyName.toLowerCase().includes(query) || 
            c.caseNumber.toLowerCase().includes(query)
        );
    }

    // Sorting
    if (options.sortBy) {
        result.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();

            switch (options.sortBy) {
                case 'familyNameAsc':
                    return a.familyName.localeCompare(b.familyName);
                case 'familyNameDesc':
                    return b.familyName.localeCompare(a.familyName);
                case 'createdAtAsc':
                    return dateA - dateB;
                case 'createdAtDesc':
                    return dateB - dateA;
                default:
                    return 0;
            }
        });
    }

    return result;
}
