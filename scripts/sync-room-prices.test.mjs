import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {load, packages, quotations, state, form, create, read, reviewedQuote, quotePayload} from './helpers/submission-fixtures.mjs';

function equal(actual, expected) { assert.deepEqual(structuredClone(actual), structuredClone(expected)); }
const parsers = load(path.resolve('src/features/packages/sync/parsers.ts'));
function csv({qdp = '2500', tpl = '', dbl = '', sgl = ''} = {}) {
  const header = Array(33).fill('');
  header[1] = 'FINAL'; header[2] = 'MID SEASON';
  const row = Array(33).fill('');
  row[2] = 'MENARA JAM'; row[5] = qdp; row[6] = tpl; row[7] = dbl; row[9] = sgl; row[13] = '12 days';
  return `${header.join(',')}\n${row.join(',')}`;
}
async function fixture(roomType = 'Quad', hotels = form().hotels) {
  const s = state(); const data = form(); data.rooms[0].name = roomType; data.hotels = hotels;
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
  return packages.syncPackageFromCsv._handler(f.s.ctx, {db_id: f.id, expected_edit_token: spec.expected_edit_token, name: spec.db_name, season: spec.row.season_code, year: '2026/2027', duration: spec.row.duration, transport: spec.transport, hotels: spec.hotel_updates, rooms: spec.rooms});
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
  await quotations.update._handler(f.s.ctx, {payload: {...quotePayload(f.id, f.fid), ...edit, id: q.id, expected_quotation_token: edit.snapshot_refresh_token}});
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
  await f.s.ctx.db.insert('package_rooms', {package_id: f.id, room_type: 'Triple', price: 1500, enabled: true});
  const before = f.s.tables.package_rooms.map(({room_type, price, enabled}) => ({room_type, price, enabled}));
  const {saved, rows} = await plan(f, {qdp: '', tpl: '1500'}); rows[0].transport = 'Train';
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

test('changed-price apply retains custom and disabled rooms and adds absent types', async () => {
  const f = await fixture();
  await f.s.ctx.db.insert('package_rooms', {package_id: f.id, room_type: 'Triple', price: 1500, enabled: false});
  await f.s.ctx.db.insert('package_rooms', {package_id: f.id, room_type: 'Family', price: 1900, enabled: true});
  const {plan: p} = await plan(f, {tpl: '9999', dbl: '3000'});
  assert.equal(p.packagesToUpdate.length, 1);
  const expected = [
    {room_type: 'Quad', price: 2500, enabled: true},
    {room_type: 'Triple', price: 1500, enabled: false},
    {room_type: 'Family', price: 1900, enabled: true},
    {room_type: 'DBL', price: 3000, enabled: true},
  ];
  equal(p.packagesToUpdate[0].rooms, expected);
  await apply(f, p.packagesToUpdate[0]);
  equal(f.s.tables.package_rooms.map(({room_type, price, enabled}) => ({room_type, price, enabled})), expected);
});

const preservedHotels = [
  {hotel_type: 'MAKKAH', name: 'Fairmont Makkah', enabled: false, placeholder: 'Custom Makkah placeholder', meals: ['BREAKFAST']},
  {hotel_type: 'Madinah', name: 'Anwar Madinah', enabled: true, placeholder: 'Enter Madinah hotel', meals: ['BREAKFAST', 'DINNER']},
  {hotel_type: 'AZIZIAH', name: '', enabled: false, placeholder: 'Enter Aziziah hotel', meals: []},
  {hotel_type: 'JEDDAH', name: 'Jeddah Transit', enabled: true, placeholder: 'Enter Jeddah', meals: ['BREAKFAST']},
];
async function savedHotels(f) {
  const saved = await read(f.s, f.id);
  return saved.hotels.map(({_id, hotel_type, name, enabled, placeholder, meals}) => ({_id, hotel_type, name, enabled, placeholder, meals}));
}
test('sync review query includes enabled and placeholder for every saved hotel', async () => {
  const f = await fixture('Quad', preservedHotels);
  const saved = await packages.listWithHotelsAndMeals._handler(f.s.ctx, {});
  equal(saved[0].hotels.map(({hotel_type, name, enabled, placeholder, meals}) => ({hotel_type, name, enabled, placeholder, meals})), preservedHotels);
});
test('price-only sync review lists only the approved room price change', async () => {
  const f = await fixture('Quad', preservedHotels);
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1);
  equal(p.packagesToUpdate[0].changes, [{field: 'Quad price', old: 'RM 1,200', new: 'RM 2,500'}]);
});
test('price-only sync apply preserves every hotel row and its metadata', async () => {
  const f = await fixture('Quad', preservedHotels);
  const before = await savedHotels(f);
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1);
  await apply(f, p.packagesToUpdate[0]);
  assert.equal(f.s.tables.package_rooms[0].price, 2500);
  equal(await savedHotels(f), before);
});
test('price-only manual import preserves the disabled hotel without inventing MADINAH', async () => {
  const f = await fixture('Quad', [preservedHotels[0]]);
  await f.s.ctx.db.patch(f.id, {source: 'manual'});
  const before = await savedHotels(f);
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1);
  equal(p.packagesToUpdate[0].changes, [{field: 'Quad price', old: 'RM 1,200', new: 'RM 2,500'}]);
  await apply(f, p.packagesToUpdate[0]);
  assert.equal(f.s.tables.package_rooms[0].price, 2500);
  equal(await savedHotels(f), before);
});
test('reviewed hotel mapping edits preserve metadata and untouched hotel rows', async () => {
  const f = await fixture('Quad', [
    preservedHotels[0],
    {...preservedHotels[1], meals: ['BREAKFAST']},
    {...preservedHotels[2], name: 'Aziziah Stay'},
  ]);
  const before = await savedHotels(f);
  const {saved, rows} = await plan(f, {qdp: '1200'});
  const mapping = {...rows[0], makkah_hotel: 'Swissotel Makkah', madinah_meals: 'HB', taif_hotel: 'Taif Stay'};
  const mappingCsv = `${Object.keys(mapping).join(',')}\n${Object.values(mapping).map(value => value ?? '').join(',')}`;
  const p = parsers.buildSyncPlan(parsers.parsePackageMappingCsv(mappingCsv), [], saved);
  assert.equal(p.packagesToUpdate.length, 1);
  equal(p.packagesToUpdate[0].changes, [
    {field: 'MAKKAH hotel', old: 'Fairmont Makkah', new: 'Swissotel Makkah'},
    {field: 'MADINAH meals', old: 'BB', new: 'HB'},
    {field: 'TAIF hotel', old: '—', new: 'Taif Stay'},
  ]);
  await apply(f, p.packagesToUpdate[0]);
  const after = await savedHotels(f);
  equal(after.filter(hotel => hotel.hotel_type !== 'TAIF'), [
    {...before[0], name: 'Swissotel Makkah'},
    {...before[1], meals: ['BREAKFAST', 'DINNER']},
    before[2],
  ]);
  assert.equal(after.length, 4);
  const taif = after.find(hotel => hotel.hotel_type === 'TAIF');
  assert.ok(taif?._id);
  const {_id, ...taifFields} = taif;
  equal(taifFields, {hotel_type: 'TAIF', name: 'Taif Stay', enabled: true, placeholder: '', meals: []});
});
test('price-only sync preserves saved shorthand meals without expanding them', async () => {
  const f = await fixture('Quad', [
    {hotel_type: 'MAKKAH', name: 'Fairmont Makkah', enabled: true, placeholder: 'Enter Makkah hotel', meals: ['BB']},
  ]);
  const before = await savedHotels(f);
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1);
  equal(p.packagesToUpdate[0].changes, [{field: 'Quad price', old: 'RM 1,200', new: 'RM 2,500'}]);
  equal(p.packagesToUpdate[0].hotel_updates, []);
  await apply(f, p.packagesToUpdate[0]);
  assert.equal(f.s.tables.package_rooms[0].price, 2500);
  equal(await savedHotels(f), before);
});
test('price-only sync succeeds and preserves duplicate saved hotel types', async () => {
  const f = await fixture('Quad', [
    {hotel_type: 'MAKKAH', name: 'Fairmont Makkah', enabled: false, placeholder: 'Primary Makkah', meals: ['BREAKFAST']},
    {hotel_type: 'MAKKAH', name: 'Swissotel Makkah', enabled: true, placeholder: 'Secondary Makkah', meals: ['DINNER']},
    {hotel_type: 'JEDDAH', name: 'Jeddah Transit A', enabled: true, placeholder: 'First Jeddah', meals: ['BREAKFAST']},
    {hotel_type: 'JEDDAH', name: 'Jeddah Transit B', enabled: false, placeholder: 'Second Jeddah', meals: []},
  ]);
  const before = await savedHotels(f);
  const {plan: p} = await plan(f);
  assert.equal(p.packagesToUpdate.length, 1);
  equal(p.packagesToUpdate[0].changes, [{field: 'Quad price', old: 'RM 1,200', new: 'RM 2,500'}]);
  equal(p.packagesToUpdate[0].hotel_updates, []);
  await apply(f, p.packagesToUpdate[0]);
  assert.equal(f.s.tables.package_rooms[0].price, 2500);
  equal(await savedHotels(f), before);
});
