import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quotations, state, create, form, reviewedQuote } from './helpers/submission-fixtures.mjs';

async function fixture() {
  const s = state();
  const packageId = await create(s, form());
  const payload = await reviewedQuote(s, packageId, s.tables.package_flights[0]._id);
  payload.selected_rooms[0].pax = 2;
  payload.adds_ons = [{name:'Extra luggage', price:100, pax:2}];
  payload.discounts = [{name:'Loyalty', price:50, pax:1}];
  const {id} = await quotations.create._handler(s.ctx, {payload});
  return {s, id, row:s.tables.quotations[0]};
}

async function reads(s, id) {
  const [list, page, edit, detail] = await Promise.all([
    quotations.list._handler(s.ctx, {}),
    quotations.listPaginated._handler(s.ctx, {paginationOpts:{cursor:null,numItems:10}}),
    quotations.getQuotationForEdit._handler(s.ctx, {target_quotation_id:id}),
    quotations.getQuotationFullDetails._handler(s.ctx, {target_quotation_id:id}),
  ]);
  return structuredClone({list:list.find(q => q.id === id), page:page.page.find(q => q.id === id), edit, detail});
}

async function expectWarning(s, id, expected) {
  const result = await reads(s,id);
  assert.deepEqual(result.edit.stale_fields, expected, 'edit warnings');
  assert.deepEqual(result.detail.stale_fields, expected, 'review warnings');
  assert.equal(result.list.is_stale, expected.length > 0, 'filtered-list input warning');
  assert.equal(result.page.is_stale, expected.length > 0, 'paginated-list warning');
  return result;
}

async function refresh(s, id) {
  const saved = await quotations.getQuotationForEdit._handler(s.ctx, {target_quotation_id:id});
  const review = await quotations.getSnapshotRefreshReview._handler(s.ctx, {
    quotation_id:id, expected_quotation_token:saved.snapshot_refresh_token,
  });
  return quotations.refreshSnapshot._handler(s.ctx, {
    quotation_id:id, expected_quotation_token:review.expected_quotation_token, source_context:review.source_context,
  });
}

const changes = [
  ...['name','year','duration','inclusions','exclusions'].map(field => [
    `package ${field}`, s => {s.tables.packages[0][field] = 'Changed value';}, [`package.${field}`],
  ]),
  ...['departure_date','return_date','departure_sector','return_sector'].map(field => [
    `flight ${field}`, s => {s.tables.package_flights[0][field] = 'Changed value';}, ['flight'],
  ]),
  ['meal', s => {s.tables.package_meals[0].meal_type = 'DINNER';}, ['hotels']],
  ['airline', s => {s.tables.package_flights[0].flight = 'NEW AIRLINE';}, ['flight']],
  ['month', s => {s.tables.package_flights[0].month = 'FEB';}, ['flight']],
  ['hotel name', s => {s.tables.package_hotels[0].name = 'New hotel';}, ['hotels']],
  ['hotel placeholder', s => {s.tables.package_hotels[0].placeholder = 'New placeholder';}, ['hotels']],
  ['hotel disabled', s => {s.tables.package_hotels[0].enabled = false;}, ['hotels']],
  ['last hotel removed', s => {s.tables.package_hotels.length = 0;}, ['hotels']],
  ['hotel added', s => {s.tables.package_hotels.push({...s.tables.package_hotels[0],_id:'hotel:new',hotel_type:'MADINAH'});}, ['hotels']],
  ['room disabled', s => {s.tables.package_rooms[0].enabled = false;}, ['room_pricing']],
  ['last room removed', s => {s.tables.package_rooms.length = 0;}, ['room_pricing']],
  ['room added', s => {s.tables.package_rooms.push({...s.tables.package_rooms[0],_id:'room:new',room_type:'Double'});}, ['room_pricing']],
  ['room price', s => {s.tables.package_rooms[0].price = 9000;}, ['room_pricing']],
  ['optional package field added', s => {s.tables.packages[0].package_code = 'NEW';}, ['package.code']],
  ['optional package field removed', s => {delete s.tables.packages[0].transport;}, ['package.transport']],
  ['missing flight', s => {s.tables.package_flights.length = 0;}, ['flight.removed']],
];

