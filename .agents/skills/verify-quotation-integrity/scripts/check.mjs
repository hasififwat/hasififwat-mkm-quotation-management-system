#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");
const sourcePath = path.join(repo, "convex/quotations.ts");
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const output = outIndex < 0
  ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mkm-formal-")), "result.json")
  : path.resolve(args[outIndex + 1]);
const supported = new Set(["--out", "--self-test"]);
for (let i = 0; i < args.length; i++) {
  if (!supported.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`);
  if (args[i] === "--out") i++;
}
assert.equal(ts.version, "5.9.3", "Reconfirm the checker against the changed TypeScript version");
assert.equal(require("convex/package.json").version, "1.45.0", "Reconfirm the adapter against the changed Convex version");

function loadActualHandlers(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = new Module(sourcePath, undefined);
  mod.filename = sourcePath;
  mod.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  mod._compile(compiled.outputText, sourcePath);
  assert.equal(typeof mod.exports.create._handler, "function");
  assert.equal(typeof mod.exports.update._handler, "function");
  return { create: mod.exports.create._handler, update: mod.exports.update._handler };
}

const now = "2026-01-01T00:00:00.000Z";
function createDatabase() {
  const tables = {
    clients: [{ _id: "c1", name: "Verification client", created_at: now, updated_at: now }],
    packages: ["p1", "p2"].map((_id) => ({
      _id, name: _id, year: "2026/2027", duration: "12 days", status: "active",
      created_at: now, updated_at: now,
    })),
    package_flights: ["p1", "p2"].map((package_id, index) => ({
      _id: `f${index + 1}`, package_id, month: "January", flight: "Verification flight",
      departure_date: "2027-01-01", departure_sector: "KUL-JED",
      return_date: "2027-01-12", return_sector: "JED-KUL", created_at: now,
    })),
    package_rooms: ["p1", "p2"].map((package_id, index) => ({
      _id: `r${index + 1}`, package_id, room_type: "quad", price: 100, enabled: true,
    })),
    package_hotels: [], package_meals: [], quotation_items: [], quotation_logs: [],
    quotations: [{
      _id: "q1", hijri_year: "1448H", sequence_num: 1, revision: 0,
      client_id: "c1", client_name: "Verification client", package_id: "p1", flight_id: "f1",
      pic_name: "Verifier", branch: "Verification", status: "draft", total_amount: 100,
      notes: "", created_by: "Verifier", created_at: now, updated_at: now,
    }],
  };
  const writes = [];
  let serial = 0;
  const find = (id) => Object.values(tables).flat().find((row) => row._id === id);
  const db = {
    query(table) {
      assert.ok(table in tables, `Adapter does not implement table ${table}`);
      const predicates = [];
      const query = {
        withIndex(_name, callback) {
          const builder = { eq(field, value) { predicates.push([field, value]); return builder; } };
          callback(builder);
          return query;
        },
        async collect() {
          return structuredClone(tables[table].filter((row) => predicates.every(([field, value]) => row[field] === value)));
        },
      };
      return query;
    },
    async get(id) { return structuredClone(find(id) ?? null); },
    async insert(table, value) {
      assert.ok(table in tables, `Adapter does not implement table ${table}`);
      const id = `${table}:verification:${++serial}`;
      tables[table].push({ ...structuredClone(value), _id: id });
      writes.push({ operation: "insert", table, id });
      return id;
    },
    async patch(id, value) {
      const row = find(id);
      assert.ok(row, `Cannot patch absent row ${id}`);
      Object.assign(row, structuredClone(value));
      writes.push({ operation: "patch", id });
    },
    async delete(id) {
      const rows = Object.values(tables).find((entries) => entries.some((row) => row._id === id));
      assert.ok(rows, `Cannot delete absent row ${id}`);
      rows.splice(rows.findIndex((row) => row._id === id), 1);
      writes.push({ operation: "delete", id });
    },
  };
  return { tables, writes, db };
}

function* cases() {
  for (const operation of ["create", "update"])
    for (const authenticated of [false, true])
      for (const package_id of ["p1", "p2", "missing-package"])
        for (const flight_id of ["f1", "f2", "missing-flight"])
          for (const client_id of ["c1", "missing-client"])
            for (const room_type of ["quad", "unknown-room", null])
              for (const pax of [1, 2])
                for (const price of [0, 100])
                  yield { operation, authenticated, package_id, flight_id, client_id, room_type, pax, price };
}

async function check(source) {
  const handlers = loadActualHandlers(source);
  const result = {
    cases: 0, successfulCalls: 0, rejectedCalls: 0, positiveWitnesses: { create: 0, update: 0 },
    properties: {
      authenticated_writes: { failures: 0, firstCounterexample: null },
      flight_matches_package: { failures: 0, firstCounterexample: null },
    },
    adapterErrors: [],
  };
  function violation(name, input, detail) {
    const property = result.properties[name];
    property.failures++;
    property.firstCounterexample ??= { input, detail };
  }
  for (const input of cases()) {
    result.cases++;
    const state = createDatabase();
    const identity = input.authenticated ? { subject: "verification-user", tokenIdentifier: "verification-user" } : null;
    const ctx = { db: state.db, auth: { async getUserIdentity() { return identity; } } };
    const payload = {
      pic_name: "Verifier", branch: "Verification", client_id: input.client_id,
      package_id: input.package_id, flight_id: input.flight_id,
      selected_rooms: input.room_type === null ? [] : [{ room_type: input.room_type, pax: input.pax, price: input.price }],
      adds_ons: [], discounts: [], ...(input.operation === "update" ? { id: "q1" } : {}),
    };
    const refsValid = input.client_id === "c1" && input.room_type === "quad" &&
      ((input.package_id === "p1" && input.flight_id === "f1") || (input.package_id === "p2" && input.flight_id === "f2"));
    let response;
    try {
      response = await handlers[input.operation](ctx, { payload });
    } catch (error) {
      result.rejectedCalls++;
      // Rejected transactions do not commit. Unexpected errors cannot count as a passing proof.
      const knownRejection = new Set([
        "Client not found", "Package not found", "Flight not found",
        "Selected flight does not belong to the selected package",
        "At least one room selection is required",
        "Room type 'unknown-room' does not exist in this package",
      ]).has(error.message) || (!input.authenticated && /unauthenticated|not authenticated/i.test(error.message));
      if ((refsValid && input.authenticated) || !knownRejection) {
        result.adapterErrors.push({ input, error: error.message });
      }
      continue;
    }
    result.successfulCalls++;
    if (refsValid && input.authenticated) result.positiveWitnesses[input.operation]++;
    if (!input.authenticated && state.writes.length > 0) {
      violation("authenticated_writes", input, {
        message: "The actual mutation returned successfully with no identity and would commit writes.",
        response, writes: state.writes,
      });
    }
    const row = state.tables.quotations.find((entry) => entry._id === response?.id);
    if (!row) {
      result.adapterErrors.push({ input, error: "Successful mutation did not return the ID of a stored quotation" });
      continue;
    }
    const flight = state.tables.package_flights.find((entry) => entry._id === row.flight_id);
    if (!flight || flight.package_id !== row.package_id) {
      violation("flight_matches_package", input, {
        message: "A successful mutation stored a quotation with a flight from another package or an absent flight.",
        stored: { package_id: row.package_id, flight_id: row.flight_id }, flightPackage: flight?.package_id ?? null,
      });
    }
  }
  assert.equal(result.cases, 864, "The documented finite domain changed");
  assert.ok(result.positiveWitnesses.create > 0 && result.positiveWitnesses.update > 0, "Vacuous check: valid authenticated operations never succeeded");
  return result;
}

function removeFlightGuard(source, operation) {
  const ast = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) !== operation || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) continue;
      const object = declaration.initializer.arguments[0];
      assert.ok(ts.isObjectLiteralExpression(object));
      const handler = object.properties.find((property) => property.name?.getText(ast) === "handler");
      assert.ok(handler && ts.isPropertyAssignment(handler) && ts.isArrowFunction(handler.initializer));
      const guard = handler.initializer.body.statements.find((node) => ts.isIfStatement(node) &&
        node.expression.getText(ast).replace(/\s/g, "") === "String(selectedFlight.package_id)!==args.payload.package_id");
      assert.ok(guard, `Cannot find ${operation}'s real flight association guard; review coverage`);
      return source.slice(0, guard.getStart(ast)) + `/* verification mutant: removed ${operation} flight guard */` + source.slice(guard.end);
    }
  }
  throw new Error(`Cannot find the actual ${operation} mutation`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const source = fs.readFileSync(sourcePath, "utf8");
const report = {
  checker: "finite exhaustive execution of actual Convex handlers; in-memory database adapter",
  generatedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
  source: "convex/quotations.ts", sourceSha256: createHash("sha256").update(source).digest("hex"),
  versions: { node: process.version, typescript: ts.version, convex: require("convex/package.json").version },
  baseline: await check(source),
};
if (args.includes("--self-test")) {
  report.mutationTests = [];
  for (const operation of ["create", "update"]) {
    const scratch = path.join(path.dirname(output), `${operation}-without-flight-guard.ts`);
    fs.writeFileSync(scratch, removeFlightGuard(source, operation));
    const mutant = await check(fs.readFileSync(scratch, "utf8"));
    const detected = mutant.properties.flight_matches_package.failures > report.baseline.properties.flight_matches_package.failures;
    report.mutationTests.push({ operation, scratch, detected, result: mutant });
    assert.ok(detected, `Checker missed the broken ${operation} flight association guard`);
  }
  const restored = await check(fs.readFileSync(sourcePath, "utf8"));
  assert.deepEqual(restored, report.baseline, "Baseline changed after scratch mutation tests");
  report.baselineRestored = true;
}
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const failures = Object.fromEntries(Object.entries(report.baseline.properties).map(([name, property]) => [name, property.failures]));
console.log(JSON.stringify({ evidence: output, cases: report.baseline.cases, failures,
  adapterErrors: report.baseline.adapterErrors.length, mutationTests: report.mutationTests?.map(({ operation, detected }) => ({ operation, detected })),
  baselineRestored: report.baselineRestored ?? null }));
if (report.baseline.adapterErrors.length) process.exitCode = 2;
else if (Object.values(failures).some((count) => count > 0)) process.exitCode = 1;
