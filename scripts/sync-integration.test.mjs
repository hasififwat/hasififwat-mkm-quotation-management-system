import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';
import {ConvexError} from 'convex/values';
import {load, packages, state, form, create, read} from './helpers/submission-fixtures.mjs';

const parsers=load(path.resolve('src/features/packages/sync/parsers.ts'));
const {isPackageReferenceConflict}=load(path.resolve('src/domain/package-reference-conflict.ts'));
const page=ts.createSourceFile('page.tsx',fs.readFileSync('src/app/(protected)/packages/sync/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function pageFunction(name,context) {
 let source;
 function visit(node) {if(ts.isFunctionDeclaration(node)&&node.name?.text===name)source=node.getText(page);ts.forEachChild(node,visit);}
 visit(page);assert.ok(source);
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return vm.runInNewContext(`${js}\n${name}`,context);
}
for(const code of ['PACKAGE_SYNC_CONFLICT','PACKAGE_REFERENCE_CONFLICT'])test(`${code} displays actionable text without request stack`,()=>{
 const message='Review the retained files again before applying.';
 const error=new ConvexError({code,message});
 error.stack='Request ID abc123\nServer stack';
 const format=pageFunction('syncErrorMessage',{ConvexError,isPackageReferenceConflict});
 assert.equal(format(error),message);
 assert.equal(format(new Error('Unknown failure')),'Error: Unknown failure');
});
test('stale package with pending flight actions stops before every flight operation',async()=>{
 const s=state();const id=await create(s,form());await s.ctx.db.patch(id,{source:'sync'});
 const baseline=await read(s,id);
 const row={canonical_name:'Fixture Package',season_code:'MS - NOV',season_start:'2026-11-01',duration:'12 days'};
 const plan={errors:[],packagesToCreate:[],packagesToUpdate:[{db_id:id,db_name:'Fixture Package',expected_edit_token:baseline.editToken,row,transport:'CSV overwrite',hotels:[],rooms:[]}],packagesToPromote:[id],flightsToAdd:[{}],flightsToUpdate:[{}],flightsToRemove:[{}],flightsToPromote:['pending']};
 await s.ctx.db.patch(s.tables.package_rooms[0]._id,{price:4321});
 const before=structuredClone(s.tables);const calls=[];let result;
 const context={plan,setResult:v=>result=v,setProgress:()=>{},syncErrorMessage:e=>e.data?.message??String(e),syncPackage:args=>packages.syncPackageFromCsv._handler(s.ctx,args)};
 for(const name of ['promotePackageToSync','addFlight','updateFlight','deleteFlight','promoteToSync'])context[name]=()=>calls.push(name);
 await pageFunction('handleApply',context)();
 assert.deepEqual(calls,[]);assert.deepEqual(s.tables,before);
 assert.equal(result.flightsAdded,0);assert.equal(result.flightsUpdated,0);assert.equal(result.flightsRemoved,0);assert.equal(result.errors.length,1);
 assert.match(result.errors[0],/Review the retained files again/);
});
test('review freezes removal authorization with its parsed plan',()=>{
 let capturedPlan,capturedSchedule;
 const context={mappingRows:[],flightRows:[],existingPackages:[],mffResult:{rows:[],diagnostics:[],removalScopes:[{key:'reviewed'}],preservedFlightCount:1},mffFileName:'reviewed.csv',removalReview:{scopes:['reviewed'],complete:true},buildSyncPlan:parsers.buildSyncPlan,setPlan:v=>capturedPlan=v,setReviewedSchedule:v=>capturedSchedule=v,setProgress:()=>{},setResult:()=>{},setStep:()=>{}};
 pageFunction('reviewCurrentFiles',context)();
 context.mffResult={rows:[{status:'removed'}],diagnostics:[],removalScopes:[{key:'new'}]};
 context.removalReview.scopes.push('new');context.mffFileName='new.csv';
 assert.equal(capturedPlan.flightsToRemove.length,0);
 assert.deepEqual(Array.from(capturedSchedule.scopes),['reviewed']);assert.equal(capturedSchedule.fileName,'reviewed.csv');
 assert.equal(capturedSchedule.result.removalScopes[0].key,'reviewed');
});
