#!/usr/bin/env node
/**
 * scripts/update-prices.js
 *
 * Updates room prices for the 15 existing packages that have price changes
 * according to the MASTER PRICE LIST CSV.
 *
 * Usage:
 *   node scripts/update-prices.js "/path/to/MASTER PRICE LIST.csv"           # dry run
 *   node scripts/update-prices.js "/path/to/MASTER PRICE LIST.csv" --apply   # apply
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const APPLY     = process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// Inline price list parsing (same logic as compare-prices.js)
// ---------------------------------------------------------------------------
const SEASON_CODE_MAP = [
  { match: /SUPER LOW SEASON/i,                code: 'SLS - JUN'        },
  { match: /LOW SEASON.*(JULY|JUL)/i,          code: 'LS - JULY TO SEP' },
  { match: /LOW SEASON.*OCT/i,                 code: 'LS - OCT'         },
  { match: /MID SEASON/i,                      code: 'MS - NOV'         },
  { match: /PRE PEAK SEASON.*(25 NOV|25-30)/i, code: 'PPS - NOV'        },
  { match: /SUPER PEAK SEASON/i,               code: 'PS - DEC'         },
  { match: /PRE PEAK SEASON.*(JAN|16)/i,       code: 'LS - JAN'         },
  { match: /RAMADHAN SEASON/i,                 code: 'RS - FEB'         },
  { match: /SYAWAL SEASON/i,                   code: 'SS - MAC'         },
];

function getSeasonCode(header) {
  for (const s of SEASON_CODE_MAP) if (s.match.test(header)) return s.code;
  return null;
}

function canonicalName(pkg, segment) {
  const p = pkg.trim().toUpperCase();
  const s = (segment || '').trim().toUpperCase();
  if (p === 'MENARA JAM') {
    if (s.includes('PREMIUM'))      return 'MENARA JAM PREMIUM';
    if (s.includes('UMJ PLUS'))     return 'UMJ PLUS';
    if (s.includes('LITE'))         return 'MENARA JAM LITE';
    if (s.includes('SENAI'))        return 'MENARA JAM SENAI';
    return 'MENARA JAM';
  }
  if (p === 'MAWADDAH') {
    if (s.includes('LITE'))         return 'MAWADDAH LITE';
    if (s.includes('MANASIK HAJI')) return 'MANASIK HAJI';
    if (s.includes('PLUS'))         return 'MAWADDAH PLUS';
    return 'MAWADDAH';
  }
  if (p === 'PLATINUM')             return 'PLATINUM';
  if (p === 'SEASONAL')             return 'MUSIM HAJI';
  if (p === 'HAJI FADHIL - EJEN')   return 'HAJI FADHIL - EJEN';
  if (p === 'UNIMAP')               return 'UNIMAP';
  if (p === 'LEISURE PACKAGE')      return null;
  if (p === 'SAMBUT')               return `SAMBUT RAMADHAN - ${s}`;
  if (p === 'AWAL')                 return `AWAL RAMADHAN - ${s}`;
  if (p === 'PERTENGAHAN')          return `PERTENGAHAN RAMADHAN - ${s}`;
  if (p === 'AKHIR')                return `AKHIR RAMADHAN - ${s}`;
  return pkg.trim();
}

function parseCsvRow(line) {
  const fields = []; let field = '', inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { fields.push(field.trim()); field = ''; continue; }
    field += ch;
  }
  fields.push(field.trim());
  return fields;
}

function parsePrice(s) {
  if (!s || s === '-' || /^tba$/i.test(s)) return null;
  return parseFloat(s.replace(/,/g, '')) || null;
}

function parsePriceList(csvPath) {
  const results = [];
  const rows = fs.readFileSync(csvPath, 'utf8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').map(parseCsvRow);

  let currentSeason = null, lastPackage = '';

  for (const row of rows) {
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();
    const col3 = (row[3] || '').trim();

    if ((col1 === 'FINAL' || col1 === 'WILL BE UPDATE') && col2) {
      const code = getSeasonCode(col2);
      if (code) currentSeason = code;
      lastPackage = '';
      continue;
    }
    if (!currentSeason) continue;
    if (['UMRAH PACKAGE', 'LEISURE PACKAGE', 'UMRAH PACKAGE (CUSTOM)', 'PACKAGE'].includes(col2)) continue;
    if (col3 === 'SEGMENT' || ['QDP', 'DBL', 'PRICE PER PAX (RM)'].includes(row[5])) continue;
    if (!col2 && !col3) continue;
    if (col2) lastPackage = col2;
    if (!lastPackage || lastPackage === 'LEISURE PACKAGE') continue;

    const canon = canonicalName(lastPackage, col3);
    if (!canon) continue;

    const qdp = parsePrice(row[5]);
    const tpl = parsePrice(row[6]);
    const dbl = parsePrice(row[7]);
    if (!qdp && !tpl && !dbl) continue;

    results.push({ season: currentSeason, canonical: canon, qdp, tpl, dbl });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Merge price list rows (same package+season may appear multiple times for segments)
// Keep the row that has the highest prices across types (most complete row)
// ---------------------------------------------------------------------------
function buildPriceMap(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.canonical.trim().toUpperCase()}|${r.season}`;
    const ex  = map.get(key);
    if (!ex) { map.set(key, { ...r }); continue; }
    if ((r.qdp ?? 0) > (ex.qdp ?? 0)) ex.qdp = r.qdp;
    if ((r.tpl ?? 0) > (ex.tpl ?? 0)) ex.tpl = r.tpl;
    if ((r.dbl ?? 0) > (ex.dbl ?? 0)) ex.dbl = r.dbl;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Fetch DB packages with rooms
// ---------------------------------------------------------------------------
function runConvex(fn, args = '{}') {
  return JSON.parse(execSync(`npx convex run ${fn} '${args}'`, {
    encoding: 'utf8', cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'],
  }));
}

function runConvexMutation(fn, argsObj) {
  const escaped = JSON.stringify(argsObj).replace(/'/g, "'\\''");
  return JSON.parse(execSync(`npx convex run ${fn} '${escaped}'`, {
    encoding: 'utf8', cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'],
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const PRICE_LIST_CSV = process.argv.find(a => !a.startsWith('-') && a.includes('.csv'));
if (!PRICE_LIST_CSV) {
  console.error('Usage: node scripts/update-prices.js "/path/to/price-list.csv" [--apply]');
  process.exit(1);
}

console.log('📄 Parsing price list…');
const plMap = buildPriceMap(parsePriceList(PRICE_LIST_CSV));

console.log('🗄️  Fetching DB packages with rooms…');
const dbPackages = runConvex('packages:listWithRoomPricesOnly');

// Room type → price list field
const ROOM_MAP = { Quad: 'qdp', Triple: 'tpl', Double: 'dbl' };

// Build update plan — only packages with a proper season code (skip 2026/2027)
const plan = [];

for (const pkg of dbPackages) {
  if (!pkg.season || pkg.season === pkg.year) continue; // skip bad-season packages

  const key    = `${pkg.name.trim().toUpperCase()}|${pkg.season.trim()}`;
  const pl     = plMap.get(key);
  if (!pl) continue; // not in price list (old naming, etc.)

  const dbRooms = Object.fromEntries(
    (pkg.rooms || []).filter(r => r.enabled).map(r => [r.room_type, r.price])
  );

  const changes = [];
  for (const [roomType, plField] of Object.entries(ROOM_MAP)) {
    const plPrice = pl[plField];
    const dbPrice = dbRooms[roomType] ?? null;
    if (plPrice === null) continue;
    if (plPrice === dbPrice) continue; // unchanged
    changes.push({ room_type: roomType, old_price: dbPrice, new_price: plPrice });
  }

  if (changes.length > 0) {
    plan.push({ pkg, changes });
  }
}

// ---------------------------------------------------------------------------
// Display plan
// ---------------------------------------------------------------------------
if (plan.length === 0) {
  console.log('\n✅ All prices are already up to date.');
  process.exit(0);
}

console.log(`\n── ${plan.length} packages to update ${'─'.repeat(50)}\n`);

for (const { pkg, changes } of plan) {
  console.log(`  ${pkg.name}  [${pkg.season}]`);
  for (const c of changes) {
    const arrow = c.new_price > (c.old_price ?? 0) ? '📈' : '📉';
    const from  = c.old_price !== null ? `RM ${c.old_price.toLocaleString()}` : 'not set';
    console.log(`    ${arrow}  ${c.room_type.padEnd(7)}  ${from.padStart(12)}  →  RM ${c.new_price.toLocaleString()}`);
  }
  console.log();
}

if (!APPLY) {
  console.log('💡 Run with --apply to write these changes to the database:');
  console.log(`   node scripts/update-prices.js "${PRICE_LIST_CSV}" --apply\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Push mutation and apply
// ---------------------------------------------------------------------------
console.log('🔧 Pushing mutation and applying…\n');
execSync('npx convex run --push packages:patchRoomPrices \'{"package_id":"dummy","prices":[]}\' 2>/dev/null || true', {
  cwd: ROOT, stdio: 'pipe',
});

let updated = 0, failed = 0;

for (const { pkg, changes } of plan) {
  try {
    const result = runConvexMutation('packages:patchRoomPrices', {
      package_id: pkg._id,
      prices: changes.map(c => ({ room_type: c.room_type, price: c.new_price })),
    });
    const statuses = result.results.map(r => `${r.room_type}: ${r.status}`).join(', ');
    console.log(`  ✓ ${pkg.name} [${pkg.season}] — ${statuses}`);
    updated++;
  } catch (err) {
    console.error(`  ✗ ${pkg.name} [${pkg.season}]: ${err.message.split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n✅ Done — ${updated} updated, ${failed} failed.`);
if (failed === 0) {
  console.log('   Re-run compare-prices.js to confirm all prices now match.\n');
}
