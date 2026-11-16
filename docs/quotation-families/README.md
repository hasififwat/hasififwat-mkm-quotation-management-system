# Quotation family foundation

Staff need saved edits to retain earlier quotation content and exact issued PDFs. This foundation assigns family identity without enabling revision saves. Existing IDs and item ownership stay intact. PDF storage and immutable save enforcement belong to later tickets under #54.

## Contract for #56

`quotation_families` owns `hijri_year`, `sequence_num`, `current_revision_id`, and `archived`. Existing `quotations.revision` retains its issued value. Optional `family_id` and `previous_revision_id` identify membership and ancestry. `saved_by` and `issue_date` remain absent for legacy data. The migration sets `legacy_provenance` to `legacy_unknown`, `document_schema_version` to zero, and `snapshot_completeness` to `unknown`. It never claims legacy snapshots were complete or historically frozen.

`convex/lib/quotationFamilyIdentity.ts` exports `reserveBaseReference`, `assertRevisionVacant`, and `assertLegacyWritesAllowed`. Independent creates reserve a base sequence from retained counters, family references, living quotations, and receipt results. A revision must reuse the family's identity and must not call the allocator. Indexed absence checks run within mutation transactions. The vacancy helper does not insert a revision or enforce the future save protocol by itself.

The schema indexes support family history, archive lists, exact references, and existing create receipts. #56 owns the append request receipt contract. This PR does not provide an append mutation.

## Run the inventory

All migration endpoints are internal Convex functions in `quotationFamilyMigration`. Inventory accepts a table, nullable cursor, and limit from 1 through 50. Walk every page of `quotations`, `quotation_items`, `quotation_logs`, `quotation_create_receipts`, and `quotation_families`. Collect all blockers before planning cutover. Inventory is read-only and may observe changing data until the freeze.

Quotations report invalid identities, duplicate exact references, ambiguous bases, archive state, nonzero revisions, missing snapshots, missing items, missing live references, and inconsistent memberships. Related-table scans identify orphan references and invalid family pointers. A base shared by multiple rows blocks migration even when the revision numbers differ. Matching client, amount, or package never establishes ancestry. Singleton R3 remains R3 with unknown predecessors.

A quotation with more than 100 items blocks this bounded migration. A reviewed follow-up must inventory that record separately. Missing live references and snapshots are reported as gaps. The migration never reconstructs their content.

## Rehearse the backfill

Use a disposable backend for this ticket. Shared deployment, migration, and release cutover require separate authorization.

1. Read every inventory page and review blockers.
2. Call `backfill` with `expectedCursor` null and `dryRun` true. Dry run is the default. It writes nothing.
3. At a separately reviewed cutover, call internal `freeze` with acknowledgement `Reviewed cutover write freeze`. This persists the writer gate. There is no unlock endpoint in this PR.
4. Call `backfill` with the current checkpoint, a bounded limit, and `dryRun` false. The response supplies the next cursor. Checkpoint and membership changes commit together. Stale cursors reject.
5. Continue until `done` is true. A repeated completed call changes nothing. To scan all memberships again, pass `restart` true with a null expected cursor on the first call. Restart requires a completed scan.
6. Repeat inventory across every table. Require no blockers before any later release decision.

A blocked page commits nothing. Earlier clean batches may already be attached. The freeze remains closed while the operator resolves ambiguity. A completed quotation scan alone does not certify cutover, orphan cleanup, or PDF preservation. No endpoint in this PR enables revision saves or resumes legacy writers after backfill.

Create receipt replay remains available during the freeze because it returns the prior saved result without a write. New creates, updates, refresh, resequence, delete, repair, archive, client merge, and creator migration reject after freeze. Live package data can still change. Inventory reports missing live data as observations and never uses it to rebuild saved data.

## Reproduce verification

Run `pnpm exec next typegen` before `pnpm typecheck` in a fresh checkout. Next generates the ignored image declarations.

Run `node --test scripts/quotation-family-migration.test.mjs` for registered-handler fixtures. Run `node scripts/check-family-backend.mjs` with `FAMILY_BACKEND_BINARY` pointing to a local Convex backend executable for real transactions. The script creates an isolated temporary project, binds loopback ports 13455 and 13456, deploys copied schema and migration modules, and removes the temporary database after stopping the process. It never reads project environment files. Set `FAMILY_EVIDENCE` to save the JSON result.

The real-backend fixture checks concurrent allocation, freeze rejection, migration restart, exact content and item identity, and failed-batch rollback. It uses the actual migration and allocator modules. It does not prove public authentication, browser behavior, exact issued PDFs, or the future append-save protocol. The focused registered-handler checks cover create replay and legacy writer gates. Fixture media shows backend evidence only.

## Design choice

The architect candidates are retained in `design-a.md` and `design-b.md`. Candidate A won on bounded work, fewer persisted states, and a smaller internal interface. Both reject inferred lineage and require a persistent freeze. Candidate B's receipt-aware allocation was retained. Its per-row manifest was rejected because the gated classifier and executable comparisons already provide reviewable evidence for this scope. Cross-family judging was unavailable under the project's Codex-only policy. Independent configured review remains part of verification.
