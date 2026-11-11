---
name: verify-quotation-integrity
description: Run bounded exhaustive checks on the actual Convex quotation create/update handlers, covering anonymous writes and package/flight association, with mutation tests and source coverage records. Use when changing those mutations or reviewing quotation write integrity.
---

# Verify quotation write integrity

Two promises are checked:

1. An unauthenticated caller cannot successfully write quotation records.
   A violation lets someone create or change business quotations without signing in.
2. Every successfully stored quotation uses a flight belonging to its selected
   package. A violation can put the wrong itinerary on a customer's quotation.

The first target was chosen because the UI is login-protected while these
public mutation handlers have no identity check. The second guards an explicit
validation in both write paths. This skill checks the real TypeScript handlers;
it does not replace them with a hand-written model of their control flow.

## Run

From the repository root, after its normal `pnpm install`:

```sh
node .agents/skills/verify-quotation-integrity/scripts/check.mjs
```

The executable helper prints a JSON summary with an evidence path. It creates a
private temporary evidence directory by default; `--out /tmp/mkm-formal/result.json`
chooses an explicit result path. No server, deployment, secrets, or network calls
are needed. It uses the installed Node runtime, TypeScript **5.9.3**, and Convex
**1.45.0**; setup was executed on Node **24.19.0**. It stops if either pinned
package version changes, so recheck the adapter before updating those pins.

Exit `0` means both properties hold within the stated finite scope. Exit `1`
means at least one property has a counterexample. Exit `2` means adapter or
execution errors invalidate the run. An assertion/loader exception is also a
failed execution, never a proof that inputs were safely rejected.

## Scope and tool

The repository has no existing TypeScript SMT/proof integration. The supplied
tool performs **bounded exhaustive execution**, not an unbounded mathematical
proof. It transpiles `convex/quotations.ts`, obtains the actual registered
`create._handler` and `update._handler`, and executes each against an in-memory
adapter for exactly the database operations those paths currently use.
Shared TypeScript dependencies resolve through `scripts/helpers/load-typescript.mjs`. The checker
compiles each original or mutant quotation source separately, so dependency
loading does not replace the source under test.

All **864** cases in this Cartesian product run, with one operation per fresh
database state:

- operation: `create`, `update`;
- identity: absent, one authenticated identity;
- selected package: `p1`, `p2`, absent;
- selected flight: `f1` belonging to `p1`, `f2` belonging to `p2`, absent;
- client: present, absent;
- room selection: existing `quad`, unknown room type, empty;
- quantity: `1`, `2`;
- unit price: `0`, `100`.

Each database has two packages/flights/rooms, one client, and one existing draft
quotation. Rejected calls are treated as rolled-back transactions. Successful
calls expose the real handler's stored quotation and write trace. Positive
authenticated create/update witnesses are required to prevent a vacuous pass.

The claim covers this finite data domain and adapter assumptions only. It does
not establish live endpoint reachability, Convex schema validation, auth token
validation, user roles/ownership, concurrency/retries/transaction serialization,
snapshot refresh, all numeric inputs/rounding, PDF output, or the whole app.
Database SDK imports and registration are real; database storage is simulated.

## Read results

Open the evidence JSON and inspect each property's `failures` and
`firstCounterexample`. The counterexample uses code nouns: operation, identity,
package, flight, client, room, quantity, price, returned result, and attempted
writes. For a thrown call, unexpected errors on a valid authenticated fixture
are reported as adapter errors rather than counted as a safe rejection.

At generation, `flight_matches_package` passed all cases.
`authenticated_writes` failed in **16 cases**, eight for each operation. Example:
an absent identity submits client `c1`, package `p1`, flight `f1`, and room `quad`;
`create` successfully inserts a quotation, its line item, and its audit log.
The current `update` path likewise patches the quotation and writes its items/log.
These are findings about the current code, not a reason to weaken the property.

Report issues using the repository's required issue table. Distinguish local
handler reproduction from a live deployment test. Do not edit product code as
part of maintaining this verification unless the user requests that fix.

## Prove the checker can fail

```sh
node .agents/skills/verify-quotation-integrity/scripts/check.mjs --self-test
```

This writes scratch copies of the **actual source**, removing the
`selectedFlight.package_id` guard from `create` and then `update` separately.
It executes all 864 cases against each scratch variant and requires new
`flight_matches_package` failures. It then reruns the untouched original source
and requires an identical baseline. Scratch source and counterexamples remain
beside the evidence JSON. Product files are never patched by this self-test.

The current run still exits `1` because the original authentication finding
remains. Inspect `mutationTests[*].detected: true` and `baselineRestored: true`;
do not interpret that exit as a failed mutation test or silently suppress it.
The authentication property already has real counterexamples in the current
code; after adding a guard in a separately authorized fix, add a scratch mutant
that removes that guard and confirm that the authentication check fails again.

## Coverage and synchronization

Read [coverage.json](references/coverage.json) before interpreting a result.
It records the inspected commit, exact working-tree source digest, functions,
and supporting entry points. This source is uncommitted at generation, so the
commit alone does not identify the verified implementation.

On changes to `create`/`update`, their helper calls, auth, database operations,
or supporting route/client code, inspect the diff and current source. Adjust
the adapter and domain only to describe the new code; never adjust them merely
to make failures disappear. Unknown database operations must fail the adapter.
Extend the domain for new decisions or relationships. Rerun the checker and
mutation tests, then update coverage to the inspected commit **and** working-tree
digest. Move the sync record only after checking that correspondence.

Use `/maintain-formal-verification-skill` after merges or changes that skipped
this check. This is not a TLA+ model, so the TLA+-specific `/statechart` result
workflow does not apply.
