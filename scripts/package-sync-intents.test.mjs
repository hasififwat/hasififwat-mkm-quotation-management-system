import assert from 'node:assert/strict';
import { test } from 'node:test';
import { packages, state, create, form, read, load } from './helpers/submission-fixtures.mjs';
import path from 'node:path';
const { buildSyncPlan } = load(path.resolve('src/features/packages/sync/parsers.ts'));
const intent = {name:'Intent Test',season:'MS - NOV',year:'2026/2027',duration:'12 days',transport:'Bus',hotels:[],rooms:[{room_type:'Quad',price:1000,enabled:true}]};
test('replayed and normalized duplicate creates reject without writes', async()=>{
 const s=state(); await packages.syncPackageFromCsv._handler(s.ctx,intent);
 const before=structuredClone(s.tables); s.operations.length=0;
 await assert.rejects(()=>packages.syncPackageFromCsv._handler(s.ctx,{...intent,name:' intent test ',season:'ms - nov'}));
 assert.deepEqual(s.tables,before);
 assert.equal(s.operations.filter(([op])=>['insert','patch','delete'].includes(op)).length,0);
});
for(const child of ['manual','room','hotel','meal','flight']) test(`reviewed sync rejects changed ${child} before writes`,async()=>{
 const s=state(); const id=await create(s,form()); await s.ctx.db.patch(id,{source:'sync'});
 const baseline=await read(s,id);
 const args={...intent,db_id:id,expected_edit_token:baseline.editToken};
 if(child==='manual') await s.ctx.db.patch(id,{source:'unsync',transport:'Manual van'});
 else {const table={room:'package_rooms',hotel:'package_hotels',meal:'package_meals',flight:'package_flights'}[child]; const row=s.tables[table][0]; await s.ctx.db.patch(row._id,child==='room'?{price:4321}:child==='meal'?{meal_type:'DINNER'}:child==='flight'?{departure_sector:'NEW'}:{name:'New hotel'});}
 const before=structuredClone(s.tables); s.operations.length=0;
 await assert.rejects(()=>packages.syncPackageFromCsv._handler(s.ctx,args));
 assert.deepEqual(s.tables,before);
 assert.equal(s.operations.filter(([op])=>['insert','patch','delete'].includes(op)).length,0);
});
test('fresh reviewed sync applies',async()=>{const s=state(); const id=await create(s,form());await s.ctx.db.patch(id,{source:'sync'});const baseline=await read(s,id); await packages.syncPackageFromCsv._handler(s.ctx,{...intent,db_id:id,expected_edit_token:baseline.editToken});assert.equal(s.tables.packages[0].transport,'Bus');});
