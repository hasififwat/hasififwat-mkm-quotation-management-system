# Candidate B. Inventory manifest, then apply.

## Problem

#55 gives future saved revisions a stable family while preserving every existing quotation ID, business field, item, log and create receipt. Current create allocates max living quotation sequence plus one. Delete can remove that maximum. Existing update, refresh, repair, resequence, client merge and creator migration can change rows. An unlocked multi-batch migration cannot claim stable classification.

## Usage

An internal operator runs `inventoryPage({table, cursor, limit})` without writes. It returns classifications and source fingerprints. The operator reviews ambiguous groups and unknown historical facts.

For a later reviewed cutover, `beginMigration({expectedRelease: 1})` creates an exclusive migration state. It is unavailable while a compile-time release gate is false. This PR leaves that gate false. Tests exercise real handler logic with an explicit fixture release override supplied through the module loader, never a public request argument.

`stagePage({runId, expectedCursor, limit})` writes immutable inventory entries and advances the persisted checkpoint in the same transaction. `applyPage({runId, expectedCursor, limit, dryRun:true})` previews changes without advancing. The same call with false applies already staged, unambiguous entries. `reconcilePage({runId, cursor, limit})` verifies exact membership and source preservation. No finish API unlocks legacy writers in #55.

## Shape

```ts
type Family = {
  base_year: string;
  base_sequence: number;
  current_revision_id: Id<'quotations'>;
  archived: boolean;
  created_at: string;
};
type RevisionIdentity = {
  family_id?: Id<'quotation_families'>;
  previous_revision_id?: Id<'quotations'>;
  history_provenance?: 'legacy_unknown' | 'native';
  saved_by?: string;
  issue_date?: string;
  snapshot_completeness?: 'complete' | 'partial' | 'unknown';
  document_schema_version?: number;
};
type Run = {
  key: 'quotation-family-v1';
  phase: 'staging' | 'blocked' | 'applying' | 'reconciling' | 'complete';
  stage_cursor: string | null;
  apply_cursor: string | null;
  staged: number;
  applied: number;
  blocked: number;
};
type Entry = {
  run_id: Id<'quotation_family_migrations'>;
  quotation_id: Id<'quotations'>;
  source_fingerprint: string;
  classification: 'singleton' | 'already_migrated' | 'ambiguous' | 'invalid';
  findings: string[];
};
type Allocation = {year: string; high_water: number};
```

The domain structure is an explicit run state machine plus an immutable per-row manifest. Model the Domain selects state transitions rather than independent booleans. Make Operations Idempotent selects source comparison and goal-state reconciliation rather than blind insert or cursor increments.

Keep `revision` as the existing number. Never reset nonzero values. A singleton nonzero revision can become a singleton family with `legacy_unknown` history and absent predecessor. It must not claim that prior revisions were recovered. A base shared by multiple legacy rows is ambiguous even when revision numbers differ. Matching client, package, amount or timestamps cannot establish ancestry. Identical year/sequence/revision rows are a duplicate collision. Both conditions block apply of the whole run.

A family stores only immutable identity and mutable operational state. Artifact generation state belongs in a future separate table. Missing issue date remains absent. Legacy `created_at` must not be presented as a proven issue date. Legacy `created_by` may be copied to a clearly named source actor field with unknown provenance, or left unclaimed. Schema version zero means legacy unknown document schema, never a fabricated renderer version.

## Modules and signatures

- `convex/lib/quotationFamilyModel.ts` owns pure classification, stable source fingerprint and metadata derivation.
- `convex/quotationFamilyMigration.ts` owns internal inventory, begin, stage, apply and reconcile handlers. Boundary Discipline places cursor, limit and phase validation here.
- `convex/lib/quotationWriteGate.ts` owns one inactive release flag and transactionally reads the migration singleton. Every existing quotation writer calls it after authentication and before data mutation.
- `convex/lib/quotationFamilyIdentity.ts` owns `reserveBase(ctx, year)` and `assertRevisionVacant(ctx, familyId, revision)` for #56. The caller cannot choose a base number.

