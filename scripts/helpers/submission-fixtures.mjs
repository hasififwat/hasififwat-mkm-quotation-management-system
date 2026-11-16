import path from "node:path";
import { fileURLToPath } from "node:url";
import { typescriptLoader } from "./load-typescript.mjs";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const load = typescriptLoader(repo);
export const packages = load(path.join(repo, "convex/packages.ts"));
export const quotations = load(path.join(repo, "convex/quotations.ts"));
export const flights = load(path.join(repo, "convex/packageFlights.ts"));
export const { normalizePackageMutationPayload: normalize } = load(path.join(repo, "src/features/packages/utils/normalizePackageMutationPayload.ts"));
export const { transformConvexPackage: transform } = load(path.join(repo, "src/features/packages/utils/transformConvexPackage.ts"));
export const { packageSchema } = load(path.join(repo, "src/features/packages/schema.ts"));
import assert from "node:assert/strict";
export function state(authenticated = true) {
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
export function form(year='2026/2027') {
  return {
    name:'Fixture Package', duration:'12 days', year, transport:'Bus', status:'unpublished', inclusions:'Breakfast', exclusions:'Visa',
    hotels:[{_id:'',_creationTime:0,name:'Makkah Hotel',enabled:true,placeholder:'',hotel_type:'MAKKAH',meals:['BREAKFAST']}],
    rooms:[{_id:'',name:'Quad',price:1200,enabled:true,sort_order:0}],
    flights:[{year_key:'',pakej:'',code:'MALAYSIA AIRLINES',month:'JAN',departure:'2027-01-01',return:'2027-01-12',package_name:'',sector_departure:'KUL-JED',sector_return:'JED-KUL'}],
  };
}
export async function create(s, data) { return (await packages.createPackage._handler(s.ctx, {payload:normalize(data)})).packageDocId; }
export async function read(s, id) { return packages.getById._handler(s.ctx, {id}); }
export async function save(s, data) { return packages.updatePackage._handler(s.ctx, {id:data._id, expectedEditToken:data.editToken, payload:normalize(data)}); }
export function quotePayload(package_id, flight_id, room_type='Quad', price=1200) { return {pic_name:'Fixture staff',branch:'Fixture',client_id:'client:1',package_id,flight_id,selected_rooms:[{room_type,price,pax:1}],adds_ons:[],discounts:[]}; }

