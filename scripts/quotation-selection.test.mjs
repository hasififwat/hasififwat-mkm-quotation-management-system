import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  create, form, load, packages, quotations, quotePayload, state,
} from "./helpers/submission-fixtures.mjs";

async function fixture() {
  const s = state();
  const packageId = await create(s, form());
  const displayed = (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === packageId);
  const payload = quotePayload(packageId, displayed.flights[0]._id, "Quad", 1111.25);
  payload.reviewed_context = displayed.creation_context;
  payload.notes = "Keep this draft";
  payload.selected_rooms[0].pax = 2;
  payload.adds_ons = [{ name: "Transfer", price: 10.25, pax: 2 }];
  payload.discounts = [{ name: "Promo", price: 0.25, pax: 2 }];
  return { s, packageId, displayed, payload };
}

async function rejectsWithoutWrites(s, payload) {
  const before = structuredClone(s.tables);
  s.operations.length = 0;
  await assert.rejects(() => quotations.create._handler(s.ctx, { payload }), /changed|unavailable|review|conflict|archived|disabled|not found|does not exist/i);
  assert.deepEqual(s.tables, before, "A rejected selection must leave all records unchanged");
  assert.deepEqual(s.operations.filter(([op]) => ["insert", "patch", "delete"].includes(op)), []);
}

for (const [name, change] of [
  ["package name", ({ s }) => s.ctx.db.patch(s.tables.packages[0]._id, { name: "Changed package" })],
  ["package duration", ({ s }) => s.ctx.db.patch(s.tables.packages[0]._id, { duration: "15 days" })],
  ["selected room price without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_rooms[0]._id, { price: 1500 })],
  ["departure date without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_flights[0]._id, { departure_date: "2027-01-05" })],
  ["return date without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_flights[0]._id, { return_date: "2027-01-15" })],
  ["departure sector without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_flights[0]._id, { departure_sector: "KUL-MED" })],
  ["return sector without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_flights[0]._id, { return_sector: "MED-KUL" })],
  ["flight code without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_flights[0]._id, { flight: "MH999" })],
  ["hotel name without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_hotels[0]._id, { name: "Changed hotel" })],
  ["meal without parent timestamp change", ({ s }) => s.ctx.db.patch(s.tables.package_meals[0]._id, { meal_type: "DINNER" })],
  ["archived package", ({ s, packageId }) => packages.archivePackage._handler(s.ctx, { id: packageId })],
  ["disabled selected room", ({ s }) => s.ctx.db.patch(s.tables.package_rooms[0]._id, { enabled: false })],
  ["removed selected room", ({ s }) => s.ctx.db.delete(s.tables.package_rooms[0]._id)],
  ["removed selected flight", ({ s }) => s.ctx.db.delete(s.tables.package_flights[0]._id)],
]) {
  test(`creation rejects changed ${name} before any writes`, async () => {
    const data = await fixture();
    const parentTimestamp = data.s.tables.packages[0].updated_at;
    await change(data);
    if (name.includes("without parent timestamp change")) assert.equal(data.s.tables.packages[0].updated_at, parentTimestamp);
    await rejectsWithoutWrites(data.s, data.payload);
  });
}

test("unchanged reviewed selection saves and reopens with the intentional custom price", async () => {
  const { s, payload } = await fixture();
  const saved = await quotations.create._handler(s.ctx, { payload });
  const details = await quotations.getQuotationFullDetails._handler(s.ctx, { target_quotation_id: saved.id });
  assert.equal(details.items.selected_rooms[0].price, 1111.25);
  assert.equal(details.items.selected_rooms[0].pax, 2);
  assert.equal(details.selected_flight.departure_date, "2027-01-01");
  assert.equal(details.selected_flight.return_date, "2027-01-12");
  assert.equal(details.total_amount, 2242.5);
  assert.equal(details.notes, "Keep this draft");
  assert.deepEqual(details.items.adds_ons.map(({ name, price, pax }) => ({ name, price, pax })), payload.adds_ons);
  assert.deepEqual(details.items.discounts.map(({ name, price, pax }) => ({ name, price, pax })), payload.discounts);
  const listed = (await quotations.list._handler(s.ctx, {})).find(row => row.id === saved.id);
  assert.equal(listed.total_amount, 2242.5);
  assert.equal(listed.is_stale, false);
});

test("creation requires the reviewed context", async () => {
  const { s, payload } = await fixture();
  delete payload.reviewed_context;
  await rejectsWithoutWrites(s, payload);
});

test("fresh context cannot authorize a disabled selected room", async () => {
  const { s, packageId, payload } = await fixture();
  await s.ctx.db.patch(s.tables.package_rooms[0]._id, { enabled: false });
  const current = (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === packageId);
  payload.reviewed_context = current.creation_context;
  await rejectsWithoutWrites(s, payload);
});

test("reviewing the latest context permits a corrected save without changing custom prices", async () => {
  const { s, packageId, payload } = await fixture();
  await s.ctx.db.patch(s.tables.package_rooms[0]._id, { price: 1500 });
  await s.ctx.db.patch(s.tables.package_flights[0]._id, { departure_date: "2027-01-05" });
  await rejectsWithoutWrites(s, payload);
  const current = (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === packageId);
  payload.reviewed_context = current.creation_context;
  const saved = await quotations.create._handler(s.ctx, { payload });
  const details = await quotations.getQuotationFullDetails._handler(s.ctx, { target_quotation_id: saved.id });
  assert.equal(details.items.selected_rooms[0].price, 1111.25);
  assert.equal(details.selected_flight.departure_date, "2027-01-05");
  assert.equal(details.total_amount, 2242.5);
});

test("fresh context cannot authorize an archived package", async () => {
  const { s, packageId, payload } = await fixture();
  await packages.archivePackage._handler(s.ctx, { id: packageId });
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { quotationSelectionContext } = load(path.join(repo, "src/domain/quotation-selection-context.ts"));
  payload.reviewed_context = quotationSelectionContext(
    s.tables.packages[0], s.tables.package_rooms, s.tables.package_flights,
    s.tables.package_hotels, s.tables.package_meals,
  );
  await rejectsWithoutWrites(s, payload);
});

test("another package changing does not invalidate the reviewed selection", async () => {
  const { s, payload } = await fixture();
  const another = await create(s, form());
  await s.ctx.db.patch(another, { duration: "15 days" });
  const saved = await quotations.create._handler(s.ctx, { payload });
  const details = await quotations.getQuotationFullDetails._handler(s.ctx, { target_quotation_id: saved.id });
  assert.equal(details.selected_flight.departure_date, "2027-01-01");
  assert.equal(details.items.selected_rooms[0].price, 1111.25);
});
