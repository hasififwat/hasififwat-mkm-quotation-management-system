import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {load,packages,state,create,read,transform,normalize,form,quotations,quotePayload,packageSchema} from './helpers/submission-fixtures.mjs';
const require=createRequire(import.meta.url);
const {ConvexError}=require('convex/values');
const ts=require('typescript');
function route(mutation) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/packages/update/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
    exports,console:{error(){}},require(id){
      if(id==='convex/_generated/api')return {api:{packages:{updatePackage:'update'}}};
      if(id==='next/server')return {NextResponse:Response};
      if(id==='~/lib/convex-server')return {getServerConvexClient:async()=>({mutation})};
      if(id==='~/features/packages/schema')return {packageSchema};
      if(id==='~/features/packages/utils')return {normalizePackageMutationPayload:normalize};
      if(id==='~/domain/package-edit-conflict')return load(require('node:path').resolve('src/domain/package-edit-conflict.ts'));if(id==='~/domain/package-reference-conflict')return load(path.resolve('src/domain/package-reference-conflict.ts'));
      return require(id);
    },
  });
  return data=>exports.POST({json:async()=>data});
}
test('actual reference rejection reaches HTTP400 with affected quotation and no writes',async()=>{
  const s=state();const id=await create(s,form());await quotations.create._handler(s.ctx,{payload:quotePayload(id,s.tables.package_flights[0]._id)});
  const data=transform(await read(s,id));data.flights=[];const before=structuredClone(s.tables);s.operations.length=0;
  const response=await route((_ref,args)=>packages.updatePackage._handler(s.ctx,args))(data);
  assert.equal(response.status,400);const body=await response.json();
  assert.equal(body.code,'PACKAGE_REFERENCE_CONFLICT');assert.match(body.message,/1448H-0001/);assert.match(body.message,/not saved/);
  assert.deepEqual(s.tables,before);assert.deepEqual(s.operations.filter(([op])=>['patch','insert','delete'].includes(op)),[]);
});
for(const error of [new Error('ordinary failure'),new ConvexError({code:'PACKAGE_EDIT_CONFLICT',message:42}),{data:{code:'PACKAGE_EDIT_CONFLICT',message:'forged'}},new ConvexError({code:'OTHER',message:'Other'}),new ConvexError({code:'PACKAGE_REFERENCE_CONFLICT',message:42}),{data:{code:'PACKAGE_REFERENCE_CONFLICT',message:'Forged plain object'}}]){
  test(`unrecognized mutation error stays HTTP500 (${JSON.stringify(error)})`,async()=>{
    const data=form();data._id='packages:1';data.editToken='baseline';const response=await route(async()=>{throw error})(data);
    assert.equal(response.status,500);assert.equal((await response.json()).code,undefined);
  });
}
test('permitted edit still returns canonical saved package ID',async()=>{
  const s=state();const id=await create(s,form());const data=transform(await read(s,id));data.name='Saved edit';
  const response=await route((_ref,args)=>packages.updatePackage._handler(s.ctx,args))(data);
  assert.equal(response.status,200);assert.equal((await response.json()).packageId,id);assert.equal(s.tables.packages[0].name,'Saved edit');
});
test('missing baseline is HTTP409 without invoking backend',async()=>{const data=form();data._id='packages:1';let called=false;const response=await route(async()=>{called=true})(data);assert.equal(response.status,409);assert.equal((await response.json()).code,'PACKAGE_EDIT_CONFLICT');assert.equal(called,false);});
test('actual stale handler conflict reaches HTTP409 and preserves every table',async()=>{const s=state();const id=await create(s,form());const data=transform(await read(s,id));await packages.updatePackageStatus._handler(s.ctx,{id,status:'published'});const before=structuredClone(s.tables);s.operations.length=0;const response=await route((_ref,args)=>packages.updatePackage._handler(s.ctx,args))(data);assert.equal(response.status,409);assert.equal((await response.json()).code,'PACKAGE_EDIT_CONFLICT');assert.deepEqual(s.tables,before);assert.deepEqual(s.operations.filter(([op])=>['insert','patch','delete'].includes(op)),[]);});
