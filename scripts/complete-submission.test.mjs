import assert from "node:assert/strict";
import { test } from "node:test";
import { packages, quotations, flights, normalize, transform, packageSchema, state, form, create, read, save, quotePayload } from "./helpers/submission-fixtures.mjs";

const badPrices = [-1, NaN, Infinity, -Infinity, 1.001];
const badDates = ["", " ", "2027-02-30", "2027-13-01", "01/01/2027"];
const csv = rooms => ({ name: "CSV fixture", season: "Fixture", year: "2026/2027", duration: "12 days", transport: "Bus", hotels: [], rooms });
async function unchanged(s, action, pattern) {
  const before = structuredClone(s.tables);
  s.operations.length = 0;
  await assert.rejects(action, pattern);
  assert.deepEqual(s.tables, before);
  assert.deepEqual(s.operations.filter(([op]) => ["insert", "patch", "delete"].includes(op)), []);
}
for (const price of ["", " ", null, undefined, ...badPrices]) {
  test(`form rejects invalid room price ${String(price)}`, () => {
    const data = form(); data.rooms[0].price = price;
    assert.equal(packageSchema.safeParse(data).success, false);
    assert.throws(() => normalize(data), /price/i);
  });
}
for (const price of ["0", "1234.56", 0, 1234.56]) {
  test(`form parses typed price ${JSON.stringify(price)} without losing zero or cents`, () => {
    const data = form(); data.rooms[0].price = price;
    const parsed = packageSchema.parse(data);
    assert.equal(parsed.rooms[0].price, Number(price));
    assert.equal(normalize(data).rooms[0].price, Number(price));
  });
}
for (const price of badPrices) {
  for (const writer of ["createPackage", "updatePackage", "patchRoomPrices", "syncPackageFromCsv", "createPackageWithFlight"]) {
    test(`${writer} rejects price ${String(price)} before any write`, async () => {
      const s = state(); const id = await create(s, form());
      const payload = normalize(form()); payload.rooms[0].price = price;
      const args = writer === "patchRoomPrices" ? {package_id:id, prices:[{room_type:"Quad",price:10}, {room_type:"Quad",price}]}
        : writer === "syncPackageFromCsv" ? {...csv(payload.rooms), db_id:id}
        : writer === "createPackageWithFlight" ? {payload:{year:"2026/2027",packages:[{name:"Good fixture",flights:[]},{name:"Bad fixture",rooms:payload.rooms,flights:[]}]}}
        : {id,payload};
      await unchanged(s, () => packages[writer]._handler(s.ctx,args), /price/i);
    });
  }
}
for (const departure_date of badDates.concat("2027-02-01")) {
  for (const writer of ["createPackage", "updatePackage", "createPackageWithFlight", "addFlight"]) {
    test(`${writer} rejects incomplete or invalid flight ${JSON.stringify(departure_date)}`, async () => {
      const s = state(); const id = await create(s,form());
      const payload = normalize(form()); payload.flights[0].departure_date = departure_date;
      const data = form(); data.flights[0].departure = departure_date;
      const args = writer === "addFlight" ? {package_id:id,...payload.flights[0]}
        : writer === "createPackageWithFlight" ? {payload:{year:"2026/2027",packages:[{name:"Good fixture",flights:[]},{name:"Bad fixture",flights:data.flights}]}}
        : {id,payload};
      const handler = writer === "addFlight" ? flights.addFlight : packages[writer];
      await unchanged(s, () => handler._handler(s.ctx,args), /date/i);
      assert.equal(packageSchema.safeParse(data).success,false);
    });
  }
}
for (const writer of ["create", "update"]) {
  for (const section of ["selected_rooms", "adds_ons", "discounts"]) {
    for (const price of badPrices) {
      test(`quotation ${writer} rejects ${section} price ${String(price)} without changes`, async () => {
        const s = state(); const id = await create(s,form());
        const payload = quotePayload(id,s.tables.package_flights[0]._id);
        const initial = await quotations.create._handler(s.ctx,{payload});
        payload.id = initial.id;
        payload[section] = section === "selected_rooms" ? [{room_type:"Quad",price,pax:1}] : [{name:"Fixture",price,pax:1}];
        await unchanged(s, () => quotations[writer]._handler(s.ctx,{payload}), /price/i);
      });
    }
  }
  test(`quotation ${writer} rejects incomplete historical flight`, async () => {
    const s = state(); const id = await create(s,form()); const payload = quotePayload(id,s.tables.package_flights[0]._id);
    payload.id = (await quotations.create._handler(s.ctx,{payload})).id;
    s.tables.package_flights[0].return_date = "";
    await unchanged(s, () => quotations[writer]._handler(s.ctx,{payload}), /date/i);
  });
  test(`quotation ${writer} rejects overflowing arithmetic`, async () => {
    const s = state(); const id = await create(s,form()); const payload = quotePayload(id,s.tables.package_flights[0]._id);
    payload.id = (await quotations.create._handler(s.ctx,{payload})).id;
    payload.selected_rooms[0].pax = Infinity;
    await unchanged(s, () => quotations[writer]._handler(s.ctx,{payload}), /finite|amount|quantity/i);
  });
}
test("schedule import rejects invalid inherited template prices before any write", async () => {
  const s = state(); s.tables.room_templates.push({_id:"template:1",name:"Quad",price:-1,enabled:true});
  await unchanged(s, () => packages.createPackageWithFlight._handler(s.ctx,{payload:{year:"2026/2027",packages:[{name:"Scheduled fixture",flights:[]}]}}), /price/i);
});
test("both date fields are required, airline, month and sectors remain optional", () => {
  const data = form(); Object.assign(data.flights[0],{code:"",month:"",sector_departure:"",sector_return:""});
  assert.equal(packageSchema.safeParse(data).success,true);
  for (const value of badDates) { data.flights[0].return = value; assert.equal(packageSchema.safeParse(data).success,false); }
});
for (const price of [0, 1234.56]) {
  test(`price ${price} survives create/reopen/update/reopen and quotation totals`, async () => {
    const s = state(); const data = form(); data.rooms[0].price = price; Object.assign(data.flights[0],{code:"",month:"",sector_departure:"",sector_return:""});
    const id = await create(s,data); const first = await read(s,id); assert.equal(first.rooms[0].price,price);
    const edited = transform(first); edited.name="Updated fixture"; await save(s,edited);
    const reopened = await read(s,id); assert.equal(reopened.rooms[0].price,price);
    const payload = quotePayload(id,reopened.flights[0]._id,"Quad",price); payload.selected_rooms[0].pax=2;
    payload.adds_ons=[{name:"Fixture",price:10.25,pax:2}]; payload.discounts=[{name:"Fixture",price:0.25,pax:2}];
    const result = await quotations.create._handler(s.ctx,{payload}); assert.equal(s.tables.quotations.find(q=>q._id===result.id).total_amount,price*2+20);
    payload.id=result.id; await quotations.update._handler(s.ctx,{payload}); assert.equal(s.tables.quotations.find(q=>q._id===result.id).total_amount,price*2+20);
  });
}
test("packages can be saved without any flight", async () => {const s=state();const data=form();data.flights=[];await create(s,data);assert.equal(s.tables.package_flights.length,0);});
