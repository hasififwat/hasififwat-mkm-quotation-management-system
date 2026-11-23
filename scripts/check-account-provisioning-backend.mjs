import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';
import { seedLocalPasswordAccount } from './helpers/local-password-fixture.mjs';
import { requireFreePorts } from './helpers/revision-evidence.mjs';
import { form, normalize } from './helpers/submission-fixtures.mjs';

const binary = process.env.FAMILY_BACKEND_BINARY;
assert.ok(binary && path.isAbsolute(binary), 'Set FAMILY_BACKEND_BINARY to the absolute path of convex-local-backend');
const repo = fileURLToPath(new URL('..', import.meta.url));
const port = 14695;
const url = `http://127.0.0.1:${port}`;
const siteUrl = `http://127.0.0.1:${port + 1}`;
const instanceName = 'mkm-account-provisioning-fixture';
const instanceSecret = randomBytes(32).toString('hex');
const adminKey = execFileSync(binary, ['keygen', 'admin-key', '--instance-name', instanceName, '--instance-secret', instanceSecret], { encoding: 'utf8' }).trim();
await requireFreePorts([port, port + 1]);
const work = await mkdtemp(path.join(os.tmpdir(), 'mkm-account-provisioning-'));

function convex(...args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('CONVEX_')));
  try {
    execFileSync(path.join(repo, 'node_modules/.bin/convex'), args, {
      cwd: work,
      env: { ...env, CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = String(error.stderr ?? '').replaceAll(adminKey, '[redacted]');
    throw new Error(`Local Convex ${args[0]} failed. ${output}`);
  }
}

function client() {
  return new ConvexHttpClient(url, { logger: false });
}

function credentials(name) {
  return { email: `${name}@example.test`, password: randomBytes(24).toString('base64url') };
}

function account(name) {
  return { ...credentials(name), fullName: name, branch: 'Disposable fixture' };
}

async function signIn(user) {
  const connection = client();
  const { tokens } = await connection.action('auth:signIn', {
    provider: 'password',
    params: { email: user.email, password: user.password, flow: 'signIn' },
  });
  assert.ok(tokens?.token, 'Password sign-in must issue a session');
  connection.setAuth(tokens.token);
  assert.equal(await connection.query('auth:isAuthenticated', {}), true);
  return connection;
}

let backend;
try {
  await symlink(path.join(repo, 'node_modules'), path.join(work, 'node_modules'));
  for (const name of ['convex', 'src', 'convex.json', 'package.json', 'tsconfig.json', 'constants.ts', 'types.ts', 'utils.ts']) {
    await cp(path.join(repo, name), path.join(work, name), { recursive: true });
  }
  backend = spawn(binary, [
    '--interface', '127.0.0.1', '--port', String(port), '--site-proxy-port', String(port + 1),
    '--instance-name', instanceName, '--instance-secret', instanceSecret, '--disable-beacon', 'fixture.sqlite3',
  ], { cwd: work, stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 100 && backend.exitCode === null; attempt++) {
    const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(500) }).catch(() => null);
    if (response?.ok) {
      ready = true;
      break;
    }
    await setTimeout(100);
  }
  assert.ok(ready, 'Disposable Convex backend must start');

  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = privateKey.export({ type: 'pkcs8', format: 'pem' }).trim().replaceAll('\n', ' ');
  const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey.export({ format: 'jwk' }) }] });
  const envFile = path.join(work, '.fixture-auth.env');
  await writeFile(envFile, `JWT_PRIVATE_KEY=${key}\nJWKS=${jwks}\nSITE_URL=${url}\nCONVEX_SITE_URL=${siteUrl}\n`, { mode: 0o600 });
  convex('env', 'set', '--from-file', envFile);
  convex('dev', '--once', '--typecheck', 'disable', '--codegen', 'disable');

  const operator = client();
  operator.setAdminAuth(adminKey);
  const firstAdmin = account('first-admin');
  await assert.rejects(
    () => operator.mutation('profiles:provisionPasswordAccount', { ...firstAdmin, password: 'short' }),
    /at least 8 characters/i,
  );
  const adminUserId = await operator.mutation('profiles:provisionPasswordAccount', firstAdmin);
  const admin = await signIn(firstAdmin);
  const anonymous = client();
  const existing = credentials('existing-agent');
  await seedLocalPasswordAccount(url, adminKey, existing);
  const regular = await signIn(existing);
  const newAgent = account('new-agent');
  const deniedAccount = { ...newAgent, fullName: 'Denied request' };

  await assert.rejects(() => admin.mutation('profiles:createUserAccount', deniedAccount), /admin/i);
  convex('env', 'set', 'MKM_ACCOUNT_ADMIN_USER_IDS', adminUserId);
  await assert.rejects(() => anonymous.mutation('profiles:createUserAccount', deniedAccount), /not authenticated/i);
  await assert.rejects(() => regular.mutation('profiles:createUserAccount', deniedAccount), /admin/i);
  for (const caller of [anonymous, regular]) {
    await assert.rejects(() => caller.mutation('profiles:provisionPasswordAccount', deniedAccount));
  }
  for (const caller of [anonymous, regular, admin]) {
    await assert.rejects(() => caller.action('auth:signIn', {
      provider: 'password',
      params: { email: newAgent.email, password: newAgent.password, flow: 'signUp' },
    }), /registration/i);
  }
  await assert.rejects(() => signIn(newAgent));
  console.log('PASS: Provisioning defaults to denied and rejects staff and signed-out callers. Public signup is closed.');

  await assert.rejects(
    () => admin.mutation('profiles:createUserAccount', { ...newAgent, password: 'short' }),
    /at least 8 characters/i,
  );
  await admin.mutation('profiles:createUserAccount', newAgent);
  await admin.mutation('profiles:createUserAccount', newAgent);
  const agent = await signIn(newAgent);
  const profile = await agent.query('profiles:getMyProfile', {});
  assert.equal(profile.full_name, newAgent.fullName);
  assert.equal(profile.branch, newAgent.branch);
  await assert.rejects(() => agent.mutation('profiles:createUserAccount', account('another-agent')), /admin/i);
  console.log('PASS: The configured admin created a regular user with a profile, and that user signed in.');

  const customer = await regular.mutation('clients:create', { name: 'Disposable quotation client', phone_number: '' });
  const { packageDocId } = await regular.mutation('packages:createPackage', { payload: normalize(form()) });
  const packages = await regular.query('packages:listWithRooms', {});
  const selected = packages.find(pkg => pkg._id === packageDocId);
  assert.ok(selected, 'The package must be available to regular staff');
  const payload = {
    pic_name: 'Existing agent', branch: 'Disposable fixture', client_id: customer.id,
    package_id: selected._id, flight_id: selected.flights[0]._id,
    selected_rooms: [{ room_type: 'Quad', price: 1200, pax: 1 }], adds_ons: [], discounts: [],
  };
  const saved = await regular.mutation('quotations:create', {
    payload: { ...payload, request_key: randomUUID(), reviewed_context: selected.creation_context },
  });
  const draft = await agent.query('quotations:getQuotationForEdit', { target_quotation_id: saved.id });
  assert.ok(draft?.snapshot_refresh_token, 'The regular user can open the saved quotation for editing');
  await agent.mutation('quotations:update', {
    payload: { ...payload, id: saved.id, pic_name: 'New agent', expected_quotation_token: draft.snapshot_refresh_token },
  });
  const reopened = await regular.query('quotations:getQuotationFullDetails', { target_quotation_id: saved.id });
  assert.equal(reopened.id, saved.id);
  assert.equal(reopened.pic_name, 'New agent');
  assert.equal(reopened.total_amount, 1200);
  console.log('PASS: Regular users created and edited a quotation, then reopened it to verify the saved change.');
} finally {
  if (backend?.pid && backend.exitCode === null && backend.signalCode === null) {
    const exited = once(backend, 'exit');
    backend.kill();
    await exited;
  }
  await rm(work, { recursive: true, force: true });
}
