# Verification record

This record applies to commit `e98314b847fd7813de30a068f8a23e0efa470d28` and the working-tree state recorded in the [overview](README.md#snapshot). Checks ran on 2026-11-07. Application behavior was traced from source. No live backend, login, browser journey, or PDF download was exercised.

## Executed local checks

| Check | Result | What the result establishes |
| --- | --- | --- |
| `pnpm test:packages-auth` | 32 tests passed. | The actual registered package handlers reject anonymous fixture calls before database access. Selected authenticated list, publication, and archive behavior passes. The server client forwards separate request tokens and selects the configured URL through mocked HTTP transport. |
| `node .agents/skills/verify-quotation-integrity/scripts/check.mjs --out /tmp/mkm-feature-map-integrity/result.json` | Exit 1. All 864 cases executed. Authentication has 16 counterexamples. Package-flight association has zero counterexamples. Adapter errors are zero. | The actual quotation create and update handlers can write with an absent identity in the bounded in-memory model. Selected flights belong to the selected package in every successful case within that model. This is not a live exploit test or an unbounded proof. |
| Source digest comparison | `convex/quotations.ts` SHA-256 is `2e17467c227153a16eba3fcfb61d9c3579dc59fa657e4280908ea79853e4b9b6`. | This matches the digest in the existing integrity coverage record. Its old `lastSyncCommit` alone would not identify the current snapshot. |

The full integrity evidence was written to the temporary path in the command. The stable result is summarized here because temporary evidence is not a permanent repository artifact. The checker did not run its optional mutation self-tests in this session. The [integrity skill](../../.agents/skills/verify-quotation-integrity/SKILL.md) explains the fixture domain, rollback assumptions, and adapter limits. The [coverage record](../../.agents/skills/verify-quotation-integrity/references/coverage.json) describes its prior run.

## Documentation checks

`node docs/feature-map/check.mjs` passes with all 26 page and API files, all 57 registered Convex functions, and 42 feature IDs accounted for. The checker validates all local Markdown destinations and feature mappings without failures. The manifest assigns operations to explicit feature anchors.

Mermaid CLI 11.15.0 rendered all 10 diagrams from the eight Markdown files containing diagrams into SVG without errors. The tools and render output are under temporary directories, outside application dependencies and the commit. The overview was also inspected through the HTML preview at 728 pixels wide, with no console messages or clipped labels.

Re-run the commands in [maintenance.md](maintenance.md) after a source or documentation change. A passing link, inventory, or render check does not prove that a documented feature works at runtime.

## Runtime evidence boundary

The existing [MKM verification skill](../../.agents/skills/verify-mkm-app/SKILL.md) defines app journeys and a snapshot launcher. The launcher isolates the web source and cache, but not the configured Convex backend. Data journeys require an authenticated agent and disposable records. No such data journey was needed to produce this source-based map.

The [single findings table](findings.md) records consequential defects and remaining verification gaps. Deployment state, customer data frequency, third-party auth behavior, actual generated PDF layout, and browser-specific behavior remain outside the executed checks.
