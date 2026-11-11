import assert from "node:assert/strict";
import path from "node:path";
import { typescriptLoader } from "./helpers/load-typescript.mjs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handlers = typescriptLoader(repo)(path.join(repo, "convex/packages.ts"));

const now = "2026-11-03T00:00:00.000Z";
const fixture = {
  packages: [
    { _id: "p1", name: "Premium Package", status: "unpublished" },
    { _id: "p2", name: "Budget Package", status: "published" },
    { _id: "p3", name: "Archived Package", status: "published", archived: true },
  ].map((pkg) => ({ ...pkg, duration: "12 Days", year: "2026/2027", created_at: now, updated_at: now })),
  package_rooms: [
    { _id: "r1", package_id: "p1", room_type: "Quad", price: 1000, enabled: true },
    { _id: "r2", package_id: "p2", room_type: "Double", price: 2000, enabled: true },
  ],
  package_flights: [{ _id: "f1", package_id: "p1", month: "NOV", departure_date: "2026-11-01", return_date: "2026-11-12" }],
  package_hotels: [{ _id: "h1", package_id: "p1", hotel_type: "Makkah", enabled: true, name: "Fixture hotel" }],
  package_meals: [{ _id: "m1", package_hotel_id: "h1", meal_type: "Breakfast" }],
};

function context(identity, authError) {
  const tables = structuredClone(fixture);
  const operations = [];
  const ctx = {
    auth: {
      async getUserIdentity() {
        if (authError) throw authError;
        return identity;
      },
    },
    db: {
      query(table) {
        assert.ok(Object.hasOwn(tables, table), `Unknown fixture table ${table}`);
        operations.push({ kind: "query", table });
        return { collect: async () => structuredClone(tables[table]) };
      },
      async get(id) {
        operations.push({ kind: "get", id });
        return structuredClone(Object.values(tables).flat().find((row) => row._id === id) ?? null);
      },
      async patch(id, patch) {
        operations.push({ kind: "patch", id });
        const row = Object.values(tables).flat().find((item) => item._id === id);
        assert.ok(row, `Unknown fixture row ${id}`);
        Object.assign(row, patch);
      },
    },
  };
  return { ctx, tables, operations };
}

const publicHandlers = Object.entries(handlers).filter(([, handler]) =>
  handler && (handler.isQuery || handler.isMutation) && typeof handler._handler === "function",
);
assert.ok(publicHandlers.length > 0, "Load the actual registered package handlers");

for (const [name, handler] of publicHandlers) {
  test(`anonymous ${name} rejects before reading or writing data`, async () => {
    const state = context(null);
    const before = structuredClone(state.tables);
    await assert.rejects(handler._handler(state.ctx, {}), /^Error: Not authenticated$/);
    assert.deepEqual(state.operations, []);
    assert.deepEqual(state.tables, before);
  });
}

test("an authenticated account can list packages with their children and search by name", async () => {
  const { ctx } = context({ subject: "fixture-agent" });
  const rows = await handlers.listWithRooms._handler(ctx, {});
  assert.equal(rows.length, 2);
  const premium = rows.find((pkg) => pkg._id === "p1");
  assert.equal(premium.rooms[0]._id, "r1");
  assert.equal(premium.flights[0]._id, "f1");
  assert.equal(premium.hotels[0]._id, "h1");
  assert.equal(premium.hotels[0].meals[0], "Breakfast");
  const search = await handlers.listWithRooms._handler(ctx, { searchTerm: "premium" });
  assert.equal(search.length, 1);
  assert.equal(search[0]._id, "p1");
  assert.equal((await handlers.list._handler(ctx, {})).length, 3);
});

for (const status of ["published", "unpublished"]) {
  test(`an authenticated account can set status to ${status}`, async () => {
    const state = context({ subject: "fixture-agent" });
    const other = structuredClone(state.tables.packages[1]);
    await handlers.updatePackageStatus._handler(state.ctx, { id: "p1", status });
    const rows = await handlers.listWithRooms._handler(state.ctx, {});
    assert.equal(rows.find((pkg) => pkg._id === "p1").status, status);
    assert.notEqual(state.tables.packages[0].updated_at, now);
    assert.deepEqual(state.tables.packages[1], other);
    assert.deepEqual(state.operations.filter((op) => op.kind === "patch"), [{ kind: "patch", id: "p1" }]);
  });
}

test("an authenticated account can archive a package without changing its children or other packages", async () => {
  const state = context({ subject: "fixture-agent" });
  const before = structuredClone(state.tables);
  await handlers.archivePackage._handler(state.ctx, { id: "p1" });
  await handlers.archivePackage._handler(state.ctx, { id: "p1" });
  assert.equal(state.tables.packages[0].archived, true);
  const rows = await handlers.listWithRooms._handler(state.ctx, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0]._id, "p2");
  assert.deepEqual(state.tables.packages.slice(1), before.packages.slice(1));
  for (const table of Object.keys(before).filter((key) => key !== "packages")) {
    assert.deepEqual(state.tables[table], before[table]);
  }
});

for (const name of ["updatePackageStatus", "archivePackage"]) {
  test(`${name} does not reveal whether a package exists to anonymous callers`, async () => {
    for (const id of ["p1", "missing"]) {
      const state = context(null);
      await assert.rejects(handlers[name]._handler(state.ctx, { id, status: "published" }), /^Error: Not authenticated$/);
      assert.deepEqual(state.operations, []);
    }
  });
  test(`${name} preserves the missing-package error for authenticated callers`, async () => {
    const state = context({ subject: "fixture-agent" });
    await assert.rejects(handlers[name]._handler(state.ctx, { id: "missing", status: "published" }), /Package not found/);
    assert.equal(state.operations.some((op) => op.kind === "patch"), false);
  });
}

test("an identity lookup failure does not access package data", async () => {
  const failure = new Error("Fixture identity lookup failed");
  const state = context(null, failure);
  await assert.rejects(handlers.listWithRooms._handler(state.ctx, {}), (error) => error === failure);
  assert.deepEqual(state.operations, []);
});
