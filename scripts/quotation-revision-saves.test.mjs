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
