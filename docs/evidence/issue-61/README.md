# Integrated quotation revision proof

Staff need each intentional Save to retain every earlier quotation and exact issued PDF. This evidence supports #61 under #54. The product release remains disabled by default. No shared backend, production data, release activation, or PR merge was performed by this owner.

## Read the evidence by scope

| Evidence | What it establishes | Limit |
| --- | --- | --- |
| `migration-rehearsal.json` | Real concurrent base allocation with `skipQueue`, inventory under freeze, bounded checkpoints, rollback and restart, ambiguous-stop behavior, independent empty-target ZIP restore. | Legacy singleton migration tooling. Its storage is empty. It is not a modern invariant checker. |
| `backend-proof.json` | Real password JWT saves, gates, exact retries, stale conflict, independent creates, retained row and issued-byte hashes, actual catalog/profile changes, canonical client merge, archive and atomic rollback. | Disposable local backend. Failed-state retries are counted separately from pending recovery. |
| `restore-proof.json` | Independent empty backend restored all retained rows and IDs, artifacts and attempts. A restored password account authenticated and downloaded each ready PDF with matching bytes. | Public Convex download action. Application HTTP route evidence is separate. |
| `http-proof.json` | Real JWT cookie, anonymous 401, authenticated PDF 200, exact bytes, ETag, attachment, receipt replay and denied flat write after freeze. | HTTP origin is `http://localhost:3540`. |
| `session-proof.json` | Cryptographically signed expired JWT gets HTTP 401 and backend denial. Original valid JWT and unchanged command/key recover the saved ID without writes. | Fix commit `497059d1`; API source hash is recorded. No immediate JWT revocation claim. |
| `ui-proof.json`, `ui-source.json` | Actual create R0, edit R1, unchanged Save R2, exact history and old review after reload, stale mobile editor retaining its draft. | UI origin is `http://127.0.0.1:3540`. The exact development-origin config override is recorded. |
| `gate-ui-proof.json`, `gate-http-proof.json` | Compatibility, incomplete migration, completed migration with release disabled, active disposable release, and hostile enabled-without-migration combinations. | Fixture controls run before modern revisions. Legacy receipt replay is preserved. |
| `pdf-ui-proof.json` | Genuine failed artifact offers Retry PDF, actual retry reaches ready, and migrated missing-original history blocks issuance with HTTP 409. | Failure recovery is explicit user retry. Missing original is never reconstructed. |
| `pending-diagnostic.json`, `old-pending-repair.json` | Original pre-claim scheduled-action failure and one targeted repair after the fix. | The one retry repairs an old stranded row. It does not prove automatic new-save recovery. |
| `issue58-sequenced-committed-*.json` | Independent owner handoff for ordinary rendering, claimed failure with one retry, and two pre-claim failures with zero rescue. | These reports identify their own commit. Final combined-source runs are recorded separately. |

Do not combine counts from different runs. The gate-inclusive run had 18 quotations, 15 families, 17 artifacts, 19 attempts, and two explicit failed-state retries. The later ordinary integrated run had 17 quotations, 14 families, 16 artifacts, 16 attempts, and zero failed-state retries. Each report identifies its exact source and file digests.

The old `migration-rehearsal-superseded.json` withdraws the first queued concurrency and unchanged-target restore claims. Independent review corrections are append-only in `decisions.tsv`. The initial claimed-worker failure causes that were cleaned before diagnosis remain unknown. The separately captured pressure evidence identifies one real local write-budget failure; it does not establish every earlier failure's cause.

## Inspect the real application media

The media is synthetic application content. It contains no filled credential fields or unrelated customer data. PNGs are frames from the actual browser recordings, extracted with FFmpeg. No mocked UI or reconstructed screenshot was used.

- `save-r0-r1.mp4` and `saved-r1.png` show actual Save and the new revision review.
- `mobile-stale.mp4` and `mobile-stale.png` show the stale warning at 390 CSS pixels. The retained input value and zero extra family revisions are recorded separately.
- `old-review-reload.mp4` and `old-review-reload.png` show exact R0 through history and after reload.
- `pdf-failure-retry.mp4` and `pdf-failed.png` show the failed state and actual public retry.
- `gate-states.mp4` records the real create route while the backend transitions through the gate matrix.
- `missing-original-mobile.mp4` and `missing-original-mobile.png` show the honest missing-original state.
- `validation.mp4` records required-client and package selection behavior.

The before-change baseline is preserved in [#59's baseline proof](../issue-59/browser-baseline-proof.json) and its application images. It used source `3d18ab73179abc8a4d1d6407c0e6b65d7bc9a3da`, web 3500 and backend 3510. Actual browser Save changed notes while retaining the same ID and reference. The screenshot alone is not the overwrite proof. The baseline is a separate synthetic fixture, not a pixel comparison with this fixture.

T3 tabs were explicitly confirmed as owned `runtime: server` incognito tabs. Snapshot and input automation timed out. Normal DOM form controls through documented `preview_evaluate` and built-in recording worked. CUA's browser host was unavailable. Native Chrome login worked, then the URL guard stopped before an action when the human focused an unrelated personal window. No unrelated window was operated or captured. The remaining journey used the independent server browser.

## Reproduce on an owned disposable target

Use Node 24, the lockfile dependencies, and `FAMILY_BACKEND_BINARY` pointing to the local Convex executable. Ports 13965 and 13966 are for the fixture, 13975 through 13978 for migration and empty restore, 13985 and 13986 for nonempty restore, and 3540 for the web app. All helpers reject occupied or unexpected targets where they start backends. The fixture and signing material live outside `.next` at `/private/tmp/mkm-issue61-run` with private permissions.

```sh
python3 scripts/revision-integration/prepare-local-backend.py
node scripts/revision-integration/configure-local-auth.mjs
node scripts/deploy-revision-fixture.mjs
node scripts/revision-integration/seed-local-fixture.mjs
node scripts/check-integrated-revision-backend.mjs --reset-owned-fixture
node scripts/check-revision-restore.mjs
node scripts/check-revision-http.mjs
node scripts/check-revision-session.mjs
```

Start only the snapshot web app on port 3540 before the HTTP checks. `--reset-owned-fixture` deletes only the explicitly owned synthetic quotation fixture. It is never a production migration command. Do not point these scripts at a shared deployment. Use `INTEGRATION_GATE_UI=1` only when coordinating the browser checkpoints. Each checkpoint waits for an explicit recorded observation acknowledgement.

Run `node --test scripts/*.test.mjs`, application and backend TypeScript checks, production build, and the actual-handler integrity checker with all six guard mutants. Keep its scratch TypeScript under `/tmp`. The finite checker covers 1,728 cases and does not prove real JWT validation or transactions. Those have separate evidence above.

Use [the migration runbook](../../quotation-families/migration-runbook.md) for stop conditions and operator steps. Legacy inventory and `restart` are pre-append tools. Use `check-revision-invariants.mjs` for modern exported rows. The checker calls the actual saved-document and frozen-render-input functions. Its corruption tests reject missing save records, wrong references, changed frozen content, inconsistent attempts, and a self-consistent PDF for the wrong revision.

Production data quality, hosted deployments, runtime capacity, export permissions, and the eventual activation mechanism remain unverified. Rollback must preserve the permanent legacy freeze or keep writes closed. No enable endpoint was added to finish this proof.
