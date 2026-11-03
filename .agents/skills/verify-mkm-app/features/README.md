# MKM verification map

Start with the skill's launch and doctor steps. Each entry records real UI paths
found in this checkout; a mapped journey is not a claim that it passed.

## Preconditions and proof

Anonymous login validation and appearance need no database rows. Authenticated
journeys need a verification agent, the intended Convex deployment, and records
identified through its UI. A usable quotation fixture needs a client, a package
for a mapped Gregorian year, a flight belonging to that package, and a room.
There is no automatic fixture seeder in this checkout. Missing fixture/auth
preconditions are explicit failures to run, never successful empty-state proofs.

Capture each entry point separately, along with the action and resulting state.
Use fresh ARIA refs from `preview_snapshot`, then `preview_act`. The selectors
below are fallbacks grounded in current labels and source IDs. Read-only
`preview_evaluate` can inspect URL, storage, validity, and current values.
Save screenshots, snapshots, and assertions in the helper's returned `runDir`.
Mutation journeys require a disposable backend and persistence checks after
reload; they were not exercised by the initial anonymous smoke run.

## Features

- [Authentication and agent accounts](authentication.md): login validation,
  successful login, protected entry, sidebar sign-out, and account form.
- [Appearance](appearance.md): theme toggle and persistence on login/signup.
- [Packages](packages.md): listing/search and both creation entry points.
- [Clients](clients.md): listing/search, quotation history, and creation paths.
- [Quotations](quotations.md): listing/search, builder entry points, save/review.

Flight management, schedule imports beyond opening their page, PDF content,
duplicate cleanup, and statistics need additional feature entries when verified.
