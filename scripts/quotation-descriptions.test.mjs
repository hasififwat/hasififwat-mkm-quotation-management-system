import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { load, state, form, create, reviewedQuote, quotations } from "./helpers/submission-fixtures.mjs";
const { quotationFormSchema } = load(path.resolve("src/features/quotation/schema.ts"));

for (const section of ["adds_ons", "discounts"]) {
  for (const name of ["", "   ", "\t\n", "\u00a0"]) {
    test(`${section} form rejects whitespace description ${JSON.stringify(name)} at its field`, () => {
      const result = quotationFormSchema.safeParse({client_id:"client", package_id:"package", flight_id:"flight", selected_rooms:[{room_type:"Quad",price:1200,pax:1}], [section]:[{name,price:50,pax:1}]});
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some(issue => issue.path.join(".") === `${section}.0.name` && /description/i.test(issue.message)));
    });
    for (const writer of ["create", "update"]) {
      test(`${writer} rejects ${section} description ${JSON.stringify(name)} before any write`, async () => {
        const s=state(); const id=await create(s,form());
        const payload=await reviewedQuote(s,id,s.tables.package_flights[0]._id);
        if(writer === "update") { payload.id=(await quotations.create._handler(s.ctx,{payload})).id; delete payload.reviewed_context; }
        payload[section]=[{name,price:50,pax:1}];
        const before=JSON.stringify(s.tables); s.operations.length=0;
        await assert.rejects(quotations[writer]._handler(s.ctx,{payload}), /description/i);
        assert.equal(JSON.stringify(s.tables),before);
        assert.equal(s.operations.some(([op]) => ["insert","patch","delete"].includes(op)),false);
      });
    }
  }
  for (const price of [0,10.25]) {
    test(`${section} described amount ${price} survives create and update`, async () => {
      const s=state(); const id=await create(s,form()); const payload=await reviewedQuote(s,id,s.tables.package_flights[0]._id);
      payload[section]=[{name:"  Airport transfer  ",price,pax:2}];
      const parsed=quotationFormSchema.parse(payload); assert.equal(parsed[section][0].price,price);
      payload.id=(await quotations.create._handler(s.ctx,{payload})).id; delete payload.reviewed_context;
      await quotations.update._handler(s.ctx,{payload});
      const items=s.tables.quotation_items.filter(i=>i.item_type!=="room");
      assert.equal(items.length,1); assert.equal(items[0].description,payload[section][0].name);
      assert.equal(items[0].unit_price,section === "discounts" ? -price : price);
      assert.equal(s.tables.quotations[0].total_amount,1200+(section === "discounts" ? -1 : 1)*price*2);
    });
  }
}
