# Packages & Flights Audit

**Date**: 2026-07-12  
**Scope**: `convex/packages.ts`, `convex/quotations.ts`, `convex/schema.ts`, `app/features/packages/utils/`, `app/features/flights/schema.ts`

---

## Status

| # | Finding | Status |
|---|---------|--------|
| 1 | Flight IDs stripped on package edit | ✅ Fixed 2026-07-12 |
| 2 | Quotation status enum mismatch | ✅ Fixed 2026-07-12 |
| 3 | `findQuotationByStringId` full table scan | ✅ Fixed 2026-07-12 |
| 4 | `listWithRooms` loads all five tables unfiltered | 🔵 Deferred — acceptable at current scale |
| 5 | `getMappedHijriYear` hardcoded and silent on miss | ✅ Fixed 2026-07-12 |
| 6 | Flight code not captured for manually-created packages | ⬜ Open |
| 7 | `package_rooms` has no `sort_order` in schema | ⬜ Open |

---

## Summary

The packages and flights subsystem is the foundation for all quotations. The core create/read flows work correctly. Four bugs were found and fixed on 2026-07-12. Two design gaps remain open.

---

## Critical Bugs

### 1. Flight IDs always stripped on package edit ✅ Fixed

**Fixed**: `app/features/packages/utils/normalizePackageMutationPayload.ts:29` — changed `_id: undefined` to `_id: flight._id`

**Files**: `app/features/packages/utils/normalizePackageMutationPayload.ts:29`, `convex/packages.ts:437–457`

**What happens**: `normalizePackageMutationPayload` hardcodes `_id: undefined` for every flight in the outgoing payload. `transformConvexPackage` correctly reads flight `_id` values from Convex and puts them in the form state — but they are silently discarded before the mutation fires.

In `updatePackage`, the logic is:
1. Build `incomingFlightIdSet` from flights that have an `_id` — always empty because of the above
2. Delete all existing `package_flight` rows that are not in that set — deletes everything
3. Re-insert all flights as new rows with new IDs

Every package edit wipes and recreates all its flights. Any quotation whose `flight_id` pointed to the old rows now has a broken reference.

**Existing workarounds** (do not remove these):
- `flight_snapshot` on `quotations` — written at create and update time, used by the PDF renderer as the source of truth
- `repairStaleFlightIds` mutation — remaps stale `flight_id` values to the first available flight for the package

**The fix** (one line):

```ts
// normalizePackageMutationPayload.ts — line 29
// Before:
_id: undefined,

// After:
_id: flight._id,
```

With this fix, `updatePackage` will patch existing flights in place (preserving their IDs) and only insert truly new ones.

---

#### Detailed trace: where the ID dies

There are 5 hops between the database and the mutation. The ID survives 4 of them and is dropped on the 5th.

**Hop 1 — Convex → Loader** ✅ `package.edit.tsx:24`

`api.packages.getById` returns raw `package_flight` rows. Each has a real Convex `_id`.

**Hop 2 — Loader → Form State** ✅ `transformConvexPackage.ts:71–82`

The API response is mapped to form shape. Flight `_id` is preserved:

```ts
flights: packageData.flights.map((flight) => ({
  _id: flight._id,          // correctly carried through
  month: flight.month,
  departure: flight.departure_date,
  return: flight.return_date,
  sector_departure: flight.departure_sector,
  sector_return: flight.return_sector,
  // ...
})),
```

**Hop 3 — Form State → UI** ✅ `FlightDetails.tsx:133–139`

The component renders a hidden input so React Hook Form tracks the `_id` for each flight row:

```tsx
<Controller
  name={`flights.${index}._id`}
  control={control}
  render={({ field: idField }) => (
    <input type="hidden" {...idField} />
  )}
/>
```

When "Add Flight" is clicked, `_id` is intentionally absent from the `append()` call — correct for new rows that have no DB ID yet.

**Hop 4 — Submit → Route Action** ✅ `PackageBuilder.tsx:209–216`

The full RHF state is serialised to JSON. `data.flights[n]._id` still holds the Convex ID string at this point.

```ts
_submit(JSON.stringify(data), {
  method: "POST",
  encType: "application/json",
});
```

**Hop 5 — Route Action → Mutation** ❌ `normalizePackageMutationPayload.ts:28–35`

```ts
flights: (data.flights ?? []).map((flight) => ({
  _id: undefined,              // hardcoded — flight._id is never read
  month: flight.month ?? "",
  departure_date: flight.departure ?? "",
  departure_sector: flight.sector_departure ?? "",
  return_date: flight.return ?? "",
  return_sector: flight.sector_return ?? "",
})),
```

Every flight exits this function with `_id: undefined`.

**Inside `updatePackage`** (`packages.ts:394–457`):

