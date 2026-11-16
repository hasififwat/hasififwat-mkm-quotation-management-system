import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {load, packages, quotations, state, form, create, reviewedQuote, quotePayload} from './helpers/submission-fixtures.mjs';

function equal(actual, expected) { assert.deepEqual(structuredClone(actual), structuredClone(expected)); }
const parsers = load(path.resolve('src/features/packages/sync/parsers.ts'));
function csv({qdp = '2500', tpl = '', dbl = '', sgl = ''} = {}) {
  const header = Array(33).fill('');
  header[1] = 'FINAL'; header[2] = 'MID SEASON';
  const row = Array(33).fill('');
  row[2] = 'MENARA JAM'; row[5] = qdp; row[6] = tpl; row[7] = dbl; row[8] = sgl; row[13] = '12 days';
  return `${header.join(',')}\n${row.join(',')}`;
}
async function fixture(roomType = 'Quad') {
  const s = state(); const data = form(); data.rooms[0].name = roomType;
  const id = await create(s, data);
  await s.ctx.db.patch(id, {name: 'MENARA JAM', season: 'MS - NOV', source: 'sync'});
  return {s, id, fid: s.tables.package_flights[0]._id};
}
async function plan(f, options) {
  const saved = await packages.listWithHotelsAndMeals._handler(f.s.ctx, {});
  const rows = parsers.parsePriceListCsv(csv(options), saved);
  assert.equal(rows.length, 1); assert.equal(rows[0].match_status, 'MATCHED');
  return {saved, rows, plan: parsers.buildSyncPlan(rows, [], saved)};
}
async function apply(f, spec) {
  return packages.syncPackageFromCsv._handler(f.s.ctx, {db_id: f.id, name: spec.db_name, season: spec.row.season_code, year: '2026/2027', duration: spec.row.duration, transport: spec.transport, hotels: spec.hotels, rooms: spec.rooms});
}
test('saved sync data includes room prices, labels and disabled state', async () => {
  const f = await fixture(); f.s.tables.package_rooms[0].enabled = false;
  const {saved} = await plan(f);
  equal(saved[0].rooms, [{room_type: 'Quad', price: 1200, enabled: false}]);
});
test('price-only upload plans old/new review and persists without changing historical quotation data', async () => {
  const f = await fixture();
  const q = await quotations.create._handler(f.s.ctx, {payload: await reviewedQuote(f.s, f.id, f.fid)});
  const before = structuredClone({quotes: f.s.tables.quotations, items: f.s.tables.quotation_items});
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1, 'A price-only change must be reviewed');
  const spec = p.packagesToUpdate[0];
  equal(spec.changes, [{field: 'Quad price', old: 'RM 1,200', new: 'RM 2,500'}]);
  await apply(f, spec);
  assert.equal(f.s.tables.package_rooms[0].price, 2500);
  assert.equal(f.s.tables.package_rooms[0].room_type, 'Quad');
  equal({quotes: f.s.tables.quotations, items: f.s.tables.quotation_items}, before);
  const edit = await quotations.getQuotationForEdit._handler(f.s.ctx, {target_quotation_id: q.id});
  await quotations.update._handler(f.s.ctx, {payload: {...quotePayload(f.id, f.fid), ...edit, id: q.id}});
  assert.equal(f.s.tables.quotations[0].total_amount, 1200);
  equal((await plan(f)).plan.packagesToUpdate, []);
});
test('unchanged room prices plan no update', async () => {
  const f = await fixture(); const {plan: p} = await plan(f, {qdp: '1200'});
  equal(p.packagesToUpdate, []);
});
test('blank prices retain saved and custom rooms during another field update', async () => {
  const f = await fixture();
  await f.s.ctx.db.insert('package_rooms', {package_id: f.id, room_type: 'Family', price: 3200, enabled: true});
  const before = f.s.tables.package_rooms.map(({room_type, price, enabled}) => ({room_type, price, enabled}));
  const {saved, rows} = await plan(f, {qdp: ''}); rows[0].transport = 'Train';
  const spec = parsers.buildSyncPlan(rows, [], saved).packagesToUpdate[0];
  equal(spec.rooms, before); await apply(f, spec);
  equal(f.s.tables.package_rooms.map(({room_type, price, enabled}) => ({room_type, price, enabled})), before);
});
test('disabled room prices remain untouched and do not plan a write', async () => {
  const f = await fixture(); f.s.tables.package_rooms[0].enabled = false;
  const {plan: p} = await plan(f);
  equal(p.packagesToUpdate, []);
});
for (const [stored, options] of [['QDP', {qdp: '2500'}], ['Triple', {qdp: '', tpl: '2500'}], ['Double', {qdp: '', dbl: '2500'}], ['Single', {qdp: '', sgl: '2500'}]]) {
  test(`CSV aliases retain the exact saved ${stored} label`, async () => {
    const f = await fixture(stored); const {plan: p} = await plan(f, options);
    assert.equal(p.packagesToUpdate.length, 1);
    equal(p.packagesToUpdate[0].rooms, [{room_type: stored, price: 2500, enabled: true}]);
  });
}
test('manual promotion and unsync exclusion retain their existing policies', async () => {
  const f = await fixture(); await f.s.ctx.db.patch(f.id, {source: 'manual'});
  const manual = (await plan(f)).plan;
  equal(manual.packagesToPromote, [f.id]); assert.equal(manual.packagesToUpdate.length, 1);
  await f.s.ctx.db.patch(f.id, {source: 'unsync'});
  const unsync = (await plan(f)).plan;
  equal(unsync.packagesToPromote, []); equal(unsync.packagesToUpdate, []);
});
