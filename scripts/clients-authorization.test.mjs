import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const clients = typescriptLoader(path.resolve('.'))(path.resolve('convex/clients.ts'));

function fixture(authenticated = true) {
  const tables = {
    quotation_family_migrations: [],
    quotation_families: [],
    client_aliases: [],
    inquiries: [],
    clients: [
      {_id:'client:1',name:'Fixture Client',phone_number:'0123456789',created_at:'2026-01-01',updated_at:'2026-01-01'},
      {_id:'client:2',name:'Fixture Client',phone_number:'0123456789',created_at:'2026-01-02',updated_at:'2026-01-02'},
    ],
    quotations: [{_id:'quote:1',client_id:'client:1',package_id:'package:1',hijri_year:'1448H',sequence_num:1,revision:0,total_amount:1200,status:'draft',pic_name:'Fixture Staff',branch:'Fixture',created_at:'2026-01-01',updated_at:'2026-01-01'}],
    packages: [{_id:'package:1',name:'Fixture Package',year:'2026/2027'}],
  };
  const operations = [];
  const locate = id => Object.values(tables).flat().find(row => row._id === id);
  const db = {
    async get(id) { return structuredClone(locate(id) ?? null); },
    query(table) {
      assert.ok(table in tables, `Unknown table ${table}`);
      operations.push(['query',table]);
      const predicates = [];
      const q = {
        withIndex(name, callback) {
          assert.ok(['by_client_id','by_key','by_alias_client_id','by_open_client','by_archived','by_family_revision'].includes(name));
          const index = {eq(field,value) { assert.equal(field,name === 'by_key' ? 'key' : name === 'by_alias_client_id' ? 'alias_client_id' : name === 'by_open_client' ? 'open_client_id' : name === 'by_archived' ? 'archived' : name === 'by_family_revision' ? 'family_id' : 'client_id'); predicates.push([field,value]); return index; }};
          callback(index);
          return q;
        },
        order(direction) { assert.equal(direction,'desc'); return q; },
        async collect() { return structuredClone(tables[table].filter(row => predicates.every(([key,value]) => row[key] === value))); },
        async unique() { const rows = await q.collect(); assert.ok(rows.length <= 1); return rows[0] ?? null; },
        async paginate(options) { assert.equal(options.cursor,null); return {page:await q.collect(),isDone:true,continueCursor:''}; },
      };
      return q;
    },
    async insert(table,value) { assert.ok(table in tables); const id = `${table}:new`; tables[table].push({...value,_id:id}); operations.push(['insert',table]); return id; },
    async patch(id,value) { const row = locate(id); assert.ok(row); Object.assign(row,value); operations.push(['patch',id]); },
    async delete(id) { const rows = Object.values(tables).find(rows => rows.some(row => row._id === id)); assert.ok(rows); rows.splice(rows.findIndex(row => row._id === id),1); operations.push(['delete',id]); },
  };
  return {tables,operations,ctx:{db,auth:{async getUserIdentity() { return authenticated ? {subject:'fixture-staff|session'} : null; }}}};
}

const args = {
  listWithStats:{}, getAgentNames:{}, listWithStatsPaginated:{paginationOpts:{cursor:null,numItems:10}},
  getWithQuotations:{client_id:'client:1'}, list:{}, findDuplicateClients:{},
  mergeClients:{canonicalId:'client:2',duplicateIds:['client:1']}, create:{name:'New fixture'},
};

for (const [name, operation] of Object.entries(clients)) {
  if (!operation?._handler) continue;
  test(`anonymous clients.${name} rejects before reading or changing records`, async () => {
    const s = fixture(false);
    await assert.rejects(() => operation._handler(s.ctx,args[name]), /not authenticated/i);
    assert.deepEqual(s.operations,[]);
  });
  test(`clients.${name} propagates auth failure without database access`, async () => {
    const s = fixture();
    s.ctx.auth.getUserIdentity = async () => { throw new Error('Session verification unavailable'); };
    await assert.rejects(() => operation._handler(s.ctx,args[name]), /Session verification unavailable/);
    assert.deepEqual(s.operations,[]);
  });
}

test('staff can create clients and read quotation history through each client view', async () => {
  const s = fixture();
  const saved = await clients.create._handler(s.ctx,{name:' New fixture ',phone_number:'0199999999'});
  assert.equal(saved.name,'New fixture');
  assert.equal(saved.alreadyExists,false);
  assert.ok((await clients.list._handler(s.ctx,{})).some(row => row.id === saved.id));
  const duplicate = await clients.create._handler(s.ctx,{name:'Same phone',phone_number:'0199999999'});
  assert.equal(duplicate.alreadyExists,true);
  assert.equal(duplicate.existing.id,saved.id);
  for (const history of [
    await clients.listWithStats._handler(s.ctx,{}),
    (await clients.listWithStatsPaginated._handler(s.ctx,args.listWithStatsPaginated)).page,
    [await clients.getWithQuotations._handler(s.ctx,args.getWithQuotations)],
  ]) {
    const row = history.find(row => row.id === 'client:1');
    assert.equal(row.name,'Fixture Client');
    assert.equal(row.quotations[0].id,'quote:1');
    assert.equal(row.quotations[0].quotation_number,'1448H-0001');
    assert.equal(row.quotations[0].total_amount,1200);
    assert.equal(row.quotations[0].package_name,'Fixture Package');
  }
  assert.equal((await clients.getAgentNames._handler(s.ctx,{}))[0],'Fixture Staff');
  const duplicates = await clients.findDuplicateClients._handler(s.ctx,{});
  assert.equal(duplicates.duplicate_group_count,1);
  assert.equal(duplicates.groups[0].total_quotations,1);
});

