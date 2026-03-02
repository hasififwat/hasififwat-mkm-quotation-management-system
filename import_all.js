import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const dbFolder = './database';
const tmpFolder = path.join(dbFolder, 'tmp_import');

// Map of table -> fields that should be booleans
const BOOLEAN_FIELDS = {
  hotel_templates: ['is_enabled'],
  package_hotels: ['enabled'],
  package_rooms: ['enabled'],
  room_templates: ['default_enabled'],
};

// Map of table -> fields that should be numbers
const NUMBER_FIELDS = {
  package_rooms: ['price'],
  quotations: ['sequence_num', 'revision', 'total_amount'],
  quotation_items: ['quantity', 'unit_price', 'original_price'],
  room_templates: ['default_price', 'sort_order'],
};

// Ensure temp folder exists for sanitized CSVs
if (!fs.existsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder, { recursive: true });
}

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const sanitizeRow = (tableName, row) => {
  const booleanFields = BOOLEAN_FIELDS[tableName] ?? [];
  const numberFields = NUMBER_FIELDS[tableName] ?? [];

  for (const field of booleanFields) {
    if (field in row) {
      const parsed = parseBoolean(row[field]);
      if (parsed === undefined) {
        delete row[field];
      } else {
        row[field] = parsed;
      }
    }
  }

  for (const field of numberFields) {
    if (field in row) {
      const parsed = parseNumber(row[field]);
      if (parsed === undefined) {
        delete row[field];
      } else {
        row[field] = parsed;
      }
    }
  }

  return row;
};

const sanitizeToJsonl = (tableName, filePath) => {
  const csvText = fs.readFileSync(filePath, 'utf8');
  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length) {
    console.warn(`⚠️  ${tableName}: CSV parse warnings`, errors);
  }

  const sanitizedData = data.map((row) => sanitizeRow(tableName, { ...row }));
  const jsonl = sanitizedData.map((row) => JSON.stringify(row)).join('\n');
  const sanitizedPath = path.join(tmpFolder, `${path.parse(filePath).name}.jsonl`);
  fs.writeFileSync(sanitizedPath, jsonl, 'utf8');
  return sanitizedPath;
};

// Find all CSV files in the folder
const files = fs.readdirSync(dbFolder).filter((file) => file.endsWith('.csv'));

for (const file of files) {
  const tableName = path.parse(file).name;
  const filePath = path.join(dbFolder, file);
  const sanitizedPath = sanitizeToJsonl(tableName, filePath);

  console.log(`\n🚀 Importing ${tableName} (sanitized)...`);
  try {
    execSync(`npx convex import --table ${tableName} ${sanitizedPath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to import ${tableName}`);
  }
}

console.log('\n🎉 All tables imported successfully!');