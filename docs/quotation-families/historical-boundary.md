# Historical quotation boundary

Staff need saved edits to preserve every earlier quotation and issued PDF. Ticket #57 makes the saved business document the historical read contract and closes the alternate writers. Ticket #58 owns PDF bytes. Ticket #61 owns release activation. No new UI flow is enabled here.

## Saved content and current context

`readSavedQuotation(quotation, items)` accepts no catalog or profile records. A supported frozen document supplies its saved business values. Its required scalars, nested snapshots, and lines are validated at runtime. Malformed or unsupported frozen JSON rejects the read. Frozen lines must match the revision's own persisted items. A legacy revision uses its direct fields, snapshots, and item descriptions. Missing facts remain absent or null. `unknown_fields` and `legacy_unknown` provenance identify those gaps. Current catalog values never fill the historical document.

`getQuotationFullDetails` returns `saved_document` alongside the existing historical display fields. Saved room descriptions supply the room labels. Its historical `package.available_rooms` and `package.available_flights` arrays are empty. Current replacement choices are explicitly separated under `replacement_catalog`. Staleness diagnostics describe the current catalog and may change without changing the saved document. The document and the historical display fields remain stable when live client, package, room, flight, hotel, meal, or profile records change.

Quotation lists and client history summaries use saved package and flight snapshots for family revisions. Missing family snapshots produce unknown values. Pre-migration list compatibility can still return current catalog summaries, labelled `package_provenance: live_catalog`. Those summaries are not original document evidence. Modern snapshot summaries are labelled `saved`, and missing modern snapshots are labelled `legacy_unknown`. Ticket #60 owns family grouping, pagination, operational totals, and archive behavior.

## Edit contract for #59

`getQuotationForEdit` returns `saved_document`, `revision_context`, and `selected_rooms[].source_item_id`. The item ID belongs to that exact source revision and is required for retain-mode price or passenger edits. Each revision owns different item IDs.

`revision_context` contains typed `family_id`, `source_revision_id`, `current_revision_id`, and `expected_current_id`. Its state is `legacy`, `current`, or `historical`. `can_append` is false for legacy, archived, and historical records. The release gate remains an independent requirement. Old review IDs return their exact saved revision. Old edit IDs identify the newer current revision. A caller must direct staff to that current revision. There is no restore or branch operation.

`family_created_at` identifies the earliest retained family revision. `revision_issue_date` identifies the saved revision's issue instant and remains null when legacy history does not establish it. Business date formatting uses `Asia/Kuala_Lumpur`. The stored ISO instant is not replaced with a newly inferred legacy date. The PDF owner must format that saved issue instant in this business time zone.

## Reviewed refresh contract for #32 and #59

`quotations.refreshSnapshot({quotation_id, command})` accepts an append `SaveCommand` with a replacement selection. The quotation ID must equal `command.source_revision_id`. The command includes the family, source revision, expected current revision, request key, and reviewed catalog context. Prices and quantities are explicit reviewed business values. A caller preserving prices submits the source values. A deliberate price change submits the reviewed new values. Catalog prices never replace those submitted values.

The wrapper delegates to `saveRevision` without a catalog or stale-editor preflight. Actor-scoped committed receipts therefore replay before catalog, release, or stale checks. A successful refresh returns the same new-ID result as a revision save. Stale current pointers or catalog context reject with zero committed writes. Retry the same request key and command after uncertain confirmation. A new intentional save needs a new key.

The ID-only refresh payload remains supported only before the permanent family migration freeze. It rejects after migration, even if the revision release is later disabled. The existing frontend refresh flow is not migrated here. Ticket #59 owns the reviewed user flow.

## Client association contract for #60

`client_aliases` stores canonical navigation associations. Each alias references retained client rows. `canonicalClientId(ctx, clientId)` returns the final typed client ID and rejects cycles. To associate a family's current quotation with a client, resolve the current quotation's saved `client_id` through this helper. Never rewrite that saved ID or saved client name.

After a completed migration, `mergeClients` writes aliases through `associateClients`. It preserves duplicate client rows, quotations, items, references, names, and attribution. Chained merges resolve to the final canonical client. Self-selection, repeated duplicates, missing clients, and cycles reject. The result reports `associatedClients`, zero `relinkedQuotations`, and no `removedClients`. In-progress migration rejects merges. Pre-migration legacy merge behavior remains behind its existing gate.

Ticket #60 must resolve aliases when building family navigation and client aggregates. Existing historical client views remain attached to the original saved identity until that consumer work lands.

## Writer inventory

The permanent `family-v1` migration record rejects legacy create, update, ID-only refresh, resequence, delete, flight repair, archive, and creator migration. Existing create receipts still replay before the gate. Revision save is the only supported append boundary. The release record remains disabled by default and has no writer endpoint.

Update, refresh, resequence, delete, flight repair, archive, creator migration, and pre-migration client reassignment also reject a revision with a family, frozen document, or document version. That guard protects immutable rows even if a migration record is accidentally absent. Creator migration authenticates before database access. Profile edits do not supply historical preparer identity. Package reference and deletion guards remain unchanged.

`quotationFamilyMigration` is internal migration tooling. Its explicit freeze, inventory, and batch boundary remain the only allowed identity migration. It never invents prior revisions. There is no supported repair or cleanup endpoint that changes migrated revision business content.

## Verification

Run `pnpm typecheck` and `node --test scripts/*.test.mjs`. Compile the backend files explicitly because the application TypeScript configuration excludes `convex`.

```sh
node_modules/.bin/tsc --noEmit --skipLibCheck --moduleResolution bundler --module esnext --target es2022 convex/quotations.ts convex/clients.ts convex/profiles.ts convex/lib/savedQuotation.ts convex/lib/clientCanonical.ts
node .agents/skills/verify-quotation-integrity/scripts/check.mjs --self-test
FAMILY_BACKEND_BINARY=/path/to/convex-local-backend HISTORY_EVIDENCE=/tmp/history-backend.json node scripts/check-history-backend.mjs
```

The focused tests execute registered handlers. The real backend fixture uses ports 13565 and 13566, synthetic disposable records, and an admin test identity. It checks historical payloads and display fields after all live-source changes, exact old IDs, reviewed refresh, quoted prices, stale conflicts, receipts, source ownership, alias merges, and alternate-writer rejection. It also retains the prior concurrency and rollback checks. Its process and temporary database are removed in `finally`.

The fixture establishes local Convex transaction behavior. It does not establish production migration safety, real user token validation, browser persistence, or exact issued PDF bytes. The report image is a rendering of actual backend fixture outcomes, not a UI screenshot. No application UI or styling changes are included.
