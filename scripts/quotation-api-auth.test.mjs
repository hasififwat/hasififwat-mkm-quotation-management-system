import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const exported = {};
const sourcePath = path.resolve('src/proxy.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
});
vm.runInNewContext(compiled.outputText, {
  exports:exported,
  require(id) {
    if (id === '@convex-dev/auth/nextjs/server') return {
      convexAuthNextjsMiddleware: handler => handler,
      createRouteMatcher: patterns => request => patterns.some(pattern => new RegExp(`^${pattern}$`).test(new URL(request.url).pathname)),
      nextjsMiddlewareRedirect: (_request, target) => Response.redirect(`https://fixture.invalid${target}`),
    };
    return require(id);
  },
}, {filename:sourcePath});

for (const route of ['/api/quotations/create', '/api/quotations/update', '/api/packages/create']) {
  test(`anonymous ${route} returns 401 JSON`, async () => {
    const response = await exported.default(new Request(`https://fixture.invalid${route}`, {method:'POST'}), {
      convexAuth:{isAuthenticated:async () => false},
    });
    assert.equal(response.status,401);
    assert.deepEqual(await response.json(),{success:false,error:'Not authenticated'});
  });
  test(`authenticated ${route} continues to its handler`, async () => {
    assert.equal(await exported.default(new Request(`https://fixture.invalid${route}`, {method:'POST'}), {
      convexAuth:{isAuthenticated:async () => true},
    }), undefined);
  });
}
