import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const filename = "src/features/clients/InquiryComparison.tsx";
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

function loadInquiryViews(data, hooks = {}, globals = {}) {
  const exports = {};
  const noop = () => null;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useEffect: noop,
      useState: value => [value, noop],
      useRef: current => ({ current }),
      ...hooks,
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "convex/react": { useQuery: () => data },
    "convex/_generated/api": { api: { inquiries: { forClient: "forClient" } } },
    "~/features/quotation/revision-display": { revisionDate: value => value },
    "~/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
    "~/features/quotation/inquiry-display": {
      inquiryStatusLabel: { active: "Active", closed: "Closed", accepted: "Accepted" },
      inquiryClosureLabel: { manual: "Inquiry closed without acceptance" },
    },
  };
  runInNewContext(outputText, {
    exports,
    ...globals,
    require: id => modules[id] ?? new Proxy({}, { get: () => noop }),
  }, { filename });

  return exports;
}

function elements(element) {
  if (Array.isArray(element)) return Array.from(element).flatMap(elements);
  if (!element || typeof element !== "object") return [];
  const rendered = typeof element.type === "function" ? element.type(element.props) : null;
  return rendered ? elements(rendered) : [element, ...elements(element.props?.children)];
}

function renderPreview(data) {
  const views = loadInquiryViews(data);
  const preview = views.ClientInquiryPreview({ clientId: "client-1", children: null });
  return elements(preview).flatMap(node => node.props?.href ? [node.props.href] : []);
}

function inquiry(id, outcome, status) {
  return {
    id, outcome, deadline: 1000, opened_at: "2026-11-24T02:48:00Z",
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

function renderTimeline() {
  const open = inquiry("ongoing", null, "active");
  const closed = inquiry("closed", { type: "manual", at: Date.parse("2026-11-25T07:30:00Z") }, "closed");
  const accepted = inquiry("accepted", { type: "accepted", at: 200, revision_id: "accepted" }, "accepted");
  const data = { inquiries: [open, closed, accepted], actions_enabled: true, server_now: 400 };
  const state = new Map();
  let nextState = 0;
  let onResize;
  const effects = [];
  const views = loadInquiryViews(data, {
    useState(initialValue) {
      const index = nextState++;
      if (!state.has(index)) state.set(index, initialValue);
      return [state.get(index), value => state.set(index, value)];
    },
    useEffect(effect) { effects.push(effect); },
  }, {
    window: { location: { hash: "" }, addEventListener() {} },
    ResizeObserver: class {
      constructor(callback) { onResize = callback; }
      observe() {}
    },
  });

  function render() {
    nextState = 0;
    effects.length = 0;
    return views.default({ clientId: "client-1" });
  }

  const initial = render();
  initial.props.ref.current = {};
  effects.splice(0).forEach(effect => effect());

  return {
    render,
    disclosure(id) {
      return elements(render()).find(node => node.type === "button" && node.props["aria-describedby"] === `inquiry-${id}-summary`);
    },
    previewLinks(withinInquiry) {
      const nodes = elements(render());
      const scope = withinInquiry ? elements(nodes.find(node => node.props?.id === `inquiry-${withinInquiry}`)) : nodes;
      return scope.filter(node => node.props?.["aria-label"]?.startsWith("Preview quotation"))
        .map(node => node.props.href);
    },
    editLinks() {
      return elements(render()).filter(node => node.props?.href?.startsWith("/quotations/edit/"))
        .map(node => node.props.href);
    },
    resize(width) { onResize([{ contentRect: { width } }]); },
  };
}

test("narrow client detail reveals only the selected Inquiry inline and can collapse it", () => {
  const timeline = renderTimeline();
  timeline.resize(390);
  assert.equal(timeline.disclosure("ongoing").props["aria-expanded"], false);
  assert.deepEqual(timeline.previewLinks(), []);

  timeline.disclosure("ongoing").props.onClick();
  assert.equal(timeline.disclosure("ongoing").props["aria-expanded"], true);
  assert.deepEqual(timeline.previewLinks("ongoing"), ["/quotations/review/ongoing"]);
  assert.deepEqual(timeline.editLinks(), ["/quotations/edit/ongoing"]);

  timeline.disclosure("ongoing").props.onClick();
  assert.deepEqual(timeline.previewLinks(), []);
});

test("wide client detail shows one quotation pane and preserves selection when narrowed", () => {
  const timeline = renderTimeline();
  timeline.resize(1000);
  assert.equal(timeline.disclosure("ongoing").props["aria-pressed"], true);
  assert.deepEqual(timeline.previewLinks(), ["/quotations/review/ongoing"]);
  assert.deepEqual(timeline.previewLinks("ongoing"), []);

  timeline.disclosure("accepted").props.onClick();
  assert.equal(timeline.disclosure("accepted").props["aria-pressed"], true);
  assert.deepEqual(timeline.previewLinks(), ["/quotations/review/accepted"]);
  assert.deepEqual(timeline.editLinks(), []);

  timeline.resize(390);
  assert.equal(timeline.disclosure("accepted").props["aria-expanded"], true);
  assert.deepEqual(timeline.previewLinks("accepted"), ["/quotations/review/accepted"]);
});

test("timeline summaries show closure time for closed Inquiries and prices only in quotation details", () => {
  const timeline = renderTimeline();
  timeline.resize(1000);
  const nodes = elements(timeline.render());
  const summaries = ["ongoing", "closed", "accepted"].map(id =>
    elements(nodes.find(node => node.props?.id === `inquiry-${id}-summary`)),
  );

  assert.deepEqual(
    summaries.map(summary => summary.find(node => node.type === "time")?.props.dateTime),
    [undefined, "2026-11-25T07:30:00.000Z", undefined],
  );
  const showsPrice = node => typeof node.props?.children === "string" && /RM\s*100/.test(node.props.children);
  assert.ok(summaries.every(summary => !summary.some(showsPrice)));
  const quotations = nodes.find(node => node.type === "ul" && node.props["aria-label"] === "Quotations");
  assert.ok(elements(quotations).some(showsPrice));
});
