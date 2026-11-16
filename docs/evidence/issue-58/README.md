# Preserved revision PDF artifacts

Staff need each saved revision and its exact issued PDF to survive later edits and template releases. This implements the inactive server issuance boundary for #58 under #54. The revision release gate remains closed. #59 owns consuming these APIs in the edit and history UI. #61 owns release integration.

## Artifact API

`quotationPdfArtifacts.status({revision_id})` authenticates staff before lookup. It returns `pending`, `running`, `failed`, `ready`, or `missing_original`. Ready metadata includes the exact revision ID, full revision filename, MIME type, byte size, PDF SHA-256, frozen input SHA-256, renderer, asset and terms versions, and provenance. Storage IDs and frozen customer input remain internal.

`quotationPdfWorker.download({revision_id})` authenticates through its internal query and returns the stored ArrayBuffer, filename, size and SHA-256. It verifies downloaded length and hash. It never returns a public storage URL. `GET /api/quotations/[qid]/pdf` forwards the signed-in token and returns inline PDF bytes with private, no-store headers. Append `?download=1` for an attachment. A missing, failed, or pending artifact returns HTTP 409. Unauthenticated requests return HTTP 401.

`quotationPdfArtifacts.retry({revision_id})` authenticates and operates on the existing artifact. It never invokes saveRevision or creates a revision. Failed becomes pending. Pending schedules reconciliation. Running keeps its active lease until expiry. Ready remains terminal. Missing artifacts reject retry rather than reconstructing an original.

The PDF pane must use status and the authenticated route for saved revisions once #61 activates the family UI. Pending and failed states block issuance. The inactive legacy browser preview continues unchanged. Do not interpret an absent artifact on an older quotation as permission to regenerate an original.

## Transaction and recovery contract

The new-save path inserts one `quotation_pdf_artifacts` row and schedules the Node action in the same mutation as the revision, items, receipt, and family pointer. Save receipt replay returns before this hook. Rollback removes the artifact and scheduled work with the save.

The artifact contains a discriminated pending, running, failed, or ready state. Each claim inserts a separate `quotation_pdf_attempts` row. Its ID fences finalization. Running has a two-minute lease and a transactionally scheduled reconciliation. Duplicate workers cannot claim running work. Reconciliation retires an expired attempt and reschedules pending work, or finalizes its recorded candidate. Render failures await explicit authenticated retry. Ready never transitions again.

The Node action renders outside the transaction, stores server-owned bytes, registers the candidate against storage metadata and the saved input hash, and finalizes only its active attempt. Candidate registration schedules cleanup transactionally. Cleanup deletes only that recorded candidate after its attempt is no longer active or authoritative. A finalization exception recovers the registered candidate instead of deleting it. No global storage sweep or retention endpoint exists.

## Frozen input and retained implementation

`freezeRevisionPdf` consumes only `FrozenQuotationDocumentV1` produced by saveRevision. It never reads current clients, profiles, packages, rooms, or flights. The complete renderer input and SHA-256 persist at save time, including copied PNG bytes, terms, date labels, and version metadata. Missing historical values remain absent or print NOT RECORDED. A legacy descendant carries reconstruction provenance and a visible reconstruction notice. No original-import endpoint is introduced in this change.

`pdf/versions/QuotationDocumentV1.tsx` retains the executable v1 layout and currency formatter. Server dispatch recognizes the literal `mkm-quotation-v1` independently of the current input version. Future releases must add a new version and preserve this implementation. Branding and terms have dedicated v1 copies and are also embedded in every frozen input.

`convex.json` externalizes `@react-pdf/renderer`. This follows the coordinator's observed action proof and [Convex bundling configuration](https://docs.convex.dev/functions/bundling). [PDFKit issue 1801](https://github.com/foliojs/pdfkit/issues/1801) explains why inlining its standard-font imports fails.

## Reproduce verification

Run these commands with Node 24 and Poppler on PATH.

```sh
pnpm exec next typegen
pnpm typecheck
node --test scripts/*.test.mjs
node scripts/check-quotation-pdf.mjs /tmp/issue58-pdf-parity
FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/issue58-backend.json node scripts/check-pdf-artifact-backend.mjs
```

The backend fixture uses isolated ports 13485 and 13486, a temporary database and an admin test identity. It never reads project credentials or contacts a shared deployment. It tests actual save scheduling, receipt replay, rollback, duplicate claims, expired attempts, stale finalizers, public retries, render and upload failures, finalization recovery, owned late-upload cleanup, unauthorized retrieval, missing-original honesty, and repeated stored downloads. It changes the current template, formatter, branding and terms in the disposable source tree and redeploys while an old job is pending. These injected sources and fixture-only writers never enter the application bundle. The fixture stops its backend and removes its database in finally.

The JSON report records the exact tested source. The PDF and page image are actual bytes retrieved from that backend. Browser evidence displays the retrieved PDF, not an activated edit and history workflow. Release-gated application save UI verification remains with #59 and #61.

## Decisions

Two independent Codex design helpers compared a single mutable artifact row with separate attempt rows. The parent selected separate attempts to retain upload ownership when a stale worker finishes. The configured Codex-only policy excludes a cross-family arena judge. Independent review found a cleanup scheduling gap and dependencies on a mutable formatter and current version constant. All three were corrected. No added comments or suppressions required removal. Deslop and control skills are unavailable; direct cleanup, real runtime checks and native Chrome supplied the available verification.

Model the Domain shaped the state union and attempt ownership. Make Operations Idempotent shaped receipt replay, terminal readiness and recovery. Prove It Works required actual action rendering, storage and repeated authenticated downloads.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| An upload can finish before its ownership registration commits. | A hard crash can leave an unattributed file. Recovery leaves unknown files untouched rather than risk deleting an original. | Crash between storage.store and recordUpload. | Unmeasured crash window. | Storage operators. | Known storage boundary. |
| Hosted execution and activated application UI remain unverified. | Local runtime proof does not establish cloud runtime or the future gated workflow. | Deploy to hosted Convex or enable #61. | Environment dependent. | Release integrators. | Verification limit. |
| The retained fixed layout can overflow with long content. | Large quotations can extend beyond the existing body layout. | Substantially longer content than tested fixtures. | Input dependent. | Staff and customers. | Existing renderer limit. |