Indexes include families by `(base_year, base_sequence)`, `(archived, updated_at)`, quotations by `(family_id, revision)` and `(hijri_year, sequence_num, revision)`, manifest by `(run_id, quotation_id)`, migration by key and allocation by year. Existing receipt `(actor, request_key)` remains untouched. A future revision receipt table has `(actor, request_key)` and family ID, with its own request/result contract in #56.

All insert paths read the relevant indexed range and reject duplicates inside their mutation transaction. `.unique()` checks existing uniqueness but cannot substitute for a prior indexed absence read. Convex transaction conflict/retry semantics then serialize competing inserts. Real backend tests are required to claim that concurrency behavior.

## Inventory and reconciliation

Paginate quotations and items separately. For each quotation, use indexed base lookup to classify collisions. Bound that lookup with `take(2)` when only ambiguity detection is needed. Inventory includes archived state, nonzero revision, missing package/flight/hotels/rooms snapshot, missing client/package/flight/room live references, invalid base identity, existing inconsistent family IDs, orphan items and orphan logs. Store issue codes, not raw customer data in evidence.

Stage only after the write gate is closed. Every quotation and relevant dependency writer must stay closed or reconciliation must deliberately treat missing-live-reference findings as observational rather than source fingerprint changes. Packages do not rewrite saved quotation rows, but live-reference inventory can change if package writes remain open. Do not use live references to reconstruct snapshots.

Apply one manifest entry per bounded transaction or bounded small batch. Re-read its current quotation and exact stable fingerprint. Insert family only for an absent base reservation, patch only additive identity/provenance fields, update high water using max, then checkpoint atomically. An existing matching family and metadata is a no-op. Any mismatched partially populated identity blocks instead of repairing by guess.

A retry with an old expected cursor returns the committed progress or a checkpoint conflict. It never applies the next batch accidentally. Reconcile checks exact family/reference equality, one current member, unique revision per family, monotonic high water and unchanged business fingerprints. Items, logs and receipts remain byte-equivalent because no migration path touches them. Fixture tests compare all tables before and after, excluding additive fields and new family/migration/allocation tables.

## Allocation

Seed each year's allocation from all legacy references, retained families and create receipt results. Receipts can retain a deleted issued number absent from quotations. Never lower or delete a high-water row. Normal create should use this allocator even before revision activation if sequence reuse must stop in this ticket. This changes allocation only, not family/revision save behavior. Existing receipt replay returns before allocating. Revision append in #56 uses the family base directly and never calls reserveBase.

## Synthesis decision

Candidate A selected by the parent. See README.md for synthesis and verification. This candidate intentionally stores a manifest, unlike indexed immediate per-row apply. It trades extra tables and staged state for explicit reviewable inventory tied to one stable data epoch.

## Tradeoffs accepted

We accept an exclusive write pause during migration in exchange for stable inventory and bounded restartable application. We accept a larger migration-specific schema in exchange for durable per-row evidence. We accept unknown legacy history in exchange for truthful provenance.

## Alternatives considered

Immediate indexed classify-and-apply is smaller and can remain correct under a write gate. It hides fewer migration steps but has no durable reviewed manifest. Fully online dual writes require multiple legacy writers to maintain new membership before consumers are ready and create partial activation risk. Content-based grouping fabricates history and is rejected.

## Open questions and risks

No operator product decision is needed for #55. Cross-family judging is unavailable under project model policy. A migration gate cannot be safely opened again until #56 and #57 replace or block legacy overwrite paths. This PR should expose no unlock handler. The fixture suite can prove registered handler behavior, but a disposable Convex backend is needed for transaction conflicts and rollback claims.

## Next implementation step

Implement schema and the pure classifier, then prove read-only inventory against colliding and incomplete fixtures before wiring internal checkpointed application.
