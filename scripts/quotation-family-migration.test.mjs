import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test } from 'node:test';
import { load, state, create, form, reviewedQuote, quotations } from './helpers/submission-fixtures.mjs';
const migration = load(path.resolve('convex/quotationFamilyMigration.ts'));
const identity = load(path.resolve('convex/lib/quotationFamilyIdentity.ts'));
const clients = load(path.resolve('convex/clients.ts'));
const profiles = load(path.resolve('convex/profiles.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const writes = s => s.operations.filter(([name]) => ['insert','patch','delete'].includes(name));
const inventory = (s, table='quotations', cursor=null, limit=50) => migration.inventory._handler(s.ctx,{table,cursor,limit});
const freeze = s => migration.freeze._handler(s.ctx,{acknowledgement:'Reviewed cutover write freeze'});
const backfill = (s, options={}) => migration.backfill._handler(s.ctx,{expectedCursor:null,limit:50,...options});
async function fixture(count=1) {
  const s = state();
  const packageId = await create(s,form());
  const payload = await reviewedQuote(s,packageId,s.tables.package_flights[0]._id);
  for (let i=0;i<count;i++) await quotations.create._handler(s.ctx,{payload});
  return {s,payload};
}
function savedContent(s) {
  const rows = plain(s.tables.quotations).map(({family_id,previous_revision_id,saved_by,issue_date,document_schema_version,legacy_provenance,snapshot_completeness,...row}) => row);
  return createHash('sha256').update(JSON.stringify({rows,items:s.tables.quotation_items,logs:s.tables.quotation_logs,receipts:s.tables.quotation_create_receipts})).digest('hex');
}

test('inventory and default backfill are read-only and classify every bounded page',async()=>{
  const {s}=await fixture(3);
  const before=savedContent(s); s.operations.length=0;
  const first=await inventory(s,'quotations',null,2);
  assert.equal(first.page.length,2); assert.equal(first.isDone,false);
  const last=await inventory(s,'quotations',first.continueCursor,2);
  assert.equal(last.page.length,1); assert.equal(last.isDone,true);
  assert.ok([...first.page,...last.page].every(row=>row.classification==='singleton'));
  const dryPage=await backfill(s,{limit:2});
  const dryLast=await backfill(s,{expectedCursor:dryPage.cursor,limit:2});
  assert.equal(dryLast.rows.length,1); assert.equal(dryLast.done,true);
  const dry=await backfill(s);
  assert.equal(dry.changed,3); assert.equal(s.tables.quotation_families.length,0);
  assert.deepEqual(writes(s),[]); assert.equal(savedContent(s),before);
  await assert.rejects(()=>backfill(s,{dryRun:false}),/Freeze legacy writers/);
});

test('bounded backfill preserves IDs, references, exact saved content and attachments across a full rerun',async()=>{
  const {s}=await fixture(3);
  s.tables.quotations[1].revision=3; s.tables.quotations[1].archived=true;
  const before=savedContent(s);
  await freeze(s);
  const first=await backfill(s,{limit:1,dryRun:false});
  assert.equal(first.changed,1); assert.equal(first.done,false);
  await assert.rejects(()=>backfill(s,{limit:1,dryRun:false}),/checkpoint conflict/);
  const second=await backfill(s,{expectedCursor:first.cursor,limit:2,dryRun:false});
  assert.equal(second.done,true); assert.equal(second.changed,2);
  const families=plain(s.tables.quotation_families);
  assert.equal(families.length,3);
  for (const row of s.tables.quotations) {
    const family=families.find(f=>f._id===row.family_id);
    assert.equal(family.current_revision_id,row._id);
    assert.equal(family.sequence_num,row.sequence_num);
    assert.equal(family.hijri_year,row.hijri_year);
    assert.equal(family.archived,row.archived??false);
    assert.equal(row.legacy_provenance,'legacy_unknown');
    assert.equal(row.document_schema_version,0);
    assert.equal(row.snapshot_completeness,'unknown');
    assert.equal(row.previous_revision_id,undefined);
    assert.equal(row.issue_date,undefined);
    assert.equal(row.saved_by,undefined);
  }
  assert.equal(s.tables.quotations[1].revision,3);
  const inventoryRows=(await inventory(s)).page;
  assert.ok(inventoryRows.every(r=>r.classification==='migrated'));
  assert.ok(inventoryRows[1].gaps.includes('unknown_predecessors'));
  const rerun=await backfill(s,{dryRun:false,restart:true});
  assert.equal(rerun.changed,0); assert.equal(rerun.done,true);
  assert.deepEqual(plain(s.tables.quotation_families),families);
  assert.equal(savedContent(s),before);
  assert.equal((await freeze(s)),s.tables.quotation_family_migrations[0]._id);
});

for (const revision of [0,2]) test(`shared base blocks rather than inventing ancestry for revision ${revision}`,async()=>{
  const {s}=await fixture(2);
  s.tables.quotations[1].sequence_num=s.tables.quotations[0].sequence_num;
  s.tables.quotations[1].revision=revision;
  s.tables.quotations[1].archived=true;
  const rows=(await inventory(s)).page;
  assert.ok(rows.every(r=>r.blockers.includes('ambiguous_base_reference')));
  assert.equal(rows[0].blockers.includes('duplicate_revision_reference'),revision===0);
  assert.equal(rows[0].archived,false); assert.equal(rows[1].archived,true);
  await freeze(s); s.operations.length=0;
  await assert.rejects(()=>backfill(s,{dryRun:false}),/blocks this batch/);
  assert.deepEqual(writes(s),[]); assert.equal(s.tables.quotation_families.length,0);
});

test('missing snapshots and live references remain explicit gaps without reconstructing saved content',async()=>{
  const {s}=await fixture();
  const row=s.tables.quotations[0];
  delete row.package_snapshot; delete row.flight_snapshot; delete row.hotels_snapshot;
  row.package_id='missing-package'; row.flight_id='missing-flight'; row.client_id='missing-client';
  s.tables.quotation_items[0].package_room_id='missing-room'; s.tables.quotation_items[0].description='';
  const report=(await inventory(s)).page[0];
  for (const gap of ['missing_package_snapshot','missing_flight_snapshot','missing_hotels_snapshot','missing_rooms_snapshot','missing_live_package','missing_live_flight','missing_live_client','missing_live_room','missing_saved_room_label']) assert.ok(report.gaps.includes(gap),gap);
  const before=savedContent(s); await freeze(s); await backfill(s,{dryRun:false});
  assert.equal(savedContent(s),before); assert.equal(row.snapshot_completeness,'unknown');
});

for (const table of ['quotation_items','quotation_logs','quotation_create_receipts']) test(`inventory exposes orphan ownership in ${table}`,async()=>{
  const {s}=await fixture();
  if (table==='quotation_create_receipts') await s.ctx.db.insert(table,{actor:'fixture',request_key:'orphan',content:'{}',result:{id:'quotations:missing',hijri_year:'1448H',sequence_num:99,revision:0,total_amount:0,status:'draft',quotation_number:'1448H-0099'}});
  else await s.ctx.db.insert(table,{quotation_id:'quotations:missing'});
  const rows=(await inventory(s,table)).page;
  assert.ok(rows.at(-1).blockers.includes('orphan_reference'));
});

test('existing membership corruption blocks a rerun instead of silently repairing history',async()=>{
  const {s}=await fixture(); await freeze(s); await backfill(s,{dryRun:false});
  s.tables.quotation_families[0].sequence_num=900;
  assert.ok((await inventory(s)).page[0].blockers.includes('inconsistent_membership'));
  await assert.rejects(()=>backfill(s,{dryRun:false,restart:true}),/blocks this batch/);
});

test('create receipt replay returns its exact result while writers stay frozen',async()=>{
  const {s,payload}=await fixture();
  const request={...payload,request_key:'8467776c-a278-4d3d-890e-ffda6b8c6509'};
  const result=await quotations.create._handler(s.ctx,{payload:request});
  await freeze(s); await backfill(s,{dryRun:false});
  s.tables.packages.length=0; s.operations.length=0;
  assert.deepEqual(plain(await quotations.create._handler(s.ctx,{payload:request})),plain(result));
  assert.deepEqual(writes(s),[]);
  await assert.rejects(()=>quotations.create._handler(s.ctx,{payload}),/writes are frozen/);
});

for (const [name,operation,args] of [
  ['update',quotations.update,{payload:{id:'unused'}}],
  ['refresh',quotations.refreshSnapshot,{quotation_id:'unused'}],
  ['resequence',quotations.resequenceByCreatedAt,{}],
  ['delete',quotations.deleteById,{quotationId:'unused'}],
  ['repair',quotations.repairStaleFlightIds,{}],
  ['archive',quotations.archiveQuotation,{id:'unused'}],
  ['client merge',clients.mergeClients,{canonicalId:'client:1',duplicateIds:[]}],
  ['creator migration',profiles.migrateQuotationCreators,{}],
]) test(`frozen migration blocks legacy ${name} before any writes`,async()=>{
  const s=state(); await freeze(s); s.operations.length=0;
  await assert.rejects(()=>operation._handler(s.ctx,args),/writes are frozen/);
  assert.deepEqual(writes(s),[]);
});

test('independent create allocation retains deleted issued numbers and receipt-only legacy references',async()=>{
  const {s,payload}=await fixture(2);
  const highest=s.tables.quotations[1]; await quotations.deleteById._handler(s.ctx,{quotationId:highest._id});
  const third=await quotations.create._handler(s.ctx,{payload});
  assert.equal(third.sequence_num,3);
  await s.ctx.db.insert('quotation_create_receipts',{actor:'legacy',request_key:'retained',content:'{}',result:{...third,id:'quotations:deleted',sequence_num:40,quotation_number:'1448H-0040'}});
  const next=await quotations.create._handler(s.ctx,{payload});
  assert.equal(next.sequence_num,41);
  assert.equal(s.tables.quotations.every(q=>q.family_id===undefined),true);
});

test('revision uniqueness does not allocate another base reference',async()=>{
  const {s}=await fixture(); await freeze(s); await backfill(s,{dryRun:false});
  const row=s.tables.quotations[0]; const counters=plain(s.tables.quotation_reference_counters);
  await assert.rejects(()=>identity.assertRevisionVacant(s.ctx,row.family_id,0),/already exists/);
  await identity.assertRevisionVacant(s.ctx,row.family_id,1);
  await assert.rejects(()=>identity.assertRevisionVacant(s.ctx,row.family_id,-1),/Invalid quotation revision/);
  assert.deepEqual(plain(s.tables.quotation_reference_counters),counters);
});

for (const limit of [0,51,1.5]) test(`inventory rejects unsafe batch size ${limit}`,async()=>{
  const s=state(); await assert.rejects(()=>inventory(s,'quotations',null,limit),/Limit must/);
  assert.deepEqual(writes(s),[]);
});
