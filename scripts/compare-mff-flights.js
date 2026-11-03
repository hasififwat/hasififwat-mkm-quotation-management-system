#!/usr/bin/env node
/**
 * scripts/compare-mff-flights.js
 *
 * Compares the MFF flight schedule CSV against live DB package_flights.
 * Identifies flights that were added, removed, or edited in the new MFF.
 *
 * Usage:
 *   node scripts/compare-mff-flights.js "/path/to/MFF VERSION 6.csv"
 *
 * Outputs:
 *   docs/flight-diff.md   Human-readable diff report
 *   docs/flight-diff.csv  Machine-readable diff
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

const MFF_CSV = process.argv[2];
if (!MFF_CSV) {
  console.error('Usage: node scripts/compare-mff-flights.js "/path/to/MFF.csv"');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Season date ranges — derived from package-mapping.csv, not hardcoded.
// This ensures the season lookup always matches the packages we actually have.
// ---------------------------------------------------------------------------
const MAPPING_CSV_PATH = path.join(ROOT, 'docs', 'sync-1448h', 'package-mapping.csv');
if (!fs.existsSync(MAPPING_CSV_PATH)) {
  console.error(`❌ package-mapping.csv not found at ${MAPPING_CSV_PATH}`);
  console.error('   Run extract-price-list.js first to generate it.');
  process.exit(1);
}

function parseMappingCsvLine(line) {
  const fields = []; let field = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { fields.push(field); field = ''; continue; }
    field += ch;
  }
  fields.push(field);
  return fields;
}

function loadSeasonRanges() {
  const lines = fs.readFileSync(MAPPING_CSV_PATH, 'utf8').trim().split('\n');
  const headers = parseMappingCsvLine(lines[0]);
  const col = (vals, name) => (vals[headers.indexOf(name)] ?? '').trim();
  const seen = new Set();
  const ranges = [];
  for (const line of lines.slice(1)) {
    const v = parseMappingCsvLine(line);
    const code  = col(v, 'season_code');
    const start = col(v, 'season_start');
    const end   = col(v, 'season_end');
    if (!code || !start || !end || seen.has(code)) continue;
    seen.add(code);
    ranges.push({ code, start, end });
  }
  return ranges.sort((a, b) => a.start.localeCompare(b.start));
}

const SEASON_RANGES = loadSeasonRanges();
console.log(`📅 Loaded ${SEASON_RANGES.length} seasons from package-mapping.csv:`);
SEASON_RANGES.forEach(s => console.log(`   ${s.code.padEnd(25)} ${s.start} → ${s.end}`));

function getSeasonCode(isoDate) {
  for (const r of SEASON_RANGES) {
    if (isoDate >= r.start && isoDate <= r.end) return r.code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// MFF package name → canonical DB name
// ---------------------------------------------------------------------------
const MFF_NAME_MAP = {
  'UMJ':                                   'MENARA JAM',
  'UMJ SV':                                'MENARA JAM',
  'UMJ P':                                 'MENARA JAM PREMIUM',
  'UMJ PREMIUM':                           'MENARA JAM PREMIUM',
  'UMJ PLUS':                              'UMJ PLUS',
  'MAWADDAH':                              'MAWADDAH',
  'MAWADDAH SV':                           'MAWADDAH',
  'MAWADDAH - SV (BRANCH SABAH GROUP)':    'MAWADDAH',
  'MAWADDAH LITE':                         'MAWADDAH LITE',
  'MANASIK':                               'MANASIK HAJI',
  'MANASIK HAJI':                          'MANASIK HAJI',
  'UMJ (TRIP HJ FADHIL PENANG)':           'HAJI FADHIL - EJEN',
};

// Packages to skip entirely
const SKIP_PATTERNS = [
  /^JUALAN TIKET/i,
  /^LEISURE /i,
  /^AMANI TRAVEL/i,
  /UMJ P --> UMJ/i,
];

function shouldSkip(pkg) {
  return SKIP_PATTERNS.some(p => p.test(pkg));
}

// ---------------------------------------------------------------------------
// Sector normalisation
// Strips airline suffix (SV, MH, EK…), removes spaces, inserts hyphen.
// KULJED → KUL-JED, KUL JED → KUL-JED, KULMED SV → KUL-MED
// ---------------------------------------------------------------------------
function normalizeSector(s) {
  s = s.trim().toUpperCase();
  s = s.replace(/\s+(SV|MH|EK|QR|TK|EY|GA|KL|CX)$/i, '').trim();
  s = s.replace(/\s+/g, '');
  if (s.length === 6 && !s.includes('-')) {
    s = s.slice(0, 3) + '-' + s.slice(3);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Date parsing:  "2-Jul-2026" → "2026-07-02"
// ---------------------------------------------------------------------------
const MONTH_MAP = {
  JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06',
  JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12',
};

function parseDate(s) {
  if (!s) return null;
  const parts = s.trim().split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const month = MONTH_MAP[m.slice(0, 3).toUpperCase()];
  if (!month) return null;
  return `${y}-${month}-${d.padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields)
// ---------------------------------------------------------------------------
function parseCsvRow(line) {
  const fields = [];
  let field = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { fields.push(field); field = ''; continue; }
    field += ch;
  }
  fields.push(field);
  return fields;
}

// ---------------------------------------------------------------------------
// Parse MFF CSV
// MFF columns (0-indexed):
//   1=CODE  2=MONTH  8=dep FLT  9=dep DATE  11=dep SECTOR
//   14=ret FLT  15=ret DATE  17=ret SECTOR  35=PACKAGE
// ---------------------------------------------------------------------------
function parseMff(csvPath) {
  const raw  = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const results = [];
  let currentCode  = '';
  let currentMonth = '';

  for (let i = 0; i < lines.length; i++) {
    if (i < 10) continue; // skip preamble + header rows

    const row = parseCsvRow(lines[i]);
    const get = (idx) => (row[idx] || '').trim();

    // Fill down CODE and MONTH
    if (get(1)) currentCode  = get(1);
    if (get(2)) currentMonth = get(2);

    const pkg      = get(35);
    const depDate  = parseDate(get(9));
    const retDate  = parseDate(get(15));
    const depFlt   = get(8);

    // Override filled-down CODE when the flight number reveals the actual airline.
    // MH charter codes are bare 4-digit numbers (e.g. 0152, 0156B).
    if (!get(1) && depFlt) {
      if (/^SV/i.test(depFlt)) currentCode = 'SV';
      else if (/^MH/i.test(depFlt) || /^\d{4}[A-Z]?$/.test(depFlt)) currentCode = 'MH';
      else if (/^WY/i.test(depFlt)) currentCode = 'OMAN';
      else if (/^EK/i.test(depFlt)) currentCode = 'EK';
    }
    const retFlt   = get(14);
    const depSec   = get(11);
    const retSec   = get(17);

    // Skip if no dates (summary/blank rows)
    if (!depDate || !retDate) continue;

    // Skip non-package rows
    if (!pkg || shouldSkip(pkg)) continue;

    const canonicalName = MFF_NAME_MAP[pkg.toUpperCase()] ?? MFF_NAME_MAP[pkg] ?? null;

    results.push({
      mff_package:      pkg,
      canonical_name:   canonicalName,
      departure_date:   depDate,
      departure_sector: depSec,
      return_date:      retDate,
      return_sector:    retSec,
      airline:          currentCode,
      month:            currentMonth,
      dep_flight:       depFlt,
      ret_flight:       retFlt,
      dep_sector_norm:  normalizeSector(depSec),
      ret_sector_norm:  normalizeSector(retSec),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fetch DB data via Convex CLI
// ---------------------------------------------------------------------------
function runConvex(fn) {
  const raw = execSync(`npx convex run ${fn}`, {
    encoding: 'utf8',
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Main comparison
// ---------------------------------------------------------------------------
const DOCS = path.join(ROOT, 'docs', 'sync-1448h');

console.log('📖 Parsing MFF…');
const mffRows = parseMff(MFF_CSV);
const unknownPkgs = [...new Set(mffRows.filter(r => !r.canonical_name).map(r => r.mff_package))];
if (unknownPkgs.length) {
  console.warn('⚠️  Unknown MFF package names (will be skipped):', unknownPkgs.join(', '));
}
const knownMff = mffRows.filter(r => r.canonical_name);
console.log(`   ${mffRows.length} MFF rows → ${knownMff.length} known packages, ${mffRows.length - knownMff.length} skipped`);

console.log('🗄️  Fetching DB packages…');
const dbPackages = runConvex('packages:list');
// Build lookup: "CANONICAL_NAME_UPPER|SEASON_CODE" → package
const pkgLookup = new Map();
for (const p of dbPackages) {
  const key = `${p.name.trim().toUpperCase()}|${(p.season || '').trim()}`;
  if (!pkgLookup.has(key)) pkgLookup.set(key, p);
}

console.log('🗄️  Fetching DB flights…');
const dbFlights = runConvex('packageFlights:listAll');
console.log(`   ${dbFlights.length} flights in DB`);

// Build DB flight lookup: "package_id|dep_date|ret_date" → flight record
const dbFlightMap = new Map();
for (const f of dbFlights) {
  const key = `${f.package_id}|${f.departure_date}|${f.return_date}`;
  dbFlightMap.set(key, f);
}

// ---------------------------------------------------------------------------
// For each MFF row, resolve DB package_id then compare
// ---------------------------------------------------------------------------
const added    = [];
const edited   = [];
const matched  = [];
const noDbPkg  = [];

for (const row of knownMff) {
  const season = getSeasonCode(row.departure_date);
  if (!season) {
    console.warn(`⚠️  No season for date ${row.departure_date} (${row.mff_package})`);
    continue;
  }

  const pkgKey = `${row.canonical_name.trim().toUpperCase()}|${season}`;
  const dbPkg  = pkgLookup.get(pkgKey);

  if (!dbPkg) {
    noDbPkg.push({ ...row, season });
    continue;
  }

  const flightKey = `${dbPkg._id}|${row.departure_date}|${row.return_date}`;
  const dbFlight  = dbFlightMap.get(flightKey);

  if (!dbFlight) {
    added.push({ ...row, season, db_package_id: dbPkg._id, db_package_name: dbPkg.name });
  } else {
    const depChanged = normalizeSector(dbFlight.departure_sector) !== row.dep_sector_norm;
    const retChanged = normalizeSector(dbFlight.return_sector)    !== row.ret_sector_norm;
    const fltChanged = (dbFlight.flight || '') !== '' && dbFlight.flight !== row.dep_flight;

    if (depChanged || retChanged || fltChanged) {
      edited.push({
        ...row,
        season,
        db_package_id:      dbPkg._id,
        db_package_name:    dbPkg.name,
        db_flight_id:       dbFlight._id,
        db_dep_sector:      dbFlight.departure_sector,
        db_ret_sector:      dbFlight.return_sector,
        db_flight:          dbFlight.flight,
        changed_dep_sector: depChanged,
        changed_ret_sector: retChanged,
        changed_flight:     fltChanged,
      });
    } else {
      matched.push({ ...row, season, db_package_id: dbPkg._id });
    }
    // Mark DB flight as seen
    dbFlightMap.delete(flightKey);
  }
}

// Remaining DB flights not matched to any MFF row = removed
const removed = [...dbFlightMap.values()].map(f => ({
  db_flight_id:       f._id,
  db_package_id:      f.package_id,
  db_package_name:    f.package_name,
  db_package_season:  f.package_season,
  db_dep_date:        f.departure_date,
  db_dep_sector:      f.departure_sector,
  db_ret_date:        f.return_date,
  db_ret_sector:      f.return_sector,
  db_flight:          f.flight,
  month:              f.month,
}));

console.log(`\n📊 Results:`);
console.log(`   ✅ Matched (unchanged): ${matched.length}`);
console.log(`   ✏️  Edited:             ${edited.length}`);
console.log(`   ➕ Added:              ${added.length}`);
console.log(`   ➖ Removed:            ${removed.length}`);
console.log(`   ❓ No DB package:      ${noDbPkg.length}`);

// ---------------------------------------------------------------------------
// Write docs/flight-diff.md
// ---------------------------------------------------------------------------
const q = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;

function writeMd() {
  const L = [];
  L.push('# MFF Flight Schedule Diff\n');
  L.push(`Compared MFF Version 6 against ${dbFlights.length} live DB flights across ${dbPackages.length} packages.\n`);

  L.push('## Summary\n');
  L.push('| Status | Count |');
  L.push('|---|---|');
  L.push(`| ✅ Unchanged | ${matched.length} |`);
  L.push(`| ✏️ Edited (sector/flight changed) | ${edited.length} |`);
  L.push(`| ➕ Added (new in MFF, not in DB) | ${added.length} |`);
  L.push(`| ➖ Removed (in DB, not in MFF) | ${removed.length} |`);
  L.push(`| ❓ MFF rows with no matching DB package | ${noDbPkg.length} |`);

  // --- EDITED ---
  L.push('\n---\n');
  L.push('## ✏️ Edited Flights\n');
  if (edited.length === 0) {
    L.push('_None._');
  } else {
    L.push('| Package | Season | Dep Date | Ret Date | DB Dep Sector | **MFF Dep Sector** | DB Ret Sector | **MFF Ret Sector** |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const r of edited) {
      const depMark = r.changed_dep_sector ? `**${r.departure_sector}**` : r.departure_sector;
      const retMark = r.changed_ret_sector ? `**${r.return_sector}**`    : r.return_sector;
      L.push(`| ${r.db_package_name} | \`${r.season}\` | ${r.departure_date} | ${r.return_date} | ${r.db_dep_sector} | ${depMark} | ${r.db_ret_sector} | ${retMark} |`);
    }
  }

  // --- ADDED ---
  L.push('\n---\n');
  L.push('## ➕ Added Flights (in MFF, not in DB)\n');
  if (added.length === 0) {
    L.push('_None._');
  } else {
    L.push('| Package | Season | Dep Date | Dep Sector | Ret Date | Ret Sector | Airline | Dep FLT |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const r of added) {
      L.push(`| ${r.db_package_name} | \`${r.season}\` | ${r.departure_date} | ${r.departure_sector} | ${r.return_date} | ${r.return_sector} | ${r.airline} | ${r.dep_flight} |`);
    }
  }

  // --- REMOVED ---
  L.push('\n---\n');
  L.push('## ➖ Removed Flights (in DB, not in MFF)\n');
  if (removed.length === 0) {
    L.push('_None._');
  } else {
    L.push('| Package | Season | Dep Date | Dep Sector | Ret Date | Ret Sector | DB ID |');
    L.push('|---|---|---|---|---|---|---|');
    for (const r of removed) {
      L.push(`| ${r.db_package_name} | \`${r.db_package_season}\` | ${r.db_dep_date} | ${r.db_dep_sector} | ${r.db_ret_date} | ${r.db_ret_sector} | \`${r.db_flight_id}\` |`);
    }
  }

  // --- NO DB PACKAGE ---
  if (noDbPkg.length > 0) {
    L.push('\n---\n');
    L.push('## ❓ MFF Rows with No Matching DB Package\n');
    L.push('These MFF flights belong to packages that do not exist in the DB yet (season not created, or name mismatch).\n');
    L.push('| MFF Package | Canonical Name | Season | Dep Date | Ret Date |');
    L.push('|---|---|---|---|---|');
    for (const r of noDbPkg) {
      L.push(`| ${r.mff_package} | ${r.canonical_name} | \`${r.season}\` | ${r.departure_date} | ${r.return_date} |`);
    }
  }

  L.push('\n---\n');
  L.push('## Next Steps\n');
  if (edited.length > 0)   L.push(`- **Fix ${edited.length} edited flights** — update departure/return sectors in DB`);
  if (added.length > 0)    L.push(`- **Import ${added.length} new flights** — add to DB via create-from-schedule or direct mutation`);
  if (removed.length > 0)  L.push(`- **Review ${removed.length} removed flights** — confirm and delete from DB (check for linked quotations first)`);
  if (noDbPkg.length > 0)  L.push(`- **Create missing packages** — ${[...new Set(noDbPkg.map(r => `${r.canonical_name} (${r.season})`))].join(', ')}`);

  const outPath = path.join(DOCS, 'flight-diff.md');
  fs.writeFileSync(outPath, L.join('\n') + '\n', 'utf8');
  console.log(`\n✓ docs/flight-diff.md`);
}

function writeCsv() {
  const cols = ['status','package_name','season','departure_date','departure_sector','return_date','return_sector',
                 'airline','dep_flight','ret_flight','db_package_id','db_flight_id','db_dep_sector','db_ret_sector','notes'];
  const lines = [cols.join(',')];

  for (const r of matched) {
    lines.push([q('unchanged'), q(r.db_package_name ?? r.canonical_name), q(r.season),
      r.departure_date, q(r.departure_sector), r.return_date, q(r.return_sector),
      q(r.airline), q(r.dep_flight), q(r.ret_flight), q(r.db_package_id), q(''), q(''), q(''), q('')].join(','));
  }
  for (const r of edited) {
    const notes = [r.changed_dep_sector && 'dep sector changed', r.changed_ret_sector && 'ret sector changed', r.changed_flight && 'flight code changed'].filter(Boolean).join('; ');
    lines.push([q('edited'), q(r.db_package_name), q(r.season),
      r.departure_date, q(r.departure_sector), r.return_date, q(r.return_sector),
      q(r.airline), q(r.dep_flight), q(r.ret_flight), q(r.db_package_id), q(r.db_flight_id), q(r.db_dep_sector), q(r.db_ret_sector), q(notes)].join(','));
  }
  for (const r of added) {
    lines.push([q('added'), q(r.db_package_name), q(r.season),
      r.departure_date, q(r.departure_sector), r.return_date, q(r.return_sector),
      q(r.airline), q(r.dep_flight), q(r.ret_flight), q(r.db_package_id), q(''), q(''), q(''), q('')].join(','));
  }
  for (const r of removed) {
    lines.push([q('removed'), q(r.db_package_name), q(r.db_package_season),
      r.db_dep_date, q(r.db_dep_sector), r.db_ret_date, q(r.db_ret_sector),
      q(''), q(''), q(''), q(r.db_package_id), q(r.db_flight_id), q(''), q(''), q('')].join(','));
  }
  for (const r of noDbPkg) {
    lines.push([q('no_db_package'), q(r.canonical_name), q(r.season),
      r.departure_date, q(r.departure_sector), r.return_date, q(r.return_sector),
      q(r.airline), q(r.dep_flight), q(r.ret_flight), q(''), q(''), q(''), q(''), q(r.mff_package)].join(','));
  }

  const outPath = path.join(DOCS, 'flight-diff.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log('✓ docs/flight-diff.csv');
}

writeMd();
writeCsv();
console.log('\n✅ Done.');
