const fs = require('fs');

const schema = JSON.parse(fs.readFileSync('g:/INTERNSHIP/rera-api/excel_schema.json', 'utf8'));

let prismaSchema = `// Auto-generated Prisma Schema based on MahaRERA_Fields.xlsx

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ReraProject {
  id           Int      @id @default(autoincrement())
  reraNumber   String   @unique
  projectId    Int      @unique // Main ID
  projectName  String?
  rawResponses Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("rera_projects")
}
`;

function guessType(field) {
    if (typeof field !== 'string') return 'Int?'; 
    const lowerField = String(field).toLowerCase();
    
    if (field === 'projectId') return 'Int';
    if (field.endsWith('Id')) return 'Int?'; 
    if (lowerField.includes('date')) return 'String?'; 
    if (field.startsWith('is')) return 'Boolean?';
    if (lowerField.includes('count') || lowerField.includes('number') || lowerField.includes('area')) return 'String?'; 
    return 'String?';
}

Object.keys(schema).forEach(sheetName => {
    // Clean table name: remove spaces, special chars
    const tableName = sheetName.replace(/[^a-zA-Z0-9_]/g, '');
    const modelName = `Rera${tableName}`; // e.g. ReraProjectGeneral

    let fields = schema[sheetName];
    // De-duplicate fields
    fields = [...new Set(fields)];

    let modelContent = `model ${modelName} {\n`;
    modelContent += `  id Int @id @default(autoincrement())\n`;

    fields.forEach(rawField => {
        // Ensure field is a valid identifier
        if (!rawField) return;
        let field = String(rawField).trim();
        // Skip if it's 'id' (we added our own) unless it's specific
        if (field.toLowerCase() === 'id') return;
        
        // Sanitize field name (Prisma needs valid identifiers)
        // If field starts with number, prefix with '_'
        if (/^\d/.test(field)) field = `_${field}`;
        field = field.replace(/[^a-zA-Z0-9_]/g, '_');

        let type = guessType(field);
        
        // Handle mapped ProjectId
        if (field === 'projectId') {
             modelContent += `  projectId Int\n`; // Not unique here, as one project can have multiple records in some tables?
             // Actually for 1:1 tables it should be unique, for 1:N not.
             // We'll treat all as 1:N relations effectively or just store the ID.
             // We won't add @relation fields yet to keep it simple and avoid circular dependency hell.
        } else {
             modelContent += `  ${field} ${type}\n`;
        }
    });

    modelContent += `  createdAt DateTime @default(now())\n`;
    modelContent += `  updatedAt DateTime @updatedAt\n`;

    // Add explicit mapping to snake_case table name
    modelContent += `\n  @@map("rera_${tableName.toLowerCase()}")\n`;
    
    // Only add index if projectId exists in fields
    if (fields.includes('projectId')) {
        modelContent += `  @@index([projectId])\n`;
    }
    
    modelContent += `}\n\n`;

    prismaSchema += modelContent;
});

fs.writeFileSync('g:/INTERNSHIP/rera-api/src/prisma/generated_schema.prisma', prismaSchema);
console.log("Generated schema saved to src/prisma/generated_schema.prisma");
