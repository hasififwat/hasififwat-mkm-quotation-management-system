import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quotations, packages, state, create, form, quotePayload } from './helpers/submission-fixtures.mjs';

for (const [name, operation] of Object.entries(quotations)) {
  if (!operation?._handler) continue;
  test(`anonymous ${name} rejects before accessing quotation data`, async () => {
    const s = state(false);
    await assert.rejects(() => operation._handler(s.ctx, {
      payload: {}, id: 'quotation:1', quotation_id: 'quotation:1', quotationId: 'quotation:1',
      paginationOpts: {cursor:null,numItems:10},
    }), /not authenticated/i);
    assert.deepEqual(s.operations, []);
  });
}

test('session actor owns create and update audit records while PIC stays editable', async () => {
  const s = state();
  s.ctx.auth.getUserIdentity = async () => ({subject:'fixture-staff|session-one'});
  const packageId = await create(s, form());
  const payload = {...quotePayload(packageId, s.tables.package_flights[0]._id), created_by:'Spoofed actor'};
  payload.reviewed_context = (await packages.listWithRooms._handler(s.ctx, {})).find(p => p._id === packageId).creation_context;
  const saved = await quotations.create._handler(s.ctx, {payload});
  const row = s.tables.quotations.find(q => q._id === saved.id);
  assert.equal(row.created_by, 'fixture-staff');
  assert.equal(row.pic_name, 'Fixture staff');
  assert.equal(s.tables.quotation_logs[0].performed_by, 'fixture-staff');
  s.ctx.auth.getUserIdentity = async () => ({subject:'second-staff|session-two'});
  await quotations.update._handler(s.ctx, {payload:{...payload,id:saved.id,pic_name:'New PIC'}});
  assert.equal(row.created_by, 'fixture-staff');
  assert.equal(row.pic_name, 'New PIC');
  assert.equal(s.tables.quotation_logs.at(-1).performed_by, 'second-staff');
  const listed = await quotations.list._handler(s.ctx, {});
  assert.equal(listed[0].id, saved.id);
  const reopened = await quotations.getQuotationFullDetails._handler(s.ctx, {target_quotation_id:saved.id});
  assert.equal(reopened.id, saved.id);
  assert.equal(reopened.client_name, 'Fixture Client');
  assert.equal(reopened.pic_name, 'New PIC');
  assert.equal(reopened.total_amount, 1200);
  assert.equal(reopened.reference_number, '1448H-0001');
  assert.equal(reopened.selected_flight.departure_date, '2027-01-01');
  await quotations.refreshSnapshot._handler(s.ctx, {quotation_id:saved.id});
  assert.equal(s.tables.quotation_logs.at(-1).performed_by, 'second-staff');
  assert.equal(s.tables.quotation_logs.at(-1).action, 'snapshot_refreshed');
  assert.equal(row.total_amount, 1200);
});

for (const [name, operation] of Object.entries(quotations)) {
  if (!operation?._handler) continue;
  test(`${name} propagates session verification errors without database access`, async () => {
    const s = state();
    s.ctx.auth.getUserIdentity = async () => { throw new Error('Session verification unavailable'); };
    await assert.rejects(() => operation._handler(s.ctx, {}), /Session verification unavailable/);
    assert.deepEqual(s.operations, []);
  });
}
