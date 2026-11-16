# Rehearse and operate the quotation family cutover

Staff need every intentional Save to preserve earlier quotation content and exact issued PDF bytes. Use this procedure for a separately authorized cutover. This PR authorizes disposable rehearsal only. Shared deployment, production migration, release activation, merge, and retention deletion remain unauthorized.

## Record the deployment pair before any write

Record the frontend deployment ID, immutable build SHA, backend deployment name and function SHA, operator, timestamp, and rollback deployment. Record browser `NEXT_PUBLIC_CONVEX_URL`, server `CONVEX_URL`, backend `CONVEX_SITE_URL`, and frontend origin. Browser and server must address the same backend. Next.js embeds the public URL at build time. Changing runtime environment values alone does not change an existing browser bundle.

The #61 disposable reservation is web `http://localhost:3540`, backend `http://127.0.0.1:13965`, and auth site `http://127.0.0.1:13966`. These are local rehearsal addresses. Production deployment identifiers and production data quality remain unknown until an authorized operator records them. Never infer either from local success.

Use the integrated schema, artifact scheduler, Node worker, HTTP route, readers, family lists, and UI from one verified commit. Preserve `convex.json` external package configuration and renderer assets. Do not deploy a frontend pointing at an older backend. Do not start the normal multi-process development command against shared configuration. Inventory and stop old watchers, maintenance jobs, and deployment automation before cutover.

## Preserve a recoverable baseline

1. Use a private operator workspace. Keep credentials, signed URLs, database snapshots, and storage inventories out of Git and PR media.
2. Export all tables and file storage with `convex export --include-file-storage --path <private-snapshot.zip>` against the explicitly recorded backend. Hash the archive and each extracted file. Record every storage ID, byte length, and SHA-256. An export without file storage is insufficient.
3. Restore into a separate isolated target with compatible schema and auth configuration. Verify retained quotation IDs, references, items, logs, receipts, family pointers, PDF artifacts, attempts, and storage IDs. Download ready PDFs through an authenticated application route and compare bytes with the baseline.
4. Keep the original target unchanged during this restore check. Keep the export until retention is separately approved. Local rehearsal does not establish production restore capability.

## Inventory before freeze

Page `quotationFamilyMigration.inventory` with `cursor: null`, then each returned `continueCursor`, and `limit` from 1 to 50. Inspect quotations, quotation_items, quotation_logs, quotation_create_receipts, and quotation_families. Keep each page and the source SHA.

Stop on ambiguous shared base references, duplicate references, partial membership, inconsistent family pointers, receipt mismatches, or orphan ownership. Do not coalesce rows automatically. A singleton R3 retains R3 and unknown predecessors. Missing live references, snapshots, room labels, or original PDFs remain explicit gaps. Do not reconstruct predecessor quotations or label a new legacy reconstruction as an originally issued PDF.

The migration classifier describes legacy singleton rows. It is not a modern family invariant checker. After modern revisions exist, multiple rows with one base reference are expected.

## Freeze and inventory again

1. Keep `quotation_revision_release` absent or disabled. There is no product enable endpoint in this work.
2. Call internal `quotationFamilyMigration.freeze` with acknowledgement `Reviewed cutover write freeze`.
3. Confirm the permanent `family-v1` record exists. Never delete it during rollback.
4. Repeat the complete inventory under freeze. Compare with the initial export and inventory to detect writes that committed before freeze. Export again under freeze if the retained state changed.
5. Attempt old-client create, update, ID-only refresh, archive, resequence, deletion, flight repair, and creator maintenance. Require rejection with unchanged retained business rows. Receipt replay may return an already committed exact result. It must not add a row.
6. Account for in-flight HTTP calls. A pre-freeze transaction can commit before the freeze serializes. The second inventory must include it. A retry with the same command and key returns the original result. Never replace an uncertain retry with a fresh key.

If any alternate writer remains open, stop with writes closed. Do not proceed on the assumption that staff will avoid the old client.

## Backfill in bounded transactions

1. Run a dry run with an explicit cursor and limit. Inspect all blockers before writes.
2. For the first write batch, pass `expectedCursor: null`, a limit at most 50, and `dryRun: false`.
3. Persist the returned cursor and changed count. For each next batch, pass that exact cursor. Continue until `done: true`, including an empty terminal page when required.
4. If a batch fails, record its error and query the persisted state. The failed transaction must leave membership, counters, and checkpoint unchanged. Resolve data ambiguities through a separately reviewed plan. Resume from the persisted checkpoint.
5. Before release and before any modern append, rehearse a completed scan with `restart: true`. Require zero changed rows and identical retained business hashes. A completed default call with the correct checkpoint must also change nothing.

Never use `restart: true` after modern saves begin. Never run the legacy classifier to repair a legitimate modern family. The restart algorithm assumes singleton migration metadata and can flag modern revision membership as ambiguous.

## Verify the integrated release candidate

Use a real password sign-in and generated disposable signing keys. Admin test identity and registered-handler fixtures do not prove JWT validation. Check anonymous, expired, invalid, signed-out, and permitted authenticated calls.

Exercise pre-migration compatibility, frozen incomplete migration, completed migration with release disabled, and active disposable release. Also set release enabled with absent or incomplete migration in an owned fixture. Require every gated write to reject. Read-only edit capability is not release authorization. Create and edit must show maintenance or inactive state, and must never fall back to overwrite after freeze.

For active disposable release, save R0, R1, and R2 through the app. Reopen from a second view and reload. Verify exact old review URLs and history, distinct IDs, stable base, and unique revision increments. Require one winner for simultaneous different saves on one base, exact replay for the same key, and a new revision for unchanged content with a new key. Preserve a stale editor draft. Cancel and invalid input must add no revision.

Check pending, failed, retry, ready, and missing-original PDF states. Inject mutation failure, failure after storage, and lost HTTP success. Require rollback or artifact reconciliation without duplicate revision, current pointer, receipt, or authoritative artifact.

Hash earlier complete quotation rows, owned items, saved statuses, actors, frozen documents, and downloaded PDF bytes. Repeat after retain and replacement edits, reviewed refresh, catalog and profile changes, canonical client association, archive, and denied maintenance. Template changes must not change ready bytes.

Use `scripts/check-revision-invariants.mjs <extracted-export-directory>` for read-only modern row checks. Compare export hashes and downloaded bytes separately. Check more families than one list page, several revisions per family, search, package and canonical client filters, totals, usage, archived exact links, and one operational current row per family.

Run the complete test suite, application and backend TypeScript checks, production build, the 1,728-case actual-handler checker with all six guard mutants, and the real backend checks against the exact combined sources. Record the exact commit and source digests. Capture synthetic desktop and mobile media, relevant validation states, URLs, second-view persistence, reload, and cleanup. Attach media that renders on GitHub. Require fresh independent review before a ready PR.

## Stop and roll back safely

Stop if deployment pairing is unknown, export or restore fails, a checksum changes, an invariant fails, old writers remain open, auth boundaries fail, or required integrated evidence is missing. Keep revision writes disabled. Preserve all saved rows, original storage, and receipts for investigation.

Rollback the frontend only to a compatible history-preserving client, or keep the application in maintenance. A backend rollback must retain the permanent legacy freeze and immutable readers. Never restore an overwriting handler with writes open. Never delete the migration record to unblock an old client. Never replace newer saved data with a pre-cutover export as an automatic rollback.

Activation requires separate operator authorization and an approved mechanism. This runbook adds no enable endpoint. Closing revision release after activation must keep the legacy freeze permanently effective. Reads and exact issued PDF retrieval remain available through the compatible backend.
