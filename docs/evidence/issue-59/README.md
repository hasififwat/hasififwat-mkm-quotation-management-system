# Immutable revision editing and saved history

Staff need every intentional saved edit to preserve earlier quotation data and exact issued PDFs. This implements #59 under #54. Save now navigates to the returned revision. Historical editing cannot branch, and PDF readiness is independent of save success. Release was enabled only in the disposable fixture. No shared deployment or shared release activation was performed.

## Contract

The create and update HTTP routes accept `{command, expected_actor}`. The command uses the existing create/append mutation contract with explicit retain/replace intent. The HTTP response returns `id`, `family_id`, `quotation_number`, and `revision`. The helper exposes the returned ID and reference to navigation.

The editor owns one typed save session. An uncertain result retains the exact serialized command, request key, and original actor. Reauthentication during recovery keeps that original attempt. A new intentional save receives a new key, including an unchanged save. A stale conflict keeps the entered draft and fixed source identity. Its current-revision link opens separately.

Retained room controls use source item IDs outside the shared form parser. Catalog review does not replace the selection or save anything. Explicit confirmation installs the reviewed replacement, preserving entered prices. Modern editing never calls ID-only snapshot refresh.

`quotationRevisionUi.availability` authenticates and distinguishes legacy, migration, maintenance, and active modes. A migration record permanently blocks legacy updates. Committed legacy create receipts still reach the existing receipt-first backend after freeze. The UI never activates release. Historical and archived records never fall back to overwrite.

`/quotations/[qid]/history` resolves the exact revision's family and consumes #60's ordered history API. Review and history show saved status, actor, source, current/historical state, and Kuala Lumpur times. `family_created_at` is labelled Earliest retained quotation. Unknown legacy provenance stays explicit.

Saved PDF views use authenticated status, artifact-only retry, and `/api/quotations/[qid]/pdf`. Pending and failed states offer no issuance links. Missing original offers no regeneration. The inactive legacy preview remains available before cutover.

## Tested source and runtime

The UI implementation and review corrections are `1f70d1b0dff9a5c2e83b0a9dfebae468e15dd30f`. That commit normally incorporates #60 at `e249d211ba76edb551fe8b8538a738a3f81d7fb5`.

The final combined product tested after adding #58's pending watchdog is `5dd686f3f9a5346bec6343c9199317fca5c80484`. It includes #58 recovery head `0259a2eb45b505e7446dfa6355ca4cb682db1172`. The later history-fixture copy-list commit `0dfec2e7ffdba90a0075160975d63b8a246c114e` changes verification setup only. [Source verification](source-verification.json) compared all 180 non-generated application and backend files against the running snapshot. The temporary lost-response hook was removed before that comparison.

The disposable backend used `http://127.0.0.1:13865` and site port 13866. The web app used `http://issue59.localhost:3530`. Node was 24.19.0, Next was 16.3.4, and Convex was 1.45.0. The explicit external run directory was `/private/tmp/mkm-issue59-run-0890d1fa`.

Browser proof used owned T3 server incognito tabs 11, 14, and 15. Desktop measured 1402 CSS pixels wide. Mobile measured 390 × 844, with document width 390. Native Chrome AX and combined preview snapshot/action operations timed out. Documented `preview_evaluate` DOM input/change/click events drove the real app. No React state setters, mocked pages, or backend save substitutes were used. Built-in recordings captured actual rendering. PNGs are extracted recording frames and were inspected before delivery.

An initial localhost run encountered cross-port authentication cookie interference. Its rejected save kept entered values and created no revision. The final hostname isolates #59 from the other verification runs. The final authenticated runtime and all subsequent saves used that isolated hostname.

## Observed user journeys

| Journey | Actual result |
| --- | --- |
| Create R0 and edit R1/R2 | The app created `1448H-0002`, `1448H-0002-R1`, and `1448H-0002-R2` with distinct IDs. Navigation followed each returned ID. |
| Second view and reload | History persisted all records. Each exact R0/R1/R2 review URL was reopened and reloaded with its original notes, RM 4,800 total, and historical marker. |
| Lost committed response | A fixture-only HTTP hook withheld R2's first successful response. Retry opened that original R2. Quotations, items, families, and receipts were identical before and after retry. |
| Unchanged intentional save | An unchanged R2 edit created R3 with a new ID and reference. |
| Two editors | After R3 saved in one editor, the other editor's stale R2 save created nothing. Its losing notes and current-revision link remained visible at 390 pixels wide. The notes remained until tab cleanup. |
| Cancel and validation | Cancel preserved the exact saved R1. Missing client validation and a mobile zero-passenger validation created no revision. The mobile error kept the entered zero and showed At least 1 pax. |
| Reviewed replacement | Opening review created nothing and retained the entered RM 1,250 price. Explicit confirmation and Save created R4 at RM 5,000. Previous rows and items remained equal. |
| Historical links | Exact R0 review showed original notes and no edit link. Its edit URL rendered a read-only notice and offered the current editor, with no editable form. |
| PDF states | Fixture-injected pending and failed states displayed save success separately and blocked issuance. Actual public artifact retry returned ready without changing revision or receipt counts. |
| Missing original | The migrated legacy fixture naturally had no original artifact. Review showed unknown provenance, no retry/download action, and HTTP 409. |
| Exact download | The actual R0 download link produced 169,756 bytes with SHA-256 `89965b450108030d59ef8bc7fe1cfab1e2fea0fb37c6166d23d3989c75859160`, matching the authenticated bytes recorded before later edits. |

