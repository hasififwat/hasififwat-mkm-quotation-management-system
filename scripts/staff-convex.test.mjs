import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runStaffConvex, staffConvexArgs } from "./helpers/staff-convex.mjs";

test("operator CLI calls reject missing and non-object identities", () => {
  assert.throws(() => staffConvexArgs("packageFlights:listAll", {}, ""), /CONVEX_RUN_IDENTITY/);
  for (const value of ["null", "[]", '"staff"']) {
    assert.throws(() => staffConvexArgs("packageFlights:listAll", {}, value), /JSON object/);
  }
  assert.throws(() => staffConvexArgs("packageFlights:listAll", {}, "invalid"), SyntaxError);
});

test("operator reads and writes forward explicit identity and arguments without a shell or deployment", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mkm-staff-cli-test-"));
  const bin = path.join(root, "node_modules/convex/bin");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "main.js"), "console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));\n");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const before = process.env.CONVEX_RUN_IDENTITY;
  t.after(() => {
    if (before === undefined) delete process.env.CONVEX_RUN_IDENTITY;
    else process.env.CONVEX_RUN_IDENTITY = before;
  });
  const identity = JSON.stringify({ subject: "fixture-staff", name: "Staff's `literal` $(identity)" });
  process.env.CONVEX_RUN_IDENTITY = identity;
  for (const [fn, args] of [["packageFlights:listAll", {}], ["packages:patchSeason", { id: "fixture", season: "Staff's `literal` $(season)" }]]) {
    const result = JSON.parse(runStaffConvex(root, fn, args));
    assert.deepEqual(result, { args: ["run", fn, JSON.stringify(args), "--identity", identity], cwd: fs.realpathSync(root) });
  }
});
