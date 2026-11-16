import assert from 'node:assert/strict';
import { test } from 'node:test';
import { packages, state, create, form, read, load } from './helpers/submission-fixtures.mjs';
const { buildSyncPlan } = load(new URL('../src/features/packages/sync/parsers.ts', import.meta.url).pathname);
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
for (const token of [undefined, '', 'forged']) test(`sync update rejects missing or wrong baseline ${String(token)}`, async()=>{
 const s=state();const id=await create(s,form());await s.ctx.db.patch(id,{source:'sync'});
 const before=structuredClone(s.tables);s.operations.length=0;
 await assert.rejects(()=>packages.syncPackageFromCsv._handler(s.ctx,{...intent,db_id:id,expected_edit_token:token}));
 assert.deepEqual(s.tables,before);assert.equal(s.operations.filter(([op])=>['insert','patch','delete'].includes(op)).length,0);
});
test('fresh baseline cannot overwrite current unsync policy',async()=>{
 const s=state();const id=await create(s,form());await s.ctx.db.patch(id,{source:'unsync'});const baseline=await read(s,id);
 const before=structuredClone(s.tables);s.operations.length=0;
 await assert.rejects(()=>packages.syncPackageFromCsv._handler(s.ctx,{...intent,db_id:id,expected_edit_token:baseline.editToken}));
 assert.deepEqual(s.tables,before);assert.equal(s.operations.filter(([op])=>['insert','patch','delete'].includes(op)).length,0);
});

test('normalized duplicate mapping rows block the entire plan before apply',()=>{
 const row={canonical_name:'Intent Test',season_code:'MS - NOV',season_start:'2026-11-01',match_status:'NEW',duration:'12 days',transport:'Bus',makkah_hotel:'',makkah_meals:'',madinah_hotel:'',madinah_meals:'',qdp_price:1000};
 const plan=buildSyncPlan([row,{...row,canonical_name:' intent test ',season_code:'ms - nov'}],[],[]);
 assert.equal(plan.errors.length,1);assert.match(plan.errors[0],/Duplicate package in CSV/);
});
test('sync review query carries complete aggregate baseline',async()=>{
 const s=state();const id=await create(s,form());const baseline=await read(s,id);
 const listed=await packages.listWithHotelsAndMeals._handler(s.ctx,{});
 assert.equal(listed[0].editToken,baseline.editToken);
 await s.ctx.db.patch(s.tables.package_rooms[0]._id,{price:4321});
 const fresh=await packages.listWithHotelsAndMeals._handler(s.ctx,{});
 assert.notEqual(fresh[0].editToken,listed[0].editToken);
});