```ts
// Set of IDs to keep — always empty
const incomingFlightIdSet = new Set(
  args.payload.flights.filter((f) => f._id).map((f) => f._id as string),
);

// Deletes every existing flight — the condition is always true
for (const flight of dedupedExistingFlights) {
  if (!incomingFlightIdSet.has(String(flight._id))) {
    await ctx.db.delete(flight._id);
  }
}

// Re-inserts everything as new rows — the patch branch is never reached
for (const flight of args.payload.flights) {
  if (flight._id && existingFlightIdSet.has(flight._id)) {
    await ctx.db.patch(...)   // never executes
  } else {
    await ctx.db.insert(...)  // always executes
  }
}
```

The mutation logic itself is correct — the patch-vs-insert branching works as designed. It just never receives the IDs it needs.

#### Impact on quotations

Quotations store `flight_id` as a plain string referencing a `package_flight._id`. After any package save, those strings point to deleted rows.

| Query | Uses snapshot? | Effect of stale `flight_id` |
|---|---|---|
| `getQuotationFullDetails` (PDF) | Yes — prefers snapshot | PDF renders correctly for quotations that have a snapshot |
| `getQuotationForEdit` | No | Returns raw `flight_id`; edit form loads with a broken flight reference if the flight no longer exists |
| `listPaginated` / `list` | No | `selected_flight` resolves to `null` for affected quotations |

Quotations created before snapshots were introduced (i.e. before the snapshot fields were added to the schema) have no snapshot and will show broken flight data in all views once the source flight is deleted.

#### Additional gap found during trace

`FlightDetails.tsx` has no input field for `code` (the airline flight number, e.g. `SV810`). The field exists in `FlightImportSchema` and is tracked by RHF, but it is never rendered in the manual builder. Only packages created via CSV import get a flight code. This is a separate issue from the ID bug.

---

### 2. Quotation status enum mismatch ✅ Fixed

**Fixed**: Aligned all four locations to `draft | sent | accepted | rejected | revised | superseded`:
- `convex/quotations.ts` — both `create` and `update` validators
- `app/features/quotation/schema.ts` — `quotationFormSchema`, `quotationRowSchema`, `quotationFullDetailsSchema`
- `app/features/quotation/components/QuotationTable/data-table.tsx` — badge switch cases

**Files**: `convex/schema.ts:101–108`, `convex/quotations.ts:271–277` (create), `convex/quotations.ts:818–824` (update)

**What happens**: The schema defines the valid status values as:

```
draft | sent | accepted | rejected | revised | superseded
```

The `create` and `update` mutation argument validators accept:

```
draft | sent | confirmed | accepted | rejected | expired
```

Two sets of statuses that don't match.

| Status | Schema | Mutations |
|--------|--------|-----------|
| `draft` | ✅ | ✅ |
| `sent` | ✅ | ✅ |
| `accepted` | ✅ | ✅ |
| `rejected` | ✅ | ✅ |
| `revised` | ✅ | ❌ cannot be set |
| `superseded` | ✅ | ❌ cannot be set |
| `confirmed` | ❌ schema rejects | ✅ mutation accepts |
| `expired` | ❌ schema rejects | ✅ mutation accepts |

Attempting to set `confirmed` or `expired` will throw a Convex validation error at runtime. `revised` and `superseded` exist in the schema (added for V2) but can never be set through the public API.

**The fix**: Align both enums. Remove `confirmed` and `expired` from the mutation validators. Add `revised` and `superseded` to the mutation validators.

---

## Significant Issues

### 3. Full table scan on every single-quotation lookup ✅ Fixed

**Fixed**: `convex/quotations.ts:45–47` — replaced full `.collect()` + `.find()` with `ctx.db.get(quotationId as Id<"quotations">)`. Added `import type { Id }` from `_generated/dataModel`.

**File**: `convex/quotations.ts:44–47`

```ts
async function findQuotationByStringId(ctx: any, quotationId: string) {
  const quotations = await ctx.db.query("quotations").collect();
  return quotations.find((item: any) => String(item._id) === quotationId) ?? null;
}
```

This loads the entire `quotations` table to look up one record by ID. It is called by `getQuotationForEdit`, `getQuotationFullDetails`, `update`, and `deleteById` — every individual quotation operation.

**The fix**: Use `ctx.db.get()` which is a direct ID lookup:

```ts
import type { Id } from "./_generated/dataModel";

async function findQuotationByStringId(ctx: any, quotationId: string) {
  try {
    return await ctx.db.get(quotationId as Id<"quotations">);
  } catch {
    return null;
  }
}
```

---

### 4. `listWithRooms` loads all five package tables unfiltered

**File**: `convex/packages.ts:21–91`

