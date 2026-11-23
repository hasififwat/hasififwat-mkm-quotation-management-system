#!/usr/bin/env node

import { runStaffConvex } from './helpers/staff-convex.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const APPLY     = process.argv.includes('--apply');

const SEASON_RANGES = [
  { code: 'SLS - JUN',        start: '2026-06-18', end: '2026-06-30' },
  { code: 'LS - JULY TO SEP', start: '2026-07-01', end: '2026-09-30' },
  { code: 'LS - OCT',         start: '2026-10-01', end: '2026-10-31' },
  { code: 'MS - NOV',         start: '2026-11-01', end: '2026-11-24' },
  { code: 'PPS - NOV',        start: '2026-11-25', end: '2026-11-30' },
  { code: 'PS - DEC',         start: '2026-12-01', end: '2027-01-15' },
  { code: 'LS - JAN',         start: '2027-01-16', end: '2027-01-30' },
  { code: 'RS - FEB',         start: '2027-02-01', end: '2027-03-13' },
  { code: 'SS - MAC',         start: '2027-03-14', end: '2027-03-24' },
];

function getSeasonCode(isoDate) {
  for (const r of SEASON_RANGES) {
    if (isoDate >= r.start && isoDate <= r.end) return r.code;
  }
  return null;
}

function runConvex(fn) {
  const raw = runStaffConvex(ROOT, fn);
  return JSON.parse(raw);
}

console.log('🗄️  Fetching packages and flights…');
const packages = runConvex('packages:list');
const flights  = runConvex('packageFlights:listAll');

const flightsByPkg = new Map();
for (const f of flights) {
  const list = flightsByPkg.get(f.package_id) ?? [];
  list.push(f.departure_date);
  flightsByPkg.set(f.package_id, list);
}

const badPackages = packages.filter(p => !p.season || p.season === p.year);
console.log(`\nFound ${badPackages.length} packages with season = "${badPackages[0]?.year ?? '2026/2027'}":\n`);

const proposals = [];

for (const pkg of badPackages) {
  const pkgFlights = flightsByPkg.get(String(pkg._id)) ?? [];

  if (pkgFlights.length === 0) {
    console.log(`  ⚠️  ${pkg.name} — no flights, cannot derive season`);
    proposals.push({ pkg, derivedSeason: null, flightCount: 0 });
    continue;
  }

  const seasonCodes = [...new Set(pkgFlights.map(d => getSeasonCode(d)).filter(Boolean))];

  if (seasonCodes.length === 0) {
    console.log(`  ⚠️  ${pkg.name} — flights outside known season ranges: ${pkgFlights.join(', ')}`);
    proposals.push({ pkg, derivedSeason: null, flightCount: pkgFlights.length });
    continue;
  }

  if (seasonCodes.length > 1) {
    const counts = {};
    for (const d of pkgFlights) {
      const s = getSeasonCode(d);
      if (s) counts[s] = (counts[s] ?? 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    console.log(`  ⚠️  ${pkg.name} — flights span multiple seasons: ${seasonCodes.join(', ')} → using dominant: ${dominant}`);
    proposals.push({ pkg, derivedSeason: dominant, flightCount: pkgFlights.length, ambiguous: true });
  } else {
    proposals.push({ pkg, derivedSeason: seasonCodes[0], flightCount: pkgFlights.length });
  }
}

console.log('\n── Proposed Changes ──────────────────────────────────────────────');
console.log(`${'Package'.padEnd(45)} ${'Current'.padEnd(15)} → New Season`);
console.log('─'.repeat(80));
for (const { pkg, derivedSeason, flightCount } of proposals) {
  const flag = derivedSeason ? '' : ' ⚠️ SKIP';
  const flights_label = `(${flightCount} flights)`;
  console.log(
    `${pkg.name.padEnd(45)} ${(pkg.season ?? '').padEnd(15)} → ${derivedSeason ?? 'UNKNOWN — manual fix needed'}${flag} ${flights_label}`
  );
}

const toFix = proposals.filter(p => p.derivedSeason);
const toSkip = proposals.filter(p => !p.derivedSeason);

console.log(`\n${toFix.length} can be auto-fixed, ${toSkip.length} need manual review.`);

if (!APPLY) {
  console.log('\n💡 Run with --apply to apply these changes:');
  console.log('   node scripts/fix-package-seasons.js --apply\n');
  process.exit(0);
}

console.log('\n🔧 Applying…\n');

for (const { pkg, derivedSeason } of toFix) {
  try {
    runStaffConvex(ROOT, 'packages:patchSeason', { id: pkg._id, season: derivedSeason });
    console.log(`  ✓ ${pkg.name}: "${pkg.season}" → "${derivedSeason}"`);
  } catch (err) {
    console.error(`  ✗ ${pkg.name}: ${err.message.split('\n')[0]}`);
  }
}

if (toSkip.length > 0) {
  console.log('\n⚠️  These packages need manual season assignment:');
  for (const { pkg } of toSkip) {
    console.log(`   - ${pkg.name} (${pkg._id})`);
  }
}

console.log('\n✅ Done. Re-run compare-mff-flights.js to see the updated diff.');
