import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function boundary(mode, authenticated = true) {
  const exported = {};
  const source = path.resolve('src/features/quotation/revision-api.ts');
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, {
    exports: exported, Response, Error,
    require(id) {
      if (id === '@convex-dev/auth/nextjs/server') return {convexAuthNextjsToken: async () => authenticated ? 'token' : null};
      if (id === '~/lib/convex-server') return {getServerConvexClient: async () => ({query: async () => ({mode, actor: 'staff'}), mutation: async () => {throw new Error('Unexpected mutation');}})};
      if (id === 'convex/_generated/api') return {api: {quotationRevisionUi: {availability: 'availability'}}};
      return require(id);
    },
  }, {filename: source});
  return exported.saveRevisionResponse;
}

for (const mode of ['migration', 'maintenance', 'active']) {
  test(`committed legacy create receipts can reach the receipt-first backend during ${mode}`, async () => {
    const adapt = boundary(mode);
    assert.equal(await adapt({request_key: 'original-key', notes: 'unchanged'}, 'create'), null);
    assert.equal((await adapt({request_key: 'original-key'}, 'append')).status, 409);
    assert.equal((await adapt({notes: 'new legacy write'}, 'create')).status, 409);
  });
}

test('anonymous receipt replay remains authenticated', async () => {
  assert.equal((await boundary('maintenance', false)({request_key: 'original-key'}, 'create')).status, 401);
});

for (const helper of ['configure-local-auth.mjs', 'seed-local-fixture.mjs', 'control-fixture.mjs']) {
  test(`${helper} rejects a build-owned run directory before reading private state`, () => {
    const outcome = spawnSync(process.execPath, [path.resolve('scripts/revision-ui', helper)], {
      env: {...process.env, REVISION_UI_RUN_DIR: path.resolve('.next/forbidden-fixture')}, encoding: 'utf8',
    });
    assert.notEqual(outcome.status, 0);
    assert.match(outcome.stderr, /must be outside .next/);
  });
}

test('prepare rejects a .next descendant before creating an owned backend', () => {
  const outcome = spawnSync('python3', [path.resolve('scripts/revision-ui/prepare-local-backend.py')], {
    env: {...process.env, REVISION_UI_RUN_DIR: path.resolve('.next/forbidden-fixture')}, encoding: 'utf8',
  });
  assert.notEqual(outcome.status, 0);
  assert.match(outcome.stderr, /must be outside .next/);
  assert.equal(fs.existsSync('.next/forbidden-fixture'), false);
});
