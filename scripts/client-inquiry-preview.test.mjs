import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const filename = "src/features/clients/InquiryComparison.tsx";
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

function renderPreview(data) {
  const exports = {};
  const noop = () => null;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useEffect: noop, useState: value => [value, noop] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "convex/react": { useQuery: () => data },
    "convex/_generated/api": { api: { inquiries: { forClient: "forClient" } } },
    "~/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
    "~/features/quotation/inquiry-display": {
      inquiryStatusLabel: { active: "Active", closed: "Closed", accepted: "Accepted" },
      inquiryClosureLabel: { manual: "Inquiry closed without acceptance" },
    },
  };
  runInNewContext(outputText, {
    exports,
    require: id => modules[id] ?? new Proxy({}, { get: () => noop }),
  }, { filename });

  function links(element) {
    if (Array.isArray(element)) return Array.from(element).flatMap(links);
    if (!element || typeof element !== "object") return [];
    if (element.props?.href) return [element.props.href];
    const rendered = typeof element.type === "function" ? element.type(element.props) : null;
    return links(rendered ?? element.props?.children);
  }

  return links(exports.ClientInquiryPreview({ clientId: "client-1", children: null }));
}

function inquiry(id, outcome, status) {
  return {
    id, outcome, deadline: 1000,
    options: [{ family_id: id, revision_id: id, reference: id, status, reason: "manual", total_amount: 100 }],
  };
}

test("the directory shows the last closed Inquiry by outcome time, even if it opened earlier", () => {
  const mostRecentlyOpened = inquiry("later-opening", { type: "manual", at: 100 }, "closed");
  const mostRecentlyClosed = inquiry("later-closure", { type: "accepted", at: 300 }, "accepted");
  const links = renderPreview({ inquiries: [mostRecentlyOpened, mostRecentlyClosed], actions_enabled: true, server_now: 400 });
  assert.deepEqual(links, ["/clients/client-1", "/quotations/review/later-closure"]);
});

test("an open Inquiry takes precedence over closed history and exposes its active quotation edit", () => {
  const open = inquiry("ongoing", null, "active");
  const closed = inquiry("closed", { type: "manual", at: 100 }, "closed");
  const links = renderPreview({ inquiries: [closed, open], actions_enabled: true, server_now: 400 });
  assert.deepEqual(links, ["/clients/client-1", "/quotations/review/ongoing", "/quotations/edit/ongoing"]);
});
