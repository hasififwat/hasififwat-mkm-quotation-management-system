# Dependency projection with an authoritative mutation guard

Staff need to edit packages without removing flight IDs or room types that existing quotations need. This candidate gives the builder a read-only dependency projection and repeats the check within the package update transaction.

## Observed ownership

`convex/quotations.ts` stores `quotation.flight_id`. Both create and update require the exact selected flight to exist and belong to the selected package. A flight snapshot preserves display details but does not make a missing ID valid for saving.

`getQuotationForEdit` at line 735 resolves each room selection as the linked current room's `room_type`, falling back to `quotation_items.description`. Update at line 1143 matches current package rooms by exact `room_type`. It does not compare room IDs or require `enabled`. Disabled rooms remain valid dependencies under the actual handler. Do not introduce a new enabled-room rule in this work item.

`PackageBuilder.handleImport` at line 219 replaces rooms with imported rows and clears their IDs. The final form uses the same update route and mutation as ordinary edits. That route currently converts every mutation error to HTTP 500. The builder treats only HTTP 400 as a known rejection; all other failures enter the manual unknown-outcome contract.

## Caller usage sketch

```ts
const requirements = useQuery(api.packages.quotationRequirements, { id });
const impacts = findReferenceConflicts(requirements, proposedSelections);
// Builder can explain impacts before dispatch, but never authorizes removal.

// Inside updatePackage, after access and input checks, before the first write.
const requirements = await readQuotationRequirements(ctx, id);
const conflicts = findReferenceConflicts(requirements, proposedSelections);
if (conflicts.length) throw new ConvexError({ code: 'QUOTATION_REFERENCES', conflicts });
```

## Named shape

```ts
type QuotationRequirement = {
  quotationId: string;
  quotationNumber: string;
  flightId: string;
  roomTypes: string[];
};
type ProposedSelections = {
  flightIds: ReadonlySet<string>;
  roomTypes: ReadonlySet<string>;
};
type ReferenceConflict = {
  quotationId: string;
  quotationNumber: string;
  missingFlightId?: string;
  missingRoomTypes: string[];
};
```

The projection owns dependency resolution. The pure comparison owns exact set membership. The transaction owns authorization and the final decision. Query quotations through `by_package_id` and their room items through `by_quotation_id`. Include archived quotations and all statuses because neither archive nor status removes their stored dependency. A stable quotation ID supplements the human reference number when revisions or legacy rows have ambiguous labels.

Incoming flight IDs survive only when they identify this package's existing flight. A copied foreign ID must not count as preserving a flight. Incoming room IDs are irrelevant; the exact type strings matter.

The message should say that nothing was saved, list the affected quotation references and removed selections, and ask staff to keep those selections or deliberately change the affected quotations first. The API recognizes only the structured reference error and returns a known rejection, preferably existing HTTP 400. Unknown errors retain HTTP 500 and the manual reconciliation contract. Avoid parsing generic error text.

## Comparison

| Candidate | Safety | Staff experience | Maintenance cost |
| --- | --- | --- | --- |
| Projection plus mutation guard | Mutation guard remains authoritative despite stale query data. | Immediate explanation while editing and after a concurrent reference appears. | New public query, generated typing, query state and duplicate invocation of the same pure comparison. |
| Mutation-only rejection | Same transaction-level safety with fewer moving pieces. | Explanation arrives on Save; the draft remains available for correction. | One guard, one structured error and HTTP adaptation. |
| Retirement | Existing children remain stored and historical selections remain valid. | Staff can hide retired selections from new quotations. | Requires a new lifecycle policy across queries, creation, update, import and display. Outside this bounded change. |

## Recommendation and red-flag screen

Choose mutation-only rejection for this work item. The projection candidate is structurally viable but adds a second read path that does not improve the authoritative guarantee. It also cannot operate against the unchanged deployed backend, so it worsens verification and compatibility under the no-deployment constraint. Add a projection later only if staff need advance warnings before Save.

Model the Domain shaped the set-based selection comparison and grouped quotation requirements. Boundary Discipline shaped the placement before mutation writes and the narrow structured-error translation. I read both principle leaf skills in this session.

Keep the guard near the destructive writer or in one small dependency module if another in-scope writer genuinely reuses it. Do not build separate methods for loading flights, loading rooms, classifying changes and producing prose that callers must coordinate. Those would be temporal decomposition and a shallow interface.

## Verification contract

Actual registered-handler regressions must prove referenced flight removal and room-type removal reject before any writes; imported replacement retaining the type succeeds despite ID churn; unreferenced removal succeeds; existing quotation reopen and update still work after permitted edits. Test disabled rows explicitly because current handlers accept them. Test stale room IDs with the description fallback, unrelated packages, revisions, archived quotations, and foreign incoming flight IDs.

There is one historical-data caveat. A live linked room type can differ from an item's description in already inconsistent data. Since updatePackage replaces all room IDs, reopening afterward falls back to description. Do not silently rewrite such quotation items. Establish a fixture for that mismatch and document whether the guard checks the post-replacement description as well, without claiming historical correction.

Browser evidence against the configured deployment cannot prove the new transactional guard until a separately authorized backend deployment occurs. A local route test with the actual registered mutation can prove the typed rejection mapping. An authenticated browser can prove the new error presentation through explicitly labelled transport fault injection and verify permitted edits against the existing backend. The report must keep those claims separate.
