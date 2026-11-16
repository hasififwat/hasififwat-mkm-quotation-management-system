# Snapshot refresh review

Staff review one server-produced saved/current comparison. The edit DTO carries a SHA-256 token of canonical full quotation content and all quotation items. The browser keeps that loaded token with the draft. Review rejects a changed saved quotation rather than switching from A to B silently. An explicit Review latest saved quotation action can fetch a new saved token and review without changing the draft.

The server builds preview values and writes from the same snapshot builders. The review freezes the quotation token and existing deterministic quotationSelectionContext. Confirmation recomputes both in the mutation before the existing snapshot patch and log insert. Convex transaction retry rereads that context. Quotation charges and items remain untouched.

The alternative optional revision counter was rejected because every quotation and item writer would need to advance it, expanding this ticket. Exact canonical JSON was the migration-free alternative, but SHA-256 bounds the quotation token to85 characters. No custom short hash or timestamp-only identity is used. The token includes legacy content as it exists, with absent fields distinguished from populated snapshots, and sorts item rows by ID and object keys lexically.

The parent independently deployed this implementation to q005-confirmation and executed authenticated getQuotationForEdit/getSnapshotRefreshReview successfully. This establishes WebCrypto SHA-256 support in the actual local Convex runtime.

The existing source context is retained. It covers material package and child content without a schema revision migration. Missing or unrelated saved flight blocks refresh instead of claiming an old flight is current.

Typed HTTP success/failure/uncertain outcomes from exact #31 parent0318341379a22e8f32147d40f0011e0b87230d1a remain. A409 is a safe known failure.5xx and lost responses remain uncertain and direct staff to inspect the saved record. The review request is read-only and has separate safe load/unavailable/conflict messages.

No general quotation update concurrency, autosave, repricing, or package-switch layout changes are included.
