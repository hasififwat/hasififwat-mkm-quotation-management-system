import assert from "node:assert/strict";
import * as authServer from "@convex-dev/auth/server";
import * as passwordModule from "@convex-dev/auth/providers/Password";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { getFunctionName } from "convex/server";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localRequire = createRequire(path.join(repo, "package.json"));
const ts = localRequire("typescript");
const originalTimestamp = "2026-01-01T00:00:00.000Z";
const valid = {
  email: "new.staff@example.test",
  password: "Fixture-password-123",
  fullName: "New Fixture Staff",
  branch: "Fixture Branch",
  unit: "Fixture Unit",
};

function application(adminIds) {
  const env = adminIds === undefined ? {} : { MKM_ACCOUNT_ADMIN_USER_IDS: adminIds };
  const cache = new Map();
  let authConfig;
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    vm.runInNewContext(compiled.outputText, {
      exports, structuredClone, crypto, TextEncoder, btoa, process: { env },
      require(id) {
        if (id === "@convex-dev/auth/server") return {
          ...authServer,
          convexAuth(config) {
            authConfig = config;
            return authServer.convexAuth(config);
          },
        };
        if (id === "@convex-dev/auth/providers/Password") return passwordModule;
        if (id.startsWith(".")) {
          const resolved = path.resolve(path.dirname(filename), id);
          if (fs.existsSync(`${resolved}.ts`)) return load(`${resolved}.ts`);
          return localRequire(resolved.endsWith(".js") ? resolved : `${resolved}.js`);
        }
        return localRequire(id);
      },
    }, { filename });
    return exports;
  }
  const profiles = load(path.join(repo, "convex/profiles.ts"));
  load(path.join(repo, "convex/auth.ts"));
  const providers = authConfig.providers.map((provider) => typeof provider === "function" ? provider() : provider);
  const configured = providers.find((provider) => (provider.options?.id ?? provider.id) === "password");
  assert.ok(configured, "Load the Password provider configured by convex/auth.ts");
  return { profiles, password: { ...configured, ...configured.options } };
}

function fixture(app, { userId = "users:admin", userExists = true, passwordAccount = true } = {}) {
  const tables = {
    users: userExists ? [{ _id: userId, email: "staff@example.test", name: "Fixture Staff" }] : [],
    authAccounts: passwordAccount ? [{ _id: "authAccounts:staff", userId, provider: "password", providerAccountId: "staff@example.test" }] : [],
    profiles: [
      { _id: "profiles:staff", email: "staff@example.test", full_name: "Fixture Staff", branch: "Fixture Branch", unit: "Fixture Unit", updated_at: originalTimestamp },
      { _id: "profiles:other", email: "other@example.test", full_name: "Other Staff", branch: "Other Branch", updated_at: originalTimestamp },
    ],
  };
  const operations = [];
  const locate = (id) => Object.values(tables).flat().find((row) => row._id === id);
  const ctx = {
    auth: { async getUserIdentity() { return userId ? { subject: `${userId}|fixture-session` } : null; } },
    db: {
      normalizeId(table, id) {
        return typeof id === "string" && id.startsWith(`${table}:`) ? id : null;
      },
      async get(first, second) {
        const table = second === undefined ? null : first;
        const id = second === undefined ? first : second;
        operations.push(["get", id]);
        const row = table ? tables[table]?.find((item) => item._id === id) : locate(id);
        return structuredClone(row ?? null);
      },
      query(table) {
        assert.ok(Object.hasOwn(tables, table), `Unknown fixture table ${table}`);
        operations.push(["query", table]);
        const predicates = [];
        const query = {
          withIndex(name, callback) {
            assert.ok(["by_email", "userIdAndProvider", "providerAndAccountId"].includes(name), `Unknown fixture index ${name}`);
            const index = { eq(field, value) { predicates.push([field, value]); return index; } };
            callback(index);
            return query;
          },
          async collect() { return structuredClone(tables[table].filter((row) => predicates.every(([key, value]) => row[key] === value))); },
          async first() { return (await query.collect())[0] ?? null; },
          async unique() { const rows = await query.collect(); assert.ok(rows.length <= 1, `Duplicate ${table} fixture rows`); return rows[0] ?? null; },
        };
        return query;
      },
      async insert(table, value) {
        assert.ok(Object.hasOwn(tables, table), `Unknown fixture table ${table}`);
        const id = `${table}:new-${tables[table].length}`;
        tables[table].push({ ...structuredClone(value), _id: id });
        operations.push(["insert", table]);
        return id;
      },
      async patch(id, value) {
        const row = locate(id);
        if (!row) throw new Error(`Document ${id} does not exist`);
        Object.assign(row, structuredClone(value));
        operations.push(["patch", id]);
      },
    },
    async runMutation(reference, payload) {
      const name = typeof reference === "string" ? reference : getFunctionName(reference);
      if (name === "profiles:provisionPasswordAccount") return app.profiles.provisionPasswordAccount._handler(ctx, payload);
      assert.equal(name, "auth:store", "Only the in-memory auth store is available");
      const args = payload.args;
      assert.equal(args.provider, "password");
      if (args.type === "retrieveAccountWithCredentials") {
        const account = tables.authAccounts.find((row) => row.providerAccountId === args.account.id);
        if (!account || args.account.secret !== valid.password) return "InvalidSecret";
        return structuredClone({ account, user: locate(account.userId) });
      }
      assert.equal(args.type, "createAccountFromCredentials");
      operations.push(["createAccount", args.account.id]);
      const userId = await ctx.db.insert("users", args.profile);
      const accountId = await ctx.db.insert("authAccounts", { userId, provider: args.provider, providerAccountId: args.account.id });
      return structuredClone({ account: locate(accountId), user: locate(userId) });
    },
  };
  return { ctx, tables, operations };
}

