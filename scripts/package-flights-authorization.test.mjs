import assert from "node:assert/strict";
import { test } from "node:test";
import { flights, state } from "./helpers/submission-fixtures.mjs";

const args = {
  addFlight: { package_id: "package:1", month: "JAN", departure_date: "2027-01-01", departure_sector: "KUL-JED", return_date: "2027-01-12", return_sector: "JED-KUL" },
  updateFlight: { id: "flight:1", package_id: "package:1", month: "JAN", departure_date: "2027-01-01", departure_sector: "KUL-MED", return_date: "2027-01-12", return_sector: "JED-KUL", dep_flight: "Updated Airline" },
  deleteFlight: { id: "flight:1" },
  setSourceManual: {},
  promoteToSync: { ids: ["flight:1"] },
  listAll: {},
};
const publicHandlers = Object.entries(flights).filter(([, handler]) =>
  handler && (handler.isQuery || handler.isMutation) && typeof handler._handler === "function",
);
assert.deepEqual(publicHandlers.map(([name]) => name).sort(), Object.keys(args).sort());

function fixture(authenticated = true) {
  const s = state(authenticated);
  s.tables.packages.push({ _id: "package:1", name: "Fixture package", season: "PS - DEC" });
  s.tables.package_flights.push(
    { _id: "flight:1", ...args.addFlight, source: "manual" },
    { _id: "flight:2", ...args.addFlight, source: "sync" },
    { _id: "flight:3", ...args.addFlight },
  );
  return s;
}

for (const [name, handler] of publicHandlers) {
  test(`anonymous ${name} rejects before database access`, async () => {
    const s = fixture(false);
    const before = structuredClone(s.tables);
    await assert.rejects(handler._handler(s.ctx, args[name]), /^Error: Not authenticated$/);
    assert.deepEqual(s.operations, []);
    assert.deepEqual(s.tables, before);
  });
  test(`${name} propagates identity failures before database access`, async () => {
    const s = fixture();
    const before = structuredClone(s.tables);
    const failure = new Error("Identity lookup failed");
    s.ctx.auth.getUserIdentity = async () => { throw failure; };
    await assert.rejects(handler._handler(s.ctx, args[name]), error => error === failure);
    assert.deepEqual(s.operations, []);
    assert.deepEqual(s.tables, before);
  });
}

test("staff can list joined flights and preserve source defaults", async () => {
  const s = fixture();
  const rows = await flights.listAll._handler(s.ctx, {});
  assert.equal(rows.length, 3);
  assert.equal(rows[0].package_name, "Fixture package");
  assert.equal(rows[0].package_season, "PS - DEC");
  assert.deepEqual(Array.from(rows, row => row.source), ["manual", "sync", "manual"]);
});

test("staff can add manual and sync flights, read them, and delete only the selected flight", async () => {
  const s = fixture();
  const before = structuredClone(s.tables.package_flights);
  for (const source of [undefined, "sync"]) {
    const id = await flights.addFlight._handler(s.ctx, { ...args.addFlight, dep_flight: "MH100", ret_flight: "MH101", source });
    const saved = (await flights.listAll._handler(s.ctx, {})).find(row => row._id === id);
    assert.equal(saved.source, source ?? "manual");
    assert.equal(saved.flight, "MH100");
    assert.equal(saved.return_flight, "MH101");
    assert.equal(saved.package_id, "package:1");
    await flights.deleteFlight._handler(s.ctx, { id });
    assert.deepEqual(s.tables.package_flights, before);
  }
});

test("staff source maintenance changes only eligible flights and remains repeatable", async () => {
  const s = fixture();
  assert.equal(await flights.setSourceManual._handler(s.ctx, {}), 1);
  assert.equal(await flights.setSourceManual._handler(s.ctx, {}), 0);
  await flights.promoteToSync._handler(s.ctx, { ids: ["flight:1", "flight:2", "missing"] });
  await flights.promoteToSync._handler(s.ctx, { ids: ["flight:1"] });
  assert.deepEqual(s.tables.package_flights.map(row => row.source), ["sync", "sync", "manual"]);
});

test("staff can update an existing flight without replacing its ID", async () => {
  const s = fixture();
  const others = structuredClone(s.tables.package_flights.slice(1));
  await flights.updateFlight._handler(s.ctx, args.updateFlight);
  const rows = await flights.listAll._handler(s.ctx, {});
  assert.equal(rows.length, 3);
  assert.equal(rows[0]._id, "flight:1");
  assert.equal(rows[0].departure_sector, "KUL-MED");
  assert.equal(rows[0].flight, "Updated Airline");
  assert.deepEqual(s.tables.package_flights.slice(1), others);
});
