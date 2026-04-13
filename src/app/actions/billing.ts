"use server";

import { BigQuery } from '@google-cloud/bigquery';

// Default bigquery client uses application default credentials
const bigquery = new BigQuery();

export interface CloudBillingSummary {
    currentMonthTotal: number;
    currency: string;
    lastUpdated: Date;
    error?: string;
}

export async function getMonthlyBillingInfo(): Promise<CloudBillingSummary> {
    try {
        // 1. Find the table name (dynamically since the suffix is unknown)
        const query = `
      SELECT table_name 
      FROM \`cura-ant.gcp_billing.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name LIKE 'gcp_billing_export_v1_%'
      LIMIT 1
    `;
        const [tables] = await bigquery.query({ query });
        if (!tables || tables.length === 0) {
            return {
                currentMonthTotal: 0,
                currency: 'EUR',
                lastUpdated: new Date(),
                error: 'Die Google Cloud Abrechnungsexport-Tabelle existiert noch nicht. Bitte beachte, dass dies bis zu 24 Stunden dauern kann.'
            };
        }
        
        const tableName = tables[0].table_name;

        // 2. Query the sum for current month
        const costQuery = `
      SELECT 
        SUM(cost) as total_cost,
        currency
      FROM \`cura-ant.gcp_billing.${tableName}\`
      WHERE invoice.month = FORMAT_DATE("%Y%m", CURRENT_DATE())
      GROUP BY currency
    `;

        const [rows] = await bigquery.query({ query: costQuery });

        if (!rows || rows.length === 0) {
            return {
                currentMonthTotal: 0,
                currency: 'EUR',
                lastUpdated: new Date()
            };
        }

        return {
            currentMonthTotal: rows[0].total_cost ? Number(rows[0].total_cost) : 0,
            currency: rows[0].currency || 'EUR',
            lastUpdated: new Date()
        };

    } catch (error) {
        console.error('BigQuery Error:', error);
        
        let errorMessage = 'Fehler beim Abruf der Daten: ' + (error as Error).message;
        if ((error as Error).message.includes('Could not load the default credentials') || (error as Error).message.includes('Failed to load credentials')) {
            errorMessage = 'Lokale Umgebung: Keine Google Cloud Authentifizierung gefunden. Die Kosten können nur in der Live-Umgebung (nach Deployment) abgerufen werden.';
        } else if ((error as Error).message.includes('bigquery.jobs.create') || (error as Error).message.includes('Access Denied')) {
            errorMessage = 'Zugriff verweigert: Bitte navigiere in der Google Cloud Console zu "IAM & Verwaltung" > "IAM". Suche nach dem Dienstkonto "firebase-app-hosting-compute@cura-ant.iam.gserviceaccount.com" (aktiviere "Von Google bereitgestellte Rollenzuweisungen einschließen" rechts oben) und weise diesem die Rollen "BigQuery-Datenbetrachter" und "BigQuery-Jobnutzer" zu.';
        }
        
        return {
            currentMonthTotal: 0,
            currency: 'EUR',
            lastUpdated: new Date(),
            error: errorMessage
        };
    }
}