async function rejectsWithoutWrites(operation, state, args, error) {
  const before = structuredClone(state.tables);
  await assert.rejects(() => operation._handler(state.ctx, args), error);
  assert.deepEqual(state.tables, before);
  assert.equal(state.operations.some(([kind]) => ["insert", "patch", "createAccount"].includes(kind)), false);
}

const app = application("users:admin");
for (const name of ["createProfileForEmail", "setProfileEmail", "migrateQuotationCreators", "removeLegacySupabaseIds", "provisionPasswordAccount"]) {
  test(`${name} is an internal mutation unavailable to public callers`, () => {
    assert.ok(app.profiles[name], `${name} must be registered`);
    assert.equal(app.profiles[name].isMutation, true);
    assert.equal(app.profiles[name].isInternal, true, `${name} must not be a public mutation`);
    assert.notEqual(app.profiles[name].isPublic, true);
  });
}

test("anonymous account provisioning rejects before accessing staff data", async () => {
  const state = fixture(app, { userId: null });
  await rejectsWithoutWrites(app.profiles.createUserAccount, state, valid, /Not authenticated/);
  assert.deepEqual(state.operations, []);
});

for (const adminIds of [undefined, "", "users:someone-else", "users:administrator"]) {
  test(`account provisioning rejects staff outside the admin allowlist ${JSON.stringify(adminIds)}`, async () => {
    const configured = application(adminIds);
    await rejectsWithoutWrites(configured.profiles.createUserAccount, fixture(configured), valid, /admin|authorized|forbidden/i);
  });
}

test("an allowlisted identity without a users document cannot provision accounts", async () => {
  await rejectsWithoutWrites(app.profiles.createUserAccount, fixture(app, { userExists: false }), valid, /admin|authorized|forbidden|user|account|authenticated/i);
});

for (const password of ["", "1234567"]) {
  test(`administrator provisioning rejects a ${password.length}-character password`, async () => {
    await rejectsWithoutWrites(app.profiles.createUserAccount, fixture(app), { ...valid, password }, /password|8/i);
  });
}

for (const name of ["createUserAccount", "createProfileForEmail"]) {
  for (const field of ["email", "fullName", "branch"]) {
    test(`${name} rejects blank ${field} without changing accounts or profiles`, async () => {
      await rejectsWithoutWrites(app.profiles[name], fixture(app), { ...valid, [field]: " \t " }, /required|blank|empty|email|name|branch/i);
    });
  }
}

test("a configured administrator with a users document can provision a staff account", async () => {
  const state = fixture(app);
  await app.profiles.createUserAccount._handler(state.ctx, valid);
  const profile = state.tables.profiles.find((row) => row.email === valid.email);
  assert.ok(profile);
  assert.equal(profile.full_name, valid.fullName);
  assert.equal(profile.branch, valid.branch);
  assert.equal(profile.unit, valid.unit);
  const account = state.tables.authAccounts.find((row) => row.providerAccountId === valid.email);
  assert.ok(account);
  assert.equal(state.tables.users.find((row) => row._id === account.userId)?.email, valid.email);
});

