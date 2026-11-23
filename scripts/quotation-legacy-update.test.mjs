import assert from "node:assert/strict";
import { test } from "node:test";
import { create, flights, form, packages, quotations, reviewedQuote, state } from "./helpers/submission-fixtures.mjs";

async function fixture() {
  const s = state();
  const data = form();
  data.flights[0].departure = "2027-01-10";
  data.flights.push({ ...data.flights[0], departure: "2027-01-01" });
  const packageId = await create(s, data);
  const [original, replacement] = s.tables.package_flights;
  const payload = await reviewedQuote(s, packageId, original._id);
  const { id } = await quotations.create._handler(s.ctx, { payload });
  const edit = () => quotations.getQuotationForEdit._handler(s.ctx, { target_quotation_id: id });
  const review = () => quotations.getQuotationFullDetails._handler(s.ctx, { target_quotation_id: id });
  const catalogue = async () => (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === packageId);
  const save = (changes) => quotations.update._handler(s.ctx, {
    payload: { ...payload, id, ...changes }
  });
  const reschedule = (flight, departure_date) => flights.updateFlight._handler(s.ctx, {
    id: flight._id, package_id: packageId, month: flight.month, dep_flight: flight.flight,
    departure_date, departure_sector: flight.departure_sector,
    return_date: flight.return_date, return_sector: flight.return_sector
  });
  return { s, id, original, replacement, edit, review, catalogue, save, reschedule };
}

async function rejectsWithoutWrites(s, save, code) {
  const before = structuredClone(s.tables);
  const start = s.operations.length;
  await assert.rejects(save, error => error.data?.code === code);
  assert.deepEqual(s.tables, before);
  assert.deepEqual(s.operations.slice(start).filter(([op]) => ["insert", "delete", "patch"].includes(op)), []);
}

const priceEdit = [{ room_type: "Quad", price: 1350, pax: 2 }];

test("legacy Save rejects a stale draft and preserves the other editor's note and charges", async () => {
  const f = await fixture();
  const first = await f.edit();
  const second = await f.edit();
  const note = "Customer requested wheelchair assistance.";
  await f.save({ expected_quotation_token: first.snapshot_refresh_token, notes: note });

  await rejectsWithoutWrites(f.s, () => f.save({
    expected_quotation_token: second.snapshot_refresh_token,
    notes: second.notes,
    selected_rooms: priceEdit,
  }), "QUOTATION_STALE_EDITOR");
  const saved = await f.review();
  assert.equal(saved.id, f.id);
  assert.equal(saved.notes, note);
  assert.equal(saved.total_amount, 1200);
});

test("legacy Save rejects an unreviewed replacement date and saves the reviewed date and entered price", async () => {
  const f = await fixture();
  const draft = await f.edit();
  const loaded = await f.catalogue();
  assert.equal(loaded.flights.find(flight => flight._id === f.replacement._id).departure_date, "2027-01-01");
  await f.reschedule(f.replacement, "2027-01-03");

  const replacement = {
    expected_quotation_token: draft.snapshot_refresh_token,
    flight_id: f.replacement._id,
    selected_rooms: priceEdit,
  };
  await rejectsWithoutWrites(f.s, () => f.save({
    ...replacement, reviewed_context: loaded.creation_context,
  }), "QUOTATION_SELECTION_CONFLICT");
  const unchanged = await f.review();
  assert.equal(unchanged.selected_flight.departure_date, "2027-01-10");
  assert.equal(unchanged.total_amount, 1200);

  const reviewed = await f.catalogue();
  assert.equal(reviewed.flights.find(flight => flight._id === f.replacement._id).departure_date, "2027-01-03");
  const result = await f.save({ ...replacement, reviewed_context: reviewed.creation_context });
  assert.equal(result.id, f.id);
  const saved = await f.review();
  assert.equal(saved.selected_flight.departure_date, "2027-01-03");
  assert.equal(saved.total_amount, 2700);
});