[Browser observations](browser-proof.json), [saved row projection](final-ui-dump.json), [persistence comparisons](persistence-checks.json), and [actual browser download](r0-issued.pdf) contain synthetic records only. The row projection omits embedded PDF image input and records its hash instead.

The lost-response fixture changed only the disposable HTTP adapter after commit. [The injected return branch](lost-response-hook.txt) returned 503 once per request key after the actual mutation succeeded. It was removed before unchanged, stale, and replacement checks. Pending/failed status injection used a disposable internal mutation. These injections establish UI recovery behavior, not an organically observed renderer failure. Ready-state terminal behavior remains covered by actual backend handler tests.

## Automated and transaction checks

All 651 repository tests passed at the combined product source. Application typecheck and explicit backend typecheck passed. The quotation integrity checker passed 864 legacy and 864 revision cases, with zero adapter errors and all six guard mutants detected.

[Historical backend results](final-history-backend.json) passed on ports 14275/14276. They exercise actual public saves, exact old reads, reviewed refresh, immutable prior rows, stale/catalog/source-item rejection, writer barriers, and rollback. The history checker copies both PDF dependencies and #60's shared current-family reader into its temporary source.

[The unchanged ordinary PDF fixture rerun](final-pdf-backend-rerun.json) passed on ports 14265/14266 with exit zero. [The preceding failure log](pdf-fixture-first-failure.log) is retained. That first run failed after restoring intentionally malformed test input; its underlying worker exception was not retained, so its exact cause remains unknown. A separate diagnostic captured a valid claimed artifact failing with `TooManyWrites` at the local 4 MiB-per-second write limit. [Diagnostic error and attempts](pdf-budget-observation.json) retain that observation. It does not establish the first failure's cause. No broad retry wrapper or PDF product reset was added.

The reusable [fixture instructions](../../../scripts/revision-ui/README.md) require an explicit external run directory. Focused tests reject `.next` descendants before reading private state or starting a backend. The complete generated-JWT signup/seed/migration/cleanup cycle also passed with hostile inherited CLI deployment variables, using only the guarded owned backend.

## Media and baseline scope

- [Desktop saved R1](revision-r1-desktop.png) shows the new reference, source, saved content, and separate PDF state.
- [Mobile stale draft](stale-editor-mobile.png), [mobile history](history-mobile.png), and [mobile validation](validation-mobile.png) show actual 390-pixel layouts.
- [PDF state recording](pdf-states.mp4), [lost response recording](lost-response-retry.mp4), and [missing original](missing-original-desktop.png) show the real app states.
- [Baseline browser proof](browser-baseline-proof.json) and [baseline mutation proof](baseline-overwrite.json) came from the coordinator's synthetic run at `3d18ab73179abc8a4d1d6407c0e6b65d7bc9a3da`, localhost 3500/backend 3510. Images alone do not prove overwrite. The first notes had already changed through a handler probe before the later browser save. Those records are separate from this run.

## Decisions, review, and cleanup

Two independent designs compared a separate revision editor with an in-place builder session. The existing layout won. The separate design contributed the frozen serialized attempt boundary. Model the Domain shaped explicit intent and session states. Make Operations Idempotent shaped receipt recovery. Prove It Works required real browser saves, second views, reloads, and downloaded bytes. Separate Before Serializing Shared State shaped isolated ports and browser ownership.

Fresh independent review found the wrong sign-in route and blocked legacy receipt recovery. Both were corrected before final browser proof, with focused tests. The coordinator independently reviewed corrected product source. Comment review found no added comments or suppressions to remove. Deslop/control skills were unavailable. Direct cleanup and real browser checks were used. The configured Codex-only policy excludes a different-family judge.

[The decision trail](decisions.tsv) records the run. [Cleanup](cleanup.json) records backend shutdown and private-state removal. Owned web port 3530 and backend ports 13865/13866 were confirmed closed. All three owned T3 preview tabs were closed. The disposable source, database, storage, account, JWT, and signing-key files were removed. The native fallback window contained a user PR tab, so it was preserved when AX became unavailable. The coordinator was notified. Baseline fixture cleanup remains with its coordinator owner.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Local write pressure can fail a claimed PDF job. | The artifact needs an explicit retry. The captured diagnostic exceeded the local write budget. | Burst fixture saves and background PDF writes exceed 4 MiB per second. | Reproduced intermittently locally. | Verification operators and staff under equivalent limits. | Runtime limit handled by failed-state UI. |
| The first ordinary fixture failure has incomplete cause evidence. | It cannot be attributed to the later captured quota error. The unchanged rerun passed. | Assess only the first failure log. | One recorded run. | Reviewers. | Evidence limit. |
| Shared deployment and release activation remain outside this run. | Local proof does not establish hosted execution or production migration safety. | Deploy or activate the release. | Environment dependent. | Release integrators. | #61 integration boundary. |
