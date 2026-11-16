import fs from 'node:fs/promises';
import {typescriptLoader} from './helpers/load-typescript.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const load=typescriptLoader(process.cwd());
const {readSavedQuotation}=load(path.resolve('convex/lib/savedQuotation.ts'));
const {freezeRevisionPdf}=load(path.resolve('convex/lib/quotationPdfInput.ts'));

export function checkRevisionInvariants(tables) {
  const names = ['quotations', 'quotation_families', 'quotation_items', 'quotation_logs', 'quotation_create_receipts', 'quotation_save_receipts', 'quotation_reference_counters', 'quotation_pdf_artifacts', 'quotation_pdf_attempts'];
  for (const name of names) assert.ok(Array.isArray(tables[name]), `Missing table ${name}`);
  const rows = new Map(tables.quotations.map(row => [row._id, row]));
  const families = new Map(tables.quotation_families.map(row => [row._id, row]));
  const bases = new Set();
  for (const family of families.values()) {
    const base = JSON.stringify([family.hijri_year, family.sequence_num]);
    assert.ok(!bases.has(base), `Duplicate family base ${base}`);
    bases.add(base);
    const members = tables.quotations.filter(row => row.family_id === family._id).sort((a, b) => a.revision - b.revision);
    assert.ok(members.length, `Empty family ${family._id}`);
    assert.equal(family.current_revision_id, members.at(-1)._id, 'Current pointer must identify highest retained revision');
    const counter = tables.quotation_reference_counters.filter(row => row.hijri_year === family.hijri_year);
    assert.equal(counter.length, 1, 'One reference counter per family year');
    assert.ok(counter[0].high_water >= family.sequence_num, 'Counter reserves family reference');
    for (const [index, row] of members.entries()) {
      assert.equal(row.hijri_year, family.hijri_year);
      assert.equal(row.sequence_num, family.sequence_num);
      assert.ok(Number.isSafeInteger(row.revision) && row.revision >= 0);
      if (index) {
        assert.equal(row.revision, members[index - 1].revision + 1, 'No revision gap after retained root');
        assert.equal(row.previous_revision_id, members[index - 1]._id, 'Exact predecessor');
      } else {
        assert.equal(row.previous_revision_id, undefined, 'Retained root has no invented predecessor');
        if (row.revision !== 0) assert.equal(row.legacy_provenance, 'legacy_unknown');
      }
    }
  }
  for (const row of rows.values()) assert.ok(families.has(row.family_id), `Missing family for ${row._id}`);
  for (const name of ['quotation_items', 'quotation_logs']) for (const row of tables[name]) assert.ok(rows.has(row.quotation_id), `Orphan ${name} ${row._id}`);
  const keys = new Set();
  for (const name of ['quotation_create_receipts', 'quotation_save_receipts']) {
    for (const receipt of tables[name]) {
      const row = rows.get(receipt.result.id);
      assert.ok(row, `Orphan ${name} ${receipt._id}`);
      assert.equal(receipt.result.revision, row.revision);
      assert.equal(receipt.result.quotation_number, `${row.hijri_year}-${String(row.sequence_num).padStart(4, '0')}${row.revision ? `-R${row.revision}` : ''}`, 'Receipt exact reference');
      if (name === 'quotation_save_receipts') {
        assert.equal(receipt.result.family_id, row.family_id);
        const key = JSON.stringify([receipt.actor, receipt.request_key]);
        assert.ok(!keys.has(key), 'Duplicate actor and request key');
        keys.add(key);
      } else {
        assert.equal(receipt.result.hijri_year, row.hijri_year);
        assert.equal(receipt.result.sequence_num, row.sequence_num);
      }
    }
  }
  const artifacts = new Map(tables.quotation_pdf_artifacts.map(row => [row._id, row]));
  const revisions = new Set();
  const attempts = new Map(tables.quotation_pdf_attempts.map(row => [row._id, row]));
  for (const artifact of artifacts.values()) {
    assert.ok(rows.has(artifact.revision_id), 'Artifact owns retained revision');
    const owner=rows.get(artifact.revision_id);
    if(owner.document_schema_version===1) {
      const expected=freezeRevisionPdf(JSON.parse(owner.frozen_document));
      assert.deepEqual(JSON.parse(artifact.input_json),JSON.parse(JSON.stringify(expected)),'PDF render input matches exact owning frozen revision');
    }
    assert.equal(createHash('sha256').update(artifact.input_json).digest('hex'), artifact.input_sha256, 'Artifact input hash');
    assert.ok(!revisions.has(artifact.revision_id), 'One artifact per revision');
    revisions.add(artifact.revision_id);
    if (['running', 'ready'].includes(artifact.state.kind)) {
      const attempt = attempts.get(artifact.state.attempt_id);
      assert.equal(attempt?.artifact_id, artifact._id, 'Artifact attempt ownership');
      assert.equal(attempt.retired, false);
      if (artifact.state.kind === 'ready') {
        assert.ok(attempt.candidate, 'Ready attempt has a storage candidate');
        for (const key of ['storage_id', 'size', 'sha256', 'input_sha256', 'mime']) assert.equal(artifact.state[key], attempt.candidate[key], `Ready candidate ${key}`);
        assert.equal(artifact.input_sha256, artifact.state.input_sha256);
      }
    }
  }
  for (const row of rows.values()) if (row.document_schema_version === 1) {
    assert.ok(revisions.has(row._id), 'Modern revision has PDF artifact');
    const owned=tables.quotation_items.filter(item=>item.quotation_id===row._id);
    readSavedQuotation(row,owned);
    const document = JSON.parse(row.frozen_document);
    const reference=`${row.hijri_year}-${String(row.sequence_num).padStart(4,'0')}${row.revision?`-R${row.revision}`:''}`;
    assert.equal(document.quotation_number,reference);
    for(const key of ['saved_by','issue_date','status','client_id','client_name','package_id','flight_id','pic_name','branch','notes','total_amount','package_snapshot','flight_snapshot','hotels_snapshot'])assert.deepEqual(document[key],row[key],`Frozen business field ${key}`);
    assert.equal(document.version, 1);
    const items = tables.quotation_items.filter(item => item.quotation_id === row._id).map(({_id, _creationTime, quotation_id, created_at, ...item}) => item);
    assert.ok(items.length, 'Modern revision owns items');
    assert.deepEqual(items, document.items, 'Owned items match frozen lines');
    const receipts = tables.quotation_save_receipts.filter(receipt => receipt.result.id === row._id);
    assert.equal(receipts.length, 1, 'Modern revision owns one save receipt');
    assert.equal(receipts[0].actor, row.saved_by, 'Saved actor matches receipt');
    const logs = tables.quotation_logs.filter(log => log.quotation_id === row._id && ['created','revision_saved'].includes(log.action));
    assert.equal(logs.length, 1, 'Modern revision owns one audit entry');
    assert.equal(logs[0].performed_by, row.saved_by);
    assert.equal(logs[0].action, row.previous_revision_id ? 'revision_saved' : 'created');
  }
  for (const attempt of attempts.values()) assert.ok(artifacts.has(attempt.artifact_id), 'No orphan PDF attempt');
  return Object.fromEntries(names.map(name => [name, tables[name].length]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  assert.ok(directory, 'Pass an extracted Convex export directory. This command is read-only.');
  const tables = {};
  for (const name of ['quotations', 'quotation_families', 'quotation_items', 'quotation_logs', 'quotation_create_receipts', 'quotation_save_receipts', 'quotation_reference_counters', 'quotation_pdf_artifacts', 'quotation_pdf_attempts']) {
    const text = await fs.readFile(path.join(directory, name, 'documents.jsonl'), 'utf8');
    tables[name] = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
  console.log(JSON.stringify({ surface: 'Read-only exported row invariants. Storage bytes and user authorization require separate verification.', counts: checkRevisionInvariants(tables) }, null, 2));
}
