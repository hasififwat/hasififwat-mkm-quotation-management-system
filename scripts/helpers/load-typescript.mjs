import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

export function typescriptLoader(repo) {
  const localRequire = createRequire(path.join(repo, "package.json"));
  const ts = localRequire("typescript");
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    vm.runInNewContext(compiled.outputText, {
      exports,
      require(id) {
        if (id.startsWith(".")) {
          const resolved = path.resolve(path.dirname(filename), id);
          if (fs.existsSync(`${resolved}.ts`)) return load(`${resolved}.ts`);
          return localRequire(`${resolved}.js`);
        }
        return localRequire(id);
      },
    }, { filename });
    return exports;
  }
  return load;
}
