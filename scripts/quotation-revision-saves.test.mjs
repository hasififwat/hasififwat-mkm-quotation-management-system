import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {load,state,create,form,reviewedQuote,quotations} from './helpers/submission-fixtures.mjs';
const revisions=load(path.resolve('convex/quotationRevisionSaves.ts'));
const migration=load(path.resolve('convex/quotationFamilyMigration.ts'));
const plain=value=>JSON.parse(JSON.stringify(value));
async function fixture() {
  const s=state();const pkg=await create(s,form());
  const payload=await reviewedQuote(s,pkg,s.tables.package_flights[0]._id);
  const zero=await quotations.create._handler(s.ctx,{payload});
  await migration.freeze._handler(s.ctx,{acknowledgement:'Reviewed cutover write freeze'});
  await migration.backfill._handler(s.ctx,{expectedCursor:null,limit:50,dryRun:false});
  s.tables.quotation_revision_release.push({_id:'release',key:'revision-v1',enabled:true});
  return {s,zero,command:{operation:'append',request_key:randomUUID(),family_id:s.tables.quotation_families[0]._id,source_revision_id:zero.id,expected_current_id:zero.id,pic_name:'Fixture',branch:'Fixture',notes:'',client:{mode:'retain'},selection:{mode:'retain'},extras:{mode:'retain'}}};
}
test('legacy provenance and unknown snapshot facts survive multiple saved revisions',async()=>{
  const {s,command}=await fixture();delete s.tables.quotations[0].flight_snapshot;
  const one=await revisions.save._handler(s.ctx,{command});
  const two=await revisions.save._handler(s.ctx,{command:{...command,request_key:randomUUID(),source_revision_id:one.id,expected_current_id:one.id}});
  const row=s.tables.quotations.find(q=>q._id===two.id);
  assert.equal(JSON.parse(row.frozen_document).provenance,'legacy_unknown');
  assert.equal(row.flight_snapshot,undefined);assert.equal(row.snapshot_completeness,'unknown');
});
test('retained unavailable rooms permit intentional price edits with source ownership',async()=>{
  const {s,command}=await fixture();const item=s.tables.quotation_items[0];
  s.tables.packages=[];s.tables.package_rooms=[];s.tables.package_flights=[];s.tables.clients=[];
  const before=plain({quotes:s.tables.quotations,items:s.tables.quotation_items});
  const next=await revisions.save._handler(s.ctx,{command:{...command,selection:{mode:'retain',rooms:[{source_item_id:item._id,price:10.1,pax:3}]}}});
  assert.equal(s.tables.quotations.find(q=>q._id===next.id).total_amount,30.3);
  assert.deepEqual(plain(s.tables.quotations.slice(0,1)),before.quotes);
  assert.deepEqual(plain(s.tables.quotation_items.filter(i=>i.quotation_id===command.source_revision_id)),before.items);
  await assert.rejects(()=>revisions.save._handler(s.ctx,{command:{...command,request_key:randomUUID(),source_revision_id:next.id,expected_current_id:next.id,selection:{mode:'retain',rooms:[{source_item_id:item._id,price:10,pax:1}]}}}),/Room does not belong/);
});
test('inactive gate and frozen legacy contracts write nothing',async()=>{
  const {s,command}=await fixture();s.tables.quotation_revision_release=[];
  const before=plain(s.tables);
  await assert.rejects(()=>revisions.save._handler(s.ctx,{command}),/inactive/);
  await assert.rejects(()=>quotations.update._handler(s.ctx,{payload:{id:command.source_revision_id}}),/frozen/);
  assert.deepEqual(plain(s.tables),before);
});
test('saved status survives while new revision starts draft and receipts are actor scoped',async()=>{
  const {s,command}=await fixture();s.tables.quotations[0].status='sent';
  const next=await revisions.save._handler(s.ctx,{command});
  assert.equal(s.tables.quotations[0].status,'sent');
  assert.equal(s.tables.quotations.find(q=>q._id===next.id).status,'draft');
  const before=plain(s.tables);
  s.ctx.auth.getUserIdentity=async()=>({subject:'different-actor'});
  await assert.rejects(()=>revisions.save._handler(s.ctx,{command}),e=>e.data?.code==='QUOTATION_STALE_EDITOR');
  assert.deepEqual(plain(s.tables),before);
});
test('explicit same-ID replacement requires current reviewed context and preserves cross-year base',async()=>{
  const {s,command}=await fixture();const pkg=s.tables.packages[0];
  const context=await reviewedQuote(s,pkg._id,s.tables.package_flights[0]._id);
  const selection={mode:'replace',package_id:pkg._id,flight_id:s.tables.package_flights[0]._id,reviewed_context:context.reviewed_context,rooms:[{room_type:'Quad',price:123.45,pax:2}]};
  pkg.year='2027/2028';
  const before=plain(s.tables);
  await assert.rejects(()=>revisions.save._handler(s.ctx,{command:{...command,selection}}),e=>e.data?.code==='QUOTATION_SELECTION_CONFLICT');
  assert.deepEqual(plain(s.tables),before);
  const current=await reviewedQuote(s,pkg._id,s.tables.package_flights[0]._id);
  const next=await revisions.save._handler(s.ctx,{command:{...command,selection:{...selection,reviewed_context:current.reviewed_context}}});
  const row=s.tables.quotations.find(q=>q._id===next.id);
  assert.equal(row.hijri_year,s.tables.quotations[0].hijri_year);
  assert.equal(row.sequence_num,s.tables.quotations[0].sequence_num);
  assert.equal(row.total_amount,246.9);
});

test('refresh append command retains receipt replay without legacy refresh tokens', async()=>{
  const {s,command}=await fixture(); const pkg=s.tables.packages[0]; const flight=s.tables.package_flights[0];
  const context=await reviewedQuote(s,pkg._id,flight._id);
  const args={quotation_id:command.source_revision_id,command:{...command,selection:{mode:'replace',package_id:pkg._id,flight_id:flight._id,reviewed_context:context.reviewed_context,rooms:[{room_type:'Quad',price:1200,pax:1}]}}};
  const saved=await quotations.refreshSnapshot._handler(s.ctx,args); const before=plain(s.tables);
  assert.deepEqual(plain(await quotations.refreshSnapshot._handler(s.ctx,args)),plain(saved));
  assert.deepEqual(plain(s.tables),before); assert.equal(s.tables.quotations.length,2);
});
