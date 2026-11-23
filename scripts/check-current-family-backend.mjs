import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { ConvexHttpClient } from 'convex/browser';
import net from 'node:net';

const repo = process.cwd();
const binary = process.env.FAMILY_BACKEND_BINARY;
if (!binary) throw new Error('Set FAMILY_BACKEND_BINARY to a convex-local-backend executable');
const port = 13665;
const url = `http://127.0.0.1:${port}`;
for (const candidate of [port, port + 1]) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(candidate, '127.0.0.1', () => server.close(resolve));
  });
}
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'current-family-backend-'));
const secret = randomBytes(32).toString('hex');
const name = 'current-family-fixture';
const adminKey = execFileSync(binary, ['keygen','admin-key','--instance-name',name,'--instance-secret',secret], {encoding:'utf8'}).trim();
const backend = spawn(binary, ['--interface','127.0.0.1','--port',String(port),'--site-proxy-port',String(port+1),'--instance-name',name,'--instance-secret',secret,'--disable-beacon',path.join(root,'fixture.sqlite3')], {cwd:root,stdio:'ignore',detached:true});
const result = { surface:'Disposable real Convex backend. Backend fixtures, not UI proof.', checks:[] };
try {
  await fs.mkdir(path.join(root,'convex/lib'), {recursive:true});
  await fs.mkdir(path.join(root,'convex/_generated'));
  await fs.symlink(path.join(repo,'node_modules'),path.join(root,'node_modules'));
  await fs.writeFile(path.join(root,'package.json'), JSON.stringify({type:'module',dependencies:{convex:'1.45.0','@react-pdf/renderer':'4.9.0'}}));
  await fs.copyFile(path.join(repo,'convex.json'),path.join(root,'convex.json'));
  await fs.cp(path.join(repo,'src/features/quotation/pdf'),path.join(root,'src/features/quotation/pdf'),{recursive:true});
  for (const file of ['inquiries.ts','lib/inquiryLifecycle.ts','lib/quotationRefreshToken.ts','schema.ts','quotations.ts','quotationFamilies.ts','packages.ts','lib/currentQuotations.ts','lib/packageEditSnapshot.ts','lib/packageReferences.ts','clients.ts','profiles.ts','quotationFamilyMigration.ts','quotationRevisionSaves.ts','lib/savedQuotation.ts','lib/clientCanonical.ts','lib/quotationFamilyIdentity.ts','_generated/server.js','_generated/api.js','quotationPdfArtifacts.ts','quotationPdfWorker.ts','lib/quotationPdfAssetsV1.json','lib/quotationPdfInput.ts','lib/quotationPdfTermsV1.ts','lib/quotationPdfModel.ts']) await fs.copyFile(path.join(repo,'convex',file),path.join(root,'convex',file));
  await fs.mkdir(path.join(root,'src/domain'), {recursive:true});
  for (const file of ['quotation-selection-context.ts','umrah-years.ts','submission-validation.ts','package-edit-conflict.ts','package-sync-intent.ts','snapshot-refresh-review.ts','quotation-status.ts']) await fs.copyFile(path.join(repo,'src/domain',file),path.join(root,'src/domain',file));
  await fs.writeFile(path.join(root,'convex/fixture.ts'), `
import { internalMutation, internalQuery } from './_generated/server';
import { saveRevision, saveCommand } from './quotationRevisionSaves';
import { quotationSelectionContext } from '../src/domain/quotation-selection-context';
import { v } from 'convex/values';
export const seed = internalMutation({args:{},handler:async(ctx)=>{
const now='2026-11-17';
if(!await ctx.db.query('quotation_revision_release').unique())await ctx.db.insert('quotation_revision_release',{key:'revision-v1',enabled:true});
const client=await ctx.db.insert('clients',{name:'Disposable revision fixture',phone_number:'fixture-phone',created_at:now,updated_at:now});
const pkg=await ctx.db.insert('packages',{name:'Disposable',duration:'12 days',year:'2026/2027',status:'active',created_at:now,updated_at:now});
const flight=await ctx.db.insert('package_flights',{package_id:pkg,month:'Nov',flight:'OUT',return_flight:'RETURN',departure_date:'2026-11-20',return_date:'2026-12-01',departure_sector:'KUL',return_sector:'JED',created_at:now});
await ctx.db.insert('package_rooms',{package_id:pkg,room_type:'Quad',price:100.1,enabled:true,created_at:now});
const hotel=await ctx.db.insert('package_hotels',{package_id:pkg,hotel_type:'MAKKAH',name:'Saved hotel',placeholder:'Hotel',enabled:true,created_at:now});
await ctx.db.insert('package_meals',{package_hotel_id:hotel,meal_type:'BREAKFAST',created_at:now});
await ctx.db.insert('profiles',{full_name:'Saved preparer',branch:'Fixture',updated_at:now});
const context=quotationSelectionContext(await ctx.db.get(pkg),await ctx.db.query('package_rooms').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_flights').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_hotels').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_meals').collect());
return {client,pkg,flight,context};}});
export const rollback = internalMutation({args:{command:saveCommand},handler:async(ctx,{command})=>{await saveRevision(ctx,'fixture-actor',command);throw new Error('Injected failure after complete save');}});
export const removeCatalog = internalMutation({args:{},handler:async(ctx)=>{for(const table of ['clients','packages','package_flights','package_rooms'] as const)for(const row of await ctx.db.query(table).collect())await ctx.db.delete(row._id);}});
export const changeLive=internalMutation({args:{},handler:async(ctx)=>{
for(const row of await ctx.db.query('clients').collect())await ctx.db.patch(row._id,{name:'Changed client',phone_number:'Changed phone'});
for(const row of await ctx.db.query('packages').collect())await ctx.db.patch(row._id,{name:'Changed package',duration:'15 days',updated_at:'2026-11-18'});
for(const row of await ctx.db.query('package_rooms').collect())await ctx.db.patch(row._id,{room_type:'Renamed',price:9000});
for(const row of await ctx.db.query('package_flights').collect())await ctx.db.patch(row._id,{flight:'Changed flight',return_flight:'Changed return',departure_date:'2026-11-21'});
for(const row of await ctx.db.query('package_hotels').collect())await ctx.db.patch(row._id,{name:'Changed hotel'});
for(const row of await ctx.db.query('package_meals').collect())await ctx.db.patch(row._id,{meal_type:'DINNER'});
for(const row of await ctx.db.query('profiles').collect())await ctx.db.patch(row._id,{full_name:'Changed preparer',branch:'Changed branch'});
}});
export const review=internalQuery({args:{pkg:v.id('packages')},handler:async(ctx,{pkg})=>quotationSelectionContext(await ctx.db.get(pkg),await ctx.db.query('package_rooms').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_flights').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_hotels').withIndex('by_package_id',q=>q.eq('package_id',pkg)).collect(),await ctx.db.query('package_meals').collect())});
export const missingGate=internalMutation({args:{},handler:async(ctx)=>{for(const row of await ctx.db.query('quotation_family_migrations').collect())await ctx.db.delete(row._id);}});
export const migration=internalMutation({args:{state:v.union(v.literal('missing'),v.literal('incomplete'),v.literal('complete'))},handler:async(ctx,{state})=>{const gate=await ctx.db.query('quotation_family_migrations').unique();if(state==='missing'){if(gate)await ctx.db.delete(gate._id);}else if(gate)await ctx.db.patch(gate._id,{done:state==='complete'});else await ctx.db.insert('quotation_family_migrations',{key:'family-v1',done:state==='complete',cursor:null});}});
export const legacy=internalMutation({args:{id:v.id('quotations')},handler:async(ctx,{id})=>{const row=await ctx.db.get(id);const {_id,_creationTime,family_id,previous_revision_id,frozen_document,document_schema_version,...legacy}=row;return await ctx.db.insert('quotations',{...legacy,sequence_num:900,revision:0,archived:false});}});
export const release=internalMutation({args:{enabled:v.boolean()},handler:async(ctx,{enabled})=>{const gate=await ctx.db.query('quotation_revision_release').unique();await ctx.db.patch(gate._id,{enabled});}});
export const dump=internalQuery({args:{},handler:async(ctx)=>{const result={};for(const table of ['quotations','quotation_families','quotation_items','quotation_logs','quotation_save_receipts','quotation_reference_counters','client_aliases','clients','profiles','quotation_revision_release','quotation_family_migrations','inquiries','inquiry_events'] as const)result[table]=await ctx.db.query(table).collect();return result;}});
`);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (backend.exitCode !== null) throw new Error('Owned disposable backend exited before readiness');
    try { if ((await fetch(`${url}/version`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Owned disposable backend did not become ready');
  const deploy = spawn(path.join(repo,'node_modules/.bin/convex'),['dev','--once','--typecheck','disable','--codegen','disable'],{cwd:root,env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('CONVEX_'))),CONVEX_SELF_HOSTED_URL:url,CONVEX_SELF_HOSTED_ADMIN_KEY:adminKey},stdio:['ignore','pipe','pipe']});
  let output=''; deploy.stdout.on('data',d=>output+=d);deploy.stderr.on('data',d=>output+=d);
  const code=await new Promise(r=>deploy.on('exit',r));
  if(code!==0) throw new Error(`Local deployment failed. ${output.replaceAll(adminKey,'[redacted]')}`);
  const client = new ConvexHttpClient(url); client.setAdminAuth(adminKey);
  const mutate = async (fn, args) => {
    for (let attempt = 0; ; attempt++) {
      try { return await client.mutation(fn, args); }
      catch (error) {
        if (attempt >= 8 || !String(error).includes('TooManyWrites')) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };
  const seed=await mutate('fixture:seed',{});
  client.setAdminAuth(adminKey,{subject:'fixture-actor|fixture-session',issuer:'fixture',tokenIdentifier:'fixture|fixture-actor'});
  const key=()=>crypto.randomUUID();
  const save = command => mutate('quotationRevisionSaves:save', {command});
  const legacy=await mutate('quotations:create',{payload:{
    request_key:key(),pic_name:'Fixture',branch:'Fixture',notes:'zero',
    client_id:seed.client,package_id:seed.pkg,flight_id:seed.flight,reviewed_context:seed.context,
    selected_rooms:[{room_type:'Quad',price:100,pax:1}],adds_ons:[],discounts:[],
  }});
  await mutate('quotationFamilyMigration:freeze',{acknowledgement:'Reviewed cutover write freeze'});
  const migration=await mutate('quotationFamilyMigration:backfill',{expectedCursor:null,limit:10,dryRun:false});
  assert.equal(migration.done,true);
  assert.equal(migration.changed,1);
  const family=(await client.query('fixture:dump',{})).quotation_families.find(row=>row.current_revision_id===legacy.id);
  assert.ok(family);
  assert.equal(family.inquiry_id,undefined);
  const standalone={id:legacy.id,family_id:family._id};
  const destination=async()=>(await client.query('inquiries:destination',{client_id:seed.client})).destination;
  const create=async()=>({operation:'create',request_key:key(),inquiry_destination:await destination(),pic_name:'Fixture',branch:'Fixture',notes:'zero',client:{mode:'replace',id:seed.client},selection:{mode:'replace',package_id:seed.pkg,flight_id:seed.flight,reviewed_context:seed.context,rooms:[{room_type:'Quad',price:100,pax:1}]},extras:{mode:'replace',addons:[],discounts:[]}});
  const append=(base,changes={})=>({operation:'append',request_key:key(),family_id:base.family_id,source_revision_id:base.id,expected_current_id:base.id,pic_name:'Fixture',branch:'Fixture',notes:'saved',client:{mode:'retain'},selection:{mode:'retain'},extras:{mode:'retain'},...changes});
  const dump=()=>client.query('fixture:dump',{});
  const current=[],old=[];
  for(let i=0;i<13;i++){
    const zero=i===0?standalone:await save(await create());
    const changes=i===0?{}:{expected_inquiry_cycle:(await destination()).cycle};
    const one=await save(append(zero,changes));const two=await save(append(one,changes));
    old.push(zero,one);current.push(two);
  }
  const beforeReads=await dump();
  for(const sortBy of ['created_at','updated_at'])for(const sortDir of ['asc','desc']){
    const ids=[];let cursor=null;
    do {
      const page=await client.query('quotations:listPaginated',{paginationOpts:{cursor,numItems:10},sortBy,sortDir});
      ids.push(...page.page.map(row=>row.id));assert.equal(page.total,13);
      if(page.isDone)break;
      assert.equal(page.page.length,10);assert.notEqual(page.continueCursor,cursor);cursor=page.continueCursor;
    }while(ids.length<100);
    assert.equal(ids.length,13);assert.equal(new Set(ids).size,13);assert.deepEqual(ids.sort(),current.map(row=>row.id).sort());
  }
  assert.equal(await client.query('quotations:count',{}),13);
  assert.deepEqual(await dump(),beforeReads);
  result.checks.push('Thirteen families with three revisions each span pages. Both timestamp sorts and directions return every current ID exactly once. Counts agree. Read handlers leave persisted source tables unchanged.');
  await mutate('fixture:changeLive',{});
  const list=await client.query('quotations:list',{});assert.equal(list.length,13);
  assert.ok(list.every(row=>row.package.name==='Disposable'&&row.client_name==='Disposable revision fixture'));
  for(const searchTerm of [list[0].quotation_number,list[0].quotation_number.replace(/-R\d+$/,''),'Disposable']){
    const page=await client.query('quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10},searchTerm});
    assert.ok(page.page.length>0);assert.equal(page.total,await client.query('quotations:count',{searchTerm}));
  }
  const absent=await client.query('quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10},searchTerm:'Changed package'});assert.equal(absent.total,0);
  const packagePage=await client.query('quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10},package_id:seed.pkg});assert.equal(packagePage.total,13);
  const canonical=await mutate('clients:create',{name:'Canonical fixture',phone_number:'fixture'});
  const final=await mutate('clients:create',{name:'Final fixture',phone_number:'fixture'});
  const beforeMerge=await dump();
  await mutate('clients:mergeClients',{canonicalId:canonical.id,duplicateIds:[seed.client]});
  await mutate('clients:mergeClients',{canonicalId:final.id,duplicateIds:[canonical.id]});
  const rows=await client.query('clients:listWithStats',{});assert.equal(rows.length,1);assert.equal(rows[0].quotation_count,13);assert.equal(rows[0].total_quoted_value,1300);
  const clientPage=await client.query('quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10},client_id:final.id});assert.equal(clientPage.total,13);assert.ok(clientPage.page.every(row=>row.client_id===final.id&&row.client_name==='Disposable revision fixture'));
  const associated=await client.query('clients:getWithQuotations',{client_id:seed.client});assert.equal(associated.id,final.id);assert.equal(associated.quotations.length,13);assert.equal(associated.historical_quotations.length,26);
  const merged=await dump();assert.deepEqual(merged.quotations,beforeMerge.quotations);assert.deepEqual(merged.quotation_items,beforeMerge.quotation_items);
  result.checks.push('Saved package/client names survive live changes. Base/full reference and saved-label searches agree with counts. Package deep links filter current rows. Transitive canonical aliases group all thirteen families once without rewriting saved identity or items.');
  const second=await mutate('fixture:seed',{});
  const moved=await save(append(current[0],{client:{mode:'replace',id:second.client},selection:{mode:'replace',package_id:second.pkg,flight_id:second.flight,reviewed_context:second.context,rooms:[{room_type:'Quad',price:200,pax:1}]}}));
  const stats=await client.query('packages:listWithQuotationCounts',{});
  assert.equal(stats.find(row=>row.id===seed.pkg).total,12);assert.equal(stats.find(row=>row.id===second.pkg).total,1);assert.equal(stats.find(row=>row.id===seed.pkg).historical_total,27);
  const originalClient=await client.query('clients:getWithQuotations',{client_id:final.id});assert.equal(originalClient.quotations.length,12);assert.equal(originalClient.historical_quotations.length,27);
  const replacementClient=await client.query('clients:getWithQuotations',{client_id:second.client});assert.equal(replacementClient.quotations[0].id,moved.id);
  result.checks.push('Replacing the current client/package moves operational client values and package status counts to the new association. Prior associations remain separately discoverable.');
  assert.deepEqual(await client.query('quotations:findDuplicates',{}),[]);
  const beforeArchive=await dump();const family_id=moved.family_id;
  client.setAdminAuth(adminKey);
  for(const [fn,args]of [['quotations:list',{}],['quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10}}],['quotations:count',{}],['clients:listWithStats',{}],['packages:listWithQuotationCounts',{}],['quotationFamilies:history',{family_id}]])await assert.rejects(()=>client.query(fn,args));
  await assert.rejects(()=>mutate('quotationFamilies:archive',{family_id}));assert.deepEqual(await dump(),beforeArchive);
  client.setAdminAuth(adminKey,{subject:'fixture-actor|fixture-session',issuer:'fixture',tokenIdentifier:'fixture|fixture-actor'});
  await mutate('fixture:release',{enabled:false});const closed=await dump();
  await assert.rejects(()=>mutate('quotationFamilies:archive',{family_id}));assert.deepEqual(await dump(),closed);
  await mutate('fixture:release',{enabled:true});
  for (const state of ['missing', 'incomplete']) {
    await mutate('fixture:migration', {state});
    const gated = await dump();
    await assert.rejects(() => mutate('quotationFamilies:archive', {family_id}), /inactive/);
    assert.deepEqual(await dump(), gated);
  }
  await mutate('fixture:migration', {state:'complete'});
  await mutate('quotationFamilies:archive',{family_id});await mutate('quotationFamilies:archive',{family_id});
  assert.equal(await client.query('quotations:count',{}),12);
  const archived=await client.query('quotations:listPaginated',{paginationOpts:{cursor:null,numItems:10},visibility:'archived'});assert.equal(archived.page[0].id,moved.id);
  const history=await client.query('quotationFamilies:history',{family_id});assert.equal(history.revisions.length,4);assert.equal(history.family.current_revision_id,moved.id);assert.equal(history.family.archived,true);
  for(const prior of [old[0],old[1],current[0]]){
    const exact=await client.query('quotations:getQuotationFullDetails',{target_quotation_id:prior.id});assert.equal(exact.id,prior.id);assert.equal(exact.revision_context.current_revision_id,moved.id);assert.equal(exact.revision_context.can_append,false);
  }
  const afterArchive=await dump();assert.deepEqual(afterArchive.quotations,beforeArchive.quotations);assert.deepEqual(afterArchive.quotation_items,beforeArchive.quotation_items);assert.equal(afterArchive.quotation_logs.filter(row=>row.action==='family_archived').length,1);
  await assert.rejects(()=>save(append(moved)));assert.deepEqual(await dump(),afterArchive);
  result.checks.push('Unauthenticated operational/history readers and archive reject. Disabled release rejects archive with no writes. Archive logs once, hides only the family operationally, preserves the current pointer, exact old review content, all revision/item rows and ordered history, and rejects later append. Family revisions never enter deletable duplicate suggestions.');
  const legacyId = await mutate('fixture:legacy', {id:moved.id});
  const legacyRows = await client.query('quotations:list', {});
  assert.equal(legacyRows.length, 13);
  assert.ok(legacyRows.some(row => row.id === legacyId && row.family_id === null));
  assert.equal(await client.query('quotations:count', {}), 13);
  result.checks.push('Missing and incomplete migration gates reject family archive without writes. The actual optional family index includes an ungrouped legacy row alongside indexed current family pointers.');
  result.runtime={node:process.version,convex:'1.45.0',url};
  result.source=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
  result.source_dirty=execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim().length>0;
} finally {
  process.kill(-backend.pid, 'SIGTERM');
  await new Promise(r=>backend.exitCode!==null?r():backend.once('exit',r));
  await fs.rm(root,{recursive:true,force:true});
}

result.cleanup='Isolated process stopped and temporary database removed in finally.';
console.log(JSON.stringify(result,null,2));
if(process.env.CURRENT_FAMILY_EVIDENCE)await fs.writeFile(process.env.CURRENT_FAMILY_EVIDENCE,JSON.stringify(result,null,2)+'\n');
