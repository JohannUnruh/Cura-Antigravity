const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const importDir = path.join(__dirname, 'import_files');
const files = ['MappeSeelsorge.xlsx', 'MappeFreizeiten.xlsx', 'MappeVorträge.xlsx'];

files.forEach(file => {
    const filePath = path.join(importDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`--- Analyzing ${file} ---`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('Headers:', jsonData[0]);
        console.log('Row 1:', jsonData[1]);
        console.log('Row 2:', jsonData[2]);
        console.log('\n');
    } else {
        console.log(`File ${file} not found.`);
    }
});
