# Separate ordinary PDF checks from pressure checks

The ordinary PDF backend fixture must verify all original artifacts without letting later unrelated writes interfere with their renders. This test-only follow-up sequences save and race phases before clone recovery and template checks. It does not change product code, artifact states, schema, APIs, or the release gate.

## Assessment

The #59 diagnostic captures an actual TooManyWrites error inside a claimed worker's try block during a mutation call. [Preserved pressure evidence](observed-pressure.json) records its failed artifact, valid frozen JSON, matching input hash, and the exact error. Other original artifacts were still pending while recovery clone tests had already begun. This establishes overlapping fixture phases and one captured write-quota failure. It does not establish the cause of every earlier failure. The old cleaned-up port 14265 run remains unattributed.

The original harness issued several revision saves and race groups without waiting for their PDFs. It then began clone and recovery writes and checked only selected original PDFs later. That mixed ordinary correctness checks with write pressure.

The correction waits for each ordinary save or deliberate concurrent group to finish rendering before starting later writes. Same-key calls, distinct-key races and independent-family saves remain concurrent within their existing groups. Every original artifact must be ready before clone recovery or template deployment begins. No ordinary failed artifact is retried to make the check pass.

The readiness waiter keeps its existing bound of 150 polls at 200 milliseconds. A failed artifact rejects immediately with its metadata, attempts and scheduled-function states. Timeouts and other unexpected errors still fail the run. No error is converted to success and no generic retry wrapper is introduced.

## Separate failure scenarios

`PDF_CLAIMED_WRITE_FAILURE=1` deliberately throws immediately before recordUpload inside the disposable worker's try block. A fixture-only counter must be consumed, and the artifact must enter failed with one retired attempt and no registered candidate. Exactly one authenticated public retry must reach the same artifact with a second attempt, unchanged frozen input and revision rows, and a verified stored PDF hash. This is deterministic failure injection at the captured boundary, not a claim to reproduce actual quota saturation.

`PDF_PRECLAIM_FAILURES=2` remains a separate scenario. Two failed scheduled actions must each leave a durable future watchdog. It must recover with zero manual rescue calls. The new ordinary readiness barriers do not run in this scenario.

Run these commands separately. They share disposable ports 13485 and 13486.

```sh
FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/ordinary.json node scripts/check-pdf-artifact-backend.mjs
PDF_CLAIMED_WRITE_FAILURE=1 FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/claimed.json node scripts/check-pdf-artifact-backend.mjs
PDF_PRECLAIM_FAILURES=2 FAMILY_BACKEND_BINARY=/path/to/convex-local-backend REVISION_EVIDENCE=/tmp/preclaim.json node scripts/check-pdf-artifact-backend.mjs
node --test scripts/*.test.mjs
```

The two fault modes are mutually exclusive. Each fixture owns its temporary source, backend process group and database. Cleanup runs in finally. Shared backends and browser focus remain untouched. #58 owns this script change; #59 and #61 were notified to avoid duplicate edits. #61 can consume the local test-only commit in its final verification PR. No additional PR is required.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Ordinary saves and later recovery writes overlapped original renders. | A captured claimed worker hit the local write quota, mixing pressure behavior into ordinary assertions. | Run write-heavy phases before original PDFs settle. | Observed once in the supplied diagnostic; frequency is unmeasured. | Verification owners. | Test sequencing correction. |
| Earlier cleaned-up failures lack complete diagnostics. | Their exact causes cannot be assigned retrospectively. | Rely on failure counts after fixture cleanup. | Applies to the earlier reported run. | Reviewers interpreting evidence. | Attribution limit. |
