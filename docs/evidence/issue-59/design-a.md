# Candidate A. Revision command session inside the existing builder

## Problem

Every intentional save must create a new immutable quotation revision. The existing builder sends flat legacy payloads, keeps only a create request key, navigates edits back to their source ID, and derives the selected package from live catalog rows. The backend already supplies immutable source documents, exact item IDs, append commands, actor receipts and independent PDF artifacts. The frontend must express those existing distinctions without editing #60's listing schema or backend.

## Usage

The edit loader fetches the source document and current replacement catalog. It passes a revision edit context to the builder. A historical or archived source renders a read-only notice with an exact review link and, when appropriate, an edit-current link. It never mounts an editable builder.

```tsx
<QuotationBuilder revision={{ context, savedDocument, sourceRooms }} initialData={formData} />
```

The builder validates the entered values before creating an attempt. The command session owns the complete immutable attempted command. A retry invokes the stored command rather than rebuilding it from today's form values.

```ts
const attempt = beginRevisionAttempt(draft, revision, crypto.randomUUID());
const result = await saveQuotation({ command: attempt.command });
if (result.kind === 'saved') router.push(`/quotations/review/${result.id}?saved=1`);
```

The saved review displays business content independently of artifact readiness.

```tsx
<RevisionSummary details={details} />
<SavedQuotationPdf revisionId={details.id} />
```

## Shape

The command session is one discriminated state machine, per Model the Domain. It replaces the loosely related submitting/error/create-attempt flags for revision mode.

```ts
type RevisionSaveState =
  | { kind: 'editing' }
  | { kind: 'pending'; attempt: RevisionAttempt }
  | { kind: 'uncertain'; attempt: RevisionAttempt; message: string }
  | { kind: 'rejected'; message: string; conflict: 'selection' | 'stale' | null }
  | { kind: 'saved'; id: string; reference: string };

type RevisionAttempt = Readonly<{ command: SaveCommand; serialized: string }>;

type DraftSelection =
  | { mode: 'retain'; sourceRooms: SavedRoom[] }
  | { mode: 'replace'; catalog: QuotationPackage };

type RevisionDraft = {
  values: QuotationFormValues;
  selection: DraftSelection;
  clientMode: 'retain' | 'replace';
};

function beginRevisionAttempt(draft: RevisionDraft, source: RevisionEditContext | null, key: string): RevisionAttempt {
  throw new Error('not implemented');
}
```

An append loads in retain mode. Its room controls show the source revision's saved rooms and prices, even when current catalog entries vanished. Retain room edits supply source_item_id from the source model. Keep these IDs outside the current shared form schema, which strips unknown keys. Use exact source item ID ownership in the command construction. Existing room_type-based controls cannot safely represent duplicate saved room labels; the retained-room editor should key and bind by source_item_id. Replacement mode can continue the existing catalog room editor because the backend requires unique room_type in its reviewed package.

Opening review of the latest catalog must not itself replace saved selections. Display the catalog review and require an explicit Use reviewed selection action. Only that action changes the selection union to replace. The same package and flight IDs still require explicit replacement intent. Catalog refresh must preserve entered prices where the selected room survives. It must not call router.refresh or reset the entered draft. Refresh snapshot becomes the same reviewed replacement save command path, not an ID-only mutation.

For unchanged client identity use retain. An explicit client change uses replace. Extras can always be explicit replace because the builder owns entered names, prices and quantities. New create commands require replacement for client, selection and extras.

Freeze the complete command after validation and before the first HTTP call, per Make Operations Idempotent. Disable form editing while pending. An uncertain result retains the exact command and request key. A Retry save button retries that command even if the form remains visible. A newly validated intentional save after a definite rejection may use a new key. Never silently create a fresh attempt when the previous result is uncertain. Navigation after successful retry uses the receipt result's new ID and full reference.

HTTP routes authenticate first, parse command input at the boundary and forward to quotationRevisionSaves.save. Both create and update responses return id, quotation_number and revision. Update must not fabricate the source ID. Convert QUOTATION_STALE_EDITOR and QUOTATION_SELECTION_CONFLICT into explicit 409 responses. Expired authentication, malformed payload and backend validation are definite rejection states. Network failure, 5xx or malformed success are uncertain. Keep the complete local draft in every non-success state, per Boundary Discipline.

For stale conflicts render a View current revision link in a new tab. Do not replace expected_current_id and resubmit the losing draft. The loaded source/current IDs are immutable session context. That preserves the no-branch rule.

## Module map

- QuotationBuilder.tsx owns interactive values, retained versus replacement presentation, and the revision save state machine.
- revision-command.ts owns the pure conversion from entered form plus explicit selection intent into SaveCommand and complete attempt bytes.
- save-quotation.ts owns HTTP invocation and response decoding. Both legacy and revision success parse returned IDs.
- API create/update routes choose explicit command handling and retain inactive legacy compatibility.
- Create and edit server pages pass revision availability and source context. Historical edit pages render a notice rather than an editor.
- revision-ui.tsx owns read-only reference, current/historical indicator, saved status, actor, source, KL date and provenance display shared by review and history.
- SavedQuotationPdf.tsx owns authenticated status subscription, retry and exact-byte inline/download links. It never imports the browser renderer.
- /quotations/[qid]/history/page.tsx resolves qid through getQuotationFullDetails, then calls #60's quotationFamilies.history. It renders ascending rows with exact review links.

The frontend needs an authenticated read-only availability query if none exists. It reads the current release/migration state and returns a mode. It must never write release state. New creation uses revision commands only when the release is enabled. Before activation the existing legacy UI remains coherent. Family records remain immutable even when release is disabled, so they never fall back to legacy update. Backend save remains the final gate.

Saved PDF status is a separate domain union. pending/running show saved success plus issuance progress. failed offers artifact-only retry. ready renders /api/quotations/[qid]/pdf and its download=1 link. missing_original reports absent original and offers no regeneration. A legacy browser preview remains confined to inactive, unmigrated legacy mode.

History uses Doc quotation fields from #60's ascending response. Missing actor/date/source values print Not recorded. family_created_at and revision_issue_date have separate labels. Dates use Asia/Kuala_Lumpur. Legacy provenance states that pre-cutover history is unknown. Never infer missing historical fields from current profiles or catalog.

## Synthesis decision

Pending comparison with candidate B. Candidate A concentrates retry identity in the builder's command session and keeps transport decoding in the existing save helper.

## Tradeoffs accepted

- Keep a narrowly gated legacy path until #61 activates the release. It is necessary to avoid exposing an unusable save flow before cutover.
- Retained rooms need a small dedicated rendering branch. Reusing the live catalog editor would blur preserved values and replacement choices.
- The create page needs a read-only release query. Inferring release from family presence cannot determine mode for a new quotation.

## Alternatives considered

A generic useQuotationSave hook could own validation, requests, conflicts, storage and navigation. It hides more mechanics but requires passing the form, router, source context and catalog policies into one hook. That interface creates broad coupling and makes draft ownership harder to trace. A pure command constructor plus a local explicit session has a smaller boundary.

Always sending replacement selections was rejected because unchanged saves would refresh historical catalog snapshots and reject unavailable saved rooms. Automatically switching to retain when IDs match was also rejected because an intentional refresh may use exactly the same IDs.

## Open questions and risks

The operator has already fixed the product decisions. No additional preference question is needed. Implementation should verify the definite versus uncertain HTTP error classification against actual Convex errors. It must also verify duplicate saved room descriptions and incomplete legacy selections with real source-item identities.

## Next implementation step

Add the pure revision command/attempt conversion and helper response tests, then wire the explicit session into the builder without changing #60's schema.
