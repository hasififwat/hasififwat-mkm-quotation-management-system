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
  assert.deepEqual(retry, first, "Retry must resolve the first committed result");
  assert.deepEqual(s.tables, before, "Retry must not add quotation, item, or log records");
});
