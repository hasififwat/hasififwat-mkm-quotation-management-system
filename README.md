# Safe schedule removal review

Staff can import recognized package and flight CSV rows while saved flights remain protected until staff confirm a complete named scope.

Baseline `bab5e142207df4bac78e54956f44c12d389ec045`.
Tested head `fa30682dea27b01000b34f5d4432fa07aa080085`.
Final preview `http://sync45.localhost:3550/packages/sync`.
The baseline captures used the owned origin `http://sync3550.localhost:3550/packages/sync`. One initial unsupported-file reproduction used localhost before the origin was isolated. The published baseline captures use the isolated origin.

## Actual browser evidence

These are screenshots of the actual Next app and actual disposable local Convex backend on ports 3560/3561. All records and staff identities are synthetic. No endpoint, UI state, or persistence result was mocked. No shared backend was deployed or mutated.

- [Unsupported file before](before-unsupported.png) proposes two removals. [After](after-unsupported.png) recognizes zero rows, reports a file diagnostic, and preserves both flights.
- [Unknown alias before](before-unknown.png) proposes two removals. [After](after-unknown.png) names the rejected alias and disables missing-flight removals.
- [Unsupported year before](before-year.png) proposes two removals. [After](after-year.png) reports the unsupported 2028 departure. The final fixture uses a matching 2028 return to isolate the unsupported-season condition. The baseline fixture had a 2026 return, so it also violated chronological order.
- [Partial file before](before-partial.png) proposes removing the omitted November 10 flight. [After](after-partial.png) preserves it and leaves authorization unchecked.
- [Addition review](addition-review.png) adds November 15 and preserves November 1 and 10. Staff clicked Apply in the real UI. [Flight Audit](after-add-audit.png) and [full navigation and reload](after-add-reload.png) show all three sync flights plus the unrelated manual flight. The live query in [saved-after-add.json](saved-after-add.json) independently agrees.
- Selecting a scope alone still displayed zero removals. [Completeness confirmation](scoped-confirmation.png) and [final review](removal-review.png) show the uploaded filename, MENARA JAM, MS - NOV, November 1–24, and two intended removals. Staff confirmed that partial.csv was authoritative for this deliberately narrowed test scope and clicked Apply. [Expanded review](removal-expanded.png) records the detailed review state.
- [Flight Audit after removal](after-remove-audit.png) and [after reload](after-remove-reload.png) show November 1 retained and November 10/15 removed. The unrelated manual flight remains. [Saved query](saved-after-remove.json) independently agrees.

The layout of the diagnostic, review, and saved Flight Audit captures was inspected. Screenshots prove the rendered states and saved records described above. Unit tests additionally cover unknown sections, impossible dates, malformed rows, preamble shifts, manual/out-of-range/other-package preservation, and intentional removal of a scope's final flight. Those additional cases are not claimed as browser journeys.

The first disposable runtime was stored under .next and was cleared by the production build. Its owned backend was stopped. Synthetic fixtures were recreated in a separate runtime outside the build cache before corrected captures. Baseline and final IDs therefore differ. Their package, dates, and source values are equivalent. Persistence claims concern the uninterrupted final runtime only.

## Verification

Regression commit `5d53cae5` precedes the fix. [Failing output](tests-before.tap) includes the intended failures.

```text
✖ unsupported upload never proposes saved-flight removal
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
1 !== 0
```

[Final focused suite](tests-after.tap) passes 13 tests. [Repository suite](tests-all-final.tap) passes all 519 tests. Run `node --test scripts/sync-schedule-safety.test.mjs` or `node --test scripts/*.test.mjs` from the checkout.

Installed Next type generation and `pnpm typecheck` pass. [Final production build](build-final.txt) passes at the tested head. [Changed-file lint](scoped-lint.txt) exits successfully with four pre-existing hook-dependency warnings. `git diff --check` passes.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
| --- | --- | --- | --- | --- | --- |
| Existing full-repository lint debt | Full lint exits nonzero with 20 errors and 35 warnings in its recorded run. Changed-file lint has no errors. | Run pnpm lint across the repository | Deterministic in this checkout | Maintainers expecting a clean global lint gate | Existing debt outside this focused repair |

[Full lint output](full-lint.txt) records the existing errors. No suppressions were added.

The initial independent source review found a preamble diagnostic gap. Commit `3844e30c` fixes it and adds a regression. A later compatibility check found that ordinary column labels also needed to be accepted. Commit fa30682d accepts exact supported header labels. All final browser captures were repeated at that head with FLT/DATE/PACKAGE headings. A fresh final source/test reviewer confirmed both corrections and found no further blocker. The separate comment review resulted in one narration deletion and no suppression flags.

## Scope and integration

The parser now returns rows, diagnostics, available removal scopes, and a count of preserved missing flights. The UI separately records selected scopes and the staff completeness confirmation. Diagnostics veto missing-flight removals. Valid recognized rows remain importable. Conservative diagnostics can require a corrected export before destructive replacement is available.

The fixed-column MFF parser and current price-list season mapping remain supported. This is not general spreadsheet recognition. Staff must know whether the selected file is complete. The software does not infer completeness from a successful parse.

The planner, Apply loop, and mutation contracts are unchanged. #44's stable edited-flight IDs and reference protection remain a separate integration point. This repair filters absence-based removed rows before the planner. Prices and stale-intent handling belong to #46/#47 and are outside this proof.

## Cleanup

[Cleanup proof](cleanup.json) records both owned tabs closed, frontend/backend stopped, ports 3550/3560/3561 free, and the disposable runtime removed. Deleting that owned runtime removed all synthetic fixture records, accounts, signing keys, and generated credentials. The temporary checkout environment file was removed. Evidence remains outside the runtime. No shared browser cookies were changed or cleared.

[Source manifest](source.json) records the exact tested head and hashes. The dedicated evidence branch contains only evidence, not credentials or application changes.
