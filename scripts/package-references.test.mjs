import assert from 'node:assert/strict';
import {test} from 'node:test';
import {packages, quotations, state, form, create, read, save, transform, quotePayload} from './helpers/submission-fixtures.mjs';

async function fixture() {
  const s=state(); const id=await create(s,form());
  const quote=await quotations.create._handler(s.ctx,{payload:quotePayload(id,s.tables.package_flights[0]._id)});
  return {s,id,qid:quote.id,data:transform(await read(s,id))};
}
async function rejectsWithoutWrites(s, action, expected) {
  const before=structuredClone(s.tables);s.operations.length=0;
  await assert.rejects(action,error=>{
    assert.equal(error.data?.code,'PACKAGE_REFERENCE_CONFLICT');
    assert.match(error.data.message,expected);return true;
  });
  assert.deepEqual(s.tables,before);
  assert.deepEqual(s.operations.filter(([op])=>['patch','insert','delete'].includes(op)),[]);
}
for(const removal of ['flight','room','both'])test(`referenced ${removal} removal rejects before every write`,async()=>{
  const {s,data}=await fixture();data.name='Must not persist';
  if(removal!=='room')data.flights=[];
  if(removal!=='flight')data.rooms=[];
  await rejectsWithoutWrites(s,()=>save(s,data),/1448H-0001/);
});
test('archived revised quotations still protect their selections',async()=>{
  const {s,data}=await fixture();Object.assign(s.tables.quotations[0],{archived:true,status:'superseded',revision:2});data.flights=[];
  await rejectsWithoutWrites(s,()=>save(s,data),/1448H-0001-R2/);
});
test('room ID churn permits reopening and saving a quotation with unchanged type',async()=>{
  const {s,id,qid,data}=await fixture();const oldRoom=s.tables.package_rooms[0]._id;
  data.name='Permitted edit';data.rooms[0].enabled=false;data.rooms[0].price=0;
  await save(s,data);assert.notEqual(s.tables.package_rooms[0]._id,oldRoom);
  const reopened=await quotations.getQuotationForEdit._handler(s.ctx,{target_quotation_id:qid});
  assert.equal(reopened.selected_rooms[0].room_type,'Quad');
  await quotations.update._handler(s.ctx,{payload:{...quotePayload(id,reopened.flight_id),...reopened,id:qid}});
  assert.equal(s.tables.quotations[0].total_amount,1200);
  assert.equal(s.tables.quotation_items.find(i=>i.item_type==='room').package_room_id,s.tables.package_rooms[0]._id);
});
test('description fallback protects the type after earlier room ID churn',async()=>{
  const {s,data}=await fixture();await save(s,data);data.rooms=[];
  await rejectsWithoutWrites(s,()=>save(s,data),/Quad/);
});
test('unreferenced flight and room removal succeeds despite snapshot copies',async()=>{
  const {s,id,data}=await fixture();
  const extraRoom=await s.ctx.db.insert('package_rooms',{package_id:id,room_type:'Double',price:0,enabled:true});
  const extraFlight=await s.ctx.db.insert('package_flights',{...s.tables.package_flights[0],_id:undefined,package_id:id});
  await save(s,data);
  assert.ok(!s.tables.package_rooms.some(r=>r._id===extraRoom));assert.ok(!s.tables.package_flights.some(r=>r._id===extraFlight));
});
test('preexisting missing selections do not block ordinary package edits',async()=>{
  const {s,data}=await fixture();s.tables.quotations[0].flight_id='historical-missing';s.tables.quotation_items[0].package_room_id='historical-missing';s.tables.quotation_items[0].description='Historical type';
  data.name='Ordinary edit';await save(s,data);assert.equal(s.tables.packages[0].name,'Ordinary edit');
});
