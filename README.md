# Safe quotation create retry evidence

Staff keep their entries on a rejected or uncertain save and can retry the same retained draft without creating another quotation.

Baseline commit `f8d8e2bcc1ea08789e087051aabc5b579122a11d`.
Fixed commit `8e760d42d2544011447f12913a6e33fd71f39527`.
Preview URL `http://save3410.localhost:3410`.
The actual Next app used disposable local Convex on ports 3420/3421. All records and accounts are synthetic. No shared backend was written or deployed.

## Browser proof

[Original failure video](before.mp4) shows actual stale-context rejection, lost confirmation after real commit, and explicit staff retry. [Original persisted duplicates](before-list.png) shows the two resulting records. Backend count went 0 after rejection, 1 after commit with lost confirmation, and 2 after retry. The first ID was `m17f981a80ysjmmfnyrk7hjqj98japvw`. Retry created `m17b64r9kbhy41jz03dnb9szrh8jbma5`.

[Fixed flow video](after.mp4) repeats actual rejection, retained entries, real commit with injected lost confirmation, explicit retry, list, and reopen after full navigation. Count stayed 2 on rejection, became 3 on commit, and stayed 3 on retry. Both successful responses contain `m17da2bdd698pnfwxzrj8f76g98jabm7`. The saved-review URL contains that ID. The list shows only one new quotation, 1448H-0003, beside the two baseline duplicates.

[Saved recipient and entries after reload](after-reload.png) and [saved flight and room selection](after-rooms.png) verify persistence independently of the save message. PIC, branch, notes, client, December 10–22 flight, Quad room and one pax remain. Rendered layouts were inspected.

Fault injection was bounded and browser-local. The rejection changed only the outgoing reviewed_context so the actual route and mutation rejected it. The lost-confirmation wrapper awaited native fetch through the actual HTTP route, read the real successful response, then threw before passing confirmation to the app. Transport loss was simulated. The backend commit was real. No endpoint success, page, React setter, or persistence result was mocked. The wrapper was removed by full navigation.

An attempted changed-notes browser path used failing selectors and did not edit the draft. The video contains this idle interval. No browser collision claim is made. Edited-content collision is covered by helper tests, actual handler tests, and live backend checks.

## Verification

The failing regression is committed before the fix at `c2002ce5a9a54d3bd1b3f959e32f985c4df8f6ac`.

Before

```
✖ explicit retry after a lost confirmation returns the original quotation without duplicate writes
AssertionError [ERR_ASSERTION]: Retry must resolve the first committed result
+ id: 'quotations:9'
- id: 'quotations:6'
```

After

```
✔ explicit retry after a lost confirmation returns the original quotation without duplicate writes
```

All 506 repository script tests passed. The final retry, save-helper and selection set passed 47 tests. Installed Next type generation and TypeScript checks passed. Scoped lint passed. Complete convex/quotations.ts lint retains the same two explicit-any errors and one unused-variable warning observed at the baseline. No new lint suppression was added.

The integrity checker executed 864 actual-handler cases with zero property failures and zero adapter errors. All four guard mutants were detected and the baseline restored. Its in-memory adapter does not prove concurrent transaction behavior.

[Live transaction evidence](live-retries.json) records the independent actual Convex checks, source digests, exact commit and results. Two separately authenticated HTTP client instances issue concurrent mutations. Actual quotation, item, log and receipt tables are inspected to establish record counts and rollback. This does not claim a measured production failure rate or a specifically observed OCC scheduling interleaving.

The independent source and no-comments reviews passed. Browser evidence review is recorded in the PR. Retry identity belongs to the retained builder page. Reload and tab-close draft recovery are outside this repair. A fresh builder is an intentional new create and can use identical content.

## Media hosting and cleanup

GitHub's browser session was signed out. The authorized small evidence-asset branch hosts these files, and raw asset accessibility is verified. The decision trail stays local.

Disposable fixtures, accounts, receipts, database storage and signing credentials are removed by destroying this task's own local instance after verification. Owned tabs and services are closed. Cleanup confirmation is posted with the PR.