Every call to `listWithRooms` (used in the package list and quotation builder) does five `.collect()` calls with no index filtering:

```ts
await ctx.db.query("packages").collect()
await ctx.db.query("package_rooms").collect()
await ctx.db.query("package_flights").collect()
await ctx.db.query("package_hotels").collect()
await ctx.db.query("package_meals").collect()
```

The search filtering on package name also runs in memory after the full collect. This is acceptable at current data volumes but will degrade linearly as packages accumulate over multiple years.

**Recommended approach**: When the dataset grows, paginate the packages first and use the `by_package_id` indexes to fetch child rows only for the returned page.

---

### 5. `getMappedHijriYear` is hardcoded and will silently fail ✅ Fixed

**Fixed**: `convex/quotations.ts:13–26` — added missing `2025/2026 → 1447H`, extended map through `2031/2032 → 1453H`, replaced silent `?? year` fallback with an explicit `throw`.

**File**: `convex/quotations.ts:12–21`

```ts
const hijriYearMap: Record<string, string> = {
  '2026/2027': "1448H",
  '2027/2028': "1449H",
}
return hijriYearMap[year] ?? year;
```

The function falls back to the raw input string if the year is not in the map. Any quotation created in 2025 would have gotten `"2025/2026"` as its `hijri_year` instead of `"1447H"`, producing malformed quotation numbers like `2025/2026-0001` instead of `1447H-0001`.

The map will need to be extended every year, and there is no warning when a lookup misses.

**The fix**: Either extend the map to cover all years in use, or compute the hijri year from the Gregorian year algorithmically. At minimum, throw an error instead of returning the raw string when a lookup misses:

```ts
const mapped = hijriYearMap[year];
if (!mapped) throw new Error(`No hijri year mapping for: ${year}`);
return mapped;
```

---

## Design Gaps

### 6. Flight code not captured for manually-created packages

**Files**: `convex/packages.ts:223–232` (createPackage args), `app/features/packages/utils/normalizePackageMutationPayload.ts:28–36`

`createPackageWithFlight` (CSV import path) accepts a `code` field (the airline flight number, e.g. `SV810`) and stores it in `package_flights.flight`. The manual `createPackage` mutation does not accept a `code` field, and `normalizePackageMutationPayload` does not map `flight.code` either.

Result: packages created through the 6-step builder always have a blank flight code. The flight listing page shows an empty `flight` column for these packages.

**The fix**: Add `flight: v.optional(v.string())` to the `createPackage` and `updatePackage` flight args, and map `flight.code` through `normalizePackageMutationPayload`.

---

### 7. `package_rooms` has no `sort_order` in the Convex schema

**Files**: `convex/schema.ts:76–81`, `app/features/packages/schema.ts:19–26`

`room_templates` has a `sort_order` field that controls display order in the builder. When rooms are created from templates, the insertion order reflects the template order — but `package_rooms` does not store `sort_order`. Once written, room order is undefined.

The frontend `roomSchemaApiRes` expects a `sort_order` field but the Convex schema does not have one, so it always defaults to `0`.

**The fix**: Add `sort_order: v.number()` to `package_rooms` in the schema and populate it during insert (from the template's `sort_order` or from the array index).

---

## Fix Priority

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 1 | Flight IDs stripped on edit | 1 line | ✅ Fixed 2026-07-12 |
| 2 | Status enum mismatch | Small | ✅ Fixed 2026-07-12 |
| 3 | `findQuotationByStringId` full scan | Small | ✅ Fixed 2026-07-12 |
| 5 | Hijri year map hardcoded | Small | ✅ Fixed 2026-07-12 |
| 6 | Flight code lost on manual create | Medium | ⬜ Open |
| 4 | `listWithRooms` unfiltered collect | Medium | 🔵 Deferred |
| 7 | `package_rooms` no sort_order | Medium | ⬜ Open |

### Remaining action: stale data repair

The flight ID fix prevents future corruption. Quotations created before this fix may still have stale `flight_id` values from previous package edits. Run `repairStaleFlightIds` (in `convex/quotations.ts`) with `dryRun: true` first to assess the damage, then without `dryRun` to repair.

---

## Related Files Reference

| File | Role |
|------|------|
| `convex/packages.ts` | All package queries and mutations |
| `convex/quotations.ts` | All quotation queries and mutations; `repairStaleFlightIds` workaround |
| `convex/schema.ts` | Database schema — source of truth for valid field values |
| `app/features/packages/utils/normalizePackageMutationPayload.ts` | Transforms form state → mutation payload (contains the flight ID bug) |
| `app/features/packages/utils/transformConvexPackage.ts` | Transforms Convex response → form state (correctly preserves IDs) |
| `app/features/flights/schema.ts` | `FlightImportSchema` — used by both the package form and CSV import |
