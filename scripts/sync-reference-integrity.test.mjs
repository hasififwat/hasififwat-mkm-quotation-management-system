import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {load, packages, quotations, flights, state, form, create, quotePayload, reviewedQuote, read} from './helpers/submission-fixtures.mjs';

const parsers = load(path.resolve('src/features/packages/sync/parsers.ts'));
const page = ts.createSourceFile('page.tsx',fs.readFileSync('src/app/(protected)/packages/sync/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let applySource;
function visit(node) {
  if(ts.isFunctionDeclaration(node) && node.name?.text==='handleApply') applySource=node.getText(page);
  ts.forEachChild(node,visit);
}
visit(page);
assert.ok(applySource);
const applyJs=ts.transpileModule(applySource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
async function fixture() {
  const s=state(); const id=await create(s,form()); const fid=s.tables.package_flights[0]._id;
  const q=await quotations.create._handler(s.ctx,{payload:await reviewedQuote(s,id,fid)});
  return {s,id,fid,qid:q.id};
}
function editedRow(f) {
  return {status:'edited',package_name:'Fixture Package',season:'MS - NOV',departure_date:'2027-01-01',return_date:'2027-01-12',departure_sector:'KUL-MED',return_sector:'JED-KUL',airline:'MH',dep_flight:'MH123',ret_flight:'MH456',db_package_id:f.id,db_flight_id:f.fid,notes:''};
}
async function syncArgs(f, rooms=[{room_type:'Quad',price:2300,enabled:true}]) {
  return {db_id:f.id,expected_edit_token:(await read(f.s,f.id)).editToken,name:'Fixture Package',season:'MS - NOV',year:'2026/2027',duration:'12 days',transport:'Changed transport',hotels:[],rooms};
}
async function reopenAndSave(f) {
  const edit=await quotations.getQuotationForEdit._handler(f.s.ctx,{target_quotation_id:f.qid});
  assert.equal(edit.flight_id,f.fid);
  assert.ok(!edit.stale_fields.includes('flight.removed'));
  await quotations.update._handler(f.s.ctx,{payload:{...quotePayload(f.id,f.fid),...edit,id:f.qid,expected_quotation_token:edit.snapshot_refresh_token}});
}
for(const reject of [false,true]) test(`edited flight ${reject?'rejection':'success'} preserves quotation selection`,async()=>{
  const f=await fixture(); const before=structuredClone(f.s.tables.quotations[0]); const original=structuredClone(f.s.tables.package_flights[0]);
  const plan=parsers.buildSyncPlan([], [editedRow(f)], []);
  const calls=[];let result;
  const context={plan,setResult:v=>result=v,setProgress:()=>{},airlineName:parsers.airlineName,
    syncErrorMessage:e=>String(e),
    async addFlight(args){calls.push('add');if(reject)throw new Error('Injected write rejection');return flights.addFlight._handler(f.s.ctx,args);},
    async deleteFlight(args){calls.push('delete');return flights.deleteFlight._handler(f.s.ctx,args);},
    async updateFlight(args){calls.push('update');if(reject)throw new Error('Injected write rejection');return flights.updateFlight._handler(f.s.ctx,args);},
    promotePackageToSync:()=>{},promoteToSync:()=>{},syncPackage:()=>{},
  };
  await vm.runInNewContext(`${applyJs}\nhandleApply`,context)();
  assert.deepEqual(calls,['update']);
  assert.equal(f.s.tables.package_flights.length,1);
  assert.equal(f.s.tables.package_flights[0]._id,f.fid);
  assert.equal(result.flightsUpdated,reject?0:1);
  assert.equal(result.errors.length,reject?1:0);
  if(reject)assert.deepEqual(f.s.tables.package_flights[0],original);
  else assert.equal(f.s.tables.package_flights[0].departure_sector,'KUL-MED');
  assert.deepEqual(f.s.tables.quotations[0],before);
  await reopenAndSave(f);
});
test('referenced genuine deletion rejects without writes',async()=>{
  const f=await fixture();const before=structuredClone(f.s.tables);
  await assert.rejects(()=>flights.deleteFlight._handler(f.s.ctx,{id:f.fid}),e=>e.data?.code==='PACKAGE_REFERENCE_CONFLICT');
  assert.deepEqual(f.s.tables,before);
});
test('unreferenced genuine deletion succeeds',async()=>{
  const f=await fixture();f.s.tables.quotations=[];
  await flights.deleteFlight._handler(f.s.ctx,{id:f.fid});assert.equal(f.s.tables.package_flights.length,0);
});
test('CSV room removal rejects before package, hotel or room writes',async()=>{
  const f=await fixture();const before=structuredClone(f.s.tables);f.s.operations.length=0;
  const args=await syncArgs(f,[]);
  await assert.rejects(()=>packages.syncPackageFromCsv._handler(f.s.ctx,args),e=>e.data?.code==='PACKAGE_REFERENCE_CONFLICT');
  assert.deepEqual(f.s.tables,before);
  assert.deepEqual(f.s.operations.filter(([op])=>['patch','insert','delete'].includes(op)),[]);
});
test('CSV same-type room ID churn preserves saved prices and permits quotation save',async()=>{
  const f=await fixture();const oldRoom=f.s.tables.package_rooms[0]._id;const before=structuredClone(f.s.tables.quotations[0]);const items=structuredClone(f.s.tables.quotation_items);
  await packages.syncPackageFromCsv._handler(f.s.ctx,await syncArgs(f));
  assert.notEqual(f.s.tables.package_rooms[0]._id,oldRoom);
  assert.deepEqual(f.s.tables.quotations[0],before);assert.deepEqual(f.s.tables.quotation_items,items);
  await reopenAndSave(f);assert.equal(f.s.tables.quotations[0].total_amount,1200);
});
test('new flight update rejects anonymous access before database operations',async()=>{
  const s=state(false);
  await assert.rejects(()=>flights.updateFlight._handler(s.ctx,{id:'package_flights:1',package_id:'packages:1',month:'JAN',departure_date:'2027-01-01',departure_sector:'KUL-MED',return_date:'2027-01-12',return_sector:'JED-KUL'}),/Not authenticated/);
  assert.deepEqual(s.operations,[]);
});
test('flight update rejects package mismatch and invalid dates without writes',async()=>{
  const f=await fixture();const before=structuredClone(f.s.tables);const base={id:f.fid,package_id:f.id,month:'JAN',departure_date:'2027-01-01',departure_sector:'KUL-MED',return_date:'2027-01-12',return_sector:'JED-KUL'};
  await assert.rejects(()=>flights.updateFlight._handler(f.s.ctx,{...base,package_id:'packages:other'}),/package/i);
  await assert.rejects(()=>flights.updateFlight._handler(f.s.ctx,{...base,return_date:'invalid'}));
  assert.deepEqual(f.s.tables,before);
});
