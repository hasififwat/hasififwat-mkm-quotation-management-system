import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { typescriptLoader } from "./helpers/load-typescript.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = typescriptLoader(repo);
const packages = load(path.join(repo, "convex/packages.ts"));
const quotations = load(path.join(repo, "convex/quotations.ts"));
const { normalizePackageMutationPayload: normalize } = load(path.join(repo, "src/features/packages/utils/normalizePackageMutationPayload.ts"));
const { transformConvexPackage: transform } = load(path.join(repo, "src/features/packages/utils/transformConvexPackage.ts"));
const { packageSchema, selectedPackageFormSchema } = load(path.join(repo, "src/features/packages/schema.ts"));
function state(authenticated = true) {
  const tables = { packages: [], package_hotels: [], package_meals: [], package_rooms: [], package_flights: [], quotations: [], quotation_items: [], quotation_logs: [], hotel_templates: [], room_templates: [], clients: [{_id:'client:1', name:'Fixture Client'}] };
  let serial = 0;
  const operations = [];
  const locate = id => Object.values(tables).flat().find(row => row._id === id);
  const db = {
    query(table) {
      assert.ok(table in tables, `Unknown table ${table}`);
      operations.push(['query', table]);
      const predicates = [];
      const q = {
        withIndex(name, callback) {
          const valid = {by_package_id:'package_id', by_package_hotel_id:'package_hotel_id', by_quotation_id:'quotation_id', by_hijri_year:'hijri_year'};
          assert.ok(name in valid, `Unknown index ${name}`);
          const builder = { eq(field, value) { assert.equal(field, valid[name]); predicates.push([field,value]); return builder; } };
          callback(builder);
          return q;
        },
        async collect() { return structuredClone(tables[table].filter(row => predicates.every(([k,v]) => row[k] === v))); },
      };
      return q;
    },
    async get(id) { operations.push(['get', id]); return structuredClone(locate(id) ?? null); },
    async insert(table, value) { assert.ok(table in tables, `Unknown table ${table}`); const id = `${table}:${++serial}`; tables[table].push({...structuredClone(value), _id:id, _creationTime:serial}); operations.push(['insert',table,id]); return id; },
    async patch(id, patch) { const row = locate(id); assert.ok(row, `Missing patch ${id}`); for (const [key,value] of Object.entries(patch)) { if (value === undefined) delete row[key]; else row[key] = structuredClone(value); } operations.push(['patch',id]); },
    async delete(id) { const rows = Object.values(tables).find(rows => rows.some(row => row._id === id)); assert.ok(rows, `Missing delete ${id}`); rows.splice(rows.findIndex(row => row._id === id),1); operations.push(['delete',id]); },
  };
  const ctx = { db, auth: { async getUserIdentity() { return authenticated ? {subject:'fixture-staff'} : null; } } };
  return {ctx,tables,operations};
}
function form(year='2026/2027') {
  return {
    name:'Fixture Package', duration:'12 days', year, transport:'Bus', status:'unpublished', inclusions:'Breakfast', exclusions:'Visa',
    hotels:[{_id:'',_creationTime:0,name:'Makkah Hotel',enabled:true,placeholder:'',hotel_type:'MAKKAH',meals:['BREAKFAST']}],
    rooms:[{_id:'',name:'Quad',price:1200,enabled:true,sort_order:0}],
    flights:[{year_key:'',pakej:'',code:'MALAYSIA AIRLINES',month:'JAN',departure:'2027-01-01',return:'2027-01-12',package_name:'',sector_departure:'KUL-JED',sector_return:'JED-KUL'}],
  };
}
async function create(s, data) { return (await packages.createPackage._handler(s.ctx, {payload:normalize(data)})).packageDocId; }
async function read(s, id) { return packages.getById._handler(s.ctx, {id}); }
async function save(s, data) { return packages.updatePackage._handler(s.ctx, {id:data._id, expectedEditToken:data.editToken, payload:normalize(data)}); }
function quotePayload(package_id, flight_id, room_type='Quad', price=1200) { return {pic_name:'Fixture staff',branch:'Fixture',client_id:'client:1',package_id,flight_id,selected_rooms:[{room_type,price,pax:1}],adds_ons:[],discounts:[]}; }

const mappings = [
  ["2025/2026", "1447H"], ["2026/2027", "1448H"], ["2027/2028", "1449H"],
  ["2028/2029", "1450H"], ["2029/2030", "1451H"], ["2030/2031", "1452H"], ["2031/2032", "1453H"],
];
const invalidYears = ["", "2026", "2026-2027", " 2026/2027", "2026/2027 ", "2024/2025", "2032/2033", "constructor", "toString", "__proto__"];
const csv = year => ({ name: "Fixture", season: "Fixture", year, duration: "12 days", transport: "Bus", hotels: [], rooms: [] });

