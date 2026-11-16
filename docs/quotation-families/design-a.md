# Candidate A. Indexed singleton migration

## Problem

The user needs #55 to establish permanent family identity while preserving exact saved quotation content and IDs. This change must leave existing save behavior inactive. Existing base references are not proof of a historical relationship, so two rows sharing a base must never be merged automatically.

## Usage

An operator calls internal inventory with a table cursor and a bounded page size. The result classifies every row on the page and returns the next cursor. Inventory never writes. An operator starts a frozen migration using an internal command. Backfill accepts the stored checkpoint and defaults to dry run. Repeating the same backfill call either returns the recorded prior result or computes no changes from already attached membership. Reconciliation walks the same tables and proves family and revision invariants before any future cutover.

Example calls are `inventory({table: 'quotations', cursor: null, limit: 50})`, `backfill({cursor: null, limit: 50, dryRun: true})`, and `backfill({cursor: null, limit: 50, dryRun: false})`. Only the last requires a persisted write freeze. No command enables revision saving.

## Shape

`quotation_families` owns `hijri_year`, `sequence_num`, typed `current_revision_id`, `archived`, and creation metadata. Its compound base-reference index supports uniqueness checks with a two-row bound. The current pointer is required whenever a family is committed. A family and its first membership are inserted atomically.

Each quotation gains optional typed `family_id`, `previous_revision_id`, `document_schema_version`, and `migration_provenance`. Existing `revision`, `created_by`, `created_at`, items and snapshots retain their exact values. Provenance explicitly records unknown legacy history and unknown original issue date. The migration does not call `created_at` an issuance date. Snapshot completeness is a report of fields actually present, not a claim that legacy content was frozen. The future save API will supply known actor and issue date in a complete saved-document structure.

`quotation_reference_counters` owns a monotone high-water mark per year. Independent create allocation reads the unique year counter and retains the maximum existing reference as a rollout fallback. Backfill raises counters with `max` and never lowers them. Revision insertion uses the family's reference and consumes no counter.

`quotation_family_migration` is a singleton discriminated lifecycle with states `inactive` and `frozen`. It owns checkpoint and migration version. No public mutation changes this state. An internal start command freezes writers. A failure leaves the freeze in place for resumable work. This PR has no activation command and no revision append mutation.

`inventory` paginates quotations, items and families separately. Each quotation classification uses a compound `(hijri_year, sequence_num, revision)` index and a base-reference index with `.take(2)`. It reports duplicate exact references separately from ambiguous bases. Any base with more than one legacy row blocks migration. A singleton nonzero revision is valid inventory with missing predecessors explicitly unknown. Invalid integers or empty years block. Partial membership, mismatched family reference, pointer mismatch and duplicate family references block. Mixed archive state is visible for ambiguous groups. Items use typed table normalization and indexed quotation ownership to detect orphan references without scanning all quotations.

Live reference checks inspect package, flight, client and room IDs. Missing data becomes a reported legacy gap, never reconstructed business content. Snapshot checks include package, flight, hotels and room labels. Migration patches only new identity/provenance metadata and never refreshes snapshots.

Backfill processes only clean singleton identities. Dry run uses the exact same classifier and returns intended changes. An indexed uniqueness lookup immediately precedes insertion within the transaction. Existing membership must match family year, sequence, current pointer and revision uniqueness before it is treated as a no-op. Batch writes and checkpoint update occur in one transaction. Stale cursor attempts reject or replay prior result, rather than advance past unprocessed rows. Returning to the initial cursor is supported as a reconciliation rerun and produces zero writes.

The boundary is two internal registered operations plus one shared writer guard. Model the Domain shaped the persisted lifecycle and classification result instead of scattered booleans. Make Operations Idempotent shaped strict validation of existing membership before rerun no-ops. Boundary Discipline keeps all transport validation in registered handlers.

## Writer freeze

All quotation writers must read the persisted freeze in their transaction before writing. This includes create, update, refreshSnapshot, resequenceByCreatedAt, deleteById, repairStaleFlightIds, archiveQuotation, clients.mergeClients and profiles.migrateQuotationCreators. Create receipt replay happens before the freeze check because replay is read-only and must preserve the prior result. Authentication still happens first on existing authenticated handlers. The default missing state is inactive and retains current behavior. Migration writes require frozen, so running a backfill against ordinary live legacy writers fails closed. The singleton gate read also gives Convex OCC a shared dependency between freeze activation and already-running writes.

## Synthesis decision

Candidate A selected by the parent. See README.md for synthesis and verification.

## Tradeoffs accepted

- We accept rejecting all shared legacy base references in exchange for never fabricating revision lineage.
- We accept a deliberate write freeze during backfill in exchange for stable resumable membership and counters.
- We accept optional rollout fields in exchange for deploying schema before the guarded release.
- We accept multiple inventory pages in exchange for bounded reads and auditable checkpointing.

## Alternatives considered

An offline manifest can inventory all data and submit approved memberships. It handles explicit human resolution well but introduces signed manifest lifecycle, stale-data fingerprints and two representations of classification. A future reconciliation ticket may use it for ambiguous references. It is unnecessary for clean singleton migration.

Automatically grouping matching year and sequence hides ambiguity inside the migrator and invents history. It is rejected even when revisions happen to form a contiguous sequence.

## Open limits

Issued PDF bytes and complete frozen document snapshots belong to later tickets. No migration can recover overwritten historical content. Actual Convex transaction concurrency needs disposable backend proof; in-memory registered-handler fixtures establish classification, retry and unchanged content only.

## Next implementation step

Add the optional identity schema, compound indexes and inactive freeze guard, then test the shared classifier through registered inventory and backfill handlers.
