#!/usr/bin/env node
/**
 * scripts/compare-prices.js
 *
 * Compares room prices in the MASTER PRICE LIST CSV against live DB package_rooms.
 * Identifies packages where prices have changed, been added, or are missing.
 *
 * Usage:
 *   node scripts/compare-prices.js "/path/to/MASTER PRICE LIST.csv"
 *
 * Outputs:
 *   docs/price-diff.md    Human-readable price diff report
 *   docs/price-diff.csv   Machine-readable diff
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

const PRICE_LIST_CSV = process.argv[2];
if (!PRICE_LIST_CSV) {
  console.error('Usage: node scripts/compare-prices.js "/path/to/price-list.csv"');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Season detection (same as extract-price-list.js)
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
  for (const s of SEASON_CODE_MAP) {
    if (s.match.test(header)) return s.code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Package + segment → canonical DB name
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
  if (p === 'LEISURE PACKAGE')        return null;
  if (p === 'SAMBUT')                 return `SAMBUT RAMADHAN - ${s}`;
  if (p === 'AWAL')                   return `AWAL RAMADHAN - ${s}`;
  if (p === 'PERTENGAHAN')            return `PERTENGAHAN RAMADHAN - ${s}`;
  if (p === 'AKHIR')                  return `AKHIR RAMADHAN - ${s}`;
  return pkg.trim();
}

// ---------------------------------------------------------------------------
// Price list CSV parser
// Price columns (0-indexed): QDP=5, TPL=6, DBL=7, QNT=8, SGL=9
// ---------------------------------------------------------------------------
function parseCsvRow(line) {
  const fields = [];
  let field = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { fields.push(field.trim()); field = ''; continue; }
    field += ch;
  }
  fields.push(field.trim());
  return fields;
}

function parsePrice(s) {
  if (!s || s === '-' || s.toUpperCase() === 'TBA') return null;
  return parseFloat(s.replace(/,/g, '')) || null;
}

function parsePriceList(csvPath) {
  const rows = fs.readFileSync(csvPath, 'utf8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map(parseCsvRow);

  const results = [];
  let currentSeason = null;
  let lastPackage   = '';

  for (const row of rows) {
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();
    const col3 = (row[3] || '').trim();

    // Season header
    if ((col1 === 'FINAL' || col1 === 'WILL BE UPDATE') && col2.length > 0) {
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
    const pkg = lastPackage;
    if (!pkg || pkg === 'LEISURE PACKAGE') continue;

    const canon = canonicalName(pkg, col3);
    if (!canon) continue;

    const qdp = parsePrice(row[5]);
    const tpl = parsePrice(row[6]);
    const dbl = parsePrice(row[7]);
    const qnt = parsePrice(row[8]);
    const sgl = parsePrice(row[9]);

    // Skip rows with no prices at all
    if (!qdp && !tpl && !dbl && !qnt && !sgl) continue;

    results.push({
      season_code:    currentSeason,
      canonical_name: canon,
      pl_quad:        qdp,
      pl_triple:      tpl,
      pl_double:      dbl,
      pl_quint:       qnt,
      pl_single:      sgl,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fetch DB packages with rooms
// ---------------------------------------------------------------------------
function runConvex(fn, args = '{}') {
  const raw = execSync(`npx convex run ${fn} '${args}'`, {
    encoding: 'utf8', cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(raw);
}

// Room type → price list column mapping
const DB_TO_PL = {
  'Quad':   'pl_quad',
  'Triple': 'pl_triple',
  'Double': 'pl_double',
  'Quint':  'pl_quint',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const DOCS = path.join(ROOT, 'docs', 'sync-1448h');

console.log('📄 Parsing price list…');
const plRows = parsePriceList(PRICE_LIST_CSV);
// Merge rows for the same canonical_name+season (segment variants → single entry, keep highest prices)
const plMap = new Map();
for (const row of plRows) {
  const key = `${row.canonical_name.trim().toUpperCase()}|${row.season_code}`;
  const existing = plMap.get(key);
  if (!existing) {
    plMap.set(key, { ...row });
  } else {
    // Keep highest price across segment variants
    for (const f of ['pl_quad','pl_triple','pl_double','pl_quint','pl_single']) {
      if (row[f] !== null && (existing[f] === null || row[f] > existing[f])) {
        existing[f] = row[f];
      }
    }
  }
}
console.log(`   ${plMap.size} unique package×season combinations`);

console.log('🗄️  Fetching DB packages with rooms…');
const dbPackages = runConvex('packages:listWithRooms');
console.log(`   ${dbPackages.length} packages in DB`);

// Build DB room lookup: package_id → { Quad: price, Triple: price, Double: price, ... }
function getRoomPrices(pkg) {
  const result = {};
  for (const room of (pkg.rooms || [])) {
    if (room.enabled) result[room.room_type] = room.price;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------
const changed   = [];
const matched   = [];
const noDbMatch = [];
const noPlMatch = [];

// Check each price list entry against DB
for (const [key, pl] of plMap) {
  const dbPkg = dbPackages.find(p => {
    const dbKey = `${p.name.trim().toUpperCase()}|${(p.season || '').trim()}`;
    return dbKey === key;
  });

  if (!dbPkg) {
    noDbMatch.push(pl);
    continue;
  }

  const dbRooms = getRoomPrices(dbPkg);
  const diffs = [];

  for (const [roomType, plField] of Object.entries(DB_TO_PL)) {
    const plPrice = pl[plField];
    const dbPrice = dbRooms[roomType] ?? null;

    if (plPrice === null && dbPrice === null) continue;
    if (plPrice === null) continue; // not in price list, skip

    if (dbPrice === null) {
      diffs.push({ room_type: roomType, db_price: null, pl_price: plPrice, delta: null, status: 'missing_in_db' });
    } else if (plPrice !== dbPrice) {
      diffs.push({ room_type: roomType, db_price: dbPrice, pl_price: plPrice, delta: plPrice - dbPrice, status: 'changed' });
    }
  }

  const entry = {
    canonical_name: pl.canonical_name,
    season:         pl.season_code,
    db_id:          String(dbPkg._id),
    db_name:        dbPkg.name,
    db_status:      dbPkg.status,
    pl_quad:        pl.pl_quad,
    pl_triple:      pl.pl_triple,
    pl_double:      pl.pl_double,
    db_quad:        dbRooms['Quad']   ?? null,
    db_triple:      dbRooms['Triple'] ?? null,
    db_double:      dbRooms['Double'] ?? null,
    diffs,
  };

  if (diffs.length > 0) changed.push(entry);
  else matched.push(entry);
}

// DB packages with valid season but no price list entry
for (const p of dbPackages) {
  if (!p.season || p.season === p.year) continue;
  const key = `${p.name.trim().toUpperCase()}|${p.season.trim()}`;
  if (!plMap.has(key)) {
    noPlMatch.push({ db_name: p.name, season: p.season, db_id: String(p._id) });
  }
}

console.log(`\n📊 Results:`);
console.log(`   ✅ Prices match:       ${matched.length}`);
console.log(`   💰 Prices changed:     ${changed.length}`);
console.log(`   ❓ No DB package:      ${noDbMatch.length} (package not yet created)`);
console.log(`   ⚠️  No price list entry: ${noPlMatch.length}`);

// ---------------------------------------------------------------------------
// Write docs/price-diff.md
// ---------------------------------------------------------------------------
function fmt(n) { return n === null ? '—' : `RM ${n.toLocaleString()}`; }
function delta(n) {
  if (n === null) return '';
  return n > 0 ? `+RM ${n.toLocaleString()}` : `-RM ${Math.abs(n).toLocaleString()}`;
}

function writeMd() {
  const L = [];
  L.push('# Package Price Diff\n');
  L.push('Comparing **MASTER PRICE LIST MKM 1448H (2026/2027)** against live DB `package_rooms`.\n');

  L.push('## Summary\n');
  L.push('| | Count |');
  L.push('|---|---|');
  L.push(`| ✅ Prices match (no change) | ${matched.length} |`);
  L.push(`| 💰 Price changes detected | ${changed.length} |`);
  L.push(`| ❓ Package not in DB yet | ${noDbMatch.length} |`);
  L.push(`| ⚠️ In DB but not in price list | ${noPlMatch.length} |`);

  // --- CHANGED ---
  L.push('\n---\n');
  L.push('## 💰 Packages with Price Changes\n');
  if (changed.length === 0) {
    L.push('_No price changes detected._');
  } else {
    for (const pkg of changed) {
      L.push(`### ${pkg.db_name} — \`${pkg.season}\`\n`);
      L.push(`| Room Type | Current DB Price | New Price List Price | Change |`);
      L.push(`|---|---|---|---|`);

      const allRooms = ['Quad', 'Triple', 'Double'];
      for (const roomType of allRooms) {
        const plField = DB_TO_PL[roomType];
        const plPrice = pkg[`pl_${roomType.toLowerCase()}`];
        const dbPrice = pkg[`db_${roomType.toLowerCase()}`];
        if (plPrice === null && dbPrice === null) continue;

        const diff = pkg.diffs.find(d => d.room_type === roomType);
        if (diff) {
          const changeStr = diff.status === 'missing_in_db'
            ? '🆕 Not set in DB'
            : diff.delta > 0
              ? `📈 ${delta(diff.delta)}`
              : `📉 ${delta(diff.delta)}`;
          L.push(`| **${roomType}** | ${fmt(dbPrice)} | **${fmt(plPrice)}** | ${changeStr} |`);
        } else {
          L.push(`| ${roomType} | ${fmt(dbPrice)} | ${fmt(plPrice)} | ✅ Same |`);
        }
      }
      L.push('');
    }
  }

  // --- MATCHED ---
  L.push('\n---\n');
  L.push('## ✅ Packages with Matching Prices\n');
  if (matched.length === 0) {
    L.push('_None._');
  } else {
    L.push('| Package | Season | Quad | Triple | Double |');
    L.push('|---|---|---|---|---|');
    for (const pkg of matched) {
      L.push(`| ${pkg.db_name} | \`${pkg.season}\` | ${fmt(pkg.db_quad)} | ${fmt(pkg.db_triple)} | ${fmt(pkg.db_double)} |`);
    }
  }

  // --- NO DB MATCH ---
  if (noDbMatch.length > 0) {
    L.push('\n---\n');
    L.push('## ❓ Packages in Price List but Not in DB\n');
    L.push('These need to be created in Convex first.\n');
    L.push('| Canonical Name | Season | Quad | Triple | Double |');
    L.push('|---|---|---|---|---|');
    for (const pl of noDbMatch) {
      L.push(`| ${pl.canonical_name} | \`${pl.season_code}\` | ${fmt(pl.pl_quad)} | ${fmt(pl.pl_triple)} | ${fmt(pl.pl_double)} |`);
    }
  }

  // --- NO PL MATCH ---
  if (noPlMatch.length > 0) {
    L.push('\n---\n');
    L.push('## ⚠️ DB Packages Not in Price List\n');
    L.push('These DB packages have a valid season code but no matching price list entry.\n');
    L.push('| DB Name | Season | DB ID |');
    L.push('|---|---|---|');
    for (const p of noPlMatch) {
      L.push(`| ${p.db_name} | \`${p.season}\` | \`${p.db_id}\` |`);
    }
  }

  L.push('\n---\n');
  if (changed.length > 0) {
    L.push('## Next Steps\n');
    L.push(`Update the ${changed.length} packages listed above. Each package's rooms can be updated via the package edit page or via a migration script.`);
  }

  const outPath = path.join(DOCS, 'price-diff.md');
  fs.writeFileSync(outPath, L.join('\n') + '\n', 'utf8');
  console.log(`\n✓ docs/price-diff.md`);
}

// ---------------------------------------------------------------------------
// Write docs/price-diff.csv
// ---------------------------------------------------------------------------
function writeCsv() {
  const cols = ['status','db_name','season','room_type','db_price','pl_price','delta','db_id'];
  const lines = [cols.join(',')];
  const q = v => `"${(v ?? '').toString().replace(/"/g, '""')}"`;

  for (const pkg of changed) {
    for (const diff of pkg.diffs) {
      lines.push([
        q(diff.status), q(pkg.db_name), q(pkg.season),
        q(diff.room_type), diff.db_price ?? '', diff.pl_price ?? '',
        diff.delta ?? '', q(pkg.db_id),
      ].join(','));
    }
  }
  for (const pkg of matched) {
    for (const [roomType, plField] of Object.entries(DB_TO_PL)) {
      const price = pkg[`db_${roomType.toLowerCase()}`];
      if (price !== null) {
        lines.push([q('matched'), q(pkg.db_name), q(pkg.season), q(roomType), price, price, 0, q(pkg.db_id)].join(','));
      }
    }
  }
  for (const pl of noDbMatch) {
    lines.push([q('no_db_package'), q(pl.canonical_name), q(pl.season_code), q(''), '', '', '', q('')].join(','));
  }
  for (const p of noPlMatch) {
    lines.push([q('no_pl_entry'), q(p.db_name), q(p.season), q(''), '', '', '', q(p.db_id)].join(','));
  }

  const outPath = path.join(DOCS, 'price-diff.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log('✓ docs/price-diff.csv');
}

writeMd();
writeCsv();
console.log('\n✅ Done.');
