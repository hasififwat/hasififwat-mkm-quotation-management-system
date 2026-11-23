import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';

export async function seedLocalPasswordAccount(url, adminKey, { email, password }) {
  assert.match(url, /^http:\/\/127\.0\.0\.1:[0-9]+$/, 'Expected a disposable local Convex backend');
  assert.ok(adminKey, 'Expected a local Convex admin key');
  const admin = new ConvexHttpClient(url, { logger: false });
  admin.setAdminAuth(adminKey);
  const { user } = await admin.mutation('auth:store', {
    args: {
      type: 'createAccountFromCredentials',
      provider: 'password',
      account: { id: email, secret: password },
      profile: { email },
    },
  });
  return user._id;
}

export async function seedRevisionPasswordAccount(run, account) {
  const environment = parseEnv(await readFile(path.join(run.sourceDir, '.env.local'), 'utf8'));
  assert.equal(environment.CONVEX_SELF_HOSTED_URL, run.url, 'Fixture backend URL mismatch');
  return seedLocalPasswordAccount(run.url, environment.CONVEX_SELF_HOSTED_ADMIN_KEY, account);
}
