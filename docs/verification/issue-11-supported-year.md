# Issue 11 supported Umrah years

Verified locally on 2026-11-11. The goal is to reject unsupported package years, preserve save/reopen and quotation creation for every offered year, and retain package authorization behavior.

## Revision record

- Requested base, initial HEAD, and local `origin/migration/nextjs-upgrade`: `db4b6555537281618eca5d68bd52bb8cfeb8dbdf`.
- Regression commit: `92beb0b0a66046038b6d5952cd573197850ea7cb` (`test: cover supported Umrah year write boundaries and quotation compatibility`). Production files were unchanged when the regressions ran and when this commit was made.
- Implementation commit: the commit introducing this document, titled `fix: enforce supported Umrah years across package writers`. Resolve its exact SHA with `git log -1 --format=%H -- docs/verification/issue-11-supported-year.md`. The handoff reports both ordered SHAs. A commit cannot embed its own hash.
- Browser-helper snapshot: regression commit plus uncommitted implementation, source digest `56635812fb1abd2b21bf1fb8f94ca1ed6944a7a270edb0ed59b86cda0434622c`. It is not a browser-tested final commit.

## Behavior and scope

The dependency-free keyed catalog owns seven explicit Gregorian-to-Hijri mappings and the two existing selectable choices. `2025/2026` maps to `1447H`, through `2031/2032` mapping to `1453H`. Only `2025/2026` and `2026/2027` are offered. Exact string membership uses `Object.hasOwn`, so inherited property names cannot become years.

The create page supplies an empty string. Both package form schemas retain string input and output, including invalid or historical form state, and refine membership at validation. The picker derives its choices from the catalog. Final submit awaits only `trigger("year")` before setting submitting state or calling fetch. Failure exposes the existing year error on Basic Details. Other field validation, numeric coercion, save controls, and navigation remain outside this change.

The normalizer copies year without a date fallback. Actual create/update and create-with-flight handlers authenticate first, then reject unsupported years before database access. CSV inserts enforce the same rule. CSV existing-record updates continue to ignore their unused year argument. Quotation creation uses the shared lookup and retains existing mapping-error wording and numbering. Database schema, historical reads, and stored records have no migration or automatic correction.

## Executable evidence

Commands run from this worktree with Node `v24.19.0`. Dependencies use an ignored symlink to the existing root `node_modules`. No dependencies were installed. Set `pnpm_config_verify_deps_before_run=false` for pnpm commands below; otherwise pnpm tries to reinstall the shared dependency directory and aborts for lack of a TTY.

| Command | Before | After |
|---|---|---|
| `node --test scripts/supported-umrah-years.test.mjs` | 64 tests: 13 pass, 51 fail | 64 tests: 64 pass, 0 fail |
| `pnpm test:packages-auth` | Established baseline: 32 pass | 32 pass, 0 fail |
| `pnpm typecheck` | Established baseline: pass | Pass after `pnpm exec next typegen` generated ignored Next declarations |
| `pnpm exec convex typecheck` | No checked-in Convex tsconfig | Pass using the installed Convex package's exact `tsconfigCodegen()` output temporarily at `convex/tsconfig.json`; removed after the command |
| `pnpm lint` | 20 errors, 37 warnings | 20 errors, 37 warnings, exit 1 |
| `git diff --check` | Clean | Pass |

The initial root typecheck exposed missing generated Next image declarations, and the first refinement inferred a narrowed output type. Generating Next declarations and annotating the refinement callback's boolean return preserved the required string output. The final root typecheck passes. The first Convex command refused to run without its tsconfig; the subsequent command with the temporary official config passed without deployment or codegen.

Failing-before output is retained locally at `/tmp/mkm-year-red.tap`; passing output is `/tmp/mkm-year-green.tap`. The intended failures include `Missing expected rejection` from unsupported writers, schema accepting `2026`, and the normalizer returning `2025/2026` for missing year. One failure records the not-yet-created catalog. All seven valid create/reopen/update/reopen/quotation cases passed before and after. Auth output is `/tmp/mkm-year-auth.log`; root and Convex typecheck logs are `/tmp/mkm-year-typecheck.log` and `/tmp/mkm-year-convex.log`.

Lint JSON is `/tmp/mkm-year-head-eslint.json`, compared against `/tmp/mkm-year-base-eslint.json`. Diagnostic file, rule, severity, and message multisets match exactly after normalizing absolute paths and ignoring shifted line numbers. No suppressions or unrelated lint fixes were added.

