#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

process.umask(0o077);
const root = process.cwd();
const dir = path.join(root, '.next/save-local/instances/own');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const instance = readJson('instance.json');
assert.equal(instance.name, 'own');
assert.equal(instance.instanceName, 'mkm-save-recovery-own');
assert.equal(instance.cloudPort, 3420);
assert.equal(fs.realpathSync(instance.checkout), fs.realpathSync(root));
const url = 'http://127.0.0.1:3420';
const response = await fetch(`${url}/instance_name`, { signal: AbortSignal.timeout(2000) });
assert(response.ok && await response.text() === instance.instanceName, 'Expected private local backend is not running');

const require = createRequire(path.join(root, 'package.json'));
const { ConvexHttpClient } = require('convex/browser');
const { makeFunctionReference } = require('convex/server');
const fn = name => makeFunctionReference(name);
const query = (client, name, args = {}) => client.query(fn(name), args);
const mutation = (client, name, args) => client.mutation(fn(name), args);
const auth = (client, credentials, flow) => client.action(fn('auth:signIn'), {
  provider: 'password', params: { ...credentials, flow },
});
const ownerCredentials = readJson('credentials.json');
const fixture = readJson('fixture.json');
const owner = new ConvexHttpClient(url);
let ownerToken;
try { ownerToken = (await auth(owner, ownerCredentials, 'signIn'))?.tokens?.token; }
catch { throw new Error('Local owner authentication failed'); }
assert(ownerToken, 'Local owner authentication did not return a token');
owner.setAuth(ownerToken);
const peer = new ConvexHttpClient(url);
peer.setAuth(ownerToken);
const anonymous = new ConvexHttpClient(url);
const actor = new ConvexHttpClient(url);
const runId = crypto.randomUUID();
const actorCredentials = {
  email: `retry-${runId}@quote003.invalid`,
  password: crypto.randomBytes(24).toString('base64url'),
};
let actorToken;
try { actorToken = (await auth(actor, actorCredentials, 'signUp'))?.tokens?.token; }
catch { throw new Error('Synthetic actor authentication failed'); }
assert(actorToken, 'Synthetic actor authentication did not return a token');
actor.setAuth(actorToken);
const [ownerProfile, actorProfile] = await Promise.all([
  query(owner, 'profiles:getMyProfile'), query(actor, 'profiles:getMyProfile'),
]);
assert.equal(ownerProfile?.email, ownerCredentials.email);
assert.equal(actorProfile?.email, actorCredentials.email);
assert.notEqual(actorProfile.email, ownerProfile.email);

