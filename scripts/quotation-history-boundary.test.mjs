import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {load,state,create,form,reviewedQuote,quotations} from './helpers/submission-fixtures.mjs';
const revisions=load(path.resolve('convex/quotationRevisionSaves.ts'));
const migration=load(path.resolve('convex/quotationFamilyMigration.ts'));
const clients=load(path.resolve('convex/clients.ts'));
const profiles=load(path.resolve('convex/profiles.ts'));
const {canonicalClientId}=load(path.resolve('convex/lib/clientCanonical.ts'));
const plain=value=>JSON.parse(JSON.stringify(value));
const detail=(s,id)=>quotations.getQuotationFullDetails._handler(s.ctx,{target_quotation_id:id});
async function fixture(){
  const s=state(); const pkg=await create(s,form());
  const payload=await reviewedQuote(s,pkg,s.tables.package_flights[0]._id);
  const zero=await quotations.create._handler(s.ctx,{payload});
  await migration.freeze._handler(s.ctx,{acknowledgement:'Reviewed cutover write freeze'});
  await migration.backfill._handler(s.ctx,{expectedCursor:null,limit:50,dryRun:false});
  s.tables.quotation_revision_release.push({_id:'release',key:'revision-v1',enabled:true});
  const command={operation:'append',request_key:randomUUID(),family_id:s.tables.quotation_families[0]._id,source_revision_id:zero.id,expected_current_id:zero.id,pic_name:'Fixture',branch:'Fixture',notes:'saved',client:{mode:'retain'},selection:{mode:'retain'},extras:{mode:'retain'}};
  return {s,zero,command};
}
function writes(s){return s.operations.filter(op=>['insert','patch','delete'].includes(op[0]));}
test('historical payload remains saved after all live business sources change',async()=>{
  const {s,command}=await fixture();const one=await revisions.save._handler(s.ctx,{command});
  const before=await detail(s,one.id);
  for(const table of ['clients','packages','package_rooms','package_flights','package_hotels','package_meals','profiles']){
    for(const row of s.tables[table])for(const key of Object.keys(row))if(!key.startsWith('_')&&!key.endsWith('_id'))row[key]=typeof row[key]==='string'?'Changed live value':row[key];
  }
  const after=await detail(s,one.id);
  assert.deepEqual(plain(after.saved_document),plain(before.saved_document));
  assert.equal(after.items.selected_rooms[0].room_type,'Quad');
  assert.equal(after.package.name,before.package.name);
  assert.equal(after.client_name,before.client_name);
  const edit=await quotations.getQuotationForEdit._handler(s.ctx,{target_quotation_id:one.id});
  assert.equal(edit.selected_rooms[0].source_item_id,s.tables.quotation_items.find(i=>i.quotation_id===one.id)._id);
  const two=await revisions.save._handler(s.ctx,{command:{...command,request_key:randomUUID(),source_revision_id:one.id,expected_current_id:one.id}});
  const old=await detail(s,one.id);
  assert.equal(old.id,one.id); assert.equal(old.revision_context.current_revision_id,two.id);
  assert.equal(old.revision_context.state,'historical');assert.equal(old.revision_context.can_append,false);
  assert.deepEqual(plain(old.saved_document),plain(before.saved_document));
});
test('legacy missing fields remain unknown rather than reconstructed from catalog',async()=>{
  const {s,zero}=await fixture(); const row=s.tables.quotations[0];
  delete row.package_snapshot;delete row.flight_snapshot;delete row.hotels_snapshot;
  const result=await detail(s,zero.id);
  assert.equal(result.package.name,'');assert.equal(result.selected_flight,null);assert.deepEqual(plain(result.package.hotels),[]);
  assert.equal(result.saved_document.provenance,'legacy_unknown');
  for(const key of ['package','flight','hotels_and_meals','client_phone','return_flight','revision_issue_date']) assert.ok(result.saved_document.unknown_fields.includes(key));
});
test('malformed frozen documents fail closed',async()=>{
  const {s,command}=await fixture();const one=await revisions.save._handler(s.ctx,{command});const row=s.tables.quotations.find(q=>q._id===one.id);
  for(const frozen of ['{',JSON.stringify({version:1,items:[]}),JSON.stringify({...JSON.parse(row.frozen_document),items:[{description:'Bad'}]})]){
    const original=row.frozen_document;row.frozen_document=frozen;
    await assert.rejects(()=>detail(s,one.id));row.frozen_document=original;
  }
});
test('reviewed refresh appends through receipts and rejects stale context without writes',async()=>{
  const {s,zero,command}=await fixture();const reviewed=await reviewedQuote(s,command.selection.package_id??s.tables.packages[0]._id,s.tables.package_flights[0]._id);
  const refresh={...command,selection:{mode:'replace',package_id:reviewed.package_id,flight_id:reviewed.flight_id,reviewed_context:reviewed.reviewed_context,rooms:reviewed.selected_rooms}};
  const previous=plain(s.tables.quotations);const priorItems=plain(s.tables.quotation_items);
  const one=await quotations.refreshSnapshot._handler(s.ctx,{quotation_id:zero.id,command:refresh});
  assert.notEqual(one.id,zero.id);assert.deepEqual(plain(s.tables.quotations.slice(0,1)),previous);
  assert.deepEqual(plain(s.tables.quotation_items.filter(i=>i.quotation_id===zero.id)),priorItems);
  assert.equal(s.tables.quotations.find(q=>q._id===one.id).total_amount,previous[0].total_amount);
  s.tables.packages.length=0;s.operations.length=0;
  assert.deepEqual(plain(await quotations.refreshSnapshot._handler(s.ctx,{quotation_id:zero.id,command:refresh})),plain(one));
  assert.deepEqual(writes(s),[]);
  await assert.rejects(()=>quotations.refreshSnapshot._handler(s.ctx,{quotation_id:zero.id,command:{...refresh,request_key:randomUUID()}}),e=>e.data?.code==='QUOTATION_STALE_EDITOR');assert.deepEqual(writes(s),[]);
  await assert.rejects(()=>quotations.refreshSnapshot._handler(s.ctx,{quotation_id:one.id}),/frozen/);assert.deepEqual(writes(s),[]);
});
test('postmigration merge records canonical aliases and preserves historical identity',async()=>{
  const {s,zero}=await fixture();
  const second=await s.ctx.db.insert('clients',{name:'Canonical',created_at:'2026',updated_at:'2026'});
  const third=await s.ctx.db.insert('clients',{name:'Final',created_at:'2026',updated_at:'2026'});
  const before=plain(s.tables.quotations);
  await clients.mergeClients._handler(s.ctx,{canonicalId:second,duplicateIds:['client:1']});
  await clients.mergeClients._handler(s.ctx,{canonicalId:third,duplicateIds:[second]});
  assert.equal(await canonicalClientId(s.ctx,'client:1'),third);
  assert.deepEqual(plain(s.tables.quotations),before);assert.equal(s.tables.clients.length,3);
  assert.equal((await detail(s,zero.id)).client_name,before[0].client_name);
  const aliases=plain(s.tables.client_aliases);
  await assert.rejects(()=>clients.mergeClients._handler(s.ctx,{canonicalId:'client:1',duplicateIds:[third]}),/cycle/);
  assert.deepEqual(plain(s.tables.client_aliases),aliases);
});
for(const missingGate of [false,true])test(`alternate writers reject immutable revisions, missing migration gate ${missingGate}`,async()=>{
  const {s,zero}=await fixture();if(missingGate)s.tables.quotation_family_migrations=[];
  for(const [operation,args]of [
    [quotations.update,{payload:{id:zero.id,pic_name:'Fixture',branch:'Fixture',client_id:'client:1',package_id:s.tables.packages[0]._id,flight_id:s.tables.package_flights[0]._id,selected_rooms:[{room_type:'Quad',price:1,pax:1}]}}],
    [quotations.refreshSnapshot,{quotation_id:zero.id}],[quotations.resequenceByCreatedAt,{}],
    [quotations.deleteById,{quotationId:zero.id}],[quotations.repairStaleFlightIds,{}],
    [quotations.archiveQuotation,{id:zero.id}],[profiles.migrateQuotationCreators,{}],
  ]){
    const before=plain(s.tables);s.operations.length=0;
    await assert.rejects(()=>operation._handler(s.ctx,args),/frozen|Immutable/);
    assert.deepEqual(plain(s.tables),before);assert.deepEqual(writes(s),[]);
  }
});

test('modern list and client history summaries use saved package and flight content',async()=>{
  const {s,zero}=await fixture();
  const before=(await quotations.list._handler(s.ctx,{})).find(q=>q.id===zero.id);
  s.tables.packages[0].name='Changed live package';s.tables.package_flights[0].flight='Changed live flight';
  for(const rows of [await quotations.list._handler(s.ctx,{}),(await quotations.listPaginated._handler(s.ctx,{paginationOpts:{cursor:null,numItems:50}})).page]){
    const current=rows.find(q=>q.id===zero.id);assert.deepEqual(plain(current.package),plain(before.package));assert.deepEqual(plain(current.selected_flight),plain(before.selected_flight));assert.equal(current.package_provenance,'saved');
  }
  const history=await clients.getWithQuotations._handler(s.ctx,{client_id:'client:1'});
  assert.equal(history.quotations[0].package_name,before.package.name);
  assert.equal(history.quotations[0].package_provenance,'saved');
});
