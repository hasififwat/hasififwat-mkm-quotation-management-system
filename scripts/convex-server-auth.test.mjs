import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localRequire = createRequire(path.join(repo, "package.json"));
const ts = localRequire("typescript");
const { makeFunctionReference } = localRequire("convex/server");
const sourcePath = path.join(repo, "src/lib/convex-server.ts");

function loadFactory(tokens, env = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exported = {};
  vm.runInNewContext(compiled.outputText, {
    exports: exported,
    process: { env },
    require(id) {
      if (id === "@convex-dev/auth/nextjs/server") {
        return { convexAuthNextjsToken: async () => tokens.shift() };
      }
      if (id === "server-only") return {};
      return localRequire(id);
    },
  }, { filename: sourcePath });
  return exported.getServerConvexClient;
}

test("server requests carry their own session and never reuse another request's token", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "https://fixture.convex.cloud/api/query");
    requests.push(new Headers(options.headers).get("Authorization"));
    return new Response(JSON.stringify({ status: "success", value: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  });
  const factory = loadFactory(["fixture-agent-a", "fixture-agent-b", undefined], {
    NEXT_PUBLIC_CONVEX_URL: "https://fixture.convex.cloud",
  });
  const first = await factory();
  const second = await factory();
  const anonymous = await factory();
  assert.notEqual(first, second);
  assert.notEqual(second, anonymous);
  const list = makeFunctionReference("packages:listWithRooms");
  assert.deepEqual(await first.query(list, {}), []);
  assert.deepEqual(await second.query(list, {}), []);
  assert.deepEqual(await anonymous.query(list, {}), []);
  assert.deepEqual(requests, ["Bearer fixture-agent-a", "Bearer fixture-agent-b", null]);
});

test("server configuration keeps its server-only URL preference", async () => {
  const factory = loadFactory([undefined], {
    CONVEX_URL: "https://server-fixture.convex.cloud",
    NEXT_PUBLIC_CONVEX_URL: "https://public-fixture.convex.cloud",
  });
  assert.equal((await factory()).url, "https://server-fixture.convex.cloud");
});

test("missing deployment configuration still fails explicitly", async () => {
  const factory = loadFactory([undefined]);
  await assert.rejects(async () => factory(), /CONVEX_URL \/ NEXT_PUBLIC_CONVEX_URL is not set/);
});