const tables = ['quotations', 'quotation_items', 'quotation_logs', 'quotation_create_receipts'];
const limit = 10000;
const cli = path.join(root, 'node_modules/convex/bin/main.js');
const cliEnv = { ...process.env };
for (const key of Object.keys(cliEnv)) {
  if (key.startsWith('CONVEX_') || key.startsWith('NEXT_PUBLIC_CONVEX_')) delete cliEnv[key];
}
cliEnv.CONVEX_SELF_HOSTED_URL = url;
cliEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = readJson('secrets.json').adminKey;
function readTable(table) {
  assert(tables.includes(table));
  const result = spawnSync(process.execPath, [cli, 'data', table, '--limit', String(limit), '--format', 'json'], {
    cwd: root, env: cliEnv, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `Local admin read failed for ${table}`);
  const rows = JSON.parse(result.stdout);
  assert(Array.isArray(rows) && rows.length < limit, `Incomplete local admin read for ${table}`);
  return rows.sort((a, b) => String(a._id).localeCompare(String(b._id)));
}
const snapshot = () => Object.fromEntries(tables.map(table => [table, readTable(table)]));
const counts = state => Object.fromEntries(tables.map(table => [table, state[table].length]));
const diff = (before, after, table) => {
  const oldRows = new Map(before[table].map(row => [row._id, row]));
  const newRows = new Map(after[table].map(row => [row._id, row]));
  for (const [id, row] of oldRows) if (newRows.has(id)) assert.deepEqual(newRows.get(id), row, `${table} changed an existing row`);
  return {
    added: [...newRows.values()].filter(row => !oldRows.has(row._id)),
    removed: [...oldRows.values()].filter(row => !newRows.has(row._id)),
  };
};
function changes(before, after, expected) {
  const result = Object.fromEntries(tables.map(table => [table, diff(before, after, table)]));
  for (const table of tables) {
    assert.equal(result[table].added.length, expected[table]?.added ?? 0, `${table} additions`);
    assert.equal(result[table].removed.length, expected[table]?.removed ?? 0, `${table} removals`);
  }
  return result;
}
const none = (before, after) => changes(before, after, {});
async function expectFailure(label, operation, predicate) {
  let error;
  try { await operation(); } catch (caught) { error = caught; }
  assert(error, `${label} unexpectedly succeeded`);
  assert(predicate(error), `${label} returned an unexpected error: ${String(error.message)}`);
}
const isCode = code => error => error?.data?.code === code || String(error?.message).includes(code);
const hasMessage = message => error => String(error?.message).includes(message);
const newRows = {
  quotations: { added: 1 }, quotation_items: { added: 3 }, quotation_logs: { added: 1 },
  quotation_create_receipts: { added: 1 },
};
function checkCreated(added, result, requestKey, packageId) {
  assert.equal(added.quotations.added[0]._id, result.id);
  const quotation = added.quotations.added[0];
  assert.equal(quotation.package_id, packageId);
  assert.equal(quotation.client_id, fixture.clientId);
  assert.equal(quotation.total_amount, 10050);
  assert.equal(result.total_amount, 10050);
  assert.equal(quotation.sequence_num, result.sequence_num);
  assert.equal(quotation.hijri_year, result.hijri_year);
  assert.equal(quotation.revision, result.revision);
  assert.equal(quotation.status, result.status);
  assert.deepEqual(added.quotation_items.added.map(item => [item.item_type, item.quantity, item.unit_price]).sort(), [
    ['addon', 1, 100], ['discount', 1, -50], ['room', 2, 5000],
  ]);
  assert(added.quotation_items.added.every(item => item.quotation_id === result.id));
  assert.equal(added.quotation_logs.added[0].quotation_id, result.id);
  assert.equal(added.quotation_logs.added[0].action, 'created');
  const receipt = added.quotation_create_receipts.added[0];
  assert.equal(receipt.actor, quotation.created_by);
  assert.equal(receipt.request_key, requestKey);
  assert.deepEqual(receipt.result, result);
  return quotation;
}

let packageId;
let baseline;
let successful = false;
let failure;
try {
  const packageInput = {
    name: `Retry verification ${runId}`, duration: '12 HARI 10 MALAM', season: '2026/2027',
    transport: 'Bus', year: '2026/2027', status: 'published', inclusions: '', exclusions: '', hotels: [],
    rooms: [{ room_type: 'Quad', price: 5000, enabled: true }],
    flights: [{ month: 'December', flight: 'VERIFY', departure_date: '2026-12-10', departure_sector: 'KUL-JED', return_date: '2026-12-22', return_sector: 'JED-KUL' }],
  };
  packageId = String((await mutation(owner, 'packages:createPackage', { payload: packageInput })).packageDocId);
  const listed = (await query(owner, 'packages:listWithRooms', {})).find(pkg => pkg._id === packageId);
  assert(listed?.creation_context && listed.flights.length === 1 && listed.rooms.length === 1, 'Synthetic package was not created correctly');
  const key = crypto.randomUUID();
  const payload = {
    pic_name: 'Retry Verification', branch: 'Local', client_id: fixture.clientId, package_id: packageId,
    flight_id: String(listed.flights[0]._id), reviewed_context: listed.creation_context, notes: `Retry verification ${runId}`,
    status: 'draft', selected_rooms: [{ room_type: 'Quad', price: 5000, pax: 2 }],
    adds_ons: [{ name: 'Synthetic add-on', price: 100, pax: 1 }],
    discounts: [{ name: 'Synthetic discount', price: 50, pax: 1 }], request_key: key,
  };
  const create = (client, value) => mutation(client, 'quotations:create', { payload: value });
  baseline = snapshot();
  let before = baseline;
  const [first, concurrent] = await Promise.all([create(owner, payload), create(peer, payload)]);
  assert.deepEqual(concurrent, first, 'Concurrent identical retries returned different results');
  let after = snapshot();
  const firstQuote = checkCreated(changes(before, after, newRows), first, key, packageId);
  console.log('PASS concurrent same-key requests return the same persisted result and create one quotation');

  before = after;
  assert.deepEqual(await create(owner, payload), first);
  after = snapshot(); none(before, after);
  console.log('PASS repeat after an uncertain response returns the exact original result without writes');

  before = after;
  await expectFailure('Same-key collision', () => create(owner, { ...payload, notes: `${payload.notes} changed` }), isCode('QUOTATION_ATTEMPT_CONFLICT'));
  after = snapshot(); none(before, after);
  console.log('PASS same key with a different payload is rejected without writes');

  before = after;
  const raceKey = crypto.randomUUID();
  const racePayloads = [
    { ...payload, request_key: raceKey, notes: `${payload.notes} race A` },
    { ...payload, request_key: raceKey, notes: `${payload.notes} race B` },
  ];
  const race = await Promise.allSettled([create(owner, racePayloads[0]), create(peer, racePayloads[1])]);
  const winnerIndex = race.findIndex(result => result.status === 'fulfilled');
  const loserIndex = race.findIndex(result => result.status === 'rejected');
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1, 'Concurrent collision must have exactly one winner');
  assert.equal(race.filter(result => result.status === 'rejected').length, 1, 'Concurrent collision must have exactly one rejection');
  assert(isCode('QUOTATION_ATTEMPT_CONFLICT')(race[loserIndex].reason), 'Concurrent collision must reject with an attempt conflict');
  const raceResult = race[winnerIndex].value;
  after = snapshot();
  const raceQuote = checkCreated(changes(before, after, newRows), raceResult, raceKey, packageId);
  assert.equal(raceQuote.notes, racePayloads[winnerIndex].notes, 'The saved quotation must match the winning payload');
  before = after;
  assert.deepEqual(await create(owner, racePayloads[winnerIndex]), raceResult);
  after = snapshot(); none(before, after);
  console.log('PASS concurrent different payloads produce one winner, one conflict, and one complete winning quotation');

  before = after;
  const distinctKey = crypto.randomUUID();
  const intentional = await create(owner, { ...payload, request_key: distinctKey });
  assert.notEqual(intentional.id, first.id);
  after = snapshot(); checkCreated(changes(before, after, newRows), intentional, distinctKey, packageId);
  console.log('PASS identical payload with a new key creates a distinct quotation');

  before = after;
  const other = await create(actor, payload);
  assert.notEqual(other.id, first.id);
  after = snapshot();
  const otherQuote = checkCreated(changes(before, after, newRows), other, key, packageId);
  assert.notEqual(otherQuote.created_by, firstQuote.created_by);
  console.log('PASS the same key is isolated between authenticated actors');

  before = after;
  await expectFailure('Anonymous replay', () => create(anonymous, payload), hasMessage('Not authenticated'));
  after = snapshot(); none(before, after);
  console.log('PASS anonymous replay is rejected without writes');

  before = after;
  const failedKey = crypto.randomUUID();
  await expectFailure('Invalid create', () => create(owner, { ...payload, request_key: failedKey, selected_rooms: [] }), hasMessage('At least one room selection is required'));
  after = snapshot(); none(before, after);
  console.log('PASS rejected create leaves no quotation, item, log, or receipt');

  before = after;
  const recovered = await create(owner, { ...payload, request_key: failedKey });
  assert.notEqual(recovered.id, first.id);
  after = snapshot(); checkCreated(changes(before, after, newRows), recovered, failedKey, packageId);
  console.log('PASS a key from a rejected create remains usable');

  before = after;
  await mutation(owner, 'packages:patchSeason', { id: packageId, season: `Changed ${runId}` });
  const changed = (await query(owner, 'packages:listWithRooms', {})).find(pkg => pkg._id === packageId);
  assert(changed?.creation_context && changed.creation_context !== payload.reviewed_context, 'Synthetic package context did not change');
  assert.deepEqual(await create(peer, payload), first);
  after = snapshot(); none(before, after);
  console.log('PASS replay returns the original result after its package context changes');

  before = after;
  await expectFailure('New create with stale context', () => create(owner, { ...payload, request_key: crypto.randomUUID() }), isCode('QUOTATION_SELECTION_CONFLICT'));
  after = snapshot(); none(before, after);
  console.log('PASS a new attempt with stale package context is rejected without writes');

  before = after;
  await mutation(owner, 'quotations:deleteById', { quotationId: first.id });
  after = snapshot();
  const removed = changes(before, after, {
    quotations: { removed: 1 }, quotation_items: { removed: 3 }, quotation_logs: { removed: 1 },
  });
  assert.equal(removed.quotations.removed[0]._id, first.id);
  assert(removed.quotation_items.removed.every(item => item.quotation_id === first.id));
  assert.equal(removed.quotation_logs.removed[0].quotation_id, first.id);
  before = after;
  await expectFailure('Replay after deletion', () => create(owner, payload), error => /QUOTATION_ATTEMPT_CONFLICT|deleted|no longer|not found/i.test(String(error?.message)) || error?.data?.code === 'QUOTATION_ATTEMPT_CONFLICT');
  after = snapshot(); none(before, after);
  console.log('PASS replay after the original is deleted is rejected and does not recreate it');
  console.log(JSON.stringify({ before: counts(baseline), afterProof: counts(after) }));
  successful = true;
} catch (error) {
  failure = error;
} finally {
  if (packageId) {
    try {
      const ownQuotes = readTable('quotations').filter(row => row.package_id === packageId);
      for (const quotation of ownQuotes) await mutation(owner, 'quotations:deleteById', { quotationId: quotation._id });
      await mutation(owner, 'packages:archivePackage', { id: packageId });
      const final = snapshot();
      assert.equal(final.quotations.filter(row => row.package_id === packageId).length, 0);
      if (baseline) {
        for (const table of ['quotations', 'quotation_items', 'quotation_logs']) assert.deepEqual(final[table], baseline[table], `${table} cleanup`);
      }
      console.log(JSON.stringify({ cleanup: 'Synthetic quotations removed; synthetic package archived', retainedReceipts: baseline ? final.quotation_create_receipts.length - baseline.quotation_create_receipts.length : null, final: counts(final) }));
    } catch (cleanupError) {
      console.error(`Cleanup failed for synthetic package ${packageId}: ${cleanupError.message}`);
      successful = false;
      failure ??= cleanupError;
    }
  }
}
if (!successful) {
  console.error(failure?.stack ?? 'Retry verification did not complete');
  process.exitCode = 1;
}
