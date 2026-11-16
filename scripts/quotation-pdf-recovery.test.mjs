import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { getFunctionName } from 'convex/server';
import { load, state } from './helpers/submission-fixtures.mjs';

const artifacts = load(path.resolve('convex/quotationPdfArtifacts.ts'));

function fixture(kind = 'pending') {
  const s = state();
  s.tables.quotation_pdf_artifacts.push({_id:'artifact', state:{kind}});
  const scheduled = () => s.operations.filter(op => op[0] === 'schedule').map(([,delay,ref,args]) => ({delay,name:getFunctionName(ref),args}));
  return {...s, scheduled};
}

test('pending redispatch arms an independent mutation watchdog before the action can fail', async () => {
  const s = fixture();
  await artifacts.reconcile._handler(s.ctx, {artifact_id:'artifact'});
  const jobs = s.scheduled();
  const watchdog = jobs.find(job => job.name === 'quotationPdfArtifacts:reconcile');
  assert.ok(watchdog && watchdog.delay > 0, 'preclaim action failure retains a future recovery mutation');
  assert.ok(jobs.find(job => job.name === 'quotationPdfWorker:run'));
  s.operations.length = 0;
  await artifacts.reconcile._handler(s.ctx, watchdog.args);
  assert.equal(s.scheduled().filter(job => job.name === 'quotationPdfArtifacts:reconcile').length, 1);
  assert.equal(s.scheduled().filter(job => job.name === 'quotationPdfWorker:run').length, 1);
});

test('ready and failed watchdogs stop without scheduling work', async () => {
  for (const kind of ['ready','failed']) {
    const s = fixture(kind);
    await artifacts.reconcile._handler(s.ctx, {artifact_id:'artifact'});
    assert.equal(s.scheduled().length, 0);
  }
});

test('running watchdog leaves active attempt to its transactionally scheduled lease recovery', async () => {
  const s = fixture();
  const claim = await artifacts.claim._handler(s.ctx, {artifact_id:'artifact'});
  assert.ok(claim);
  assert.equal(s.scheduled().filter(job => job.name === 'quotationPdfArtifacts:reconcile').length,1);
  s.operations.length = 0;
  await artifacts.reconcile._handler(s.ctx, {artifact_id:'artifact'});
  assert.equal(s.scheduled().length,0);
  assert.equal(s.tables.quotation_pdf_artifacts[0].state.attempt_id,claim.attempt_id);
});

test('initial save dispatch commits both worker and watchdog for the same artifact', async () => {
  const s = state();
  const id = await artifacts.enqueueRevisionPdf(s.ctx, 'revision', {
    quotation_number:'1448H-0001-R2', issue_date:'2026-11-17T00:00:00Z',
    client_name:'Fixture', pic_name:'Fixture', branch:'Fixture', total_amount:0, items:[], provenance:null,
  });
  const jobs = s.operations.filter(op => op[0] === 'schedule');
  assert.equal(s.tables.quotation_pdf_artifacts.length,1);
  assert.equal(jobs.length,2);
  for (const job of jobs) assert.equal(job[3].artifact_id,id);
  assert.ok(jobs.some(job => job[1] > 0 && getFunctionName(job[2]) === 'quotationPdfArtifacts:reconcile'));
});
