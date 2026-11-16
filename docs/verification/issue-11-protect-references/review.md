# Independent work item 4 review

Staff need to edit packages without removing the flight IDs and room types that existing quotations need. I reviewed the manual update and section-import implementation against `e9ec009e52ba2bfa4034366152f31e3d1d606abc`. The product head observed at the end of review was `63c57f0c3e370f2659c48bbe260a296e22a092f6`. The route regression file was still untracked while I ran it.

## Verdict

No correctness blocker was found in the stated manual-builder and section-import scope. This review makes no deployed-backend or browser claim.

The guard runs before the first parent patch, child deletion, or insertion. It checks the existing flight IDs omitted by the submission and the existing room types absent from the incoming rooms. Its quotation and item index predicates use the actual string fields in the schema. Archived quotations and every status remain included.

The room lookup matches `getQuotationForEdit` by using the linked room type first and the saved item description after room ID churn. It does not reject disabled retained rows or replacement room IDs. Those remain valid in the actual quotation update handler. Snapshot-only room entries, add-ons, and discounts do not establish selected-room references.

The installed Convex HTTP client reconstructs `ConvexError` and assigns deserialized structured error data, so the route's typed narrowing is compatible with the actual transport implementation. Only the recognized code with a string message receives HTTP 400. Ordinary errors, other codes, malformed typed errors, and forged plain error objects retain HTTP 500. The builder's existing unknown-outcome behavior remains unchanged for those failures.

The actual section-import callback is exercised through the component's rendered props. It clears imported room IDs, replaces the selected room settings, receives the real registered-handler rejection, keeps the draft correctable, and then saves after a permitted correction. This is component-callback and handler evidence, not a browser-dialog journey.

## Independent verification

I ran `node --test scripts/package-references.test.mjs scripts/package-reference-route.test.mjs scripts/recoverable-save.test.mjs`. All 25 checks passed. The checks compare all fixture tables and attempted writes for rejected removals. They also reopen and update an existing quotation after a permitted package edit that replaces room IDs and disables the retained type.

`Prove It Works` shaped this review's direct execution of the registered-handler, route, and callback checks instead of relying on the implementation summary.

## No-comments pass

The reviewed diff adds zero source comments and zero lint or TypeScript suppressions. No deletion candidates or MUST KILL flags were found. I made no repository edits. Deletions, restorations, reruns, architecture changes, encodings, and unenforced comment constraints are all zero.

## Scope limits

Standalone `packageFlights.deleteFlight` and CSV sync room replacement are unchanged alternate writers. The PR must keep its claim limited to manual package editing and builder section import. Existing historical data inconsistencies are not repaired by this guard. Parent verification owns the authenticated browser evidence, final full checks, fixture cleanup, and exact final PR head.
