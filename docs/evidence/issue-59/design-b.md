# Candidate B. A revision editor owns a save session

## Problem

Every deliberate Save must append an immutable revision. A transport retry must replay the same frozen command. The existing builder owns both form presentation and legacy persistence and derives its edit package from the live catalog. Its current create attempt retains only a key. Separating the revision session prevents those legacy assumptions from becoming revision policy.

## Usage

The create and edit pages choose the revision editor only when the backend exposes the enabled revision release. The existing builder remains the inactive legacy path.

```tsx
return revisionRelease.enabled
  ? <RevisionEditor seed={{kind: 'create', clients, packages}} />
  : <QuotationBuilder initialData={null} allPackages={packages} allClients={clients} />;
```

The edit loader rejects historical editing before rendering an editor. It renders an exact saved reference, an explanation, and a link to the current edit URL. It never redirects automatically or creates an editor based on an old record.

```tsx
if (source.revision_context.state === 'historical') {
  return <HistoricalEditNotice source={source} />;
}
return <RevisionEditor seed={{kind: 'append', source, clients, packages}} />;
```

The editor presents the existing form layout through a shared field view. The editor owns its own form schema, session and commit function. The common field view receives form controls and available options, but cannot save or refresh snapshots.

```tsx
const editor = useRevisionEditor(seed);
return <QuotationFields form={editor.form} options={editor.options}
  onReviewReplacement={editor.reviewReplacement} onSave={editor.save} />;
```

## Shape

```ts
type EditorSeed =
  | {kind: 'create'; clients: ClientOption[]; packages: PackageOption[]}
  | {kind: 'append'; source: ExactEditRecord; clients: ClientOption[]; packages: PackageOption[]};

type SourceRoom = {
  sourceItemId: string;
  roomType: string;
  price: number;
  pax: number;
};
type SelectionDraft =
  | {kind: 'retained'; rooms: SourceRoom[]; saved: SavedSelection}
  | {kind: 'replacement'; reviewed: ReviewedSelection; rooms: ReplacementRoom[]};
type SaveSession =
  | {kind: 'editing'}
  | {kind: 'pending'; attempt: FrozenAttempt}
  | {kind: 'uncertain'; attempt: FrozenAttempt; message: string}
  | {kind: 'rejected'; category: 'stale' | 'selection' | 'validation' | 'auth'; message: string}
  | {kind: 'saved'; revision: SavedRevision};
type FrozenAttempt = Readonly<{requestKey: string; body: string}>;
type SavedRevision = {id: string; fullReference: string};

function createAttempt(draft: ValidRevisionDraft, source: EditorSeed): FrozenAttempt {
  throw new Error('not implemented');
}
async function commitAttempt(attempt: FrozenAttempt): Promise<CommitResult> {
  throw new Error('not implemented');
}
```

The domain shape is the selection intent and save session, per Model the Domain. `SourceRoom` IDs remain in the revision editor schema and never pass through the existing schema which strips unknown fields. A retained selection renders saved package, flight, hotel and room values. Current catalog data appears only in the replacement review. Opening that review never commits or replaces the draft. A separate explicit confirmation installs the reviewed replacement context and its entered prices.

The receipt owner serializes the command exactly once at the first valid Save. Pending blocks another submission. Uncertain offers Retry this save and reuses the same serialized body. The editor must not allow a new edited payload to reuse that attempt key. Inputs can remain visible, but the retried payload is frozen and the UI labels the pending attempt. A distinct intentional save gets a new key only after a definite rejection or completion. A stale rejection preserves all form values and exposes View current in another tab. It never refreshes the editor seed automatically.

The API accepts create/append `command` under the existing HTTP routes, validates boundary shape, calls `quotationRevisionSaves.save`, and returns the saved ID and full reference. It preserves legacy request handling while inactive. The response parser returns the actual result for both routes. It never substitutes the source qid. Auth and validation rejection create no revision. Lost successful response creates one revision and receipt replay navigates to that original result.

`SavedRevisionPanel` owns the read-only saved view and PDF status for modern family records. It always displays exact reference, saved status, actor, issue instant in Asia/Kuala_Lumpur, family creation separately, source reference and current/historical state. It shows unknown legacy provenance without claiming complete history. An authenticated status subscription drives pending/running/failed/ready/missing_original. Failed retry calls only `quotationPdfArtifacts.retry`. Ready links to `/api/quotations/[qid]/pdf` and its attachment variant. Missing original offers no regeneration. The inactive legacy viewer stays available only for legacy records. The saved business summary remains usable on mobile even where inline PDF embedding is unavailable.

`/quotations/[qid]/history` resolves family through exact details, calls #60's history query, and renders ascending immutable rows with exact review links. It has no writer and does not duplicate #60's backend. History rows can render status per row as needed, but avoid a subscription for every row unless visible.

## Module map

- `revision-editor.tsx` owns modern form/session state and replacement review.
- `revision-editor-model.ts` owns draft types, command creation and session transitions.
- `QuotationBuilder.tsx` exports or consumes reusable field layout. Legacy persistence remains there while inactive.
- `save-quotation.ts` owns HTTP result parsing and exact serialized retry transport.
- Existing create/update routes adapt authenticated HTTP to actual save commands.
- `saved-revision-panel.tsx` owns exact saved summary and preserved PDF state.
- Edit/review/create/history pages choose explicit modes and load in parallel.

## Interface depth

The page chooses one editor from a single seed. Form fields know nothing about keys, receipt replays, family pointers or PDF jobs. The session hides those invariants. This is deeper than adding a set of optional callback props to the builder, which would make every caller coordinate the protocol. The main cost is extracting shared layout from a large component. The editor and the legacy builder must not each copy the full form markup.

## Synthesis decision

Pending parent comparison with candidate A. No cross-family judge is available under the configured Codex-only policy.

## Tradeoffs accepted

- We accept a larger initial layout extraction in exchange for a modern editor that cannot accidentally call legacy overwrite or ID-only refresh.
- We accept separate modern and legacy persistence while the release is inactive. The modern path has one save command and one session owner.
- We accept a locked retry attempt after an uncertain response. Staff retain entered values and can resolve the original attempt without creating a duplicate.

## Alternatives considered

A single builder with optional revision context and branching submit/refresh handlers minimizes markup changes, but exposes protocol policy alongside catalog state and navigation state in the largest component. It is viable if it still centralizes the command/session boundary and never derives retained content from live options.

A separate page-sized editor with copied form markup was rejected. Two copies would drift on pricing, validation and accessibility and would make ordinary field changes require coordinated edits.

## Open questions and risks

Can the shared field extraction remain mechanical enough to preserve the accepted UX and current validation behavior? If the extraction starts changing field behavior, prefer candidate A's smaller integration with the session boundary grafted in.

Can the backend expose release readiness through an existing read contract? No client-only feature flag should activate writes or silently fall back to legacy behavior for family records.

## Next implementation step

Implement command serialization and receipt retry behavior with focused observable transport tests, then choose the smallest field extraction supported by the current builder.
