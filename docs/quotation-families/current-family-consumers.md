# Current family consumers

Staff need one current quotation per family in operational screens. Saved revisions keep their own identities and values.

The shared reader queries families by archive state, fetches each exact current pointer, and uses the family index with an absent family ID for ungrouped legacy rows. It selects current pointers before filtering, sorting, counting, and pagination. Family archive state owns visibility. Legacy ungrouped rows retain their row archive behavior. Broken pointers never promote an older revision.

Two independent design helpers compared a derived current collection with a materialized operational document. The derived collection won because existing queries already collect rows. Materializing labels and totals would require changes to save and client merge writers owned by other tickets. Client and package history association summaries still collect retained revisions to report their separate historical counts. The operational reader itself does not collect historical revisions.

`quotations.listPaginated` accepts `searchTerm`, `package_id`, canonical `client_id`, and `visibility` of `current`, `archived`, or `history`. History contains revisions excluded from current operational results, including archived families. Package statistics link to that separate history filter. Cursor values contain the sort value and exact ID. Saved labels and base or full references drive search. Saved client IDs remain available as `saved_client_id`; `client_id` resolves canonical navigation.

`quotationFamilies.history({family_id})` returns `{family, revisions}`. Revisions are ordered by ascending revision number. Exact review IDs remain usable under authentication. Ticket #59 owns the complete history route and editing experience.

`quotationFamilies.archive({family_id})` authenticates and requires the existing revision release and completed family migration. It patches family visibility and inserts one `family_archived` event against the current revision. Repeated requests preserve the pointer and add no event. It never patches quotation or item content. The release remains disabled in repository configuration.

Client reads resolve transitive aliases before grouping and pagination. Current counts and `total_quoted_value` exclude archived families and old revisions. Client detail exposes `historical_quotations` separately with exact IDs and saved names. Package operational counts use the same current set. Existing reference guards still inspect retained data.

Model the Domain shaped the shared current reader. Prove It Works requires actual registered handlers, disposable Convex transactions, and authenticated UI evidence. The external issue-table file and deslop plugin were absent, so review uses the supplied columns and direct diff cleanup.

## Recorded UI verification

Actual authenticated Chrome captures at `http://localhost:3520` used implementation `3b778621a285a90e52a918d3313ac136a1ac2425`. The disposable backend used ports 13765 and 13766. Thirteen families retained 39 revisions. Page one showed ten current revisions, and page two showed three. Archiving a family removed it immediately. The archived list retained its R2 after reload, with no Edit action. Client detail independently showed 12 current quotations, RM1,278 in quoted value, and 27 historical or archived revisions. An exact original revision review link rendered and survived reload. Current and historical package deep links and base-reference search worked.

The backend snapshot initially preceded the history validator addition. Updating only local backend product files corrected the fixture mismatch, and both package links were rerun. No product fix was required. The later archive migration guard and indexed-reader correction are backend-only. Their actual API persistence tests are separate from these captures. The full history route link belongs to #59 and was not exercised. The existing review rendering does not establish authoritative issued PDF bytes.

The native window and T3 tab were closed. The isolated backend and web processes were stopped, and their synthetic database, storage and credentials were removed. The shared backend was untouched. Application-only images exclude browser bookmarks and credentials. [UI proof](current-family-ui-evidence.json) and [backend proof](current-family-backend-evidence.json) distinguish their tested commits.

## Reproduce backend checks

Run `node --test scripts/*.test.mjs`, `node_modules/.bin/tsc --noEmit`, and the explicit backend compiler with JSX and JSON imports enabled after the merged PDF dependency. Run the disposable transaction verifier as follows.

```sh
FAMILY_BACKEND_BINARY=/path/to/convex-local-backend CURRENT_FAMILY_EVIDENCE=/tmp/current-family.json node scripts/check-current-family-backend.mjs
```

The verifier owns ports 13665 and 13666 and cleans its entire backend process group. It uses actual PDF scheduling and renderer dependencies. Its mutation retry applies only to an explicit local `TooManyWrites` rejection and preserves the command and request key. Missing or incomplete migration must reject with the inactive-release error, so throttling cannot stand in for that guard.

Clean source `b3d59e3b1e81af49a060982b7cfa5b6f2663532a` passed the real backend run, all 622 repository tests, application typecheck, and explicit backend typecheck. Fresh independent review passed 31 focused handler tests and found no remaining guard or indexed-reader defect. Its remaining history-summary cost is recorded above. The final evidence commit changes documentation and images only. Model configuration restricts review to Codex; no different-provider judge was used.

A later copy-only correction makes the client-list long-press summary use the quotation's saved `client_name`. Canonical account headings and navigation remain current. `scripts/client-quotation-copy.test.mjs` executes real save, merge and list handlers, then the compiled actual row callback with a controlled clipboard. It proves that merging into a differently named account does not change the copied quoted name. This changes no layout. The full suite now contains 623 tests.
