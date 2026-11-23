import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const {ConvexError} = require('convex/values');
function route(error, revision = null) {
 const calls = []; const exported = {};
 const source = path.resolve('src/app/api/quotations/update/route.ts');
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(source,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
  exports:exported, Error, console:{error(){}},
  require(id) {
   if(id==='next/server') return {NextResponse:Response};
   if(id==='~/features/quotation/revision-api') return {saveRevisionResponse:async()=>revision};
   if(id==='convex/_generated/api') return {api:{quotations:{refreshSnapshot:'refresh',update:'update'}}};
   if(id==='~/lib/convex-server') return {getServerConvexClient:async()=>({mutation:async(...args)=>{calls.push(args);if(error)throw error;return {snapshot_refresh_token:'refreshed'};}})};
   return require(id);
  },
 }, {filename:source});
 return {post:body=>exported.POST(new Request('https://fixture.invalid/api/quotations/update',{method:'POST',body:JSON.stringify(body)})), calls};
}
const payload = {_intent:'refresh_snapshot',quotation_id:'q:1',expected_quotation_token:'loaded',source_context:'reviewed'};
test('refresh route forwards both reviewed tokens', async()=>{
 const r=route();
 const response=await r.post(payload);
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{success:true,refreshed:true,snapshot_refresh_token:'refreshed'});
 assert.deepEqual(JSON.parse(JSON.stringify(r.calls)),[['refresh',{quotation_id:'q:1',expected_quotation_token:'loaded',source_context:'reviewed'}]]);
});
for(const key of ['quotation_id','expected_quotation_token','source_context']) test(`refresh route requires ${key}`,async()=>{
 const r=route(); assert.equal((await r.post({...payload,[key]:null})).status,400); assert.equal(r.calls.length,0);
});
for(const code of ['SNAPSHOT_REFRESH_CONFLICT','SNAPSHOT_REFRESH_UNAVAILABLE'])test(`typed ${code} maps to409`,async()=>{
 const response=await route(new ConvexError({code})).post(payload);assert.equal(response.status,409);assert.equal((await response.json()).code,code);
});
for(const error of [new Error('Not authenticated'),new ConvexError({code:'Unauthenticated'})])test('refresh authentication maps to401',async()=>{
 assert.equal((await route(error).post(payload)).status,401);
});
test('unknown refresh errors remain500',async()=>assert.equal((await route(new Error('network')).post(payload)).status,500));
test('ordinary update sends the draft to the legacy mutation',async()=>{
 const r=route();assert.equal((await r.post({id:'q:1',notes:'draft'})).status,200);assert.equal(r.calls[0][0],'update');
});
test('revision response still owns command handling',async()=>{
 const revision=Response.json({success:true,revision:2});const r=route(null,revision);assert.equal(await r.post({command:{operation:'append'}}),revision);assert.equal(r.calls.length,0);
});

for (const code of ['QUOTATION_STALE_EDITOR', 'QUOTATION_SELECTION_CONFLICT']) {
 test(`legacy Save returns a typed HTTP 409 for ${code}`, async () => {
  const message = 'Review the saved quotation or catalogue before saving.';
  const response = await route(new ConvexError({code, message})).post({id:'q:1',notes:'draft'});
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {success:false, code, error:message});
 });
}
