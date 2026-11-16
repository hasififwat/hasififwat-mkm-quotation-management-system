import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { typescriptLoader } from "./helpers/load-typescript.mjs";

const { saveQuotation } = typescriptLoader(process.cwd())(path.resolve("src/features/quotation/save-quotation.ts"));

for (const status of [400, 401, 409, 500, 502]) {
  test(`HTTP ${status} preserves a useful recovery message without retrying`, async () => {
    let calls = 0;
    const result = await saveQuotation({ notes: "Keep this draft" }, undefined, async () => {
      calls++;
      return new Response("private backend detail", { status });
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    assert.match(result.message, new RegExp(String(status)));
    assert.match(result.message, /entries.*kept/i);
    assert.doesNotMatch(result.message, /private backend detail/);
  });
}

test("network failure has an unknown outcome and never retries", async () => {
  let calls = 0;
  const result = await saveQuotation({}, undefined, async () => { calls++; throw new TypeError("offline"); });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.match(result.message, /could not confirm/i);
  assert.match(result.message, /check.*quotations.*before.*sav/i);
});

for (const body of ["not JSON", "{}", '{"id":42}']) {
  test(`unconfirmed success ${body} warns before another save`, async () => {
    const result = await saveQuotation({}, undefined, async () => new Response(body));
    assert.equal(result.ok, false);
    assert.match(result.message, /could not confirm/i);
  });
}

test("create sends one POST and returns the exact record ID", async () => {
  const result = await saveQuotation({ notes: "Keep this draft" }, undefined, async (url, options) => {
    assert.equal(url, "/api/quotations/create");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { notes: "Keep this draft" });
    return Response.json({ success: true, id: "saved-record" });
  });
  assert.equal(result.ok, true);
  assert.equal(result.id, "saved-record");
});

test("update keeps the existing record identity", async () => {
  const result = await saveQuotation({ id: "existing-record" }, "existing-record", async (url) => {
    assert.equal(url, "/api/quotations/update");
    return Response.json({ success: true });
  });
  assert.equal(result.ok, true);
  assert.equal(result.id, "existing-record");
});
