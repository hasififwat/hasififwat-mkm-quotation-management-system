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
  const tables = { client_aliases: [], packages: [], package_hotels: [], package_meals: [], package_rooms: [], package_flights: [], quotations: [], quotation_items: [], quotation_logs: [], quotation_create_receipts: [], quotation_save_receipts: [], quotation_revision_release: [], quotation_families: [], quotation_family_migrations: [], quotation_reference_counters: [], profiles: [], hotel_templates: [], room_templates: [], clients: [{_id:'client:1', name:'Fixture Client'}] };
  let serial = 0;
  const operations = [];
  const locate = id => Object.values(tables).flat().find(row => row._id === id);
  const db = {
    query(table) {
      assert.ok(table in tables, `Unknown table ${table}`);
      operations.push(['query', table]);
      const predicates = [];
      const filters = [];
      const fieldValue = (row, field) => field.split('.').reduce((value,key) => value?.[key],row);
      let indexFields = ['_creationTime'];
      let indexField = '_creationTime';
      let direction = 'asc';
      const q = {
        withIndex(name, callback) {
          const valid = {by_alias_client_id:'alias_client_id', by_client_id:'client_id', by_package_id:'package_id', by_package_hotel_id:'package_hotel_id', by_quotation_id:'quotation_id', by_hijri_year:'hijri_year', by_updated_at:'updated_at', by_actor_request_key:['actor', 'request_key'], by_key:'key', by_reference:table === 'quotation_create_receipts' ? ['result.hijri_year','result.sequence_num'] : ['hijri_year','sequence_num'], by_reference_revision:['hijri_year','sequence_num','revision'], by_family_revision:['family_id','revision'], by_archived:'archived'};
          assert.ok(name in valid, `Unknown index ${name}`);
          const fields = Array.isArray(valid[name]) ? valid[name] : [valid[name]];
          let fieldIndex = 0;
          const builder = { eq(field, value) { assert.equal(field, fields[fieldIndex++]); predicates.push([field,value]); return builder; } };
          indexField = fields[0]; indexFields = fields;
          callback?.(builder);
          return q;
        },
        filter(callback) {
          const expression = {field: name => row => row[name], neq: (field, value) => row => field(row) !== value};
          filters.push(callback(expression));
          return q;
        },
        order(value) { direction = value; return q; },
        async collect() { return structuredClone(tables[table].filter(row => predicates.every(([k,v]) => fieldValue(row,k) === v) && filters.every(predicate => predicate(row)))); },
        async take(count) { return (await q.collect()).sort((a,b) => { for (const field of indexFields) { const av=fieldValue(a,field), bv=fieldValue(b,field); if(av!==bv) return (av<bv?-1:1)*(direction==='desc'?-1:1); } return 0; }).slice(0,count); },
        async unique() { const rows = await q.collect(); assert.ok(rows.length <= 1, 'Expected a unique record'); return rows[0] ?? null; },
        async paginate({cursor, numItems}) {
          const rows = (await q.collect()).sort((a,b) => (a[indexField] < b[indexField] ? -1 : a[indexField] > b[indexField] ? 1 : 0) * (direction === 'desc' ? -1 : 1));
          const start = cursor === null ? 0 : Number(cursor);
          const end = start + numItems;
          return {page: rows.slice(start,end), isDone: end >= rows.length, continueCursor: String(end)};
        },
      };
      return q;
    },
    normalizeId(table, id) { return tables[table]?.some(row => row._id === id) || String(id).startsWith(`${table}:`) ? id : null; },
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

export async function reviewedQuote(s, ...args) {
  const payload = quotePayload(...args);
  const displayed = (await packages.listWithRooms._handler(s.ctx, {})).find(pkg => pkg._id === payload.package_id);
  payload.reviewed_context = displayed.creation_context;
  return payload;
}
