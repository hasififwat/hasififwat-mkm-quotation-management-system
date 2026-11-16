import assert from "node:assert/strict";
import { test } from "node:test";
import { create, form, quotations, reviewedQuote, state } from "./helpers/submission-fixtures.mjs";

const requestKey = "d5b28771-25d5-4dca-915f-29a006947747";

async function fixture() {
  const s = state();
  const packageId = await create(s, form());
  const flightId = s.tables.package_flights[0]._id;
  const payload = { ...await reviewedQuote(s, packageId, flightId), request_key: requestKey };
  return { s, packageId, payload };
}

test("explicit retry after a lost confirmation returns the original quotation without duplicate writes", async () => {
  const { s, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload });
  const before = structuredClone(s.tables);
  const retry = await quotations.create._handler(s.ctx, { payload });
  assert.deepEqual(structuredClone(retry), structuredClone(first), "Retry must resolve the first committed result");
  assert.deepEqual(s.tables, before, "Retry must not add quotation, item, or log records");
});

for (const [name, edit] of [
  ["notes", payload => { payload.notes = "Changed notes"; }],
  ["room quantity", payload => { payload.selected_rooms[0].pax = 2; }],
  ["reviewed package context", payload => { payload.reviewed_context = "changed"; }],
]) {
  test(`committed attempt rejects changed ${name} without returning the old record`, async () => {
    const { s, payload } = await fixture();
    await quotations.create._handler(s.ctx, { payload });
    const before = structuredClone(s.tables);
    const edited = structuredClone(payload);
    edit(edited);
    await assert.rejects(() => quotations.create._handler(s.ctx, { payload: edited }), error => error.data?.code === "QUOTATION_ATTEMPT_CONFLICT");
    assert.deepEqual(s.tables, before);
  });
}

test("new attempt permits an intentional quotation with identical content", async () => {
  const { s, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload });
  const second = await quotations.create._handler(s.ctx, { payload: { ...payload, request_key: "a60c8979-2170-45c4-89f4-582d540b2171" } });
  assert.notEqual(first.id, second.id);
  assert.equal(s.tables.quotations.length, 2);
  assert.equal(s.tables.quotation_items.length, 2);
  assert.equal(s.tables.quotation_logs.length, 2);
});

test("anonymous replay fails before database access", async () => {
  const { s, payload } = await fixture();
  await quotations.create._handler(s.ctx, { payload });
  s.operations.length = 0;
  await assert.rejects(() => quotations.create._handler({ ...s.ctx, auth: { getUserIdentity: async () => null } }, { payload }), /Not authenticated/);
  assert.deepEqual(s.operations, []);
});

test("another authenticated actor cannot replay the first actor's key", async () => {
  const { s, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload });
  const otherCtx = { ...s.ctx, auth: { getUserIdentity: async () => ({ subject: "other-staff" }) } };
  const other = await quotations.create._handler(otherCtx, { payload });
  assert.notEqual(other.id, first.id);
  assert.equal(s.tables.quotations.length, 2);
  assert.equal(s.tables.quotations[1].created_by, "other-staff");
});

test("replay resolves the committed result after package changes while a new attempt rejects stale context", async () => {
  const { s, packageId, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload });
  await s.ctx.db.patch(packageId, { archived: true, name: "Changed package" });
  const before = structuredClone(s.tables);
  const retry = await quotations.create._handler(s.ctx, { payload });
  assert.deepEqual(structuredClone(retry), structuredClone(first));
  assert.deepEqual(s.tables, before);
  await assert.rejects(() => quotations.create._handler(s.ctx, { payload: { ...payload, request_key: "a60c8979-2170-45c4-89f4-582d540b2171" } }), error => error.data?.code === "QUOTATION_SELECTION_CONFLICT");
});

test("deleted quotation cannot be recreated by a delayed retry", async () => {
  const { s, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload });
  await quotations.deleteById._handler(s.ctx, { quotationId: first.id });
  const before = structuredClone(s.tables);
  await assert.rejects(() => quotations.create._handler(s.ctx, { payload }), error => error.data?.code === "QUOTATION_ATTEMPT_CONFLICT" && /deleted/.test(error.data.message));
  assert.deepEqual(s.tables, before);
});

test("failed selection creates no receipt and the corrected same attempt can save", async () => {
  const { s, payload } = await fixture();
  await assert.rejects(() => quotations.create._handler(s.ctx, { payload: { ...payload, reviewed_context: "stale" } }), error => error.data?.code === "QUOTATION_SELECTION_CONFLICT");
  assert.equal(s.tables.quotation_create_receipts.length, 0);
  assert.equal(s.tables.quotations.length, 0);
  const saved = await quotations.create._handler(s.ctx, { payload });
  assert.equal(s.tables.quotations[0]._id, saved.id);
  assert.equal(s.tables.quotation_create_receipts.length, 1);
});

test("canonical content ignores property order and caller-supplied creator", async () => {
  const { s, payload } = await fixture();
  const first = await quotations.create._handler(s.ctx, { payload: { ...payload, created_by: "forged" } });
  const reordered = Object.fromEntries(Object.entries(payload).reverse());
  reordered.selected_rooms = payload.selected_rooms.map(row => Object.fromEntries(Object.entries(row).reverse()));
  const retry = await quotations.create._handler(s.ctx, { payload: reordered });
  assert.deepEqual(structuredClone(retry), structuredClone(first));
  assert.equal(s.tables.quotations[0].created_by, "fixture-staff");
});

for (const invalidKey of ["", "not-a-key", "a".repeat(1000)]) {
  test(`invalid request key of length ${invalidKey.length} is rejected before writes`, async () => {
    const { s, payload } = await fixture();
    const before = structuredClone(s.tables);
    await assert.rejects(() => quotations.create._handler(s.ctx, { payload: { ...payload, request_key: invalidKey } }), error => error.data?.code === "QUOTATION_ATTEMPT_CONFLICT");
    assert.deepEqual(s.tables, before);
  });
}
