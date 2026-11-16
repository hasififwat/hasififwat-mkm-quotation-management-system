# Price-only CSV sync evidence

Staff can review and save changed package room prices while existing quotations retain their historical amounts and selections.

Baseline and dependency #44 commit `8a34203f020164c4662026745329066b9641675c`, PR #51. Final tested commit `2c69e5504d98b217808092687324eaf40391fbb9`. Preview `http://sync46.localhost:3570`. Disposable local Convex used ports 3580 and 3581. All identities and records are synthetic. No shared cloud backend was deployed or mutated.

## Actual app proof

[Original review](before.png) shows the actual uploaded price-only CSV resulting in "Nothing to sync". [Original quotation](quotation-before.png) and [original persisted read](before.json) establish saved Quad at RM1,000 and quotation total RM1,000. The CSV supplies QDP at RM1,200. The fixture was created through actual authenticated local mutations before the journey. No page, parser, handler, response, or React state was mocked.

[Uploaded mapping](upload.png) shows the real file parsed at RM1,200. [Corrected room review](room-review.png) shows Quad changing RM1,000 to RM1,200, disabled Triple retaining RM1,500, and custom Family retaining RM1,900. [Apply result](applied.png) shows one package updated and zero flight writes. [Persisted apply read](after-apply.json) confirms those values.

[Package second view](package-second-view.png) and [package after full reload](package-reload.png) show the actual package editor's Pricing step. Numeric inputs remain 1200, 1500, and 1900. The disabled Triple remains disabled. [Identical reupload](unchanged.png) plans no changes. [No-op read](after-noop.json) has exactly the same room records, including IDs, as after apply.

[Existing quotation editor](quotation-retained.png) shows current Quad at RM1,200 with entered RM1,000 retained. The existing verification warning is expected. No Refresh snapshot action was taken. The real Save action succeeded, followed by navigation to the quotation list and a full reload. [Reloaded quotation list](quotation-reload.png) shows the same quotation 1448H-0001 at RM1,000. [Post-save persisted read](after-quote-save.json) and [assertions](assertions.json) establish unchanged room label, price, pax, subtotal, total, and selected flight snapshot. The sync itself leaves quotation items unchanged. Existing quotation-save behavior recreates item IDs and rebinds the current package room ID without changing saved values.

All published screenshots were visually inspected. Media covers a matched package with one changed price, blank missing prices, a disabled room, a custom room, actual apply, no-op reupload, second view, full reload, and existing quotation save/reload. Alias variants, manual promotion, unsync exclusion, absent room additions, and blank preservation during mixed changes are handler/planner tests rather than separate browser journeys. PDF export is outside this check.

## Checks and independent review

Regression commit `4f35f6cb` precedes the repair. [Original failing output](regression-before.txt) includes the actual missing-room and price-only failure. Two fixture details were corrected in the fix commit. [Corrected final regression against the unchanged parent](regression-before-corrected.txt) confirms the core failure independently of those corrections. [Focused passing output](regression-after.txt) passes 35 tests. [Full script suite](all-tests.txt) passes all 543 tests. [TypeScript](typecheck.txt) and [production build](build.txt) pass.

Changed-file lint has zero errors and four inherited hook warnings. [Full lint](full-lint.txt) reports 20 errors and 34 warnings. The parent evidence records 20 errors and 35 warnings. Independent source inspection found no new lint suppressions or changed-line lint failures.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Full repository lint remains failing. | Existing explicit-any, hook, and other lint debt prevents a clean full-lint result. | Run pnpm lint. | Reproduced in this run. | Maintainers using the repository lint gate. | Existing debt, outside this focused fix. |

A fresh independent review inspected the complete diff, planner/apply code, and exact-name reference guard. It passed the 35 focused tests, TypeScript, and diff check, with no actionable correctness findings. Its scoped comment review found no added comments or suppressions. The unavailable deslop plugin received a manual scoped diff inspection. Review did not claim browser media or cleanup verification. The parent inspected those artifacts separately.

Model the Domain selected a single merged room collection with canonical matching and exact saved labels. Prove It Works required actual upload/apply, persisted reads, a second editor view, and reload. The focused repair retains the existing guarded package apply API and room-ID replacement behavior. Stale intent ownership remains #47 and parser completeness remains #45.

## Isolation and cleanup

The project-local verify-mkm-app journey was followed using T3 shared preview and an owned source snapshot outside .next. The local runtime recipe was read from prior verification notes and adapted to this checkout, unique root, hostname, credentials, instance name, and assigned ports. Production build finished before the final source snapshot started. The app used actual Next dev/Turbopack and actual disposable local Convex.

[Cleanup record](cleanup.json) confirms the owned tab closed, both owned services stopped, and ports 3570, 3580, and 3581 closed. The disposable instance directory, database records, generated staff credentials, signing keys, deployment source snapshot, and web source snapshot were removed. No other task's tab, cookies, backend, records, worktree, or ports were altered. Public evidence contains only synthetic record reads and test artifacts, no credentials or signing material.
