import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { typescriptLoader } from "./helpers/load-typescript.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const load = typescriptLoader(repo);
const { quotationFormSchema } = load(path.join(repo, "src/features/quotation/schema.ts"));
const { priceError } = load(path.join(repo, "src/domain/submission-validation.ts"));

function form(section, price) {
  return {
    client_id: "client-fixture",
    package_id: "package-fixture",
    flight_id: "flight-fixture",
    selected_rooms: [{ room_type: "Quad", price: 100, pax: 1 }],
    [section]: [{ name: "Fixture", price, pax: 2 }],
  };
}

for (const section of ["adds_ons", "discounts"]) {
  for (const price of [0, 0.01, 0.25, 10, 10.25, 1234.56]) {
    test(`${section} accepts numeric amount ${price} without changing cents or zero`, () => {
      const parsed = quotationFormSchema.parse(form(section, price));
      assert.equal(parsed[section][0].price, price);
      assert.equal(typeof parsed[section][0].price, "number");
      assert.equal(parsed[section][0].pax, 2);
    });
  }

  for (const price of [NaN, Infinity, -Infinity, -0.01, 1.001, 10.255, "", " ", null, undefined]) {
    test(`${section} rejects invalid amount ${String(price)} with the shared price feedback`, () => {
      const result = quotationFormSchema.safeParse(form(section, price));
      assert.equal(result.success, false);
      const issue = result.error.issues.find(issue => issue.path.join(".") === `${section}.0.price`);
      assert.ok(issue);
      assert.equal(issue.message, priceError(price));
    });
  }

  test(`${section} accepts intentional zero after a cleared amount is corrected`, () => {
    const data = form(section, NaN);
    assert.equal(quotationFormSchema.safeParse(data).success, false);
    data[section][0].price = 0;
    assert.equal(quotationFormSchema.parse(data)[section][0].price, 0);
  });
}
