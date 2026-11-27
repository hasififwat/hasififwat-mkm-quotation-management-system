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
  await writeFile(path.join(work, 'convex/accountFixture.ts'), `
import { internalQuery } from './_generated/server';
import schema from './schema';
export const dump = internalQuery({ args: {}, handler: async (ctx) =>
  Object.fromEntries(await Promise.all(
    (Object.keys(schema.tables) as Array<keyof typeof schema.tables>).map(async (table) =>
      [table, await ctx.db.query(table).collect()]
    )
  ))
});
`);
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
  const dump = () => operator.query('accountFixture:dump', {});
  async function rejectsWithoutWrites(operation, error) {
    const before = await dump();
    await assert.rejects(operation, error);
    assert.deepEqual(await dump(), before, 'Rejected operation must persist zero writes');
  }
  const firstAdmin = account('first-admin');
  await rejectsWithoutWrites(
    () => operator.mutation('profiles:provisionPasswordAccount', { ...firstAdmin, password: 'short' }),
    /at least 8 characters/i,
  );
  const adminUserId = await seedLocalPasswordAccount(url, adminKey, firstAdmin);
  const admin = await signIn(firstAdmin);
  const anonymous = client();
  const existing = credentials('existing-agent');
  await seedLocalPasswordAccount(url, adminKey, existing);
  const regular = await signIn(existing);
  assert.equal(await anonymous.query('profiles:getMyProfile', {}), null);
  assert.deepEqual(await regular.query('profiles:getMyProfile', {}), {
    email: existing.email, full_name: null, branch: null, unit: null,
  });
  const noAccountUser = credentials('exact-email');
  noAccountUser.email = ` ${noAccountUser.email} `;
  await seedLocalPasswordAccount(url, adminKey, noAccountUser);
  const exactEmailStaff = await signIn(noAccountUser);
  assert.equal((await exactEmailStaff.query('profiles:getMyProfile', {})).email, noAccountUser.email);
  console.log('PASS: Existing password accounts retain exact-email sign-in. Anonymous profiles are null and account-only profiles have nullable staff fields.');

  const newAgent = account('new-agent');
  const deniedAccount = { ...newAgent, fullName: 'Denied request' };
  await rejectsWithoutWrites(() => admin.mutation('profiles:createUserAccount', deniedAccount), /Administrator access required/i);
  convex('env', 'set', 'MKM_ACCOUNT_ADMIN_USER_IDS', ` , ${adminUserId}, `);
  await rejectsWithoutWrites(() => anonymous.mutation('profiles:createUserAccount', deniedAccount), /Not authenticated/i);
  await rejectsWithoutWrites(() => regular.mutation('profiles:createUserAccount', deniedAccount), /Administrator access required/i);
  const adminProfile = (await dump()).profiles.find(row => row.email === firstAdmin.email);
  assert.ok(adminProfile);
  for (const caller of [anonymous, regular]) {
    for (const [name, args] of [
      ['provisionPasswordAccount', deniedAccount],
      ['createProfileForEmail', { email: newAgent.email, fullName: 'Forged staff', branch: 'Forged branch' }],
      ['setProfileEmail', { profileId: adminProfile._id, email: newAgent.email }],
      ['migrateQuotationCreators', {}],
      ['removeLegacySupabaseIds', {}],
    ]) {
      await rejectsWithoutWrites(() => caller.mutation(`profiles:${name}`, args), /Could not find public function|internal/i);
    }
  }
  for (const caller of [anonymous, regular, admin]) {
    await rejectsWithoutWrites(() => caller.action('auth:signIn', {
      provider: 'password',
      params: { email: newAgent.email, password: newAgent.password, flow: 'signUp' },
    }), /Self-registration is disabled/i);
  }
  console.log('PASS: Anonymous and regular staff cannot call any of the five internal profile mutations. Public signup rejects anonymous, regular and admin callers. Every denial persists zero writes.');
  console.log('PASS: Account provisioning fails closed without an admin allowlist and rejects anonymous and non-admin callers with zero writes.');

  await rejectsWithoutWrites(
    () => admin.mutation('profiles:createUserAccount', { ...newAgent, password: 'short' }),
    /at least 8 characters/i,
  );
  for (const field of ['email', 'fullName', 'branch']) {
    await rejectsWithoutWrites(() => admin.mutation('profiles:createUserAccount', { ...newAgent, [field]: ' \t ' }), /required/i);
  }
  await rejectsWithoutWrites(() => admin.mutation('profiles:createUserAccount', { ...newAgent, email: ` ${newAgent.email}` }), /whitespace/i);
  const newUserId = await admin.mutation('profiles:createUserAccount', { ...newAgent, fullName: ` ${newAgent.fullName} `, branch: ` ${newAgent.branch} ` });
  const created = await dump();
  assert.equal(await admin.mutation('profiles:createUserAccount', newAgent), newUserId);
  assert.deepEqual(await dump(), created, 'Provisioning retry must not change accounts or profiles');
  await rejectsWithoutWrites(() => admin.mutation('profiles:createUserAccount', { ...newAgent, password: randomBytes(24).toString('base64url') }), /already exists|secret|password/i);
  const agent = await signIn(newAgent);
  assert.deepEqual(await agent.query('profiles:getMyProfile', {}), {
    email: newAgent.email, full_name: newAgent.fullName, branch: newAgent.branch, unit: null,
  });
  await rejectsWithoutWrites(() => agent.mutation('profiles:createUserAccount', account('another-agent')), /Administrator access required/i);
  console.log('PASS: A configured admin provisions staff, retries without writes, rejects conflicting passwords and invalid fields, and the new staff account signs in with its matching profile.');

  const profileArgs = { email: 'profile-only@example.test', fullName: 'Profile Only', branch: 'Disposable fixture', unit: 'Fixture Unit' };
  for (const field of ['email', 'fullName', 'branch']) {
    await rejectsWithoutWrites(() => operator.mutation('profiles:createProfileForEmail', { ...profileArgs, [field]: ' \t ' }), /required/i);
  }
  const profileOnly = await operator.mutation('profiles:createProfileForEmail', profileArgs);
  const beforeRetry = await dump();
  assert.deepEqual(await operator.mutation('profiles:createProfileForEmail', profileArgs), profileOnly);
  assert.deepEqual(await dump(), beforeRetry);
  const original = beforeRetry.profiles.find(row => row._id === profileOnly.id);
  const changedEmail = 'reassigned@example.test';
  await operator.mutation('profiles:setProfileEmail', { profileId: profileOnly.id, email: changedEmail });
  const reassigned = await dump();
  const changed = reassigned.profiles.find(row => row._id === profileOnly.id);
  assert.equal(changed.email, changedEmail);
  assert.notEqual(changed.updated_at, original.updated_at);
  assert.ok(Number.isFinite(Date.parse(changed.updated_at)));
  assert.deepEqual({ ...changed, email: original.email, updated_at: original.updated_at }, original);
  assert.deepEqual(reassigned.profiles.filter(row => row._id !== profileOnly.id), beforeRetry.profiles.filter(row => row._id !== profileOnly.id));
  await operator.mutation('profiles:setProfileEmail', { profileId: profileOnly.id, email: changedEmail });
  assert.deepEqual(await dump(), reassigned, 'Reassigning the same email must not update its timestamp');
  for (const [email, error] of [[firstAdmin.email, /already assigned/i], [' \t ', /required/i], [` ${changedEmail}`, /whitespace/i]]) {
    await rejectsWithoutWrites(() => operator.mutation('profiles:setProfileEmail', { profileId: profileOnly.id, email }), error);
  }
  await operator.mutation('profiles:createProfileForEmail', { email: existing.email, fullName: 'Existing Staff', branch: 'Disposable fixture' });
  assert.equal((await regular.query('profiles:getMyProfile', {})).full_name, 'Existing Staff');
  console.log('PASS: Deployment-admin profile creation is idempotent. Email reassignment updates only the target email and timestamp, rejects duplicate ownership and invalid emails with zero writes, and preserves staff sign-in binding.');

  const customer = await regular.mutation('clients:create', { name: 'Disposable quotation client', phone_number: '' });
  const { packageDocId } = await regular.mutation('packages:createPackage', { payload: normalize(form()) });
  const packages = await regular.query('packages:listWithRooms', {});
  const selected = packages.find(pkg => pkg._id === packageDocId);
  assert.ok(selected, 'The package must be available to regular staff');
  const payload = {
    branch: 'Disposable fixture', client_id: customer.id,
    package_id: selected._id, flight_id: selected.flights[0]._id,
    selected_rooms: [{ room_type: 'Quad', price: 1200, pax: 1 }], adds_ons: [], discounts: [],
  };
  for (const [connection, name] of [[regular, 'Existing agent'], [agent, 'New agent']]) {
    const saved = await connection.mutation('quotations:create', {
      payload: { ...payload, pic_name: name, request_key: randomUUID(), reviewed_context: selected.creation_context },
    });
    const editor = await connection.query('quotations:getQuotationForEdit', { target_quotation_id: saved.id });
    assert.ok(editor.snapshot_refresh_token, 'Quotation editor must return a concurrency token');
    await connection.mutation('quotations:update', { payload: { ...payload, id: saved.id, pic_name: `${name} edited`, expected_quotation_token: editor.snapshot_refresh_token } });
    const reopened = await (await signIn(connection === regular ? existing : newAgent)).query('quotations:getQuotationFullDetails', { target_quotation_id: saved.id });
    assert.equal(reopened.id, saved.id);
    assert.equal(reopened.pic_name, `${name} edited`);
    assert.equal(reopened.total_amount, 1200);
  }
  console.log('PASS: Existing and newly provisioned staff each create and update a quotation, then sign in again and reopen the saved change.');
} finally {
  if (backend?.pid && backend.exitCode === null && backend.signalCode === null) {
    const exited = once(backend, 'exit');
    backend.kill();
    await exited;
  }
  await rm(work, { recursive: true, force: true });
  console.log('CLEANUP: Disposable backend stopped and temporary database and credentials removed.');
}