## Fixture coverage and limits

The tests transpile actual TypeScript modules and invoke the actual registered Convex `_handler` functions. The loader resolves relative TypeScript dependencies; application imports were not changed to accommodate mocks. The in-memory database implements the query indexes and read/insert/patch/delete operations used by these paths. Each test owns fresh disposable tables. There is no network or backend connection, and all fixtures disappear when the process exits.

The invalid matrix covers empty, calendar `2026`, malformed separators, leading/trailing whitespace, unsupported past/future ranges, `constructor`, `toString`, and `__proto__`. Every invalid writer case starts with a package and children, then checks zero database operations and unchanged tables. Anonymous calls with absent arguments establish authentication before argument inspection and database access. Missing-year normalization is asserted independently and sent to the actual create handler for rejection.

Each of all seven accepted years runs actual normalized create, getById, transformed update, getById, and quotation create. Assertions independently specify the expected Hijri code, reference such as `1447H-0001`, and persisted package snapshot year. Both offered years are included. Alternate writers exercise supported insert paths too, and CSV update accepts an ignored unsupported year without changing stored year. These are handler-level integration tests, not Convex hosted transaction or browser tests. UI wiring was inspected directly; no source-text tests or component rendering are represented as end-to-end proof.

## Browser attempt and cleanup

Read the app-verification skill and package journey. Ran `node .agents/skills/verify-mkm-app/scripts/control.mjs start --port 3101` against an isolated source snapshot. The ignored root environment file was copied locally without printing it. No account was created and no shared backend writes were performed.

Evidence directory: `/private/var/folders/kz/7v60t07j1cx_rrw_3km16pq80000gn/T/mkm-verify-J1xtTF`.

The helper started Next 16.3.4 but Turbopack rejected the shared dependency symlink with `Symlink .../node_modules is invalid, it points out of the filesystem root`. HTTP readiness failed before browser navigation. `preview_status` showed default and incognito profiles but no active tab. No tab was opened, screenshot captured, or browser persistence verified. The parent baseline attempt also lacked authenticated disposable fixtures, as recorded in `/private/var/folders/kz/7v60t07j1cx_rrw_3km16pq80000gn/T/mkm-verify-o4uvgc`.

The helper's automatic cleanup ran, followed by explicit `control.mjs stop` for the owned run. `cleanup.json` confirms workspace removal and retained evidence; `lsof -iTCP:3101 -sTCP:LISTEN` returned no listener. The copied worktree `.env.local` was removed. The temporary Convex tsconfig was removed. No generated files, secrets, or screenshot claims are committed. No push, PR, ticket update, deployment, merge, or historical-data change occurred.

Known gaps below use inferred rarity, not production measurements.

| Finding | What goes wrong | What it takes to hit it | Rarity | Who is hurt | Bucket |
|---|---|---|---|---|---|
| 1. Authenticated browser proof remains incomplete | Final-submit error display and save/reopen/quotation persistence have no end-to-end browser evidence | Run the builder with a working dependency snapshot, authenticated account, and disposable deployment | Common in this local setup, inferred | Reviewer lacks UI proof | Accept as known gap for this handoff; parent must assess before UI PR merge |
| 2. Existing lint debt | Full lint exits 1 despite zero new diagnostics | Run full repository lint | Common, measured on base and head | Maintainers cannot use full lint exit as a new-regression signal | Accept as known gap; unrelated to issue 11 |
| 3. Unsupported historical values need deliberate selection on save | An existing invalid year cannot be saved again unchanged | Edit an old package outside the seven supported ranges | Occasional, inferred; production prevalence unknown | Package editor must choose a supported year | Accept as known gap required by the requested write invariant; historical reads remain available |

A disposable authenticated environment would allow the missing browser evidence. Production counts could change the historical-value rarity assessment. No live audit was performed.

## Implementation decisions

Model the Domain put mapping and selection policy in one catalog. Boundary Discipline placed guards after authentication at the writers. Test Behavior, Not Implementation drove assertions through registered handlers and persisted snapshots. Laziness Protocol kept the final submit change to year validation and removed the duplicate quotation map. Prove It Works required successful valid paths alongside rejection tests and an explicit statement of the browser limit. The unavailable external deslop skill was not installed; the diff received manual cleanup instead. The parent retains independent review, push, PR, and ticket ownership.
