import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';
import {ConvexError} from 'convex/values';
import {load, packages, flights, state, form, create, read} from './helpers/submission-fixtures.mjs';

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

function csvRow(width, cells) {
  return Object.assign(Array(width).fill(''), cells).join(',');
}

function scheduleCsv(alias, day, sector = 'KUL-JED') {
  const flight = csvRow(36, {1:'MH', 8:'MH123', 9:`${day}-Jan-2027`, 11:sector, 14:'MH124', 15:'12-Jan-2027', 17:'JED-KUL', 35:alias});
  return [...Array(10).fill(''), flight].join('\n');
}

async function scheduleFixture() {
  const s = state();
  for (const name of ['MENARA JAM', 'MAWADDAH']) {
    const id = await create(s, form());
    await s.ctx.db.patch(id, {name, season:'PS - DEC', source:'sync'});
    const original = s.tables.package_flights.find(flight => flight.package_id === id);
    await s.ctx.db.patch(original._id, {source:'sync', flight:parsers.airlineName('MH')});
  }
  const [packageId, otherPackageId] = s.tables.packages.map(pkg => pkg._id);
  const priceList = [
    csvRow(33, {1:'FINAL', 2:'SUPER PEAK SEASON'}),
    ...s.tables.packages.map(pkg => csvRow(33, {2:pkg.name, 5:'1200', 13:'12 days'})),
  ].join('\n');

  async function review(text) {
    const existingPackages = await packages.listWithHotelsAndMeals._handler(s.ctx, {});
    const dbFlights = await flights.listAll._handler(s.ctx, {});
    const mappingRows = parsers.parsePriceListCsv(priceList, existingPackages);
    const parsed = parsers.parseMffCsv(text, mappingRows, existingPackages, dbFlights);
    assert.equal(parsed.diagnostics.length, 0);
    const approvedScopes = parsed.removalScopes.map(scope => scope.key);
    const approved = parsers.parseMffCsv(text, mappingRows, existingPackages, dbFlights, approvedScopes);
    return parsers.buildSyncPlan(mappingRows, approved.rows, existingPackages);
  }

  async function apply(plan, failedWrite) {
    let result;
    const ctx = {...s.ctx, db:{...s.ctx.db,
      async insert(table, row) {
        if (failedWrite === 'add' && table === 'package_flights' && row.package_id === packageId) {
          throw new Error('Injected flight write failure');
        }
        return s.ctx.db.insert(table, row);
      },
      async patch(id, row) {
        if (failedWrite === 'update' && row.departure_date === '2027-01-03') {
          throw new Error('Injected flight write failure');
        }
        return s.ctx.db.patch(id, row);
      },
    }};
    await pageFunction('handleApply', {
      plan,
      setResult: value => { result = value; },
      setProgress: () => {},
      syncErrorMessage: String,
      airlineName: parsers.airlineName,
      syncPackage: args => packages.syncPackageFromCsv._handler(ctx, args),
      promotePackageToSync: args => packages.promotePackageToSync._handler(ctx, args),
      addFlight: args => flights.addFlight._handler(ctx, args),
      updateFlight: args => flights.updateFlight._handler(ctx, args),
      deleteFlight: args => flights.deleteFlight._handler(ctx, args),
      promoteToSync: args => flights.promoteToSync._handler(ctx, args),
    })();
    return result;
  }

  function departures(id) {
    return s.tables.package_flights.filter(flight => flight.package_id === id).map(flight => flight.departure_date);
  }

  return {s, packageId, otherPackageId, review, apply, departures};
}

for (const failedWrite of ['add', 'update']) {
  test(`failed flight ${failedWrite} preserves the original and allows removals for other packages`, async () => {
    const {s, packageId, otherPackageId, review, apply, departures} = await scheduleFixture();
    if (failedWrite === 'update') {
      const [original] = s.tables.package_flights;
      await flights.addFlight._handler(s.ctx, {
        package_id:packageId, month:'JAN', dep_flight:original.flight, departure_date:'2027-01-03',
        return_date:original.return_date, departure_sector:'KUL-MED', return_sector:original.return_sector,
        source:'sync',
      });
    }
    const csv = scheduleCsv('UMJ', 3);
    const plan = await review(csv);
    assert.equal(plan.flightsToAdd.length, failedWrite === 'add' ? 1 : 0);
    assert.equal(plan.flightsToUpdate.length, failedWrite === 'update' ? 1 : 0);
    assert.equal(plan.flightsToRemove.length, 2);

    const result = await apply(plan, failedWrite);
    const expected = failedWrite === 'add' ? ['2027-01-01'] : ['2027-01-01', '2027-01-03'];
    assert.deepEqual(departures(packageId), expected, 'the original January 1 flight must still be saved');
    assert.deepEqual(departures(otherPackageId), []);
    assert.equal(result.flightsAdded + result.flightsUpdated, 0);
    assert.equal(result.flightsRemoved, 1);
    assert.equal(result.errors.length, 2);
    assert.match(result.errors[0], /Injected flight write failure/);
    assert.match(result.errors[1], /Skipped removal.*MENARA JAM.*2027-01-01.*failed/i);

    const retry = await review(csv);
    assert.equal(retry.flightsToAdd.length + retry.flightsToUpdate.length, 1);
    assert.equal(retry.flightsToRemove.length, 1);
    const retried = await apply(retry);
    assert.equal(retried.errors.length, 0);
    assert.equal(retried.flightsAdded + retried.flightsUpdated, 1);
    assert.equal(retried.flightsRemoved, 1);
    assert.deepEqual(departures(packageId), ['2027-01-03']);
  });
}

test('an approved removal-only import can remove the last departure', async () => {
  const {packageId, otherPackageId, review, apply, departures} = await scheduleFixture();
  const plan = await review(scheduleCsv('MAWADDAH', 1));
  assert.equal(plan.flightsToAdd.length + plan.flightsToUpdate.length, 0);
  assert.equal(plan.flightsToRemove.length, 1);

  const result = await apply(plan);
  assert.equal(result.errors.length, 0);
  assert.equal(result.flightsRemoved, 1);
  assert.deepEqual(departures(packageId), []);
  assert.deepEqual(departures(otherPackageId), ['2027-01-01']);
});