for (const [name, change, expected] of changes) {
  test(`${name}: all quotation readers agree and charges survive refresh`, async () => {
    const {s,id,row} = await fixture();
    await expectWarning(s,id,[]);
    const items = structuredClone(s.tables.quotation_items);
    const total = row.total_amount;
    change(s);
    await expectWarning(s,id,expected);
    if (name === 'missing flight' && quotations.getSnapshotRefreshReview) {
      const before = structuredClone(s.tables);
      await assert.rejects(() => refresh(s,id), /no longer available/i);
      assert.deepEqual(s.tables,before);
    } else {
      await refresh(s,id);
    }
    assert.deepEqual(s.tables.quotation_items,items);
    assert.equal(row.total_amount,total);
    const after = await expectWarning(s,id,name === 'missing flight' ? expected : []);
    assert.deepEqual(after.edit.selected_rooms.map(({price,pax}) => ({price,pax})), [{price:1200,pax:2}]);
    assert.equal(after.detail.total_amount,2550);
    assert.deepEqual(after.edit.adds_ons.map(({name,price,pax}) => ({name,price,pax})), [{name:'Extra luggage',price:100,pax:2}]);
    assert.deepEqual(after.edit.discounts.map(({name,price,pax}) => ({name,price,pax})), [{name:'Loyalty',price:50,pax:1}]);
  });
}

for (const missing of ['package_snapshot','flight_snapshot','hotels_snapshot','rooms']) {
  test(`legacy missing ${missing} explicitly requires verification`, async () => {
    const {s,id,row} = await fixture();
    if (missing === 'rooms') delete row.package_snapshot.rooms;
    else delete row[missing];
    await expectWarning(s,id,['snapshot.incomplete']);
    await refresh(s,id);
    await expectWarning(s,id,[]);
  });
}

test('collection enumeration and meal ordering do not produce changes', async () => {
  const {s,id} = await fixture();
  s.tables.package_meals.push({...s.tables.package_meals[0],_id:'meal:2',meal_type:'DINNER'});
  await refresh(s,id);
  s.tables.package_meals.reverse();
  s.tables.package_hotels.reverse();
  s.tables.package_rooms.reverse();
  await expectWarning(s,id,[]);
});

test('known empty hotel and room collections detect subsequent additions', async () => {
  const {s,id} = await fixture();
  const hotel = s.tables.package_hotels.pop();
  const room = s.tables.package_rooms.pop();
  await refresh(s,id);
  await expectWarning(s,id,[]);
  s.tables.package_hotels.push(hotel);
  s.tables.package_rooms.push(room);
  await expectWarning(s,id,['room_pricing','hotels']);
});

test('legacy timestamp absence does not invent an absent optional value', async () => {
  const {s,id,row} = await fixture();
  delete row.package_snapshot.package_updated_at;
  s.tables.packages[0].package_code = 'New code';
  await expectWarning(s,id,['snapshot.incomplete']);
  s.tables.packages[0].name = 'Known name changed';
  await expectWarning(s,id,['snapshot.incomplete','package.name']);
  await refresh(s,id);
  await expectWarning(s,id,[]);
});

test('removing one member of a nonempty collection is detected', async () => {
  const {s,id} = await fixture();
  s.tables.package_hotels.push({...s.tables.package_hotels[0],_id:'hotel:second',hotel_type:'MADINAH'});
  s.tables.package_rooms.push({...s.tables.package_rooms[0],_id:'room:second',room_type:'Double'});
  await refresh(s,id);
  s.tables.package_hotels.pop();
  s.tables.package_rooms.pop();
  await expectWarning(s,id,['room_pricing','hotels']);
});
