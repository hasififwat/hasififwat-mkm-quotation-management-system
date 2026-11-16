# CSV sync stack integration

Staff can synchronize package and flight CSVs and trust saved results. This proof covers regular merge reconciliation, with no GitHub PR merge or shared deployment.

## Exact sources

- PR50 remains `6ca78412`, based on migration/nextjs-upgrade.
- PR51 remains `0bcf61ef`. It now targets migration/nextjs-upgrade because PR50 merged during verification. The verified source is unchanged.
- PR52 is `d2c8b578966ed06f42f0d4503efcd6f9ec6722dc`, based on fix/44-sync-quotation-references.
- PR49 is `6fa5f2fc061283b3153c19ff5247d6bc527d4b0f`, based on fix/46-sync-price-only-updates.
- PR48 is `5ab3470fb011b072aa03e7087a4b8f1a8d626dde`, based on fix/45-sync-schedule-safety.

Each new head descends from its previous published head. [Decisions](source-decisions.md) explain conflict resolution. Model the Domain kept MffParseResult and SyncPlan responsibilities intact. Prove It Works required actual upload/apply and saved reads.

## Actual application checks

Preview was http://sync-integration.localhost:3610. Disposable local Convex used 3620/3621. All data is synthetic. No page, response or React state was mocked.

At standalone 51, reference conflict retains files. [DOM](phase-a-review-dom.json) and byte-identical [before](phase-a-before-review.json)/[after](phase-a-after-review.json) establish that Review retained files performs no writes. Earlier success preservation is baseline evidence, not a separate new scenario.

At 52, actual CSV apply changes 1200 to 2500. [Saved](phase52-saved.json), [second editor](phase52-second-view.json), and [reload](phase52-reload.json) show 2500. Existing quotation remains 1200.

At 49, [malformed schedule](phase49-malformed.json) disables removals and [explicit scoped review](phase49-scoped-review.json) permits one. [Saved read](phase49-saved.json) retains the manual quoted flight.

At 48, concurrent price 4321 makes the package stale while flight update/removal are pending. [Rejection](final-stale-rejected.json) contains actionable text and zero counters. [Before](final-concurrent.json) and [after](final-stale-saved.json) are byte-identical. Explicit [re-review](final-rereview.json) then [applies](final-applied.json). [Reload](final-reload.json) and [saved](final-read.json) show 2600 and the same updated flight ID. Historical quotation remains 1200. The initial frozen review was observed but not retained. The integration test proves frozen scope metadata; the extra missing flight appears only at explicit re-review. Do not treat this as complete visual acceptance.

[Duplicate input](final-duplicates.json) disables apply. [Transport](transport.json) proves concurrent duplicate create rejection, anonymous rejection, and quoted deletion guard.

## Checks and review

[573 tests](final-all-tests.txt), [typecheck](final-typecheck.txt), [build](final-source-build.txt) and [49 build](phase49-source-build.txt) pass. [Scoped lint](phase48-lint.txt) has zero errors. [Full lint](final-full-lint.txt) has 20 errors and 33 warnings. Fresh independent review passed 65 focused tests and inspected source and exact saved evidence, with no actionable findings. Snapshot-only root adjustment supported external dependencies. No deslop plugin was available; scoped diff/comment review was used.

## Media boundaries

Existing media remains evidence only at its recorded heads. [Reference video](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/blob/87fb0853bbe501148d5198587651126a8d6ad4b2/after-trimmed.mp4) and [price proof](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/blob/7a7fa1eaafe88f505ffe6898d70e5b49b77bacde/README.md) are baselines. No new image is claimed. T3 twice reported no screenshot frames. CUA browser host was unavailable; native fallback was stopped after window changes to avoid interference.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
|---|---|---|---|---|---|
| Final visual acceptance incomplete | Layout and final feedback lack fresh media | Capture unavailable | Reproduced | Reviewer | Verification limit |
| Existing lint debt | Full gate fails | Run full lint | Deterministic | Maintainer | Existing debt |
| Native window remains | Unused incognito window | Fallback | Known | User | Cleanup |

[Cleanup](cleanup.json) confirms services stopped and private instance removed, including credentials. No old 43/44 instance was touched. T3 tab closed; native window remains.

## Delivery after the branch merges

PR50 and PR51 reached migration/nextjs-upgrade during verification. PR49 merged into the price branch, PR48 merged into the schedule branch, and PR52 merged into the already-merged reference branch. Those merges did not carry the final three repairs to the migration branch.

[PR53](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/pull/53) delivers the exact verified combined head `5ab3470fb011b072aa03e7087a4b8f1a8d626dde` directly to migration/nextjs-upgrade. The merge-tree check is clean and yields the same tree as the verified head. No new product source was written for this delivery PR. The coordinator did not merge a PR or deploy a shared backend.

[Coordinator decision trail](coordinator-decisions.tsv) records the verification, audit corrections, and delivery check. The source and media limits above still apply.