for (const year of invalidYears) {
  test(`schema rejects unsupported year ${JSON.stringify(year)}`, () => {
    assert.equal(packageSchema.safeParse(form(year)).success, false);
    assert.equal(selectedPackageFormSchema.safeParse({year, packages: []}).success, false);
  });
  for (const writer of ["createPackage", "updatePackage", "createPackageWithFlight", "syncPackageFromCsv"]) {
    test(`${writer} rejects ${JSON.stringify(year)} without changing records or children`, async () => {
      const s = state();
      const id = await create(s, form());
      const before = structuredClone(s.tables);
      s.operations.length = 0;
      const args = writer === "syncPackageFromCsv" ? {...csv(year), clone_from_id: id}
        : writer === "createPackageWithFlight" ? {payload: {year, packages: []}}
        : {id, payload: normalize(form(year))};
      await assert.rejects(packages[writer]._handler(s.ctx, args), /supported Umrah year/);
      assert.deepEqual(s.tables, before);
      assert.deepEqual(s.operations, []);
    });
  }
}
for (const writer of ["createPackage", "updatePackage", "createPackageWithFlight", "syncPackageFromCsv"]) {
  test(`${writer} authenticates before inspecting invalid arguments or database`, async () => {
    const s = state(false);
    await assert.rejects(packages[writer]._handler(s.ctx, {}), /Not authenticated/);
    assert.deepEqual(s.operations, []);
  });
}
test("normalizer never invents a missing year", async () => {
  const missing = form();
  delete missing.year;
  const payload = normalize(missing);
  assert.equal(payload.year, undefined);
  const s = state();
  await assert.rejects(packages.createPackage._handler(s.ctx, {payload}), /supported Umrah year/);
  assert.deepEqual(s.operations, []);
});
for (const [year, hijri] of mappings) {
  test(`${year} creates, reopens, updates, reopens and creates a quotation with ${hijri}`, async () => {
    assert.equal(packageSchema.safeParse(form(year)).success, true);
    assert.equal(selectedPackageFormSchema.safeParse({year, packages: []}).success, true);
    const s = state();
    const id = await create(s, form(year));
    const first = await read(s, id);
    assert.equal(first.year, year);
    const edited = transform(first);
    edited.name = "Updated fixture";
    await save(s, edited);
    const reopened = await read(s, id);
    assert.equal(reopened.year, year);
    assert.equal(reopened.name, "Updated fixture");
    const result = await quotations.create._handler(s.ctx, {payload: quotePayload(id, reopened.flights[0]._id)});
    const stored = s.tables.quotations.find(q => q._id === result.id);
    assert.equal(stored.hijri_year, hijri);
    assert.equal(result.quotation_number, `${hijri}-0001`);
    assert.equal(stored.package_snapshot.year, year);
  });
}
test("alternate writers accept supported years and CSV update ignores unused year", async () => {
  const s = state();
  await packages.createPackageWithFlight._handler(s.ctx, {payload: {year: "2026/2027", packages: [{name: "Scheduled fixture", season: "Fixture", flights: []}]}});
  assert.equal(s.tables.packages[0].year, "2026/2027");
  const result = await packages.syncPackageFromCsv._handler(s.ctx, csv("2025/2026"));
  assert.equal((await read(s, result.id)).year, "2025/2026");
  await packages.syncPackageFromCsv._handler(s.ctx, {...csv("ignored"), db_id: result.id});
  assert.equal((await read(s, result.id)).year, "2025/2026");
});
test("catalog preserves the two offered choices and seven exact mappings", () => {
  const catalog = load(path.join(repo, "src/domain/umrah-years.ts"));
  assert.deepEqual(Array.from(catalog.SELECTABLE_UMRAH_YEARS), ["2025/2026", "2026/2027"]);
  for (const [year, hijri] of mappings) {
    assert.equal(catalog.isSupportedUmrahYear(year), true);
    assert.equal(catalog.getMappedHijriYear(year), hijri);
  }
  for (const value of [...invalidYears, undefined, null, 2026, {}]) {
    assert.equal(catalog.isSupportedUmrahYear(value), false);
  }
  for (const year of invalidYears) {
    assert.throws(() => catalog.getMappedHijriYear(year), {message: `No hijri year mapping for Gregorian range: ${year}`});
  }
});
