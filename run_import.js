const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
// We try to initialize without a service account key first, 
// if it fails we might need another approach.
try {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cura-ant'
    });
} catch (e) {
    console.error('Firebase Admin Init failed:', e.message);
}

const db = admin.firestore();
const importDir = path.join(__dirname, 'import_files');

async function getUserMapping() {
    console.log('Fetching user profiles from Firestore...');
    const snapshot = await db.collection('users').get();
    const mapping = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        const fullName = `${data.firstName} ${data.lastName}`.trim().toLowerCase();
        mapping[fullName] = doc.id;
    });
    console.log('Found users:', Object.keys(mapping));
    return mapping;
}

function excelDateToJS(serial) {
    if (!serial || isNaN(serial)) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function importSeelsorge(userMapping) {
    console.log('Importing Seelsorge...');
    const workbook = XLSX.readFile(path.join(importDir, 'MappeSeelsorge.xlsx'));
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let count = 0;
    for (const row of data) {
        const name = (row['Title'] || '').trim().toLowerCase();
        const authorId = userMapping[name] || 'unknown';

        const payload = {
            authorId,
            legacyName: row['Title'],
            dateFrom: excelDateToJS(row['Datum/von']),
            dateTo: excelDateToJS(row['Datum/bis']),
            topic: row['Problemherkunft'] || 'Bestandsdaten',
            origin: row['Problemherkunft'],
            consequence1: row['Folgeproblem1'],
            consequence2: row['Folgeproblem2'],
            consequence3: row['Folgeproblem3'],
            consequence4: row['Folgeproblem4'],
            consultationType: row['Gesprächsart'],
            durationInHours: row['Zeitaufwand/h'] || 0,
            prepTimeInHours: row['Vorbereitung/h'] || 0,
            isCGH: row['CGH?'] === 'Ja',
            targetGroup: row['Personengruppe'],
            gender: row['Geschlecht'],
            conclusion: row['Fazit/Erfolg'],
            ageGroup: row['Lebensabschnitt'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('legacy_consultations').add(payload);
        count++;
    }
    console.log(`Imported ${count} Seelsorge records.`);
}

async function importFreizeiten(userMapping) {
    console.log('Importing Freizeiten...');
    const workbook = XLSX.readFile(path.join(importDir, 'MappeFreizeiten.xlsx'));
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let count = 0;
    for (const row of data) {
        const name = (row['Title'] || '').trim().toLowerCase();
        const authorId = userMapping[name] || 'unknown';

        const payload = {
            authorId,
            title: row['Name-Freizeit'] || row['Art der Freizeit'] || 'Ohne Titel',
            retreatType: row['Art der Freizeit'],
            location: row['Ort'],
            church: row['Gemeinde'],
            participantCount: parseInt(row['Anzahl/ Teilnehmer']) || 0,
            dateFrom: excelDateToJS(row['Datum/von']),
            dateTo: excelDateToJS(row['Datum/bis']),
            durationInHours: parseFloat(row['Zeitaufwand/h']) || 0,
            prepTimeInHours: parseFloat(row['Vorbereitung/h']) || 0,
            notes: row['Notiz'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Only import if dates are valid
        if (payload.dateFrom && payload.dateTo) {
            await db.collection('retreats').add(payload);
            count++;
        }
    }
    console.log(`Imported ${count} Freizeiten records.`);
}

async function importVortraege(userMapping) {
    console.log('Importing Vorträge...');
    const workbook = XLSX.readFile(path.join(importDir, 'MappeVorträge.xlsx'));
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let count = 0;
    for (const row of data) {
        const name = (row['Title'] || '').trim().toLowerCase();
        const authorId = userMapping[name] || 'unknown';

        const payload = {
            authorId,
            topic: row['Seminar-Name'] || 'Bestandsvortrag',
            lectureType: row['Seminar-Art'],
            location: row['Ort'],
            church: row['Gemeinde'],
            participantCount: parseInt(row['Anzahl/Teilnehmer']) || 0,
            dateFrom: excelDateToJS(row['Datum/von']),
            dateTo: excelDateToJS(row['Datum/bis']),
            durationInHours: parseFloat(row['Zeitaufwand/h']) || 0,
            prepTimeInHours: parseFloat(row['Vorbereitung/h']) || 0,
            notes: row['Notiz'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (payload.dateFrom && payload.dateTo) {
            await db.collection('lectures').add(payload);
            count++;
        }
    }
    console.log(`Imported ${count} Vorträge records.`);
}

async function runImport() {
    try {
        const userMapping = await getUserMapping();
        await importSeelsorge(userMapping);
        await importFreizeiten(userMapping);
        await importVortraege(userMapping);
        console.log('DONE!');
    } catch (e) {
        console.error('Import failed:', e);
    }
}

runImport();
