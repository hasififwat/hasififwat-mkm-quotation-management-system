# Issue 76 browser verification

T3 Preview ran against a fresh local Next.js server at `http://localhost:3676/quotations` and an owned SQLite Convex backend on ports 13976 and 13977.

- Baseline from merged PR #85 was `94a072fb7ff27079f46e807d1ce3755988179d2c`.
- Exact tested application commit was `2d243f30ebc8446474917ffa4e390244519b769f`. The runtime source differed from the baseline only by the committed tooltip text. Fixture-only Convex controls seeded the incomplete record and enabled revision release. A local dependency link resolved Next's SWC helper after restart.

| Quotation | Fixture condition | Result |
| --- | --- | --- |
| 1448H-0001 | Hotel snapshot omitted to model incomplete saved details | The exact new copy appeared on hover and Tab focus. Tab and Enter on Preview opened the legacy warning for an incomplete snapshot. |
| 1448H-0002 | Complete, current snapshots | The list rendered no warning trigger. |
| 1448H-0003 | Catalog flight edited after the quotation was saved | The exact new copy appeared on hover and Tab focus. Preview opened the legacy warning for flight details. After local cutover, the same link opened the current migrated saved revision. Reload preserved the reference, saved items and RM 4,800 total. |

The screenshots are cropped to the relevant UI. [Browser assertions](verification.json), [fixture assertions](fixtures.json), and [cleanup](cleanup.json) record the details.

The six scoped quotation test files passed all 140 tests. Next route type generation, TypeScript and the diff check passed. Changed-file ESLint matched the baseline's existing TanStack Table warning with zero errors. The T3 tab, Next process, Convex process, database, generated signing keys and disposable credentials were removed or closed. All three ports were free afterward.
