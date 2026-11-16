# Recover PDF jobs that fail before claim

Staff need every saved revision PDF to reach a recoverable state. The #61 integration fixture captured an artifact stranded in pending after its scheduled worker action failed during claim. This follow-up closes that preclaim recovery gap. The revision release gate stays inactive.

## Confirmed cause

[Captured integration evidence](observed-preclaim-failure.json) records source `1f70d1b0dff9a5c2e83b0a9dfebae468e15dd30f`, one pending artifact, zero attempts, and its only scheduled worker failed with `TooManyWrites` at worker line 11. No retry or reset occurred after capture. The quota exposed the missing recovery path. It does not make the stranded artifact an acceptable outcome.

The worker calls claim before entering its render try block. Claim used to create the first reconciliation job. If claim failed, no attempt or reconciliation existed. [Convex scheduler guarantees](https://docs.convex.dev/api/interfaces/server.Scheduler) distinguish automatically retried scheduled mutations from actions that execute at most once and can fail transiently. Moving claim inside try alone would not cover an action that never starts.

## Durable pending dispatch

The existing artifact state union remains pending, running, failed, or ready. No schema or public API changes are required.

`dispatchPendingPdf` schedules a reconciliation mutation after 15 seconds and the worker action immediately. Both calls commit with the mutation that saves or redispatches the artifact. Initial enqueue and every pending reconciliation use this helper. The watchdog exists before claim can run. A repeated preclaim action failure leaves another future mutation to redispatch it.

Successful claim keeps the existing 120-second running lease and its reconciliation. A pending watchdog observing running work yields to that lease. Ready and failed stop the watchdog chain. Duplicate callbacks still pass through the existing claim guard. Attempt fencing, frozen input, authoritative storage, and terminal bytes remain unchanged. Persistent infrastructure failure can delay execution; the application now retains durable recovery work instead of relying on action retry.

The only product file changed is `convex/quotationPdfArtifacts.ts`. Neither `quotationRevisionSaves.ts` nor the Node worker needs a signature change. The existing authenticated `quotationPdfArtifacts.retry({revision_id})` already supports pending artifacts and schedules a reconciliation mutation. #59's PDF pane can keep the current status and download APIs. This fix requires no UI change or browser focus.

## Existing stranded records

Deploying code cannot retroactively create a missing job. After merging this fix into its own fixture, #61 must invoke the existing public retry once for revision `n577vd6nex3rb8jq6t820sbvmd8ja640`. That arms the new recovery chain for its captured pre-fix artifact. Record this targeted repair separately from the fresh-save acceptance test, which must recover without manual rescue.

This branch does not mutate #61's backend, database, source tree, or browser. It introduces no cron, global artifact scan, storage sweep, or release activation. The earlier failed-state retry observation lacks enough preserved evidence to attribute a second defect.

## Reproduce

```sh
node --test scripts/quotation-pdf-recovery.test.mjs
PDF_PRECLAIM_FAILURES=2 FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/preclaim-recovery.json node scripts/check-pdf-artifact-backend.mjs
FAMILY_BACKEND_BINARY=/path/to/convex-local-backend node scripts/check-pdf-artifact-backend.mjs
pnpm build
pnpm typecheck
node --test scripts/*.test.mjs
```

The focused regression failed before the fix because pending redispatch had no future recovery mutation. The handler tests cover initial enqueue, repeated pending recovery, terminal states, and running lease ownership.

The real backend mode injects two throws immediately before claim in the disposable worker source. A fixture-only counter determines which scheduled actions fail. This simulates the captured preclaim boundary deterministically; it does not claim to reproduce actual quota pressure. After save, the fixture only polls state and makes authenticated downloads. It never invokes retry, reconciliation, or the worker to rescue the artifact. Each failed-action snapshot must show zero attempts and a future reconciliation mutation. The final result must have one ready artifact and one attempt, unchanged quotation rows, and matching PDF download hashes.

The fixture uses ports 13485 and 13486, an admin test identity, and a temporary database. It stops its backend process group and removes the database in finally. Product sources retain no fault counter or test endpoint. The ordinary backend mode continues to verify rendering, upload and finalization failures, owned cleanup, authentication, frozen templates, and stored bytes.

## Review

A fresh independent Codex reviewer ran all four focused tests and inspected the actual injected scheduler report. It found no implementation blocker. No added code comments or suppressions required cleanup. Make Operations Idempotent shaped the repeated-failure chain. Prove It Works required captured scheduler rows and real automatic recovery rather than a manually rescued PDF.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Existing pre-fix artifacts have no scheduled watchdog. | Code deployment alone cannot wake a stranded row. | A preclaim action failed before this fix. | Confirmed in the #61 fixture. | Staff awaiting saved PDFs. | Targeted integration repair. |
| Hosted behavior remains unverified. | Local injection does not establish hosted platform failure frequency or latency. | Execute on hosted Convex. | Environment dependent. | Release integrators. | Verification limit. |

## Recorded committed-source run

Implementation `0e5db1232323b4340e97a31c9a7bdf88391f9179` passed the repeated preclaim injection on Node v24.19.0 and Convex 1.45.0 at `http://127.0.0.1:13485`. [Automatic recovery results](automatic-recovery.json) preserve both failed-action scheduler snapshots and the single ready attempt. Manual rescue calls were zero. The final stored PDF was 169262 bytes with SHA-256 `6166a108f30258429ba1dac97019e957b8b3e69968add4ebe2699fc42c2e08b4`. Both downloads matched that hash. The temporary database and owned process group were removed.

Production build, typecheck, all 627 repository tests, all four focused recovery tests, and the ordinary full PDF backend verifier passed on the same implementation tree. This verification does not activate the release or repair the preserved #61 fixture. That owner retains the captured pre-fix record and performs its targeted repair and final combined acceptance separately.
