# Workspace panels and loading states

The baseline was `50fb019d`. The tested change was `22e98a50fd46a30ea0e9eed91815eb3e978ae500`. The browser used `http://localhost:3557` and a disposable Convex database.

## Workspace

The gap between the sidebar and main panel measured 1 px before the change and 16 px at the same 1402 px viewport after it. The desktop sidebar collapsed and reopened. At 820 px, the package Preview step was inside the workspace, and the header stayed in view during scroll. At 390 px, the mobile drawer closed after navigation and the page fit the viewport.

[Before](islands-before.png) · [Light theme](islands-light.png) · [Dark theme](islands-dark.png)

## Loading

The protected shell uses page-shaped placeholders for authentication and route loading. The 18 protected route shapes cover tables, dashboards, forms, uploads, details, and documents. Pending table rows keep the real headers in view. The loading status is available to screen readers and the placeholder blocks respect reduced motion.

| Case | Observed outcome |
| --- | --- |
| Clients with a delayed read | The old page said “No clients yet.” The new page showed four skeleton rows and then the seeded row. |
| Clients with a nonmatching search | Four skeleton rows gave way to the actual empty result. |
| Clients with an injected read failure | An error replaced the skeletons and no empty message appeared. |
| Package and quotation editor navigation | The destination skeleton appeared with zero focusable placeholders and gave way to the real form. |
| Flight schedule CSV | Four pending rows gave way to the parsed flight. |
| Issued PDF | The document skeleton and progress message appeared while pending. The existing retry control appeared after an injected failure. |
| Package season group | The first load and reload started expanded. Manual collapse and expand both worked. |

[Old pending table](clients-before-loading.png) · [New pending table](clients-loading.png) · [Client read error](clients-load-error.png) · [Package editor loading](package-editor-loading.png) · [Issued PDF loading](issued-pdf-loading.png)

The targeted checks used delays and error states set up in the disposable copy. The final route sweep ran without those source changes. A synthetic quotation revision was saved, found as the current revision in history, and reloaded with its note and total intact.

## Verification

All 22 routes and fallback entry points passed 88 checks across desktop and mobile in light and dark mode. The Turbopack build, TypeScript, scoped loading lint, 159 regression tests, and PDF raster comparison passed. The server and browser tab closed, and the disposable database was removed.

[Iteration log](workspace-decisions.tsv)