test('staff merge keeps quotation reassignment available and readable', async () => {
  const s = fixture();
  const result = await clients.mergeClients._handler(s.ctx,args.mergeClients);
  assert.equal(result.relinkedQuotations,1);
  assert.equal(result.removedClients[0],'client:1');
  assert.equal(s.tables.clients.some(row => row._id === 'client:1'),false);
  assert.equal(s.tables.quotations[0].client_id,'client:2');
  const history = await clients.getWithQuotations._handler(s.ctx,{client_id:'client:2'});
  assert.equal(history.quotations[0].id,'quote:1');
  assert.equal(history.quotations[0].total_amount,1200);
});

test('current client totals resolve chained aliases and preserve separate saved historical identities', async () => {
  const s = fixture();
  s.tables.clients.push({_id:'client:3',name:'Canonical client',phone_number:'fixture',created_at:'2026-01-03',updated_at:'2026-01-03'});
  s.tables.client_aliases.push(
    {_id:'alias:1',alias_client_id:'client:1',canonical_client_id:'client:2'},
    {_id:'alias:2',alias_client_id:'client:2',canonical_client_id:'client:3'},
  );
  const original = s.tables.quotations[0];
  Object.assign(original,{family_id:'family:1',client_name:'Saved original identity',package_snapshot:{name:'Saved old package',year:'2026/2027'}});
  const current = {...original,_id:'quote:2',revision:1,total_amount:2500,package_id:'package:2',package_snapshot:{name:'Saved new package',year:'2026/2027'},created_at:'2026-02-01'};
  const archived = {...original,_id:'quote:3',family_id:'family:2',client_id:'client:3',total_amount:700};
  s.tables.quotations.push(current,archived);
  s.tables.quotation_families.push(
    {_id:'family:1',current_revision_id:'quote:2',archived:false},
    {_id:'family:2',current_revision_id:'quote:3',archived:true},
  );
  const before = structuredClone(s.tables);
  const rows = await clients.listWithStats._handler(s.ctx,{});
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,'client:3');
  assert.equal(rows[0].quotation_count,1);
  assert.equal(rows[0].total_quoted_value,2500);
  assert.equal(rows[0].historical_quotation_count,2);
  assert.equal(rows[0].quotations[0].client_id,'client:3');
  assert.equal(rows[0].quotations[0].saved_client_id,'client:1');
  assert.equal(rows[0].quotations[0].client_name,'Saved original identity');
  assert.equal(rows[0].quotations[0].package_name,'Saved new package');
  const detail = await clients.getWithQuotations._handler(s.ctx,{client_id:'client:1'});
  assert.equal(detail.id,'client:3');
  assert.equal(detail.requested_client_id,'client:1');
  assert.deepEqual(Array.from(detail.quotations,q => q.id),['quote:2']);
  assert.deepEqual(Array.from(detail.historical_quotations,q => [q.id,q.current_revision_id,q.archived]),[['quote:3','quote:3',true],['quote:1','quote:2',false]]);
  assert.equal(detail.historical_quotations[1].package_name,'Saved old package');
  assert.equal((await clients.findDuplicateClients._handler(s.ctx,{})).duplicate_group_count,0);
  assert.deepEqual(s.tables,before);
});

test('client pagination removes aliases before selecting each stable page', async () => {
  const s = fixture();
  for (let i=3;i<=29;i++) s.tables.clients.push({_id:`client:${String(i).padStart(2,'0')}`,name:`Client ${i}`,created_at:'2026-02-01',updated_at:'2026-02-01'});
  s.tables.client_aliases.push({_id:'alias:1',alias_client_id:'client:1',canonical_client_id:'client:2'});
  const seen = [];
  let cursor = null;
  for (let pageNumber=0;pageNumber<10;pageNumber++) {
    const result = await clients.listWithStatsPaginated._handler(s.ctx,{paginationOpts:{cursor,numItems:5}});
    assert.equal(result.total,28);
    seen.push(...result.page.map(row => row.id));
    if(result.isDone) break;
    assert.equal(result.page.length,5);
    cursor=result.continueCursor;
  }
  assert.equal(seen.length,28);
  assert.equal(new Set(seen).size,28);
  assert.equal(seen.includes('client:1'),false);
  assert.deepEqual(seen,Array.from(await clients.list._handler(s.ctx,{}),row => row.id));
});

test('package operational status counts exclude historical and archived associations', async () => {
  const packages = typescriptLoader(path.resolve('.'))(path.resolve('convex/packages.ts'));
  const s = fixture();
  Object.assign(s.tables.quotations[0],{family_id:'family:1',status:'accepted'});
  s.tables.quotations.push(
    {...s.tables.quotations[0],_id:'quote:2',revision:1,package_id:'package:2',status:'draft'},
    {...s.tables.quotations[0],_id:'quote:3',family_id:'family:2',status:'sent'},
  );
  s.tables.packages.push({_id:'package:2',name:'New package',year:'2026/2027'});
  s.tables.quotation_families.push(
    {_id:'family:1',current_revision_id:'quote:2',archived:false},
    {_id:'family:2',current_revision_id:'quote:3',archived:true},
  );
  const rows = await packages.listWithQuotationCounts._handler(s.ctx,{});
  const oldPackage = rows.find(row => row.id==='package:1');
  const currentPackage = rows.find(row => row.id==='package:2');
  assert.equal(oldPackage.total,0);
  assert.equal(oldPackage.historical_total,2);
  assert.equal(oldPackage.by_status.accepted,0);
  assert.equal(oldPackage.by_status.sent,0);
  assert.equal(currentPackage.total,1);
  assert.equal(currentPackage.historical_total,0);
  assert.equal(currentPackage.by_status.draft,1);
});
