# Server quotation PDF boundary

This is the bounded renderer prerequisite for #62 under #58 and #54.
It supplies the actual quotation template to a Node caller. It does not issue,
store, attach, or retrieve revision artifacts.

## Consume the renderer

`freezeQuotationForServer(details, context)` copies and deeply freezes the
displayed quotation fields, document and travel date labels, terms, and branding.
The context contains `title`, `termsVersion`, `terms`, and `assets`.
Assets contain a version and header/footer PNG data URLs with the actual bytes.
The caller must retain this complete input for pending work.

`renderQuotationPdf(input)` returns `Promise<Buffer>` through the installed
React-pdf `renderToBuffer` API. It accepts `mkm-quotation-v1`, requires the
`Asia/Kuala_Lumpur` date policy, and rejects external asset URLs.
The pure shared `QuotationDocument` imports neither Next images nor current terms.

The date builder accepts ISO calendar dates or timestamps with explicit offsets.
It formats timestamps in Asia/Kuala_Lumpur. The fixture instant
`2026-11-16T16:30:00.000Z` therefore prints `17 Nov 2026`.
Travel calendar dates remain their supplied calendar days in Kuala Lumpur.
Missing flight dates print `TBC`.

The browser adapter explicitly retains legacy viewer-local date labels and the
current Next image URLs. The HTML mobile preview is unchanged. Neither legacy
path claims to serve an immutable issued artifact.

## Reproduce the check

Use Node 24, the frozen pnpm lockfile, and Poppler tools on PATH.

```sh
pnpm install --frozen-lockfile
pnpm exec next typegen
pnpm typecheck
pnpm test:quotation-pdf
TZ=UTC pnpm test:quotation-pdf
TZ=America/Los_Angeles pnpm test:quotation-pdf
node --test scripts/*.test.mjs
```

The check compiles the real TypeScript modules into a temporary directory,
renders real PDF bytes, checks text and embedded images with Poppler, and
rasterizes the page at 1800 pixels high. It compares the browser adapter's
raster with the original template at required base
`3d18ab73179abc8a4d1d6407c0e6b65d7bc9a3da`.
It removes temporary compiled modules. Generated outputs default to
`output/pdf/issue-62`. An optional positional output directory overrides that.

For the isolated browser check, run `node scripts/check-quotation-pdf-browser.mjs`.
Open `http://127.0.0.1:3162` in an isolated browser profile, click **Generate PDF**,
and open the generated PDF. Stop the owned process afterward.
The script bundles the actual browser adapter and React-pdf browser entry.
It converts PNG imports to the Next image object shape with inline real bytes.
This proves browser rendering, not the authenticated Next quotation journey.
The harness keeps generated browser files under ignored `.next/quotation-pdf-browser`.

## Observed evidence

The local runtime was Node v24.19.0 on darwin arm64 with React 19.2.8 and
`@react-pdf/renderer` 4.9.0. The manifest range begins at 4.3.2, but the lockfile
resolves 4.9.0. The Node PDF was 170139 bytes with one A4 page and two embedded
branding images. Poppler checked the full revision reference
`MKM/1448H/0062/R02`, the total RM 26,420.50, dates, pricing rows, flight, hotels,
meal plans, transport, inclusions, exclusions, and all five payment terms.
The disabled hotel was absent. Base and extracted browser rasters matched.
All 573 existing tests passed. Typecheck passed after Next type generation.

The browser generated 170336 bytes. Native Chrome opened the actual result at
`http://127.0.0.1:3162/browser.pdf`. The screenshot shows its single page.
The shared T3 browser snapshot timed out twice, so native Chrome supplied the
authorized fallback. Both verification tabs and the owned server were closed.
No backend, account, customer record, or shared data was used or changed.

[Server PDF](MKM-1448H-0062-R02.pdf) and [browser PDF](browser.pdf) contain only
synthetic quotation data and the repository's existing branding and terms.
`server-page.png` is a raster of the actual Node PDF. `browser-pdf.png` captures
the actual browser PDF viewer. The PR records the exact tested final head.

## Handoff to #58

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Convex action bundling and execution remain unverified. | A worker can fail despite local Node success. | Bundle and execute the renderer as a Convex Node action. | Unknown until tested on a disposable backend. | The #58 implementer and staff waiting for artifacts. | Explicit runtime limit. |
| Legacy layout has fixed body and footer positioning. | Arbitrarily large quotations can overflow. | Supply substantially longer content than the verified fixture. | Input dependent and unmeasured. | Staff issuing long quotations. | Existing layout limit retained by this extraction. |

The chosen API follows the [React-pdf Node API](https://react-pdf.org/docs/v4/node).
The [Convex runtime documentation](https://docs.convex.dev/functions/runtimes)
describes a separate opt-in Node action runtime. No action was bundled, deployed,
or executed here. #58 must prove that deployment with this real template and
asset bytes, or choose a separately verified Node worker.

#58 must supply frozen revision data rather than live package lookups, retain
input and version metadata, persist the first successful PDF bytes, and implement
authorization, storage, readiness, retries, and attachment ownership. Renderer
metadata can change between renders, so byte-identical regeneration is not a
guarantee. Version tags do not archive executable templates. #58 must retain old
template implementations and assets needed by pending jobs across deployments.

Model the Domain shaped the frozen display contract. Prove It Works shaped the
actual PDF assertions, visual inspection, and base-template raster comparison.
The Codex-only policy prevented a different-family judge. The parent selected
the shared-template design after two narrow design explorations.