test("the configured Password provider rejects self-registration before creating an account", async () => {
  const state = fixture(app, { userId: null });
  const before = structuredClone(state.tables);
  await assert.rejects(() => app.password.authorize({ email: valid.email, password: valid.password, flow: "signUp" }, state.ctx), /Self-registration is disabled/);
  assert.deepEqual(state.tables, before);
  assert.deepEqual(state.operations, []);
});

test("the configured Password provider allows an existing staff email to sign in", async () => {
  const state = fixture(app);
  const before = structuredClone(state.tables);
  const result = await app.password.authorize({ email: "staff@example.test", password: valid.password, flow: "signIn" }, state.ctx);
  assert.equal(result.userId, "users:admin");
  assert.deepEqual(state.tables, before);
});

test("setProfileEmail rejects blank email without modifying a profile", async () => {
  await rejectsWithoutWrites(app.profiles.setProfileEmail, fixture(app), { profileId: "profiles:staff", email: " \t " }, /email|required|blank|empty/i);
});

test("setProfileEmail rejects a missing target profile", async () => {
  await rejectsWithoutWrites(app.profiles.setProfileEmail, fixture(app), { profileId: "profiles:missing", email: valid.email }, /not found|does not exist/i);
});

test("setProfileEmail cannot take an email owned by another staff profile", async () => {
  await rejectsWithoutWrites(app.profiles.setProfileEmail, fixture(app), { profileId: "profiles:staff", email: "other@example.test" }, /already|another|in use|duplicate/i);
});

test("setProfileEmail updates the email and timestamp while preserving other staff metadata", async () => {
  const state = fixture(app);
  const before = structuredClone(state.tables.profiles);
  await app.profiles.setProfileEmail._handler(state.ctx, { profileId: "profiles:staff", email: valid.email });
  const row = state.tables.profiles[0];
  assert.equal(row.email, valid.email);
  assert.notEqual(row.updated_at, originalTimestamp);
  assert.ok(Number.isFinite(Date.parse(row.updated_at)));
  assert.deepEqual({ ...row, email: before[0].email, updated_at: before[0].updated_at }, before[0]);
  assert.deepEqual(state.tables.profiles[1], before[1]);
});

test("setProfileEmail is idempotent for the current email", async () => {
  const state = fixture(app);
  const before = structuredClone(state.tables);
  await app.profiles.setProfileEmail._handler(state.ctx, { profileId: "profiles:staff", email: "staff@example.test" });
  await app.profiles.setProfileEmail._handler(state.ctx, { profileId: "profiles:staff", email: "staff@example.test" });
  assert.deepEqual(state.tables, before);
});

test("createProfileForEmail creates one profile and returns its id on retries", async () => {
  const state = fixture(app);
  const first = await app.profiles.createProfileForEmail._handler(state.ctx, valid);
  const afterFirst = structuredClone(state.tables);
  const second = await app.profiles.createProfileForEmail._handler(state.ctx, valid);
  assert.equal(second.id, first.id);
  assert.deepEqual(state.tables, afterFirst);
  const saved = state.tables.profiles.find((row) => row._id === first.id);
  assert.equal(saved.email, valid.email);
  assert.equal(saved.full_name, valid.fullName);
  assert.equal(saved.branch, valid.branch);
  assert.equal(saved.unit, valid.unit);
});

test("getMyProfile returns null anonymously without querying staff records", async () => {
  const state = fixture(app, { userId: null });
  assert.equal(await app.profiles.getMyProfile._handler(state.ctx, {}), null);
  assert.deepEqual(state.operations, []);
});

test("getMyProfile returns empty fields without querying profiles when no password account exists", async () => {
  const state = fixture(app, { passwordAccount: false });
  const result = await app.profiles.getMyProfile._handler(state.ctx, {});
  assert.deepEqual({ ...result }, { full_name: null, branch: null, unit: null, email: null });
  assert.equal(state.operations.some(([kind, table]) => kind === "query" && table === "profiles"), false);
});

test("getMyProfile binds the signed-in password email to its matching staff profile", async () => {
  const state = fixture(app);
  const result = await app.profiles.getMyProfile._handler(state.ctx, {});
  assert.deepEqual({ ...result }, { full_name: "Fixture Staff", branch: "Fixture Branch", unit: "Fixture Unit", email: "staff@example.test" });
});
