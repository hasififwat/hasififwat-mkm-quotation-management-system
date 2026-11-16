import assert from 'node:assert/strict';
import test from 'node:test';
import { quotations, state, form, create, reviewedQuote } from './helpers/submission-fixtures.mjs';

async function fixture() {
 const s=state(); const pid=await create(s,form());const fid=s.tables.package_flights[0]._id;
 const q=await quotations.create._handler(s.ctx,{payload:await reviewedQuote(s,pid,fid)});
 return {s,pid,fid,qid:q.id};
}
test('refresh rejects a changed saved quotation before snapshot or log writes',async()=>{
 const {s,qid}=await fixture();
 const q=s.tables.quotations.find(q=>q._id===qid); q.notes='another editor';
 const before=structuredClone(s.tables); const start=s.operations.length;
 await assert.rejects(()=>quotations.refreshSnapshot._handler(s.ctx,{quotation_id:qid,expected_quotation_token:'stale-loaded-content',source_context:'old-context'}));
 assert.deepEqual(s.tables,before);
 assert.equal(s.operations.slice(start).filter(([op])=>['patch','insert','delete'].includes(op)).length,0);
});

const edit = x => quotations.getQuotationForEdit._handler(x.s.ctx,{target_quotation_id:x.qid});
const review = async x => quotations.getSnapshotRefreshReview._handler(x.s.ctx,{quotation_id:x.qid,expected_quotation_token:(await edit(x)).snapshot_refresh_token});
async function rejectsWithoutWrites(x, action) {
 const before=structuredClone(x.s.tables); const start=x.s.operations.length;
 await assert.rejects(action,e=>e.data?.code==='SNAPSHOT_REFRESH_CONFLICT'||e.data?.code==='SNAPSHOT_REFRESH_UNAVAILABLE');
 assert.deepEqual(x.s.tables,before);assert.equal(x.s.operations.slice(start).filter(([op])=>['patch','insert','delete'].includes(op)).length,0);
}
const confirm=(x,r)=>quotations.refreshSnapshot._handler(x.s.ctx,{quotation_id:x.qid,expected_quotation_token:r.expected_quotation_token,source_context:r.source_context});

test('loaded A context rejects review after another editor saves B',async()=>{
 const x=await fixture();const loaded=await edit(x);const bid=await create(x.s,{...form(),name:'B'});const q=x.s.tables.quotations.find(q=>q._id===x.qid);q.package_id=bid;q.flight_id=x.s.tables.package_flights.find(f=>f.package_id===bid)._id;
 await rejectsWithoutWrites(x,()=>quotations.getSnapshotRefreshReview._handler(x.s.ctx,{quotation_id:x.qid,expected_quotation_token:loaded.snapshot_refresh_token}));
});
for(const change of [
 s=>{s.tables.quotations[0].notes='changed with same timestamp';},
 s=>{s.tables.quotation_items[0].quantity+=1;},
 s=>{s.tables.quotations[0].package_id='another-package';},
 s=>{s.tables.quotations[0].flight_id='another-flight';},
 s=>{s.tables.quotation_items[0].description='same total, new description';},
]) test('confirmation rejects changed saved content without writes',async()=>{const x=await fixture();const r=await review(x);change(x.s);await rejectsWithoutWrites(x,()=>confirm(x,r));});
for(const [table,key,value] of [['packages','name','changed'],['package_rooms','price',1500],['package_rooms','enabled',false],['package_flights','departure_sector','KUL-MED'],['package_hotels','name','New Hotel'],['package_meals','meal_type','DINNER']]){
 test(`confirmation rejects ${table}.${key} without parent timestamp changes`,async()=>{const x=await fixture();const r=await review(x);x.s.tables[table][0][key]=value;await rejectsWithoutWrites(x,()=>confirm(x,r));});
}
test('success writes reviewed snapshots and preserves every charge and item',async()=>{
 const x=await fixture();const q=x.s.tables.quotations[0];
 x.s.tables.quotation_items.push({...structuredClone(x.s.tables.quotation_items[0]),_id:'extra:1',item_type:'addon',description:'Transfer',unit_price:100,original_price:100,quantity:2,line_total:200});
 x.s.tables.quotation_items.push({...structuredClone(x.s.tables.quotation_items[0]),_id:'discount:1',item_type:'discount',description:'Discount',unit_price:-50,original_price:-50,quantity:1,line_total:-50});
 q.total_amount=1350;x.s.tables.packages[0].name='Latest name';x.s.tables.package_rooms[0].price=1500;
 const original=structuredClone(q),items=structuredClone(x.s.tables.quotation_items);const r=await review(x);
 assert.equal(r.saved_package,'Fixture Package');assert.equal(r.current_package,'Latest name');assert.ok(r.changes.some(c=>c.label==='Package room prices and availability'));
 await confirm(x,r);assert.equal(q.package_snapshot.name,'Latest name');assert.equal(q.package_snapshot.rooms[0].price,1500);assert.deepEqual(x.s.tables.quotation_items,items);
 for(const key of Object.keys(original).filter(k=>!['package_snapshot','flight_snapshot','hotels_snapshot','updated_at'].includes(k)))assert.deepEqual(q[key],original[key]);
 assert.equal(x.s.tables.quotation_logs.filter(l=>l.action==='snapshot_refreshed').length,1);
 await rejectsWithoutWrites(x,()=>confirm(x,r));
});
test('unrelated package changes do not conflict',async()=>{const x=await fixture();const r=await review(x);await create(x.s,{...form(),name:'Unrelated'});await confirm(x,r);});
test('legacy snapshots and original prices can be reviewed and refreshed',async()=>{
 const x=await fixture();for(const k of ['package_snapshot','flight_snapshot','hotels_snapshot']) delete x.s.tables.quotations[0][k];delete x.s.tables.quotation_items[0].original_price;
 const r=await review(x);assert.equal(r.saved_package,'Not recorded');assert.equal(r.saved_flight,'Not recorded');await confirm(x,r);assert.equal(x.s.tables.quotations[0].package_snapshot.name,'Fixture Package');
});
test('missing or unrelated saved flight blocks review without writes',async()=>{const x=await fixture();x.s.tables.package_flights[0].package_id='unrelated';await rejectsWithoutWrites(x,()=>review(x));});
test('anonymous review and confirmation reject',async()=>{const x=await fixture();const r=await review(x);x.s.ctx.auth.getUserIdentity=async()=>null;await assert.rejects(()=>review(x),/Not authenticated/);await assert.rejects(()=>confirm(x,r),/Not authenticated/);});
