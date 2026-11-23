# Issue 105 verification

The shared preview used `http://localhost:3515` with an isolated Convex backend at `http://127.0.0.1:14105`. The baseline was `5dbca753a2d59b0f2ce0743451ffb090347e8475`. The tested fix was `837f8f572904cf85b89db793c95837e5f8453355`.

## Reproduce the date mismatch

Two disposable keyed saves shared the same client, package, flight, and total. A fixture-only function set their saved timestamps so that the query returned November 22 before November 21. The page displayed the dates in the opposite order.

| Quotation | Actual saved date | Baseline row date |
| --- | --- | --- |
| `1448H-0001` (`n572nbv2am5s7rmkrf480faa798jsryq`) | November 22 | November 21 |
| `1448H-0002` (`n5763cn3gg2b0y2cf9mp8qj55x8jrfwm`) | November 21 | November 22 |

Following **Keep the earliest** opened a Delete dialog for the actual November 21 quotation. The dialog was canceled so the same two records could verify the fix. [Baseline rows](01-before-swapped-dates.png) · [Wrong delete target](02-before-wrong-delete-target.png)

## Verify archive in the shared preview

1. The query still returned the newer quote first. Each row showed its own reference and saved date in Kuala Lumpur time. Both links opened the matching saved record. [Desktop](03-after-linked-candidates.png) · [Mobile](11-mobile-candidates.png)
2. The confirmation named `1448H-0001`. Cancel kept both candidates. Confirming Archive removed the group, which stayed absent after reload. [Confirmation](04-after-archive-confirmation.png) · [Result](05-after-archive-success.png)
3. Current showed only `1448H-0002`. Archived showed only `1448H-0001`. Both records opened from their respective lists and showed their saved references again after a full reload. [Current list](06-current-list.png) · [Archived list](07-archived-list.png) · [Current record](08-current-reopened.png) · [Archived record](09-archived-reopened.png)
4. A separate unkeyed fixture was removed while its Archive dialog was open. The page reported that it could not archive `1448H-0004`. Reload cleared the stale candidate and showed the original pair. The unkeyed fixture added no receipt. [Error state](10-archive-error.png)

## Verify receipts and backfill

The archived quote and its original create receipt survived. The complete set of three receipt rows matched before and after archive, and again after backfill. Only `1448H-0003`, the separate keyed fixture removed with the legacy permanent-delete mutation, returned `orphan_reference` in receipt inventory.

The local freeze and backfill scanned both retained records and returned `done: true`. The newer family pointed to `1448H-0001` and had `archived: true`. The older family pointed to `1448H-0002` and remained current. Both saved records still reopened through the Convex reader. The historical receipt remained flagged after that completed batch.

The focused regression failed before the production change. All 86 focused tests passed after it, including the family read, migration, history, receipt, and authorization suites. Next.js type generation, TypeScript, and changed-file ESLint passed.

## Cleanup

The preview tab closed. The owned web and Convex processes stopped, and ports 3515, 14105, and 14106 returned connection refused. The disposable source, database, storage, synthetic account, signing keys, session, and raw receipt comparison file were removed. The shared checkout and shared application data were left intact.
