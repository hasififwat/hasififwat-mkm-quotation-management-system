import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const clients = typescriptLoader(path.resolve('.'))(path.resolve('convex/clients.ts'));

function fixture(authenticated = true) {
  const tables = {
    quotation_family_migrations: [],
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
    query(table) {
      assert.ok(table in tables, `Unknown table ${table}`);
      operations.push(['query',table]);
      const predicates = [];
      const q = {
        withIndex(name, callback) {
          assert.ok(['by_client_id','by_key'].includes(name));
          const index = {eq(field,value) { assert.equal(field,name === 'by_key' ? 'key' : 'client_id'); predicates.push([field,value]); return index; }};
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
