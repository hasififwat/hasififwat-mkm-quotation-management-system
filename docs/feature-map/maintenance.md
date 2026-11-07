# Investigate and maintain the feature map

## Scope a bug by feature ID

1. Open the [overview](README.md) and select a feature area.
2. Find the action in that area's feature table. Copy its ID and the entry route.
3. Describe the observed result and the expected result. Include the affected record IDs and reproduction steps without copying credentials or customer information into public reports.
4. Follow the linked UI, route handler, backend operation, and schema. Check [shared infrastructure](infrastructure.md) when the same symptom affects several features.
5. Choose an existing check from the feature's verification references. Use a disposable backend for mutation journeys. A unit fixture or static trace does not replace a live reproduction when the defect concerns deployed behavior.

For example, use `APP-02` to investigate theme persistence. Specify the browser, entry route, initial theme, toggle action, reload, expected theme, and observed theme. The linked provider and existing appearance journey identify the code and the persistence check.

For a business action, replace `APP-02` with the specific `CLIENT`, `PKG`, `FLIGHT`, or `QUOTE` action ID. Include related feature IDs when the failing path crosses boundaries, such as package edits followed by quotation snapshot review.

## Preserve identifiers

Keep a feature ID when its implementation moves or its wording changes. Allocate the next unused number within its existing prefix for a new action. Do not renumber rows to make the table consecutive. Do not reuse a removed ID for another action. Keep a retired row with its replacement or removal explanation so old issue links remain useful.

Keep each ID's explicit lowercase anchor, such as `app-02`. Link to `infrastructure.md#app-02`. Keep the uppercase ID in issue titles and investigation prompts.

## Update the snapshot and coverage

1. Record the new inspected commit and relevant working-tree changes in [README.md](README.md#snapshot).
2. Reconcile affected feature descriptions with code. Check callers and storage changes, not only the named component.
3. Update [coverage.json](coverage.json) and [coverage.md](coverage.md) for added, removed, or moved routes and backend operations. Map each operation to its actual action ID, or record an explicit exclusion for non-operations.
4. Update diagrams and source links. Keep containment, execution flow, dependency, and data diagrams separate.
5. Record the checks actually run in [verification.md](verification.md). Use `code-traced` for static findings and `fixture-executed` for in-memory checks. Use `runtime-verified` only for the real application path exercised against its intended backend.
6. Reassess the single table in [findings.md](findings.md). Preserve proof links and distinguish confirmed code behavior from deployment reachability that has not been tested.

## Check documentation links and inventories

From the repository root, run the checker with the repository's installed dependencies.

```sh
node docs/feature-map/check.mjs
```

The checker compares `src/app/**/page.tsx` and `route.ts` files with the route inventory. It uses the TypeScript parser to discover exported registered Convex functions, including the `convexAuth` bindings. It checks local Markdown link destinations, explicit feature anchors, heading fragments, duplicate feature IDs, and manifest mappings.

The checker does not prove feature behavior or render Mermaid. Inspect changed source descriptions yourself. Update the checker if the application adopts other route extensions or indirect registration patterns.

## Render diagrams

Use Mermaid CLI in a separate temporary tools directory so diagram verification does not change application dependencies. The initial map used `@mermaid-js/mermaid-cli@11.15.0` with the installed Google Chrome executable configured through Puppeteer.

For each Markdown document containing Mermaid, run the following command. Replace the input filename and temporary paths with your actual paths.

```sh
/tmp/mkm-feature-map-tools/node_modules/.bin/mmdc -i docs/feature-map/README.md -o /tmp/mkm-feature-map-render/README.md -p /tmp/mkm-feature-map-render/puppeteer.json
```

The Puppeteer configuration for this machine is the following JSON object.

```json
{
	"executablePath": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
}
```

Require a successful render for every diagram, then inspect the output for clipped labels, overlap, unreadable density, and misleading arrows. Split a diagram when it becomes difficult to read. Keep render output outside the repository unless a new image is an intentional documentation artifact.
