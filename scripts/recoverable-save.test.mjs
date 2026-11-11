import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {packages,quotations,normalize,state,packageSchema,form as fixtureForm,create,read,transform,quotePayload,load} from './helpers/submission-fixtures.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const referenceConflict = load(require('node:path').resolve('src/domain/package-reference-conflict.ts'));
const source = fs.readFileSync('src/features/packages/PackageBuilder.tsx','utf8');
function builder(fetch, initialValues) {
  const values = initialValues ?? fixtureForm();if(!initialValues){values.name='Complete draft';values.rooms[0].price='1234.56';}
  const downloads=[];const resolver=require('@hookform/resolvers/zod').zodResolver(packageSchema);
  const refs=[]; let cursor=0; const states=[]; let stateCursor=0;
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef: initial=>refs[cursor++]??(refs[cursor-1]={current:initial}),useState:initial=>{const i=stateCursor++; states[i]??=initial;return [states[i],value=>{states[i]=value}];},useEffect:()=>{}};
  const exports={}; const router={push:()=>{},refresh:()=>{}};
  const methods={setValue:(key,value)=>{values[key]=value;},getValues:path=>path?path.split('.').reduce((v,k)=>v[k],values):values,trigger:async()=>true,setFocus:()=>{},handleSubmit:(fn,invalid)=>async()=>{const result=await resolver(values,{}, {criteriaMode:"firstError",shouldUseNativeValidation:false});return Object.keys(result.errors).length?invalid(result.errors):fn(result.values)}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,fetch,structuredClone,Blob,setTimeout,URL:{createObjectURL:blob=>{downloads.push(blob);return "blob:test"},revokeObjectURL(){}},document:{createElement:()=>({click(){}})},crypto:globalThis.crypto,console,require(id){if(id==='~/domain/package-reference-conflict')return referenceConflict;if(id.includes('RoomDetails'))return {__esModule:true,default:function RoomDetails(){}};if(id==='react')return react;if(id==='react-hook-form')return {useForm:()=>methods};if(id==='next/navigation')return {useRouter:()=>router};if(id==='@hookform/resolvers/zod')return {zodResolver:()=>{}};return new Proxy({},{get:(_,key)=>key});}});
  function render(){cursor=0;stateCursor=0;return exports.default({initialData:values,allPackages:[]});}
  function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;return (node.props?.children??[]).flat(Infinity).map(n=>find(n,predicate)).find(Boolean);}
  const submit=async()=>{await find(render(),n=>n.type?.name==='PackageStepNavigation').props.onStepChange('preview');return find(render(),n=>n.type==='form').props.onSubmit({preventDefault(){}});};
  return {submit,values,states,render,find,downloads};
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

test('download retains the entire current raw draft and the original attempted snapshot',async()=>{
  const app=builder(async()=>{throw new TypeError('Lost response')});
  const attempted=structuredClone(app.values);await app.submit();
  app.values.rooms[0].price='';app.values.hotels[0].meals.push('Lunch');app.values.flights[0].code='';
  const download=app.find(app.render(),n=>n.props?.children?.includes('Download complete draft'));
  download.props.onClick();const exported=JSON.parse(await app.downloads[0].text());
  assert.deepEqual(exported.currentDraft,app.values);assert.deepEqual(exported.attemptedDraft,attempted);
  assert.equal(exported.outcome,'unknown');assert.equal(exported.version,1);
  const alert=app.find(app.render(),n=>n.props?.role==='alert');
  assert.match(JSON.stringify(alert),/connection failed/);
});
test('complete schema validation opens Pricing and prevents a blank price write',async()=>{
  let calls=0;const app=builder(async()=>{calls++});app.values.rooms[0].price='';await app.submit();
  assert.equal(calls,0);assert.ok(app.states.includes('pricing'));assert.equal(app.values.rooms[0].price,'');
  assert.match(JSON.stringify(app.render()),/Correct these fields before saving/);
});
test('confirmed success renders the canonical saved-record link',async()=>{
  const app=builder(async()=>({ok:true,json:async()=>({success:true,packageId:'packages:123'})}));
  await app.submit();const tree=app.render();assert.match(JSON.stringify(tree),/Package saved successfully/);
  assert.ok(app.find(tree,n=>n.props?.href==='/packages/edit/packages:123'));
});

test('section import rejects removal through actual update handler and keeps draft correctable',async()=>{
  const database=state();const id=await create(database,fixtureForm());
  await quotations.create._handler(database.ctx,{payload:quotePayload(id,database.tables.package_flights[0]._id)});
  const initial=transform(await read(database,id));let calls=0;
  const app=builder(async(_url,options)=>{
    calls++;
    try {
      const result=await packages.updatePackage._handler(database.ctx,{id,payload:normalize(JSON.parse(options.body))});
      return {ok:true,json:async()=>({success:true,packageId:result.packageId})};
    }catch(error){return {ok:false,status:400,json:async()=>({success:false,...error.data})};}
  },initial);
  const roomSection=app.find(app.render(),node=>node.type?.name==='RoomDetails');
  const importRooms=app.find(roomSection.props.renderCardHeader(),node=>typeof node.props?.handleImport==='function');
  assert.ok(importRooms,'actual room import callback is rendered');
  const imported=fixtureForm();imported.rooms[0].name='Double';imported.rooms[0]._id='source-room-id';
  importRooms.props.handleImport(imported);
  assert.equal(app.values.rooms[0]._id,'');assert.equal(app.values.rooms[0].name,'Double');
  const before=structuredClone(database.tables);await app.submit();
  assert.deepEqual(database.tables,before);assert.match(JSON.stringify(app.render()),/1448H-0001/);
  assert.equal(app.states.find(value=>value?.kind==='rejected')?.kind,'rejected');
  imported.rooms[0].name='Quad';importRooms.props.handleImport(imported);await app.submit();
  assert.equal(calls,2);assert.match(JSON.stringify(app.states),/saved/);
});
