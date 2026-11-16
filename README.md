# Safe CSV sync for existing quotations

Staff can edit a sync-managed flight without replacing its ID. Genuine flight deletion and room-type removal reject when an existing quotation needs them.

Baseline `bab5e142207df4bac78e54956f44c12d389ec045`.
Final browser and targeted-test commit `8a34203f020164c4662026745329066b9641675c`.
Production build and integrated source review commit `c6948fb67f91634cf38d73dc9f09d471df90365c`. The final commit changes one UI sentence from replacement to in-place update. Final TypeScript and 43 sync/reference/auth tests pass afterward.
Stack base `fix/43-flight-staff-sessions` at `6ca78412`.
Fixed preview `http://sync44.localhost:3530`. Baseline preview used `http://127.0.0.1:3530` before the coordinator identified cross-port cookies. No failed authentication attempt counts as feature proof.

## Actual app media

[Baseline video](before.mp4) shows the actual CSV review and apply. It reports one added and one removed flight. [Baseline persisted reads](before-applied.json) show that the quotation retains the deleted ID and reports `flight.removed`. The baseline video ends with a navigation/auth interruption. It does not prove a baseline edit/save interaction. Both successful and failed replacement were reproduced separately by the actual-handler and extracted-apply probe, recorded in [baseline handler proof](evidence.json).

[Rejected update video](failed.mp4) and [rejection screenshot](failed.png) show the actual app reporting the quoted Quad room conflict and real flight date validation rejection. A one-shot browser-local WebSocket send wrapper changes only the outgoing updateFlight return_date to invalid-date. The real mutation rejects it. No handler, response, page, React setter, or persisted result is mocked. The wrapper restores native send immediately. [Persisted failed-apply read](failed-apply.json) shows the same flight ID, original KUL-JED sector, unchanged Quad selection, and no stale fields.

[Successful update video](after-trimmed.mp4) shows retry without the fault, one flight updated, quoted Quad removal rejected, and the existing quotation editor with its Save action. The recording is trimmed before blank frames caused by navigation. It does not visually prove the review, reload, or audit. [Apply screenshot](after.png), [reloaded editor](reload.png), and [second-view audit](audit.png) show the rendered states. Layouts were visually inspected.

The same flight ID changes from KUL-JED to KUL-MED. [Persisted sync read](successful-apply.json) confirms the ID. [Post-save read](after-quote-save.json) and [assertions](persistence.json) confirm the same quotation, selected room price/pax/subtotal, total, and selected flight snapshot. Saving the quotation recreates quotation-item IDs as existing behavior. The package's available_flights field is a live query projection. It correctly changes to KUL-MED while the selected flight snapshot remains KUL-JED and existing stale-flight feedback remains visible. The sync does not refresh historical quotation values.

[Live transport proof](live-before.json) records an invalid update retaining the flight, genuine quoted deletion rejecting, and anonymous updateFlight rejecting against the disposable Convex backend. These are real HTTP mutation calls. Browser media establishes user continuity, while the persisted reads establish identity and saved values.

## Regressions and checks

Failing regression commit `203cae45` precedes the repair `5b4b9db3`. The base auth branch retains its own failing regression. The integration merge preserves both histories.

Before, verbatim excerpt from [regression output](regression-before.txt).

```
✖ edited flight success preserves quotation selection (33.00575ms)
✖ edited flight rejection preserves quotation selection (2.669917ms)
✖ referenced genuine deletion rejects without writes (30.058042ms)
```

After, [regression output](regression-after.txt) passes all eight new cases. The integrated independent source review ran 88 focused tests. The [final focused run](final-tests.txt) passes 43 tests at the final head. [Final TypeScript](final-typecheck.txt) passes. [Production build](build-integrated.txt) passes. The [build manifest](build-integrated-manifest.json) records the snapshot-only Turbopack root adjustment needed by the external dependency symlink.

[Scoped lint](integrated-changed-lint.txt) has zero errors and four existing hook warnings. [Full lint comparison](lint-comparison.json) confirms the same baseline 20 errors and 35 warnings with no added findings. No lint suppression was introduced.

The source review approved the ID preservation, reference guards, auth-before-read ordering, sixth-operation authorization inventory and staff positive case, and unchanged prices/snapshots. Its only requested correction was the final UI sentence. Changed-line comment review found no added comments or suppressions. The unavailable cursor-team-kit deslop/control-ui skills were replaced with scoped diff inspection and the project-local verify-mkm-app workflow using T3 shared preview.

## Boundaries and cleanup

All staff identities, clients, packages, flights, quotations, and CSVs are synthetic. Source snapshots and generated signing credentials are private. Backend ports 3540/3541 and frontend 3530 were reserved to this task. No shared cloud backend was deployed or mutated. The app and backend ran from copied sources. The production build completed before the final browser snapshot launch.

This repair does not make the complete sync atomic. Independent operations can succeed while a referenced room removal rejects. Parser completeness, price comparisons, and stale sync intents remain separate tickets. Baseline failed-add evidence is a handler/apply test with an injected add failure, not a captured live failure. Fixed failure evidence uses actual local transport validation, not a simulated offline network.

[Cleanup record](cleanup.json) confirms both owned instances stopped, the owned tab closed, and all three ports closed. The interrupted deletion command was not retried or disguised. Both old and fresh instance directories, database records, generated credentials, and the private build snapshot remain private pending cleanup approval. No data or credential deletion is claimed. Those directories are outside the repository and are excluded from this evidence branch.
