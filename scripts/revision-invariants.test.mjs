import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {typescriptLoader} from './helpers/load-typescript.mjs';
import { checkRevisionInvariants } from './check-revision-invariants.mjs';

const {freezeRevisionPdf}=typescriptLoader(process.cwd())(path.resolve('convex/lib/quotationPdfInput.ts'));

function fixture() {
  const items = [{item_type:'room',description:'Quad',package_room_id:'room',quantity:1,unit_price:100}];
  const business={issue_date:'2026-11-17T00:00:00.000Z',status:'draft',client_id:'client',client_name:'Fixture',package_id:'package',flight_id:'flight',pic_name:'Fixture',branch:'Fixture',total_amount:100};
  const document={...business,version:1,items,quotation_number:'1448H-0001',saved_by:'actor',client_phone:null,return_flight:null,provenance:null};
  const input_json = JSON.stringify(freezeRevisionPdf(document));
  const input_sha256 = createHash('sha256').update(input_json).digest('hex');
  const candidate = {storage_id:'storage',mime:'application/pdf',size:100,sha256:'a'.repeat(64),input_sha256};
  return {
    quotations:[{...business,_id:'q',family_id:'f',hijri_year:'1448H',sequence_num:1,revision:0,document_schema_version:1,saved_by:'actor',frozen_document:JSON.stringify(document)}],
    quotation_families:[{_id:'f',hijri_year:'1448H',sequence_num:1,current_revision_id:'q'}],
    quotation_reference_counters:[{hijri_year:'1448H',high_water:1}],
    quotation_items:items.map(item=>({...item,_id:'i',quotation_id:'q'})),
    quotation_logs:[{quotation_id:'q',action:'created',performed_by:'actor'}],
    quotation_save_receipts:[{actor:'actor',request_key:'key',result:{id:'q',family_id:'f',revision:0,quotation_number:'1448H-0001'}}],
    quotation_create_receipts:[],
    quotation_pdf_artifacts:[{_id:'artifact',revision_id:'q',input_json,input_sha256,state:{kind:'ready',attempt_id:'attempt',...candidate}}],
    quotation_pdf_attempts:[{_id:'attempt',artifact_id:'artifact',retired:false,candidate}],
  };
}

test('read-only checker accepts a complete modern save without mutating its input',()=>{
  const tables=fixture();const before=structuredClone(tables);
  assert.equal(checkRevisionInvariants(tables).quotations,1);
  assert.deepEqual(tables,before);
});
for (const [name, corrupt] of [
  ['self-consistent wrong PDF reference',t=>{const a=t.quotation_pdf_artifacts[0];const input=JSON.parse(a.input_json);input.title='1448H-9999';input.details.reference_number='1448H-9999';a.input_json=JSON.stringify(input);const hash=createHash('sha256').update(a.input_json).digest('hex');a.input_sha256=hash;a.state.input_sha256=hash;t.quotation_pdf_attempts[0].candidate.input_sha256=hash;}],
  ['corrupt frozen business',t=>{const doc=JSON.parse(t.quotations[0].frozen_document);doc.quotation_number='WRONG';doc.saved_by='other';doc.status='sent';doc.total_amount=999;t.quotations[0].frozen_document=JSON.stringify(doc);}],
  ['missing items',t=>t.quotation_items=[]],
  ['missing audit',t=>t.quotation_logs=[]],
  ['missing receipt',t=>t.quotation_save_receipts=[]],
  ['wrong exact receipt reference',t=>t.quotation_save_receipts[0].result.quotation_number='WRONG'],
  ['mismatched ready candidate',t=>t.quotation_pdf_attempts[0].candidate.storage_id='other'],
  ['changed frozen line',t=>t.quotation_items[0].unit_price=999],
  ['orphan item',t=>t.quotation_items[0].quotation_id='other'],
  ['missing current pointer',t=>t.quotation_families[0].current_revision_id='other'],
  ['duplicate artifact',t=>t.quotation_pdf_artifacts.push({...t.quotation_pdf_artifacts[0],_id:'duplicate'})],
]) test(`read-only checker rejects ${name}`,()=>{const tables=fixture();corrupt(tables);assert.throws(()=>checkRevisionInvariants(tables));});
