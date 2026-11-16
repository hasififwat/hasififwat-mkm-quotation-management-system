# QUOTE-003 unnamed extras

Verified only the remaining description claim. Original issues 17-21 and merged changes were not duplicated.

Baseline source 4d16a1ea. Regression test commit c1af0959 fails 24 rejection assertions and passes four named-amount cases. Fix commits f24142ad and 7e2de6a8.

Exact tested source and PR head 7e2de6a810394da5883c7149579f729e9b117dea.

Preview http://localhost:3419. Disposable anonymous local Convex http://127.0.0.1:3417, HTTP actions 3418. Synthetic staff extra-proof@example.test, fixture client Extra Description Proof, fixture package Extra Description Proof Package. No cloud deployment or customer data.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Blank extras saved unexplained adjustments | Empty descriptions persisted with RM50 or negative RM50 items | Blank or whitespace name, authenticated create or update | Deterministic for inputs, usage unknown | Staff and customers | Confirmed and fixed |
| Legacy edit feedback initially hidden | Save blocked with errors on another step | Save legacy unnamed extras from Client Details | Reproduced during review | Staff correcting older quotations | Confirmed and fixed |

## Runtime evidence

[Before video](before.mp4) shows the original saved PDF with unnamed RM50 add-on and RM10 discount. The resulting total is RM1240 against RM1200 room. Direct baseline probes in baseline.txt cover blank and whitespace names in both arrays and both actual deployed Convex mutations.

[After video](after.mp4) shows field errors, correction, save, PDF review, listing total RM1250.25, reopening and reload. The final frame and reloaded.png show Airport transfer at RM50.25 and Courtesy discount at RM0. The video and screenshots were visually inspected before publication. Contact sheets and final video frame are included.

Policy requires at least one non-whitespace character for each extras row, even zero-price rows. Empty arrays remain allowed. Trim checks validity without transforming stored text. Existing amounts, session auth, selection freshness and save-error handling remain in place.

## Checks and review

415 tests pass, including 28 description cases. TypeScript and production build pass. Bounded integrity check passes 864 cases with zero adapter errors. Shared domain and schema lint has zero errors and one pre-existing unused-type warning. git diff --check passes.

Independent gpt-6.1-sol review found the hidden legacy-edit feedback and verified the corrected callback in a fresh review, with 74 targeted tests passing and no remaining actionable findings. Video inspection was performed by the task owner. The cursor-team-kit deslop skill is absent locally, so its named workflow was unavailable; the diff was inspected manually. The referenced global issue-report file is absent; the supplied table columns were followed.

No hosted review or CI pass is implied by these local results. Actual handler tests use an in-memory adapter; live Convex probes and UI persistence complement them. UI create reproduced the baseline bug; corrected UI persistence was verified by editing that record. Corrected create is covered by handler regression checks and live rejection probes.

## Cleanup

Owned preview tab closed. Owned Next and Convex services stopped. Ports 3417-3419 are free. Disposable database, staff, fixture data, session file, environment file and local keys removed. Generated CLI files restored or removed. Parent checkout untouched. See cleanup.json.
