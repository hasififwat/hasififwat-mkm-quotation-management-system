import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {packages,normalize,state,form as fixtureForm} from './helpers/submission-fixtures.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync('src/features/packages/PackageBuilder.tsx','utf8');
function builder(fetch) {
  const values = {name:'Complete draft',year:'2026/2027',hotels:[{meals:['Breakfast']}],rooms:[{price:'1234.56'}],flights:[{departure:'2027-01-01',return:'2027-01-12'}]};
  const refs=[]; let cursor=0; const states=[]; let stateCursor=0;
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef: initial=>refs[cursor++]??(refs[cursor-1]={current:initial}),useState:initial=>{const i=stateCursor++; states[i]??=initial;return [states[i],value=>{states[i]=value}];},useEffect:()=>{}};
  const exports={}; const router={push:()=>{},refresh:()=>{}};
  let validSubmit;
  const methods={getValues:()=>values,trigger:async()=>true,setFocus:()=>{},handleSubmit:fn=>{validSubmit=fn;return fn}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,fetch,structuredClone,crypto:globalThis.crypto,console,require(id){if(id==='react')return react;if(id==='react-hook-form')return {useForm:()=>methods};if(id==='next/navigation')return {useRouter:()=>router};if(id==='@hookform/resolvers/zod')return {zodResolver:()=>{}};return new Proxy({},{get:(_,key)=>key});}});
  function render(){cursor=0;stateCursor=0;return exports.default({initialData:values,allPackages:[]});}
  function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;return (node.props?.children??[]).flat(Infinity).map(n=>find(n,predicate)).find(Boolean);}
  const submit=()=>{render();return validSubmit(values);};
  return {submit,values,states,render,find};
}
test('save callback excludes a second invocation synchronously',async()=>{
  let calls=0,resolve;const pending=new Promise(r=>resolve=r);
  const app=builder(async()=>{calls++;await pending;return {ok:true,json:async()=>({success:true})};});
  const original=JSON.stringify(app.values);const first=app.submit();const second=app.submit();
  await new Promise(r=>setImmediate(r));resolve();assert.equal(calls,1);await Promise.all([first,second]);assert.equal(JSON.stringify(app.values),original);
});
for(const failure of ['http','network'])test(`${failure} failure is visible and keeps every draft field`,async()=>{
  const app=builder(async()=>{if(failure==='network')throw new TypeError('offline');return {ok:false,status:503,json:async()=>({error:'Service unavailable'})};});
  const original=JSON.stringify(app.values);await app.submit();assert.equal(JSON.stringify(app.values),original);
  assert.match(JSON.stringify(app.states),/draft|saved|connection|unavailable/i);
});

test('Enter outside Preview never dispatches a package write',async()=>{
  let calls=0;const app=builder(async()=>{calls++;return {ok:true};});
  const form=app.find(app.render(),n=>n.type==='form');
  await form.props.onSubmit({preventDefault(){}});
  assert.equal(calls,0);
});

test('create commits then loses its response; another save cannot duplicate it',async()=>{
  const database=state();let calls=0;
  const app=builder(async()=>{
    calls++;
    await packages.createPackage._handler(database.ctx,{payload:normalize(fixtureForm())});
    throw new TypeError('Response lost after committed create');
  });
  await app.submit();const committed=JSON.stringify(database.tables);
  app.values.name='Changed draft after uncertainty';
  await app.submit();
  assert.equal(calls,1);assert.equal(database.tables.packages.length,1);
  assert.equal(JSON.stringify(database.tables),committed);
  assert.equal(app.values.name,'Changed draft after uncertainty');
  assert.match(JSON.stringify(app.states),/unknown/);
});
test('a known HTTP 400 rejection permits correction and a deliberate save',async()=>{
  let calls=0;const app=builder(async()=>++calls===1
    ? {ok:false,status:400,json:async()=>({success:false,error:'Invalid fields'})}
    : {ok:true,json:async()=>({success:true,packageId:'packages:1'})});
  await app.submit();await app.submit();await app.submit();assert.equal(calls,2);
  assert.match(JSON.stringify(app.states),/saved/);
});
test('an invalid success acknowledgement blocks another request',async()=>{
  let calls=0;const app=builder(async()=>{calls++;return {ok:true,json:async()=>({success:true})};});
  await app.submit();await app.submit();assert.equal(calls,1);assert.match(JSON.stringify(app.states),/unknown/);
});
