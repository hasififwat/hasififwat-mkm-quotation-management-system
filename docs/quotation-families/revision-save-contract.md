# Atomic revision save contract

Staff need every intentional saved edit to preserve earlier quotation content and exact issued PDFs. Ticket #56 adds an inactive atomic save command. It does not enable the UI or issue PDFs.

## Command and release boundary

`quotationRevisionSaves.save({command})` authenticates before any database lookup. `SaveCommand` is a discriminated create or append command. Every command requires a UUID v4 request key, preparer name, branch, notes, client intent, selection intent, and extras intent. Append also requires typed family, source revision, and expected current IDs.

`quotation_revision_release` has no writer endpoint. The default is closed. New saves also require the permanent family migration freeze and a completed migration. Ticket #61 owns enabling the gate after reader, writer, PDF, and UI integration. The existing legacy writer freeze is unchanged. Legacy create receipts continue to replay through the original endpoint.

A committed actor/request receipt resolves before release, current-pointer, or catalog checks. Its canonical content includes operation, identity, expected current, and selection intent. Reusing a key with different content conflicts. A distinct key represents a distinct intentional save, including unchanged content.

Append requires both source and expected current to equal the family current pointer. A stale request fails with `QUOTATION_STALE_EDITOR` and commits nothing. Callers retain their local draft and reconcile against the current revision. There is no restore or branch operation.

## Saved selections and business values

Create requires replacement client, selection, and extras. Retained values are available only for append. Client retain preserves the saved name and contact. Selection retain preserves saved package, flight, hotels, and room associations without consulting live catalog rows. Optional retained room edits name exact source item IDs and supply intentional price and quantity values. Omitting those edits copies all saved room lines. Extras retain copies saved extra lines.

Replacement selection requires a current `quotationSelectionContext`, available package and rooms, and a dated flight in that package. Replacing with the same IDs is an explicit refresh. The command preserves submitted reviewed prices and never substitutes catalog prices. Prices require at most two decimal places, quantities require positive integers, and totals use safe integer cents.

One mutation inserts the new quotation, its own items, audit entry, and receipt, and advances the family pointer. Initial revision is zero. Append reuses the original year and base sequence. Only independent create reserves a base number. New rows start draft. Previous rows, statuses, and items remain unchanged. Readers derive historical state by comparing the exact revision ID with the family pointer.

## Frozen document extension for #58

`FrozenQuotationDocumentV1` is exported from `convex/quotationRevisionSaves.ts`. Each revision persists this versioned object as `frozen_document` JSON. It contains the exact reference, issue date, actor, saved status, client name and phone, preparer name and branch, package, itinerary including return flight, hotels and meals, notes, line descriptions, room associations, prices, quantities, and total.

The contract contains business values for a future authoritative PDF job. It is not a renderer input adapter, PDF job, or storage artifact. Ticket #58 must consume these exact saved values and implement durable authoritative document storage. The contract does not prove exact issued PDF preservation yet.

Retained legacy gaps remain absent or null. Snapshot completeness stays partial or unknown. Legacy provenance carries through every descendant. No present-day fallback fills missing historical facts. New actor attribution does not inherit the previous preparer's profile ID.

## Decisions and verification

Two independent architect candidates explored a single discriminated command and separate create/append endpoints. The single command won because both operations share the same actor/key namespace and commit boundary. Explicit retain/replace intent and exact source-item ownership were retained from both candidates. The configured Codex-only policy excludes a cross-family judge.

Model the Domain shaped the command union and retained selection ownership. Prove It Works required a disposable real Convex transaction run in addition to registered-handler fixtures. The throughput unit is the inactive save boundary. Schema and quotation writes have one owner. Design and review helpers read independently.

Independent review found legacy provenance lost on a second append and incomplete prior-row comparisons in the backend fixture. Both were corrected, with a regression test and comparisons of every earlier row and item. No added comments or suppressions required removal. Deslop and control tools were unavailable. Direct cleanup and independent review were used.

Run `pnpm typecheck`, `node --test scripts/*.test.mjs`, and `node .agents/skills/verify-quotation-integrity/scripts/check.mjs --self-test`. The checker covers 864 existing legacy cases plus 864 new create/append replacement cases. It requires positive authenticated witnesses, rejects unexpected adapter errors, and tests six actual guard mutants. It does not establish live auth token validation or unbounded correctness.

Run `FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/revision.json node scripts/check-revision-backend.mjs`. This uses isolated ports 13465 and 13466, a temporary database, synthetic records, and the real public mutation with an admin test identity. Simultaneous saves bypass the HTTP client's queue. The fixture proves sequential revisions, unchanged save, receipt replay, conflicting payloads, distinct-request races, independent families, unavailable retention, and rollback after all save writes. It removes its process and database in `finally`. It never reads project credentials or touches shared deployments.

## Recorded run

The contract commit is `41438191bc23a1f1e3c4eb8c18cb920790994196`. The expanded verifier commit is `7d5d6e473a423b0004e4b566c30a334b58e706ab`. That source passed typecheck, all 601 repository tests, the 1,728-case combined handler checker with six detected guard mutants, and the real backend fixture. The backend runtime was Node v24.19.0 and Convex 1.45.0 at `http://127.0.0.1:13465`. Ports 13465 and 13466 and its temporary database were removed after the run.

[Backend results](revision-backend-evidence.json), [handler results](revision-integrity-evidence.json), and [backend evidence image](revision-backend-evidence.png) record the run. Generate the image with `python3 scripts/render-revision-evidence.py`. The image displays the executable fixture's actual results. It is a report image, not a browser screenshot.

The first attempt to save mutant reports directly under this documentation directory created temporary TypeScript sources that entered the repository typecheck. Those scratch files were removed, and typecheck and the full test suite passed again. Keep checker scratch output under `/tmp` when reproducing verification, then copy only the JSON report here.
