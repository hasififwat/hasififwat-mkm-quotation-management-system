#!/usr/bin/env node
/**
 * scripts/extract-price-list.js
 *
 * Extracts all packages from the MASTER PRICE LIST CSV, generates season codes
 * following the MKM convention (LS - JULY TO SEP, MS - NOV, PS - DEC, etc.),
 * then compares against live Convex DB packages.
 *
 * Usage:
 *   node scripts/extract-price-list.js "/path/to/MASTER PRICE LIST.csv"
 *
 * Outputs:
 *   docs/season-codes.csv       Season code → date range reference
 *   docs/package-mapping.csv    Full price list × DB comparison
 *   docs/package-mapping.md     Human-readable report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRICE_LIST_CSV = process.argv[2];
if (!PRICE_LIST_CSV) {
  console.error('Usage: node scripts/extract-price-list.js "/path/to/price-list.csv"');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Season code definitions
//    Maps raw season headers from the price list → MKM season codes.
// ---------------------------------------------------------------------------
const SEASON_CODE_MAP = [
  { match: /SUPER LOW SEASON/i,                         code: 'SLS - JUN',        fullName: 'Super Low Season (Jun)',             start: '2026-06-18', end: '2026-06-30' },
  { match: /LOW SEASON.*(JULY|JUL)/i,                   code: 'LS - JULY TO SEP', fullName: 'Low Season (Jul – Sep)',              start: '2026-07-01', end: '2026-09-30' },
  { match: /LOW SEASON.*OCT/i,                          code: 'LS - OCT',         fullName: 'Low Season (Oct)',                    start: '2026-10-01', end: '2026-10-31' },
  { match: /MID SEASON/i,                               code: 'MS - NOV',         fullName: 'Mid Season (Nov 1–24)',               start: '2026-11-01', end: '2026-11-24' },
  { match: /PRE PEAK SEASON.*(25 NOV|25-30)/i,          code: 'PPS - NOV',        fullName: 'Pre-Peak Season (Nov 25–30)',         start: '2026-11-25', end: '2026-11-30' },
  { match: /SUPER PEAK SEASON/i,                        code: 'PS - DEC',         fullName: 'Super Peak Season (Dec – 15 Jan)',    start: '2026-12-01', end: '2027-01-15' },
  { match: /PRE PEAK SEASON.*(JAN|16)/i,                code: 'LS - JAN',         fullName: 'Pre-Peak / Low Season (16–30 Jan)',   start: '2027-01-16', end: '2027-01-30' },
  { match: /RAMADHAN SEASON/i,                          code: 'RS - FEB',         fullName: 'Ramadhan Season (Feb – 13 Mac)',      start: '2027-02-01', end: '2027-03-13' },
  { match: /SYAWAL SEASON/i,                            code: 'SS - MAC',         fullName: 'Syawal Season (14–24 Mac)',           start: '2027-03-14', end: '2027-03-24' },
];

function getSeasonEntry(header) {
  for (const entry of SEASON_CODE_MAP) {
    if (entry.match.test(header)) return entry;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Package + segment → canonical DB name
// ---------------------------------------------------------------------------
function canonicalName(pkg, segment) {
  const p = pkg.trim().toUpperCase();
  const s = (segment || '').trim().toUpperCase();

  if (p === 'MENARA JAM') {
    if (s.includes('PREMIUM'))        return 'MENARA JAM PREMIUM';
    if (s.includes('UMJ PLUS'))       return 'UMJ PLUS';
    if (s.includes('LITE'))           return 'MENARA JAM LITE';
    if (s.includes('SENAI'))          return 'MENARA JAM SENAI';
    return 'MENARA JAM';
  }
  if (p === 'MAWADDAH') {
    if (s.includes('LITE'))           return 'MAWADDAH LITE';
    if (s.includes('MANASIK HAJI'))   return 'MANASIK HAJI';
    if (s.includes('PLUS'))           return 'MAWADDAH PLUS';
    return 'MAWADDAH';
  }
  if (p === 'PLATINUM')               return 'PLATINUM';
  if (p === 'SEASONAL')               return 'MUSIM HAJI';
  if (p === 'HAJI FADHIL - EJEN')     return 'HAJI FADHIL - EJEN';
  if (p === 'UNIMAP')                 return 'UNIMAP';
  if (p === 'LEISURE PACKAGE')        return null; // skip — different price structure
  if (p === 'SAMBUT')                 return `SAMBUT RAMADHAN - ${s}`;
  if (p === 'AWAL')                   return `AWAL RAMADHAN - ${s}`;
  if (p === 'PERTENGAHAN')            return `PERTENGAHAN RAMADHAN - ${s}`;
  if (p === 'AKHIR')                  return `AKHIR RAMADHAN - ${s}`;
  return pkg.trim();
}

// MFF column-30 package name → canonical DB name (for later MFF normalization)
const MFF_NAME_MAP = {
  'UMJ':                               'MENARA JAM',
  'UMJ SV':                            'MENARA JAM',
  'UMJ P':                             'MENARA JAM PREMIUM',
  'UMJ PREMIUM':                       'MENARA JAM PREMIUM',
  'UMJ PLUS':                          'UMJ PLUS',
  'MAWADDAH':                          'MAWADDAH',
  'MAWADDAH SV':                       'MAWADDAH',
  'MAWADDAH - SV (BRANCH SABAH GROUP)': 'MAWADDAH',
  'MAWADDAH LITE':                     'MAWADDAH LITE',
  'MANASIK':                           'MANASIK HAJI',
  'MANASIK HAJI':                      'MANASIK HAJI',
};

// ---------------------------------------------------------------------------
// 3. Parse the price list CSV
// ---------------------------------------------------------------------------
function parseCsvRow(line) {
  const fields = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { fields.push(field.trim()); field = ''; continue; }
    field += ch;
  }
  fields.push(field.trim());
  return fields;
}

function parsePriceList(csvPath) {
  const raw  = fs.readFileSync(csvPath, 'utf8');
  const rows = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(parseCsvRow);

  const results = [];
  let currentSeason = null;
  let lastPackage   = '';

  for (const row of rows) {
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();
    const col3 = (row[3] || '').trim();

    // Season header row: col1 is FINAL or WILL BE UPDATE, col2 is the season name
    if ((col1 === 'FINAL' || col1 === 'WILL BE UPDATE') && col2.length > 0) {
      const entry = getSeasonEntry(col2);
      if (entry) { currentSeason = { ...entry, raw: col2 }; lastPackage = ''; }
      continue;
    }

    if (!currentSeason) continue;

    // Skip sub-headers and column header rows
    if (['UMRAH PACKAGE', 'LEISURE PACKAGE', 'UMRAH PACKAGE (CUSTOM)', 'PACKAGE'].includes(col2)) continue;
    if (col3 === 'SEGMENT' || ['QDP', 'DBL', 'PRICE PER PAX (RM)'].includes(row[5])) continue;
    if (!col2 && !col3) continue;

    // Fill down package name
    if (col2) lastPackage = col2;
    const pkg = lastPackage;
    if (!pkg || pkg === 'LEISURE PACKAGE') continue;

    const canon = canonicalName(pkg, col3);
    if (!canon) continue;

    const parsePrice = (s) => {
      if (!s || s === '-' || s === 'TBA') return null;
      return parseFloat(s.replace(/,/g, '')) || null;
    };

    const bus       = (row[30] || '').trim();
    const speedTrain = (row[31] || '').trim();
    let transport = '';
    if (bus === 'YES') {
      if (/BC/i.test(speedTrain))       transport = 'BAS & SPEED TRAIN (BC)';
      else if (/EY/i.test(speedTrain))  transport = 'BAS & PERCUMA SPEED TRAIN';
      else if (speedTrain === 'YES')    transport = 'BAS & SPEED TRAIN';
      else                              transport = 'BAS';
    }

    const clean = (v) => (v || '').trim().replace(/^-$/, '');

    results.push({
      season_code:         currentSeason.code,
      season_raw:          currentSeason.raw,
      season_start:        currentSeason.start,
      season_end:          currentSeason.end,
      price_list_package:  pkg,
      price_list_segment:  col3,
      canonical_name:      canon,
      qdp_price:           parsePrice(row[5]),
      tpl_price:           parsePrice(row[6]),
      dbl_price:           parsePrice(row[7]),
      sgl_price:           parsePrice(row[9]),
      duration:            (row[13] || '').trim(),
      flight:              (row[32] || '').trim(),
      has_prices:          !!(parsePrice(row[5]) || parsePrice(row[6]) || parsePrice(row[7]) || parsePrice(row[9])),
      pl_transport:        transport,
      pl_madinah_nights:   clean(row[14]),
      pl_makkah_nights:    clean(row[15]),
      pl_other1_nights:    clean(row[16]),
      pl_other2_nights:    clean(row[17]),
      pl_madinah_hotel:    clean(row[18]),
      pl_makkah_hotel:     clean(row[19]),
      pl_other1_hotel:     clean(row[20]),
      pl_other2_hotel:     clean(row[21]),
      pl_madinah_meals:    clean(row[22]),
      pl_makkah_meals:     clean(row[23]),
      pl_other1_meals:     clean(row[24]),
      pl_other2_meals:     clean(row[25]),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// 4. Fetch live DB packages via Convex CLI
// ---------------------------------------------------------------------------
function runConvex(fn) {
  const raw = execSync(`npx convex run ${fn}`, {
    encoding: 'utf8',
    cwd: path.resolve(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(raw);
}

function fetchDbPackages() {
  try {
    return runConvex('packages:list');
  } catch (err) {
    console.warn('⚠️  Could not fetch live DB packages:', err.message.split('\n')[0]);
    return [];
  }
}

function fetchDbHotelsAndMeals() {
  try {
    return runConvex('packages:listWithHotelsAndMeals');
  } catch (err) {
    console.warn('⚠️  Could not fetch hotel/meal data:', err.message.split('\n')[0]);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 5. Match price list rows to DB packages
// ---------------------------------------------------------------------------
const HOTEL_TYPES = ['makkah', 'madinah', 'aziziah', 'taif'];

function matchToDb(rows, dbPackages, dbDetails) {
  // Lookup by (canonical_name_upper + "|" + season_code)
  const lookup = new Map();
  for (const pkg of dbPackages) {
    const key = `${(pkg.name || '').trim().toUpperCase()}|${(pkg.season || '').trim()}`;
    if (!lookup.has(key)) lookup.set(key, pkg);
  }

  // Detail lookup by _id
  const detailById = new Map();
  for (const d of dbDetails) {
    detailById.set(d._id, d);
  }

  return rows.map(row => {
    const key = `${row.canonical_name.trim().toUpperCase()}|${row.season_code}`;
    const hit = lookup.get(key);
    const detail = hit ? detailById.get(hit._id) : null;

    const isMatched = !!hit;

    // For MATCHED rows: use live DB hotel/meal/transport data
    // For NEW rows: fall back to price list columns
    let transport, makkah_hotel, makkah_meals, madinah_hotel, madinah_meals, aziziah_hotel, aziziah_meals, taif_hotel, taif_meals;

    if (isMatched && detail) {
      transport = detail.transport ?? '';
      for (const type of HOTEL_TYPES) {
        const hotel = detail.hotels?.find(h => h.hotel_type === type && h.enabled);
        const name   = hotel?.name?.trim() ?? '';
        const meals  = hotel?.meals?.join('+') ?? '';
        if (type === 'makkah')   { makkah_hotel   = name; makkah_meals   = meals; }
        if (type === 'madinah')  { madinah_hotel  = name; madinah_meals  = meals; }
        if (type === 'aziziah')  { aziziah_hotel  = name; aziziah_meals  = meals; }
        if (type === 'taif')     { taif_hotel     = name; taif_meals     = meals; }
      }
    } else {
      // NEW package — pull from price list
      // NOTE: price list hotel columns (20-21) are in AZIZIAH→TAIF order,
      // but nights (16-17) and meals (24-25) are in TAIF→AZIZIAH order.
      transport     = row.pl_transport    ?? '';
      madinah_hotel = row.pl_madinah_hotel ?? '';
      makkah_hotel  = row.pl_makkah_hotel  ?? '';
      madinah_meals = row.pl_madinah_meals ?? '';
      makkah_meals  = row.pl_makkah_meals  ?? '';
      // col20=aziziah hotel, col17=aziziah nights, col25=aziziah meals
      aziziah_hotel = row.pl_other1_hotel ? `${row.pl_other1_hotel}${row.pl_other2_nights ? ` (${row.pl_other2_nights})` : ''}` : '';
      aziziah_meals = row.pl_other2_meals ?? '';
      // col21=taif hotel, col16=taif nights, col24=taif meals
      taif_hotel    = row.pl_other2_hotel ? `${row.pl_other2_hotel}${row.pl_other1_nights ? ` (${row.pl_other1_nights})` : ''}` : '';
      taif_meals    = row.pl_other1_meals ?? '';
    }

    return {
      ...row,
      db_id:        hit?._id          || '',
      db_name:      hit?.name         || '',
      db_season:    hit?.season        || '',
      db_status:    hit?.status        || '',
      db_code:      hit?.package_code  || '',
      match_status: isMatched ? 'MATCHED' : 'NEW',
      transport,
      makkah_hotel,  makkah_meals,
      madinah_hotel, madinah_meals,
      aziziah_hotel, aziziah_meals,
      taif_hotel,    taif_meals,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. Write output files
// ---------------------------------------------------------------------------
const q = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;

function writeSeasonCsv(outPath) {
  const lines = ['season_code,full_name,price_list_season,start_date,end_date'];
  for (const s of SEASON_CODE_MAP) {
    lines.push([q(s.code), q(s.fullName), q(s.raw ?? ''), s.start, s.end].join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

function writePackageCsv(rows, outPath) {
  const cols = [
    'season_code','season_raw','season_start','season_end',
    'price_list_package','price_list_segment','canonical_name',
    'qdp_price','tpl_price','dbl_price','sgl_price',
    'duration','flight','has_prices',
    'db_id','db_name','db_season','db_status','db_code','match_status',
    'transport',
    'makkah_hotel','makkah_meals',
    'madinah_hotel','madinah_meals',
    'aziziah_hotel','aziziah_meals',
    'taif_hotel','taif_meals',
  ];
  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push([
      q(r.season_code), q(r.season_raw), r.season_start, r.season_end,
      q(r.price_list_package), q(r.price_list_segment), q(r.canonical_name),
      r.qdp_price ?? '', r.tpl_price ?? '', r.dbl_price ?? '', r.sgl_price ?? '',
      q(r.duration), q(r.flight), r.has_prices,
      q(r.db_id), q(r.db_name), q(r.db_season), q(r.db_status), q(r.db_code), r.match_status,
      q(r.transport ?? ''),
      q(r.makkah_hotel ?? ''),  q(r.makkah_meals ?? ''),
      q(r.madinah_hotel ?? ''), q(r.madinah_meals ?? ''),
      q(r.aziziah_hotel ?? ''), q(r.aziziah_meals ?? ''),
      q(r.taif_hotel ?? ''),    q(r.taif_meals ?? ''),
    ].join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

function writeMappingMd(rows, dbPackages, outPath) {
  const matched   = rows.filter(r => r.match_status === 'MATCHED');
  const newPkgs   = rows.filter(r => r.match_status === 'NEW');
  const matchedIds = new Set(matched.map(r => r.db_id).filter(Boolean));
  const orphanDb  = dbPackages.filter(p => !matchedIds.has(p._id));
  const badSeason = dbPackages.filter(p => !p.season || p.season === p.year);

  const L = [];

  L.push('# Package × Season Mapping');
  L.push('\nGenerated from: **MASTER PRICE LIST MKM 1448H (2026/2027)**\n');

  L.push('## Summary\n');
  L.push('| | Count |');
  L.push('|---|---|');
  L.push(`| Price list rows (with pricing) | ${rows.length} |`);
  L.push(`| Matched to DB | ${matched.length} |`);
  L.push(`| New (not in DB yet) | ${newPkgs.length} |`);
  L.push(`| DB packages not in price list | ${orphanDb.length} |`);
  L.push(`| DB packages with bad season value | ${badSeason.length} |`);

  L.push('\n---\n');
  L.push('## Season Code Reference\n');
  L.push('| Season Code | Full Name | Start | End |');
  L.push('|---|---|---|---|');
  for (const s of SEASON_CODE_MAP) {
    L.push(`| \`${s.code}\` | ${s.fullName} | ${s.start} | ${s.end} |`);
  }
  L.push('\n> **MFF bridge rule**: given a flight `departure_date`, find the season code by checking which date range it falls into.');

  L.push('\n---\n');
  L.push('## MFF Package Name → Canonical Name\n');
  L.push('Used by the MFF normalization script to map column-30 values to canonical package names.\n');
  L.push('| MFF Name (col 30) | Canonical Name |');
  L.push('|---|---|');
  for (const [mff, canon] of Object.entries(MFF_NAME_MAP)) {
    L.push(`| \`${mff}\` | ${canon} |`);
  }

  L.push('\n---\n');
  L.push('## Matched Packages (Price List ↔ DB)\n');
  L.push('| Season Code | Canonical Name | DB Name | DB ID | Status |');
  L.push('|---|---|---|---|---|');
  for (const r of matched) {
    L.push(`| \`${r.season_code}\` | ${r.canonical_name} | ${r.db_name} | \`${r.db_id}\` | ${r.db_status} |`);
  }

  L.push('\n---\n');
  L.push('## New Packages — Need to be Created in DB\n');
  if (newPkgs.length === 0) {
    L.push('_All price list packages are already in the DB._');
  } else {
    L.push('| Season | Canonical Name | Price List Package | Segment | QDP | DBL | Prices? |');
    L.push('|---|---|---|---|---|---|---|');
    for (const r of newPkgs) {
      const prices = r.has_prices ? '✓' : '⚠️ TBA';
      L.push(`| \`${r.season_code}\` | **${r.canonical_name}** | ${r.price_list_package} | ${r.price_list_segment} | ${r.qdp_price ?? '—'} | ${r.dbl_price ?? '—'} | ${prices} |`);
    }
    L.push('\n> Create these packages in Convex before running the MFF normalization.');
  }

  L.push('\n---\n');
  L.push('## DB Packages Not Found in Price List\n');
  if (orphanDb.length === 0) {
    L.push('_None._');
  } else {
    L.push('| DB Name | Season | Status | Note |');
    L.push('|---|---|---|---|');
    for (const p of orphanDb) {
      const note = (!p.season || p.season === p.year) ? '⚠️ Bad season value' : '';
      L.push(`| ${p.name} | \`${p.season ?? ''}\` | ${p.status} | ${note} |`);
    }
  }

  if (badSeason.length > 0) {
    L.push('\n---\n');
    L.push('## DB Packages with Bad Season Value\n');
    L.push(`Season field is set to the year (\`${badSeason[0]?.year}\`) instead of a season code. These need to be corrected.\n`);
    L.push('| DB Name | Current Season | Suggested Fix |');
    L.push('|---|---|---|');
    for (const p of badSeason) {
      L.push(`| ${p.name} | \`${p.season ?? ''}\` | Update to correct season code |`);
    }
  }

  L.push('\n---\n');
  L.push('## Next Steps\n');
  L.push(`1. **Fix bad season values** — update the ${badSeason.length} DB packages that have \`season = "2026/2027"\``);
  L.push(`2. **Create missing packages** — add the ${newPkgs.length} packages marked NEW above to Convex`);
  L.push('3. **Backfill \`package_code\`** — set a short slug on each package (e.g. `menara-jam`, `mawaddah-lite`)');
  L.push('4. **Run MFF normalization** using `docs/season-codes.csv` as the date → season lookup and `docs/package-mapping.csv` as the canonical name → DB ID lookup');

  fs.writeFileSync(outPath, L.join('\n') + '\n', 'utf8');
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const docsDir = path.resolve(__dirname, '..', 'docs', 'sync-1448h');

console.log('📄 Parsing price list…');
const allRows = parsePriceList(PRICE_LIST_CSV);
const priceListRows = allRows.filter(r => r.has_prices);
const skipped = allRows.length - priceListRows.length;
const seasons = new Set(priceListRows.map(r => r.season_code));
console.log(`   ${priceListRows.length} package rows across ${seasons.size} seasons (${skipped} without pricing skipped): ${[...seasons].join(', ')}`);

console.log('🗄️  Fetching DB packages…');
const dbPackages = fetchDbPackages();
console.log(`   ${dbPackages.length} packages in DB`);

console.log('🏨 Fetching hotel/meal/transport data…');
const dbDetails = fetchDbHotelsAndMeals();
console.log(`   ${dbDetails.length} packages with detail data`);

console.log('🔗 Matching…');
const enriched = matchToDb(priceListRows, dbPackages, dbDetails);
const matchCount = enriched.filter(r => r.match_status === 'MATCHED').length;
const newCount   = enriched.filter(r => r.match_status === 'NEW').length;
console.log(`   ${matchCount} matched, ${newCount} new`);

console.log('📝 Writing outputs…');
writeSeasonCsv(path.join(docsDir, 'season-codes.csv'));
writePackageCsv(enriched, path.join(docsDir, 'package-mapping.csv'));
writeMappingMd(enriched, dbPackages, path.join(docsDir, 'package-mapping.md'));

console.log('\n✅ Done.');
