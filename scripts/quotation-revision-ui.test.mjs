import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const load = typescriptLoader(process.cwd());
const { beginRevisionAttempt, finishRevisionAttempt } = load(path.resolve('src/features/quotation/revision-command.ts'));
const { saveRevisionAttempt } = load(path.resolve('src/features/quotation/save-quotation.ts'));
const { revisionDate } = load(path.resolve('src/features/quotation/revision-display.ts'));
const key = 'b394198a-e87d-4f3a-8715-64eefffb0e16';
const values = {client_id:'client',package_id:'package',flight_id:'flight',pic_name:'Staff',branch:'Branch',notes:'Keep my draft',selected_rooms:[{room_type:'Quad',price:100.25,pax:3}],adds_ons:[],discounts:[],status:'sent'};
const source = {client_id:'client',selected_rooms:[{source_item_id:'source-item',room_type:'Quad',price:999,pax:1}],revision_context:{can_append:true,family_id:'family',source_revision_id:'r0',expected_current_id:'r0'}};
const attempt = () => beginRevisionAttempt(values, source, {mode:'retain'}, key, 'actor');

test('retained edit carries exact source identity and ignores live catalog values', () => {
  const command = JSON.parse(attempt().body).command;
  assert.equal(command.operation,'append');
  assert.equal(command.source_revision_id,'r0');
  assert.equal(command.expected_current_id,'r0');
  assert.deepEqual(command.client,{mode:'retain'});
  assert.deepEqual(command.selection,{mode:'retain',rooms:[{source_item_id:'source-item',price:100.25,pax:3}]});
  assert.equal(command.notes,'Keep my draft');
  assert.equal(command.status,undefined);
  assert.equal(JSON.parse(attempt().body).expected_actor,'actor');
});

test('historical source cannot produce an append attempt', () => {
  assert.throws(() => beginRevisionAttempt(values,{...source,revision_context:{...source.revision_context,can_append:false}},{mode:'retain'},key,'actor'), /current/);
});

test('duplicate saved labels retain distinct exact source item identities', () => {
  const duplicateSource = {...source,selected_rooms:[...source.selected_rooms,{...source.selected_rooms[0],source_item_id:'other-item'}]};
  const duplicateValues = {...values,selected_rooms:[...values.selected_rooms,{...values.selected_rooms[0],price:200,pax:2}]};
  const command = JSON.parse(beginRevisionAttempt(duplicateValues,duplicateSource,{mode:'retain'},key,'actor').body).command;
  assert.deepEqual(command.selection.rooms.map(room => room.source_item_id),['source-item','other-item']);
});

test('retained room count or label drift rejects before transport', () => {
  assert.throws(() => beginRevisionAttempt({...values,selected_rooms:[]},source,{mode:'retain'},key,'actor'), /identity/);
  assert.throws(() => beginRevisionAttempt({...values,selected_rooms:[{...values.selected_rooms[0],room_type:'Twin'}]},source,{mode:'retain'},key,'actor'), /identity/);
});

test('same IDs become replacement only through explicit reviewed intent', () => {
  const catalog = {_id:'package',creation_context:'reviewed-catalog'};
  const command = JSON.parse(beginRevisionAttempt(values,source,{mode:'replace',catalog},key,'actor').body).command;
  assert.equal(command.selection.mode,'replace');
  assert.equal(command.selection.reviewed_context,'reviewed-catalog');
  assert.equal(command.selection.rooms[0].price,100.25);
  assert.throws(() => beginRevisionAttempt(values,source,{mode:'replace',catalog:null},key,'actor'), /Review/);
});

test('create requires a reviewed selection and uses replace intent', () => {
  const command = JSON.parse(beginRevisionAttempt(values,undefined,{mode:'replace',catalog:{_id:'package',creation_context:'reviewed'}},key,'actor').body).command;
  assert.equal(command.operation,'create');
  assert.deepEqual(command.client,{mode:'replace',id:'client'});
  assert.throws(() => beginRevisionAttempt(values,undefined,{mode:'retain'},key,'actor'), /identity/);
});

