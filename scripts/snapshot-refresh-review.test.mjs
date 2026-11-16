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
