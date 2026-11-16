import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { load, state, create, form, reviewedQuote, quotations, packages } from './helpers/submission-fixtures.mjs';
const revisions = load(path.resolve('convex/quotationRevisionSaves.ts'));
const clients = load(path.resolve('convex/clients.ts'));
const families = () => load(path.resolve('convex/quotationFamilies.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const page = (s, args = {}) => quotations.listPaginated._handler(s.ctx, { paginationOpts: { cursor: null, numItems: 10 }, ...args });
const append = (base, changes = {}) => ({ operation: 'append', request_key: randomUUID(), family_id: base.family_id, source_revision_id: base.id, expected_current_id: base.id, pic_name: 'Fixture', branch: 'Fixture', notes: 'saved', client: { mode: 'retain' }, selection: { mode: 'retain' }, extras: { mode: 'retain' }, ...changes });
async function fixture(count = 13) {
  const s = state();
  Object.assign(s.tables.clients[0], { created_at: '2026-11-17', updated_at: '2026-11-17', phone_number: 'fixture' });
  const pkg = await create(s, form());
  const reviewed = await reviewedQuote(s, pkg, s.tables.package_flights[0]._id);
  s.tables.quotation_revision_release.push({ _id: 'release', key: 'revision-v1', enabled: true });
  s.tables.quotation_family_migrations.push({ _id: 'migration', key: 'family-v1', done: true, cursor: null });
  const save = command => revisions.save._handler(s.ctx, { command });
  const current = [], old = [];
  for (let i = 0; i < count; i++) {
    const zero = await save({ operation: 'create', request_key: randomUUID(), pic_name: 'Fixture', branch: 'Fixture', notes: 'zero', client: { mode: 'replace', id: 'client:1' }, selection: { mode: 'replace', package_id: pkg, flight_id: reviewed.flight_id, reviewed_context: reviewed.reviewed_context, rooms: [{ room_type: 'Quad', price: 100, pax: 1 }] }, extras: { mode: 'replace', addons: [], discounts: [] } });
    const one = await save(append(zero));
    const two = await save(append(one));
    old.push(zero, one); current.push(two);
  }
  for (const quotation of s.tables.quotations) Object.assign(quotation, { created_at: '2026-11-17', updated_at: '2026-11-17' });
  return { s, pkg, save, current, old };
}

test('current family pagination covers multiple pages with tied timestamps in each sort direction', async () => {
  const { s, current, old } = await fixture();
  const before = plain(s.tables);
  for (const sortBy of ['created_at', 'updated_at']) for (const sortDir of ['asc', 'desc']) {
    const ids = []; let cursor = null;
    do {
      const result = await page(s, { paginationOpts: { cursor, numItems: 10 }, sortBy, sortDir });
      ids.push(...result.page.map(row => row.id));
      if (result.isDone) break;
      assert.equal(result.page.length, 10);
      assert.notEqual(result.continueCursor, cursor);
      cursor = result.continueCursor;
    } while (ids.length < 100);
    assert.equal(ids.length, current.length);
    assert.equal(new Set(ids).size, current.length);
    assert.deepEqual([...ids].sort(), current.map(row => row.id).sort());
    assert.ok(old.every(row => !ids.includes(row.id)));
  }
  assert.equal(await quotations.count._handler(s.ctx, {}), current.length);
  assert.equal((await quotations.list._handler(s.ctx, {})).length, current.length);
  assert.deepEqual(plain(s.tables), before);
});

test('saved labels, base and full references, package and canonical client filters agree with counts', async () => {
  const { s, pkg, current } = await fixture(2);
  const initial = (await page(s)).page[0];
  s.tables.packages[0].name = 'Renamed catalog only';
  for (const searchTerm of [initial.quotation_number, initial.quotation_number.replace(/-R\d+$/, ''), 'Fixture Client', 'Fixture Package']) {
    const result = await page(s, { searchTerm });
    assert.ok(result.page.length > 0, searchTerm);
    assert.equal(result.total, await quotations.count._handler(s.ctx, { searchTerm }));
  }
  assert.equal((await page(s, { searchTerm: 'Renamed catalog only' })).page.length, 0);
  assert.equal((await page(s, { package_id: pkg })).page.length, current.length);
  assert.equal((await page(s, { package_id: 'missing-package' })).page.length, 0);
  const second = await s.ctx.db.insert('clients', { name: 'Canonical', phone_number: 'fixture', created_at: '2026-11-17', updated_at: '2026-11-17' });
  const third = await s.ctx.db.insert('clients', { name: 'Final', phone_number: 'fixture', created_at: '2026-11-17', updated_at: '2026-11-17' });
  const before = plain(s.tables.quotations);
  await clients.mergeClients._handler(s.ctx, { canonicalId: second, duplicateIds: ['client:1'] });
  await clients.mergeClients._handler(s.ctx, { canonicalId: third, duplicateIds: [second] });
  const result = await page(s, { client_id: third });
  assert.equal(result.page.length, current.length);
  assert.ok(result.page.every(row => row.client_id === third && row.client_name === 'Fixture Client'));
  const stats = await clients.listWithStats._handler(s.ctx, {});
  assert.equal(stats.length, 1);
  assert.equal(stats[0].quotation_count, current.length);
  assert.equal(stats[0].total_quoted_value, current.length * 100);
  const detail = await clients.getWithQuotations._handler(s.ctx, { client_id: 'client:1' });
  assert.equal(detail.id, third);
  assert.equal(detail.quotations.length, current.length);
  assert.equal(detail.historical_quotations.length, current.length * 2);
  assert.deepEqual(plain(s.tables.quotations), before);
});

test('current client and package replacement moves operational totals and retains historical associations', async () => {
  const { s, pkg, save, current } = await fixture(1);
  const second = await s.ctx.db.insert('clients', { name: 'Replacement client', phone_number: 'fixture', created_at: '2026-11-17', updated_at: '2026-11-17' });
  s.tables.quotation_family_migrations.length = 0;
  const otherPackage = await create(s, { ...form(), name: 'Replacement package' });
  s.tables.quotation_family_migrations.push({ _id: 'migration', key: 'family-v1', done: true, cursor: null });
  const reviewed = await reviewedQuote(s, otherPackage, s.tables.package_flights.find(row => row.package_id === otherPackage)._id);
  const next = await save(append(current[0], { client: { mode: 'replace', id: second }, selection: { mode: 'replace', package_id: otherPackage, flight_id: reviewed.flight_id, reviewed_context: reviewed.reviewed_context, rooms: [{ room_type: 'Quad', price: 200, pax: 1 }] } }));
  const original = await clients.getWithQuotations._handler(s.ctx, { client_id: 'client:1' });
  const replacement = await clients.getWithQuotations._handler(s.ctx, { client_id: second });
  assert.equal(original.quotations.length, 0);
  assert.equal(original.historical_quotations.length, 3);
  assert.equal(replacement.quotations[0].id, next.id);
  const stats = await packages.listWithQuotationCounts._handler(s.ctx, {});
  assert.equal(stats.find(row => row.id === pkg).total, 0);
  assert.equal(stats.find(row => row.id === otherPackage).total, 1);
  assert.equal(stats.find(row => row.id === pkg).historical_total, 3);
  const history = await page(s, {package_id: pkg, visibility: 'history'});
  assert.equal(history.total, 3);
  assert.ok(history.page.every(row => row.package_id === pkg));
});

test('archive requires auth and release, preserves exact history and source rows, logs once and never promotes', async () => {
  const { s, current, old } = await fixture(1);
  const family_id = current[0].family_id;
  const before = plain(s.tables);
  const anonymous = { ...s.ctx, auth: { async getUserIdentity() { return null; } } };
  s.operations.length = 0;
  await assert.rejects(() => families().archive._handler(anonymous, { family_id }), /authenticated/i);
  assert.deepEqual(s.operations, []);
  s.tables.quotation_revision_release[0].enabled = false;
  await assert.rejects(() => families().archive._handler(s.ctx, { family_id }), /inactive|release|not enabled/i);
  s.tables.quotation_revision_release[0].enabled = true;
  await families().archive._handler(s.ctx, { family_id });
  await families().archive._handler(s.ctx, { family_id });
  assert.equal((await page(s)).page.length, 0);
  assert.equal(await quotations.count._handler(s.ctx, {}), 0);
  assert.equal(s.tables.quotation_families[0].current_revision_id, current[0].id);
  assert.equal(s.tables.quotation_logs.filter(row => row.action === 'family_archived').length, 1);
  assert.deepEqual(plain(s.tables.quotations), before.quotations);
  assert.deepEqual(plain(s.tables.quotation_items), before.quotation_items);
  const history = await families().history._handler(s.ctx, { family_id });
  assert.equal(history.revisions.length, 3);
  for (const prior of old) {
    const exact = await quotations.getQuotationFullDetails._handler(s.ctx, { target_quotation_id: prior.id });
    assert.equal(exact.id, prior.id);
    assert.equal(exact.revision_context.current_revision_id, current[0].id);
    assert.equal(exact.revision_context.can_append, false);
  }
  const archived = await page(s, { visibility: 'archived' });
  assert.equal(archived.page[0].id, current[0].id);
});

test('duplicate deletion suggestions exclude every family revision and archived legacy rows', async () => {
  const { s } = await fixture(2);
  assert.deepEqual(plain(await quotations.findDuplicates._handler(s.ctx, {})), []);
  const source = s.tables.quotations[0];
  for (const id of ['legacy-a', 'legacy-b', 'legacy-archived']) {
    const legacy = { ...plain(source), _id: id, archived: id === 'legacy-archived' };
    for (const key of ['family_id', 'frozen_document', 'document_schema_version']) delete legacy[key];
    s.tables.quotations.push(legacy);
  }
  const suggestions = await quotations.findDuplicates._handler(s.ctx, {});
  assert.equal(suggestions.length, 1);
  assert.deepEqual([...suggestions[0].quotationIds].sort(), ['legacy-a', 'legacy-b']);
});

test('ungrouped legacy compatibility and canonical client pagination survive alias suppression', async () => {
  const s = state();
  Object.assign(s.tables.clients[0], { created_at: '2026-11-17', updated_at: '2026-11-17', phone_number: 'fixture' });
  const pkg = await create(s, form());
  const zero = await quotations.create._handler(s.ctx, { payload: await reviewedQuote(s, pkg, s.tables.package_flights[0]._id) });
  assert.equal((await page(s)).page[0].id, zero.id);
  assert.equal(await quotations.count._handler(s.ctx, {}), 1);
  const canonicalIds = ['client:1'];
  for (let i = 0; i < 12; i++) {
    const canonical = await s.ctx.db.insert('clients', { name: `Canonical ${i}`, phone_number: 'fixture', created_at: '2026-11-17', updated_at: '2026-11-17' });
    const alias = await s.ctx.db.insert('clients', { name: `Alias ${i}`, phone_number: 'fixture', created_at: '2026-11-17', updated_at: '2026-11-17' });
    await s.ctx.db.insert('client_aliases', { alias_client_id: alias, canonical_client_id: canonical, updated_by: 'fixture', updated_at: '2026-11-17' });
    canonicalIds.push(canonical);
  }
  const seen = []; let cursor = null;
  do {
    const result = await clients.listWithStatsPaginated._handler(s.ctx, { paginationOpts: { cursor, numItems: 10 } });
    seen.push(...result.page.map(row => row.id));
    if (result.isDone) break;
    assert.equal(result.page.length, 10);
    cursor = result.continueCursor;
  } while (seen.length < 100);
  assert.equal(new Set(seen).size, 13);
  assert.deepEqual(seen.sort(), canonicalIds.sort());
  await quotations.archiveQuotation._handler(s.ctx, { id: zero.id });
  assert.equal(await quotations.count._handler(s.ctx, {}), 0);
  assert.equal((await clients.getWithQuotations._handler(s.ctx, { client_id: 'client:1' })).historical_quotations[0].id, zero.id);
});

test('all changed public readers authenticate before database access', async () => {
  const s = state(false);
  for (const [handler, args] of [
    [quotations.list, {}], [quotations.count, {}],
    [quotations.listPaginated, { paginationOpts: { cursor: null, numItems: 10 } }],
    [quotations.findDuplicates, {}], [clients.listWithStats, {}],
    [clients.listWithStatsPaginated, { paginationOpts: { cursor: null, numItems: 10 } }],
    [clients.getWithQuotations, { client_id: 'client:1' }], [packages.listWithQuotationCounts, {}],
    [families().history, { family_id: 'family:1' }],
  ]) {
    await assert.rejects(() => handler._handler(s.ctx, args), /authenticated/i);
    assert.deepEqual(s.operations, []);
  }
});

test('family visibility owns archive state and invalid current pointers never promote another revision', async () => {
  const { s, current } = await fixture(1);
  s.tables.quotations.find(row => row._id === current[0].id).archived = true;
  assert.equal((await page(s)).page[0].id, current[0].id);
  assert.equal((await quotations.list._handler(s.ctx, {}))[0].id, current[0].id);
  assert.equal(await quotations.count._handler(s.ctx, {}), 1);
  s.tables.quotation_families[0].current_revision_id = 'missing-revision';
  assert.equal((await page(s)).page.length, 0);
  assert.equal(await quotations.count._handler(s.ctx, {}), 0);
});
