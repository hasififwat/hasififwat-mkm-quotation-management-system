# Package text verification

The owned T3 Preview used http://localhost:57438/packages and a disposable Convex instance at http://127.0.0.1:57436. The production React Router build ran at commit e283a39a548315bdca35f8ebf1017aa83c2a548e. The original failures were captured on origin/main at 2146747f39f8ff6332d9ee7098a98dcae114bd03.

## What the baseline did

The package-row button opened the existing text preview and allowed picking package flights. A month query found March. Searching for the visible departure “29 JAN” returned no options. The mobile row used an unlabeled Copy icon even though tapping it opened a preview. The old schedule importer persisted 12 HARI 10 MALAM. The preview faithfully repeated the stored value.

## Checks on the PR

- Imported two flights from a synthetic schedule. The form blocked blank and whitespace durations. A second direct check rejected missing and whitespace durations without creating a package. Reimport preserved the existing duration and both flight IDs.
- The package list and edit form retained the configured duration after reload. An older import was corrected from 12 HARI 10 MALAM to 8 HARI 6 MALAM in Package Edit. The published Orchid Journey package produced a desktop quotation PDF containing “JUMLAH HARI 9 HARI 7 MALAM”. The mobile review showed the same duration.
- Uploaded a separate synthetic Master Price List and MFF schedule through Sync Packages. Apply created one package and two flights. Search found the 17 July departure and generated text retained the price list's 11H/9M duration.
- Searched by departure and return on /packages. Selected two date ranges from one package, including one spanning January and February. Both appeared in the text with their respective routes, enabled room price and hotel. The disabled room price was absent. Removing one chip removed only its flight. Empty selection disabled copy.
- Used a UTF-8 .txt file with {{name}}, {{duration}} and the required {{flights}} placeholder. {{hotels}} is also supported. Rejected a CSV, a file over 64 KiB, malformed UTF-8, a missing flights placeholder and an unknown token. An invalid replacement retained the last valid template. Use default restored the standard WhatsApp format. Templates are local to the open preview.
- Compared the system clipboard with the complete rendered custom text after clicking Copy Preview on desktop and in a 390 × 844 mobile drawer. Both comparisons passed. This used T3 viewport emulation.
- Production build and git diff --check passed. Both typecheck runs returned 2 and reported 17 diagnostics. Their full output matched after stripping diagnostic line and column numbers.

The legacy schedule format documented in docs/APP-FEATURES.md has no field for the number of hotel nights. The separate docs/SYNC.md describes duration from a price list. Existing records do not distinguish an intentional 12 HARI 10 MALAM from the old importer default. They can be corrected individually in Package Edit. No migration or backfill ran.

The browser tab closed and all three ports were released. The fixture database, auth keys, uploaded files and generated worktree files were removed. The preview URL identifies the test run and is offline after cleanup.
