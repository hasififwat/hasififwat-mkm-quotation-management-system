import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { create, form, load, packages, quotePayload, state } from "./helpers/submission-fixtures.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repo, "convex/quotations.ts");
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");
const source = fs.readFileSync(sourcePath, "utf8");
const ast = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
const guards = [];
function findGuard(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast).includes("args.payload.reviewed_context")) guards.push(node);
  ts.forEachChild(node, findGuard);
}
findGuard(ast);
assert.equal(guards.length, 1, "Review the real creation-context guard before updating this mutation check");
const guard = guards[0];
const mutant = source.slice(0, guard.getStart(ast)) + source.slice(guard.end);

function createHandler(text) {
  const compiled = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const mod = new Module(sourcePath, undefined);
  mod.filename = sourcePath;
  mod.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  const nodeRequire = mod.require.bind(mod);
  mod.require = id => {
    const filename = path.resolve(path.dirname(sourcePath), `${id}.ts`);
    return id.startsWith(".") && fs.existsSync(filename) ? load(filename) : nodeRequire(id);
  };
  mod._compile(compiled.outputText, sourcePath);
  return mod.exports.create._handler;
}

async function changedDeparture(handler) {
  const s = state();
  const packageId = await create(s, form());
  const displayed = (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === packageId);
  const payload = quotePayload(packageId, displayed.flights[0]._id, "Quad", 1111.25);
  payload.reviewed_context = displayed.creation_context;
  await s.ctx.db.patch(displayed.flights[0]._id, { departure_date: "2027-01-05" });
  const before = structuredClone(s.tables);
  s.operations.length = 0;
  try {
    const result = await handler(s.ctx, { payload });
    const saved = s.tables.quotations.find(row => row._id === result.id);
    assert.equal(saved.flight_snapshot.departure_date, "2027-01-05");
    assert.equal(s.tables.quotation_items.find(row => row.item_type === "room").unit_price, 1111.25);
    return "mixed-snapshot-created";
  } catch (error) {
    assert.equal(error.data?.code, "QUOTATION_SELECTION_CONFLICT");
    assert.deepEqual(s.tables, before);
    assert.deepEqual(s.operations.filter(([op]) => ["insert", "patch", "delete"].includes(op)), []);
    return "rejected-without-writes";
  }
}

assert.equal(await changedDeparture(createHandler(source)), "rejected-without-writes");
assert.equal(await changedDeparture(createHandler(mutant)), "mixed-snapshot-created");
assert.equal(await changedDeparture(createHandler(fs.readFileSync(sourcePath, "utf8"))), "rejected-without-writes");
console.log(JSON.stringify({ removed: "actual create reviewed-context guard", detected: true, baselineRestored: true }));