test('managed saves keep the destination or cycle in their exact request', () => {
  const destination = {canonical_client_id:'canonical', inquiry_id:'inquiry', cycle:2};
  const create = beginRevisionAttempt(values,undefined,{mode:'replace',catalog:{_id:'package',creation_context:'reviewed'}},key,'actor',destination);
  assert.deepEqual(JSON.parse(create.body).command.inquiry_destination,destination);
  const managed = {...source,revision_context:{...source.revision_context,inquiry:{cycle:2}}};
  const edit = beginRevisionAttempt(values,managed,{mode:'retain'},key,'actor');
  assert.equal(JSON.parse(edit.body).command.expected_inquiry_cycle,2);
  assert.equal(JSON.parse(edit.body).command.client.mode,'retain');
});

test('an Inquiry destination conflict retains the draft and requires a new review', async () => {
  const result = await saveRevisionAttempt(attempt(),async () => Response.json({code:'INQUIRY_DESTINATION_CHANGED'},{status:409}));
  assert.equal(result.kind,'rejected');
  assert.equal(result.conflict,'inquiry');
  assert.match(result.message,/draft is kept.*Review the destination/);
});

test('new unchanged intentional save has a distinct request key', () => {
  const first = attempt();
  const next = beginRevisionAttempt(values,source,{mode:'retain'},'008a026b-d401-497c-aea3-952d92114f2b','actor');
  assert.notEqual(JSON.parse(first.body).command.request_key,JSON.parse(next.body).command.request_key);
});

test('lost successful response retries identical serialized key and payload and returns receipt ID', async () => {
  const frozen = attempt();
  const sent = [];
  let committed;
  const request = async (url, options) => {
    assert.equal(url,'/api/quotations/update');
    sent.push(options.body);
    if (!committed) { committed = {id:'r1',quotation_number:'1448H-0001-R1'}; throw new TypeError('lost response'); }
    return Response.json(committed);
  };
  assert.equal((await saveRevisionAttempt(frozen,request)).kind,'uncertain');
  const changedValues = {...values,notes:'Changed after transport'};
  assert.equal(changedValues.notes,'Changed after transport');
  assert.deepEqual(JSON.parse(JSON.stringify(await saveRevisionAttempt(frozen,request))),{kind:'saved',id:'r1',reference:'1448H-0001-R1'});
  assert.equal(sent[0],sent[1]);
  assert.equal(JSON.parse(sent[1]).command.notes,'Keep my draft');
});

for (const [status,code,kind,conflict] of [[401,null,'rejected',undefined],[422,null,'rejected',undefined],[409,'QUOTATION_STALE_EDITOR','rejected','stale'],[409,'QUOTATION_SELECTION_CONFLICT','rejected','selection'],[500,null,'uncertain',undefined]]) {
  test(`HTTP ${status} ${code ?? ''} keeps the draft and classifies recovery`, async () => {
    const draft = structuredClone(values);
    const result = await saveRevisionAttempt(attempt(),async () => Response.json({code},{status}));
    assert.equal(result.kind,kind);
    assert.equal(result.conflict,conflict);
    assert.match(result.message,/entries.*kept/);
    assert.deepEqual(values,draft);
  });
}

test('missing revision reference is uncertain, never source-ID success', async () => {
  assert.equal((await saveRevisionAttempt(attempt(),async () => Response.json({id:'r1'}))).kind,'uncertain');
});

test('revision date uses Kuala Lumpur day across UTC midnight boundary', () => {
  assert.match(revisionDate('2026-11-16T18:00:00.000Z'),/17 Nov 2026/);
  assert.equal(revisionDate(null),'Not recorded');
});


test('uncertain save survives expired authentication and resumes the exact original receipt', async () => {
  const original = attempt();
  const bodies = [];
  let count = 0;
  const request = async (_url, options) => {
    bodies.push(options.body);
    count++;
    if (count === 1) throw new TypeError('lost committed response');
    if (count === 2) return Response.json({}, {status:401});
    return Response.json({id:'original-committed-id',quotation_number:'1448H-0001-R1'});
  };
  let state = finishRevisionAttempt(original,await saveRevisionAttempt(original,request));
  assert.equal(state.kind,'uncertain');
  state = finishRevisionAttempt(state.attempt,await saveRevisionAttempt(state.attempt,request),true);
  assert.equal(state.kind,'uncertain');
  assert.equal(state.attempt.body,original.body);
  assert.match(state.message,/original editor/);
  state = finishRevisionAttempt(state.attempt,await saveRevisionAttempt(state.attempt,request),true);
  assert.equal(state.kind,'saved');
  assert.equal(state.id,'original-committed-id');
  assert.equal(new Set(bodies).size,1);
});
