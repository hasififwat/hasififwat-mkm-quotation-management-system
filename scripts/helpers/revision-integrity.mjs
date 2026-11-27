import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { typescriptLoader } from './load-typescript.mjs';
import { state } from './submission-fixtures.mjs';

const sourcePath=path.resolve('convex/quotationRevisionSaves.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const load=typescriptLoader(process.cwd());
const { quotationSelectionContext }=load(path.resolve('src/domain/quotation-selection-context.ts'));
const legacy=load(path.resolve('convex/quotations.ts'));
const migration=load(path.resolve('convex/quotationFamilyMigration.ts'));
function fixture(authenticated=true) {
  const s=state(authenticated);
  s.tables.quotation_family_migrations.push({_id:'migration',key:'family-v1',done:true,cursor:null});
  s.tables.quotation_revision_release.push({_id:'release',key:'revision-v1',enabled:true});
  for(const id of ['p1','p2']) {
    s.tables.packages.push({_id:id,name:id,year:'2026/2027',duration:'12 days',status:'active',updated_at:'2026-01-01'});
    s.tables.package_rooms.push({_id:`r${id}`,package_id:id,room_type:'Quad',price:100,enabled:true});
    s.tables.package_flights.push({_id:`f${id}`,package_id:id,month:'Nov',departure_date:'2026-11-20',return_date:'2026-12-01',departure_sector:'KUL',return_sector:'JED'});
  }
  return s;
}
function command(s,pkg='p1',flight='fp1',client='client:1',room='Quad',pax=1,price=100) {
  const selected=s.tables.packages.find(p=>p._id===pkg);
  return {operation:'create',request_key:randomUUID(),pic_name:'Fixture',branch:'Fixture',notes:'',client:{mode:'replace',id:client},
    inquiry_destination:{canonical_client_id:client,inquiry_id:null,cycle:null},
    selection:{mode:'replace',package_id:pkg,flight_id:flight,reviewed_context:selected?quotationSelectionContext(selected,s.tables.package_rooms,s.tables.package_flights,[],[]):'',rooms:room?[{room_type:room,price,pax}]:[]},extras:{mode:'replace',addons:[],discounts:[]}};
}
async function migratedFamily(s) {
  s.tables.quotation_family_migrations.length=0;
  const { selection }=command(s);
  const { id }=await legacy.create._handler(s.ctx,{payload:{
    request_key:randomUUID(),client_id:'client:1',package_id:'p1',flight_id:'fp1',reviewed_context:selection.reviewed_context,
    pic_name:'Fixture',branch:'Fixture',notes:'',selected_rooms:selection.rooms,adds_ons:[],discounts:[],
  }});
  await migration.freeze._handler(s.ctx,{acknowledgement:'Reviewed cutover write freeze'});
  await migration.backfill._handler(s.ctx,{expectedCursor:null,limit:50,dryRun:false});
  return {id,family_id:s.tables.quotation_families.find(family=>family.current_revision_id===id)._id};
}
export async function verifyRevisionIntegrity(selfTest=false) {
  const handlers=text=>typescriptLoader(process.cwd(),new Map([[sourcePath,text]]))(sourcePath);
  const original=handlers(source).save;
  async function check(text) {
    const {save}=handlers(text);
    const report={cases:0,successes:0,authFailures:0,associationFailures:0,adapterErrors:[]};
    for(const operation of ['create','append','inquiry-append']) for(const authenticated of [false,true]) for(const pkg of ['p1','p2','missing']) for(const flight of ['fp1','fp2','missing']) for(const client of ['client:1','missing']) for(const room of ['Quad','unknown',null]) for(const pax of [1,2]) for(const price of [0,100]) {
      const s=fixture();
      let c=command(s,pkg,flight,client,room,pax,price);
      if(operation!=='create') {
        const zero=operation==='append' ? await migratedFamily(s) : await original._handler(s.ctx,{command:command(s)});
        delete c.inquiry_destination;
        c={...c,operation:'append',family_id:zero.family_id,source_revision_id:zero.id,expected_current_id:zero.id};
        if(operation==='inquiry-append') {
          c.expected_inquiry_cycle=s.tables.inquiries[0].lifecycle.cycle;
          if(client==='client:1') c.client={mode:'retain'};
        }
      }
      s.ctx.auth.getUserIdentity=async()=>authenticated?{subject:'fixture-staff'}:null;
      report.cases++;
      const valid=authenticated && ['p1','p2'].includes(pkg) && flight===`f${pkg}` && client==='client:1' && room==='Quad';
      let result;
      try { result=await save._handler(s.ctx,{command:c}); }
      catch(error) {
        const known=/Not authenticated|Package unavailable|Selected flight does not belong|Client not found|At least one room|Selected room unavailable|INQUIRY_CLIENT_LOCKED/.test(error.message);
        if(valid || !known) report.adapterErrors.push({operation,authenticated,pkg,flight,client,room,error:error.message});
        continue;
      }
      report.successes++;
      if(!authenticated) report.authFailures++;
      const row=s.tables.quotations.find(q=>q._id===result.id);
      assert.ok(row,'Successful save must return its persisted quotation');
      const actual=s.tables.package_flights.find(f=>f._id===row.flight_id);
      if(!actual || actual.package_id!==row.package_id) report.associationFailures++;
    }
    assert.ok(report.successes>0,'A valid authenticated witness is required');
    return report;
  }
  const baseline=await check(source);
  assert.equal(baseline.adapterErrors.length,0,JSON.stringify(baseline.adapterErrors[0]));
  assert.equal(baseline.authFailures,0);assert.equal(baseline.associationFailures,0);
  const mutationTests=[];
  if(selfTest) {
    const guards=[
      ['auth','if (!actor) throw new Error("Not authenticated");', ''],
      ['association','if (!flight || String(flight.package_id) !== String(pkg._id)) throw new Error("Selected flight does not belong to the selected package");','if (!flight) throw new Error("Selected flight does not belong to the selected package");'],
    ];
    for(const [name,guard,replacement] of guards) {
      assert.ok(source.includes(guard),`Missing real guard ${name}`);
      const mutant=await check(source.replaceAll(guard,replacement));
      const detected=name==='auth'?mutant.authFailures>0:mutant.associationFailures>0;
      assert.ok(detected,`Undetected ${name} mutant`);mutationTests.push({name,detected});
    }
  }
  return {source:'convex/quotationRevisionSaves.ts',sha256:createHash('sha256').update(source).digest('hex'),baseline,mutationTests};
}
