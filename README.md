# QUOTE-005 reviewed snapshot refresh proof

Issue https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/32.

Tested application head `16ac01bdda19f0a97336cc1736573a863455bac6`.
Exact parent `0318341379a22e8f32147d40f0011e0b87230d1a`, dependency [PR #37](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/pull/37), branch `fix/quote005-refresh-feedback`.
Required migration base `fae2c23d738bce0cbadd2882634aab7f9b6f36e1`.
Baseline browser used the original application snapshot at that migration base.

Preview URL `http://q005-confirmation.localhost:3340`. Own private instance `q005-confirmation`, backend 3440, site 3441. Verification used a local-only `DATABASE_UDF_USER_TIMEOUT_SECONDS=10` process setting so disposable authentication could finish. No production runtime setting changed. No shared backend deployment or merge.

## Recordings

[Original A/B race](before.mp4). The first editor loaded visibly stale A. A supported authenticated public `quotations.update` operation changed the saved quotation to B using a valid full payload from `getQuotationForEdit` and actual B IDs. Supported `packages.updatePackage` then changed B name and hotel. The original editor clicked Refresh snapshot through the real browser. It persisted unseen B current context. [The saved PDF](before-saved.png) independently shows the unseen hotel and RM 10000.

[Corrected review, conflicts, confirmation, saved PDF and reload](confirmation.mp4). At the tested head, the same A/B trigger rejects initial review. A saved quotation change after preview rejects confirmation with HTTP 409. A package name, hotel and room-price change after preview also rejects with HTTP 409. All three saved detail reads remained byte-identical across rejected attempts. Actual-handler tests compare entire tables and require zero patch/insert/delete operations on conflicts, including log writes.

Explicit Review latest saved quotation obtains the new review without resetting the draft. The table shows saved/current package name, hotel and room-pricing changes. The current room is RM 7500 while the existing quoted room is RM 5000. Confirm refresh persists only reviewed snapshots. All saved quotation items remain byte-identical and total remains RM 5000 x2 = RM 10000. The editor retains its unsaved note. The saved PDF and reload show the reviewed B name/hotel and the preserved charge.

![Conflict](conflict.png)
![Retained draft after confirmation](draft-retained.png)
![Saved PDF after reload](saved-reload.png)

Primary quotation creation used the real builder. The second-editor context switch used an actual supported service operation under explicit user authorization. It was not completed through package-switch UI and used no test-only endpoint. Primary refresh, review, confirmation and saved-result navigation used browser controls. Both MP4s and screenshots were visually inspected before publication.

## Verification

- All 457 repository tests passed. [Log](regression-tests.txt).
- All 40 focused refresh/token tests passed. [Log](focused-tests.txt).
- The regression was committed first at `ac9bbfbbef960438202d8a6fd3c6bdd60d9041ad`. Before correction it reported `AssertionError [ERR_ASSERTION]: Missing expected rejection.` [Original failure](failing-test.txt).
- The create reviewed-context guard mutation was detected and restored. [Log](create-guard-mutation.txt).
- Bounded quotation integrity passed 864 cases with zero failures or adapter errors and all 4 mutants detected/restored. This is finite actual-handler adapter evidence, not an unbounded proof or live auth proof. [Log](integrity-output.txt).
- Actual authenticated local Convex token/review queries passed, establishing WebCrypto SHA256 runtime support.
- Snapshot production build, Next type generation and standalone TypeScript passed. [Build](build.txt), [typegen](typegen.txt), [TypeScript](typecheck.txt).
- Web and backend/build snapshot application files matched the final commit exactly. Only the build snapshot Turbopack root was adjusted for symlinked local dependencies.
- Independent source review at the tested head found no actionable findings. It independently ran 40 focused tests, the create-context mutation test and `git diff --check`. Parent source review agreed. Comment review found no added comments or suppressions to change. No formal GitHub review is claimed.

## Limits

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Existing full lint failures | ESLint exits nonzero with 20 errors and 35 warnings, including inherited errors in the quotations file. No new lint diagnostic was introduced. | Run full ESLint. | Consistent on this base and head. | Maintainers using full lint as a gate. | Existing validation limitation |
| Separate package-switch rendering limitation | Selecting B in the editor showed no room cards despite3 enabled rooms in the service result and serialized props. The nodes had zero geometry. | Use package-switch UI on the disposable fixture. | Observed repeatedly; wider frequency unknown. | Staff switching a saved quotation package. | Existing UI limitation outside #32 |
| Browser fixture has no extra lines | Browser proves original room price, passenger count and total preservation. Add-on and discount preservation is covered by actual-handler tests with nonempty lines and the unchanged snapshot-only write boundary. | Assess this ticket browser fixture. | Fixed verification scope. | Reviewers assessing evidence. | Verification limit |

No general quotation update concurrency, autosave or repricing was added. The create reviewed-context guard is preserved. [Design](design.md).

## Cleanup

Owned tab closed and services stopped. Ports 3340/3440/3441 verified free. Owned backend data, keys, credentials and deploy/web snapshots removed. Proof artifacts retained. [Cleanup record](cleanup.json).
