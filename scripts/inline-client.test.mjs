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

function load(relativePath, dependencies, globals = {}) {
  const filename = path.join(repo, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports,
    ...globals,
    require(id) {
      return Object.hasOwn(dependencies, id) ? dependencies[id] : localRequire(id);
    },
  }, { filename });
  return exports;
}

test("creation API returns the stored client name with its ID", async () => {
  const { POST } = load("src/app/api/clients/create/route.ts", {
    "convex/_generated/api": { api: { clients: { create: "clients:create" } } },
    "~/lib/convex-server": {
      getServerConvexClient: async () => ({
        mutation: async () => ({ alreadyExists: false, id: "client:1", name: "Stored Name" }),
      }),
    },
  });
  const formData = new FormData();
  formData.set("name", "Entered Name");
  formData.set("phone_number", "0192100005");
  const response = await POST({ formData: async () => formData });
  assert.deepEqual(await response.json(), {
    success: true,
    clientId: "client:1",
    client: { id: "client:1", name: "Stored Name" },
  });
});

function formHarness(response) {
  const states = [];
  let cursor = 0;
  const { CreateClientForm } = load("src/features/clients/CreateClientForm.tsx", {
    react: {
      useState(initial) {
        const slot = cursor++;
        if (!(slot in states)) states[slot] = initial;
        return [states[slot], (value) => { states[slot] = value; }];
      },
    },
    "~/components/ui/button": { Button: "button" },
    "~/components/ui/input": { Input: "input" },
    "~/components/ui/label": { Label: "label" },
  }, {
    fetch: async () => ({ ok: true, json: async () => response }),
    FormData: class extends Map {},
  });
  const results = [];
  const render = () => {
    cursor = 0;
    return CreateClientForm({ onSuccess: (client) => results.push(client) });
  };
  return { render, results };
}

test("client submit contains the event and forwards the returned summary", async () => {
  const client = { id: "client:2", name: "Stored Client" };
  const { render, results } = formHarness({ success: true, client });
  const events = [];
  await render().props.onSubmit({
    preventDefault: () => events.push("preventDefault"),
    stopPropagation: () => events.push("stopPropagation"),
    currentTarget: [],
  });
  assert.deepEqual(events, ["preventDefault", "stopPropagation"]);
  assert.deepEqual(results, [client]);
});

test("duplicate reuse forwards the existing name rather than the candidate name", async () => {
  const existing = { id: "client:3", name: "Existing Client", phone_number: "0192100005" };
  const { render, results } = formHarness({ alreadyExists: true, existing });
  await render().props.onSubmit({
    preventDefault() {},
    stopPropagation() {},
    currentTarget: [],
  });
  const form = render();
  const fieldset = form.props.children[0];
  const warning = fieldset.props.children[2];
  const reuseButton = warning.props.children[1].props.children[1];
  reuseButton.props.onClick();
  assert.deepEqual(results, [existing]);
});

test("Enter stays inside the client form without cancelling native submission", () => {
  const { render } = formHarness({});
  const events = [];
  render().props.onKeyDown({
    key: "Enter",
    stopPropagation: () => events.push("contained"),
    preventDefault: () => events.push("cancelled"),
  });
  assert.deepEqual(events, ["contained"]);
});
