const XLSX = require('xlsx');
const fs = require('fs');

try {
    const workbook = XLSX.readFile('g:/INTERNSHIP/rera-api/MahaRERA_Fields.xlsx');
    console.log("Sheet Names:", workbook.SheetNames);
    
    const schema = {};
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});
        
        if (jsonData.length > 0) {
           // Skip header row, take first column
           const fieldNames = jsonData.slice(1).map(row => row[0]).filter(name => name);
           schema[sheetName] = fieldNames;
        }
    });
    fs.writeFileSync('g:/INTERNSHIP/rera-api/excel_schema.json', JSON.stringify(schema, null, 2));
    console.log("Schema written to excel_schema.json");
} catch (error) {
    console.error("Error reading excel:", error.message);
}
