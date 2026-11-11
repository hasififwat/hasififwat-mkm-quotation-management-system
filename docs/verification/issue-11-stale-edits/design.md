# Package edit baseline

The data shape is `PackageEditToken`, a versioned canonical serialization of canonical raw package, hotel, meal, room, and flight documents. The read query produces it from the same snapshot as the editable form. The mutation recomputes it before writes. Missing, empty, or mismatched tokens produce `PackageEditConflict`.

| Candidate | Coverage | Maintenance | Choice |
| --- | --- | --- | --- |
| Aggregate snapshot | All parent and child writers, regardless of timestamp discipline | One canonical document projection, no stored revision | Selected |
| Comprehensive revision | Every writer must increment one package revision | Broad writer edits and migration; a missed bump silently bypasses protection | Rejected |

Both independent Sol design explorations favor the aggregate. The parent owner selects the design. Cross-family judging is skipped under the project configuration. Include raw document identity and metadata to detect replacement and fields absent from the builder. Sort object keys and child documents by identity so database enumeration order does not create false conflicts. Read only this package's meals. The token repeats loaded package data in transport. This avoids a new hash dependency and is bounded by the existing package aggregate. It is an equality precondition, not an authentication secret.

The mounted builder owns a frozen initial form, including its baseline. New props cannot replace the baseline while preserving older field values. A typed HTTP 409 enters a separate conflict state, retains the editable draft, and blocks repeat saves. Staff download before leaving, open the current package in another tab, and manually re-enter their intended changes there. Validation and reference rejections remain correctable; unknown outcomes retain their existing barrier.

The guard relies on Convex transaction reads and conflict scheduling for concurrent transactions. Local sequential handler tests establish rejection and zero attempted writes. They do not test deployed transaction scheduling.

## Throughput checkpoint

- Blocking first steps. Fetch and rebase, confirm WI4 merge, read prior trail and skills, ground subsystem, compare independent designs, reproduce failure.
- Independent workstreams. Read-only grounding and design exploration. One owner implements handler, transport, form, and tests after the choice.
- Shared mutable state. One writer owns the branch. Package data needs one transaction comparing the loaded aggregate with current state before replacement.
- Smallest safe decomposition. One feature PR spans query, form, route, and handler because omitting any boundary breaks the guarantee.
