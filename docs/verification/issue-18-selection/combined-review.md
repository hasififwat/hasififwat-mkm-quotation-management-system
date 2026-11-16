# Combined quotation save review

Staff need the saved quotation to match the package and itinerary they reviewed. This review checked the integration of the selection conflict with the target branch's shared save helper and exact saved-record navigation.

No actionable product regression was confirmed in the scoped integration. The builder calls one save helper. The helper exposes selection-conflict metadata only for creation, HTTP 409, the expected conflict code, and a string message. Other HTTP failures preserve the target branch's recovery guidance. Network failures and unconfirmed success preserve its uncertain-outcome guidance. Creation still returns the actual saved ID, and the builder navigates to that exact record. Existing update identity remains unchanged.

The focused command was `node --test scripts/quotation-save.test.mjs scripts/quotation-selection.test.mjs`. It passed 31 of 32 tests. The new test's returned values match, but its deep strict comparison crosses the VM realm used by the TypeScript loader.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| New save-result assertion compares different object prototypes. | The test fails although the returned conflict fields match. | Run the new selection-conflict test using the existing VM-backed TypeScript loader and deepStrictEqual against a host-realm literal. | Deterministic in the focused run. | Maintainers running the regression suite. | Fix test assertion before PR readiness. |

Compare the primitive fields individually, or spread the result into a host-realm object before comparing. Product behavior does not need to change for this finding. The parent was sent this result immediately.

The parent changed the assertion to compare primitive fields during this review. A second focused run passed all 32 tests. The finding is resolved. No product behavior changed.

`git diff --check` passed. Newly added integration code contains no comments or suppressions that need deletion. Comment deletions, restores, architecture flags, and encoding offers are all zero. No source edits or nested agents were used.

Prove It Works led this review to execute the focused tests instead of inferring a pass from the source. Live browser verification on the combined head remains the parent responsibility.
