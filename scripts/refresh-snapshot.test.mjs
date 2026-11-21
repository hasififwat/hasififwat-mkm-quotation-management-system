import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { test } from "node:test";
import { typescriptLoader } from "./helpers/load-typescript.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { refreshQuotationSnapshot } = typescriptLoader(repo)(path.join(repo, "src/features/quotation/refresh-snapshot.ts"));
const review = { expected_quotation_token: "loaded-token", source_context: "reviewed-token" };
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("refresh sends the saved quotation ID and both reviewed tokens", async () => {
  const result = await refreshQuotationSnapshot("quote:1", review, async (url, init) => {
    assert.equal(url, "/api/quotations/update");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), { _intent: "refresh_snapshot", quotation_id: "quote:1", ...review });
    return response(200, { success: true, refreshed: true });
  });
  assert.equal(result.status, "success");
});

for (const status of [400, 401, 403, 404, 409]) {
  test(`HTTP ${status} rejects refresh without exposing the backend error`, async () => {
    const result = await refreshQuotationSnapshot("quote:1", review, async () => response(status, { error: "secret backend details" }));
    assert.equal(result.status, "failure");
    assert.match(result.message, new RegExp(`HTTP ${status}`));
    assert.doesNotMatch(result.message, /secret backend details/);
    assert.match(result.message, /entries.*kept/i);
    assert.match(result.message, /nothing was refreshed/i);
    assert.match(result.message, status === 401 || status === 403 ? /sign-in and access/i : /open the snapshot review again/i);
  });
}
for (const status of [408, 500, 502, 503]) {
  test(`HTTP ${status} leaves the refresh outcome unconfirmed`, async () => {
    const result = await refreshQuotationSnapshot("quote:1", review, async () => response(status, { error: "secret backend details" }));
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: "uncertain", httpStatus: status });
  });
}
for (const body of [null, {}, { success: true }, { refreshed: true }, { success: false, refreshed: true }, { success: "true", refreshed: true }]) {
  test(`unknown success response ${JSON.stringify(body)} remains uncertain`, async () => {
    assert.equal((await refreshQuotationSnapshot("quote:1", review, async () => response(200, body))).status, "uncertain");
  });
}
test("a rejected fetch remains uncertain without exposing network details", async () => {
  const result = await refreshQuotationSnapshot("quote:1", review, async () => { throw new Error("private network details"); });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: "uncertain" });
});
test("a lost or malformed response after possible commit remains uncertain", async () => {
  const result = await refreshQuotationSnapshot("quote:1", review, async () => ({ ok: true, status: 200, json: async () => { throw new Error("body lost"); } }));
  assert.equal(result.status, "uncertain");
});

const ts = createRequire(path.join(repo, "package.json"))("typescript");
const builder = fs.readFileSync(path.join(repo, "src/features/quotation/QuotationBuilder.tsx"), "utf8");
const tree = ts.createSourceFile("QuotationBuilder.tsx", builder, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "handleRefreshSnapshot") callback = node.initializer.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
for (const outcome of ["success", "failure", "uncertain"]) {
  test(`repeated refresh activation sends once while pending and revalidates only on ${outcome}`, async () => {
    assert.ok(callback, "Builder must have a guarded refresh callback");
    let finish, calls = 0, revalidations = 0;
    const states = [];
    const pending = new Promise(resolve => { finish = resolve; });
    const js = ts.transpile(`const handler = ${callback}`, { target: ts.ScriptTarget.ES2022 });
    const handler = vm.runInNewContext(`${js}; handler`, {
      qid: "quote:1", refreshRequest: { current: false }, refreshState: { status: "review", review },
      refreshQuotationSnapshot: () => { calls++; return pending; },
      setRefreshState: state => states.push(state.status),
      router: { refresh: () => { revalidations++; } },
    });
    const first = handler(); const second = handler();
    assert.equal(calls, 1);
    assert.deepEqual(states, ["pending"]);
    finish({ status: outcome, message: "Safe recovery" });
    await Promise.all([first, second]);
    assert.deepEqual(states, ["pending", outcome]);
    assert.equal(revalidations, outcome === "success" ? 1 : 0);
  });
}

for (const [code, status] of [["SNAPSHOT_REFRESH_CONFLICT", "conflict"], ["SNAPSHOT_REFRESH_UNAVAILABLE", "unavailable"]]) {
  test(`typed ${code} returns actionable recovery`, async () => {
    const result = await refreshQuotationSnapshot("quote:1", review, async () => response(409, {code}));
    assert.equal(result.status, status);
    assert.match(result.message, /entries.*kept/i);
  });
}

let openCallback;
function findOpen(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'openRefreshReview') openCallback = node.initializer.getText(tree);
  ts.forEachChild(node, findOpen);
}
findOpen(tree);
for (const latest of [false, true]) test(`opening ${latest ? 'latest' : 'loaded'} review only reads and blocks duplicate activation`, async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const calls = [], states = [];
  const js = ts.transpile(`const handler = ${openCallback}`, {target:ts.ScriptTarget.ES2022});
  const handler = vm.runInNewContext(`${js}; handler`, {
    qid:'quote:1', refreshRequest:{current:false}, loadedRefreshToken:{current:'loaded-token'},
    api:{quotations:{getQuotationForEdit:'edit', getSnapshotRefreshReview:'review'}},
    convex:{query:async (name,args) => {
      calls.push([name,JSON.parse(JSON.stringify(args))]);
      return name === 'edit' ? {snapshot_refresh_token:'latest-token'} : pending;
    }},
    setRefreshState:state=>states.push(state),
  });
  const first=handler(latest); const second=handler(latest);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), latest ? [['edit',{target_quotation_id:'quote:1'}],['review',{quotation_id:'quote:1',expected_quotation_token:'latest-token'}]] : [['review',{quotation_id:'quote:1',expected_quotation_token:'loaded-token'}]]);
  finish({...review, changes:[]}); await Promise.all([first,second]);
  assert.deepEqual(states.map(state=>state.status),['reviewing','review']);
});
