import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {typescriptLoader} from './helpers/load-typescript.mjs';
const {parseMffCsv, buildSyncPlan} = typescriptLoader(process.cwd())(path.resolve('src/features/packages/sync/parsers.ts'));
const mapping = [{season_code:'MS - NOV',season_start:'2026-11-01',season_end:'2026-11-24',canonical_name:'MENARA JAM',db_id:'p1'}];
const packages = [{_id:'p1',name:'MENARA JAM',season:'MS - NOV'}, {_id:'p2',name:'MAWADDAH',season:'MS - NOV'}];
const flight = (id, pkg='p1', date='2026-11-10') => ({_id:id,package_id:pkg,package_name:pkg==='p1'?'MENARA JAM':'MAWADDAH',package_season:'MS - NOV',departure_date:date,return_date:'2026-11-22',departure_sector:'KUL-JED',return_sector:'JED-KUL',flight:'Saudi Airlines',return_flight:'',source:'sync'});
const line = (pkg='UMJ', date='1-Nov-2026', ret='22-Nov-2026') => {const r=Array(36).fill('');Object.assign(r,{1:'SV',8:'SV123',9:date,11:'KUL-JED',14:'SV124',15:ret,17:'JED-KUL',35:pkg});return r.join(',');};
const csv = (...rows) => [...Array(10).fill(''),...rows].join('\n');
const parse = (text, flights=[flight('f1')], scopes=[]) => parseMffCsv(text,mapping,packages,flights,scopes);
const rows = result => Array.isArray(result)?result:result.rows;
test('unsupported upload never proposes saved-flight removal', () => {
  assert.equal(rows(parse('not,a,schedule\nhello,world')).filter(r=>r.status==='removed').length,0);
});
test('partial schedule preserves missing flights by default and still imports valid additions', () => {
  const result=parse(csv(line()));
  assert.equal(rows(result).filter(r=>r.status==='removed').length,0);
  assert.equal(rows(result).filter(r=>r.status==='added').length,1);
});
test('explicit scope authorizes only in-range synced missing flights', () => {
  const saved=[flight('f1'),flight('f2','p2'),flight('old','p1','2025-11-10'),{...flight('manual','p1','2026-11-12'),source:'manual'}];
  const initial=parse(csv(line()),saved);
  const scope=initial.removalScopes.find(s=>s.package_id==='p1');
  const result=parse(csv(line()),saved,[scope.key]);
  assert.deepEqual(Array.from(result.rows.filter(r=>r.status==='removed'),r=>r.db_flight_id),['f1']);
});
for(const [name,invalid] of [['unknown alias',line('UNRECOGNIZED')],['object property alias',line('constructor')],['unsupported year',line('UMJ','1-Nov-2028','22-Nov-2028')],['impossible date',line('UMJ','31-Nov-2026')],['unknown section','NEW SCHEDULE SECTION'],['malformed row','a,b,c']]) {
  test(`${name} reports diagnostics and blocks removals even with authorization`,()=>{
    const initial=parse(csv(line()));
    const result=parse(csv(line(),invalid),undefined,initial.removalScopes.map(s=>s.key));
    assert.ok(result.diagnostics.length>0);
    assert.equal(result.rows.filter(r=>r.status==='removed').length,0);
    assert.ok(result.rows.some(r=>r.status==='added'));
  });
}
test('a complete selected scope can deliberately lose its final flight',()=>{
  const initial=parse(csv(line('MAWADDAH')));
  const scope=initial.removalScopes.find(s=>s.package_id==='p1');
  const result=parse(csv(line('MAWADDAH')),undefined,[scope.key]);
  assert.equal(result.rows.filter(r=>r.status==='removed').length,1);
});
test('existing edited-flight behavior does not need removal authorization',()=>{
  const result=parse(csv(line()),[{...flight('edited','p1','2026-11-01'),departure_sector:'KUL-MED'}]);
  assert.equal(result.rows[0].status,'edited');
  const plan=buildSyncPlan([],result.rows,packages);
  assert.equal(plan.flightsToUpdate.length,1);
  assert.equal(plan.flightsToAdd.length,0);
  assert.equal(plan.flightsToRemove.length,0);
});

test('unrecognized schedule data in the preamble blocks removals',()=>{
  const initial=parse(csv(line()));
  const preamble=[...Array(9).fill(''),line('NEW UMJ ALIAS','unknown date')];
  const result=parse([...preamble,line()].join('\n'),undefined,initial.removalScopes.map(s=>s.key));
  assert.ok(result.diagnostics.some(d=>d.row===10));
  assert.equal(result.rows.filter(r=>r.status==='removed').length,0);
});

test('supported column headings in the preamble permit deliberate scoped removal',()=>{
  const header=Array(36).fill('');Object.assign(header,{8:'FLT',9:'DATE',14:'FLT',15:'DATE',35:'PACKAGE'});
  const text=[...Array(9).fill(''),header.join(','),line()].join('\n');
  const initial=parse(text);
  const result=parse(text,undefined,initial.removalScopes.map(s=>s.key));
  assert.equal(result.diagnostics.length,0);
  assert.equal(result.rows.filter(r=>r.status==='removed').length,1);
});
