# Candidate A. Reject destructive manual package updates

Staff must edit packages without stranding an existing quotation's flight or selected room type. The smallest shape is a prewrite guard in the actual `packages.updatePackage` transaction. Section import already becomes the same update payload, so it needs no separate persistence path.

## Caller usage and typed shape

```ts
await requireQuotationReferencesPreserved(ctx, {
  packageId: existingPackage._id,
  existingRooms: allExistingRooms,
  retainedFlightIds: new Set(payload.flights.flatMap(f => f._id ? [f._id] : [])),
  incomingRoomTypes: new Set(payload.rooms.map(r => r.room_type)),
});
// Only now perform the first patch/delete/insert.
```

```ts
type QuotationReferenceConflict = {
  code: "PACKAGE_REFERENCE_CONFLICT";
  message: string;
  affectedQuotations: Array<{ id: string; reference: string }>;
  affectedCount: number;
};
```

Keep the scan owned by the package-reference guard. Use the database's quotation-by-package index and quotation-items-by-quotation index. The domain model is sets of retained flight IDs and available room types plus affected quotation references. Avoid a retirement flag, a second draft model, or a shared-storage migration.

## Actual dependency

`quotations.update` requires that `flight_id` exists and belongs to `package_id`, then resolves every selected room by `room_type`. It does not require the old room row ID. `getQuotationForEdit` resolves each `item_type === "room"` item's effective type as the currently linked room's `room_type`, with `item.description` as fallback after that row disappears. The guard must use that same linked-room-then-description rule. Snapshot rooms list the whole package and must not count as selected types. Add-ons and discounts are not room references.

Resolve room selections before deleting rows. Reject a removal only if the selected type currently exists in this package and will not exist in incoming types. This avoids making unrelated ordinary saves repair preexisting historical damage. Missing historical flight references likewise do not become new removals. Keep all quotation statuses and archived quotations in scope, since no explicit retirement contract permits severing their references.

Disabled room rows still satisfy the actual quotation mutation's type lookup. Disabling a retained type alone is therefore permitted by this guard. `QuotationBuilder` hides disabled rows in its picker, but its `selected_rooms` state retains loaded selections. No quotation UI rewrite is necessary for the dependency established here. Regression must reopen and save this case rather than assert only handler acceptance.

## Guard and actionable response

Load existing flights before the first database write, alongside the existing room load. Compute existing flight IDs absent from the payload and existing room types absent from incoming types. Short-circuit when neither set is nonempty. For each package quotation, check its flight and selected room items. Collect affected references using the exact existing format `hijri_year-sequence_num.padStart(4, "0")` plus `-Rrevision` when positive. Include bounded labels, full affected count, and exact removed selections in the message. Never include client names or unrelated business details. Tell staff to keep the referenced selection or change the affected quotation first. The error must state that nothing saved.

Throw `ConvexError` with the structured conflict data before any patch/delete/insert. The update HTTP route recognizes only this exact code and validates the payload shape before forwarding a definite rejection. Prefer HTTP 409 plus the code, rather than overloading generic 400 validation. The builder recognizes only that structured response as `SaveState.kind === "rejected"`, renders its actionable message, retains all form values, and allows deliberate correction and resubmission. Every other non-OK response, malformed acknowledgement, and network error retains the inherited unknown-outcome barrier. Do not convert arbitrary 500 errors into safe retries.

## Scope and alternative

Retirement would preserve historical rows and teach quotation create/update, loaders, pickers, imports and every writer to distinguish active from retired selections. It enables future catalogue cleanup but requires a reviewed lifecycle contract and backend rollout. Reject it for this bounded work item. This guard meets the stated acceptance without schema changes or historical correction.

Standalone `packageFlights.deleteFlight` and `syncPackageFromCsv` also remove referenced data. They remain explicitly outside this manual-builder and section-import change. Do not claim global reference protection or silently redesign sync. Track their bypass exposure in the evidence and parent issue for a separate scope decision.

## Verification contract

Invoke actual registered `updatePackage` and quotation handlers with isolated in-memory fixtures. Compare all persisted tables and attempted write traces on rejection. Cases include flight removal, selected room-type removal through an imported room payload, both conflicts together, room-ID churn with retained type, prior churn with description fallback, unselected snapshot-only types, add-ons, other-package quotations, archived and revised quotations, multiple affected references, and unreferenced removals. A permitted package edit must be followed by actual `getQuotationForEdit` and `update` calls. Test route conflict decoding and builder rendering and correctable rejection, while retaining existing unknown-outcome tests.

Browser evidence may verify the new client and route behavior with injected structured conflict responses against the unchanged cloud backend. Label that injection explicitly. It cannot prove this guard is deployed. Live permitted edits, second-view reload, and quotation save can prove existing-backend compatibility with allowed edits. No backend deployment is authorized.

## Red-flag screen and synthesis recommendation

One domain helper hides one policy with a single entry point. No caller must coordinate validation stages. The HTTP adapter owns transport narrowing. The builder owns the existing save-state machine. Existing APIs and save guarantees remain intact. No new storage or manually synchronized catalogue is introduced. Select this candidate because it blocks loss at the only authorized removal boundary before the first write and preserves the current staff recovery model.

Boundary Discipline places the authoritative guard in the mutation and structured-error narrowing in HTTP. Model the Domain chooses sets and one typed conflict rather than room-ID checks spread across import and save controls.
