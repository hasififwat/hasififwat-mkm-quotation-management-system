# Quotation Snapshot Immutability & Staleness Detection

**Status:** Design / Pre-implementation
**Related audit issue:** #19 — Editing overwrites original snapshot with current live package data

---

## Problem Statement

A quotation's PDF must always reflect what was **agreed at the time of creation**, not the current state of the package. Right now, every edit — even changing just the status or notes — replaces `package_snapshot`, `flight_snapshot`, and `hotels_snapshot` with the live package data. If a package's inclusions, hotel name, or duration changed after the quotation was issued, opening and saving it silently updates the PDF.

Additionally, agents need to know when a package they quoted has changed so they can decide whether to re-issue a revised quotation.

---

## Design Goals

1. **Snapshot immutability** — editing a quotation must never overwrite the snapshot unless the user explicitly switches to a different package or flight.
2. **Staleness awareness** — when the live package changes after a quotation was snapshotted, the quotation surfaces a stale indicator so agents can act.
3. **Explicit refresh** — agents can intentionally adopt the latest package state via a deliberate "Refresh snapshot" action, not silently on every save.
4. **No breaking changes to old records** — the solution must degrade gracefully for quotations created before this feature lands.

---

## Mechanism: `package_updated_at` in the Snapshot

The `packages` table already tracks `updated_at` (updated on every package edit via `packages.ts`). We embed this value inside `package_snapshot` at the moment the snapshot is taken.

**At snapshot time (create or explicit refresh):**
```
package_snapshot.package_updated_at = selectedPackage.updated_at
```

**At read time (any query):**
```
is_stale = currentPackage.updated_at !== package_snapshot.package_updated_at
```

No extra version counter, no hash — one field comparison.

---

## Schema Changes

### `quotations` table — extend `package_snapshot`

```ts
// convex/schema.ts
package_snapshot: v.optional(v.object({
  name: v.string(),
  year: v.string(),
  duration: v.string(),
  transport: v.optional(v.string()),
  package_code: v.optional(v.string()),
  inclusions: v.optional(v.string()),
  exclusions: v.optional(v.string()),
  package_updated_at: v.optional(v.string()),  // ← NEW: package.updated_at at snapshot time
})),
```

`package_updated_at` is optional so existing records without it are not broken.

### No change to `flight_snapshot` or `hotels_snapshot`

Flight staleness will be detected by field-level comparison (departure_date, sectors) rather than a timestamp, since `package_flights` has no `updated_at`. Hotels are part of the package, so `package_updated_at` covers them.

---

## Changes to `update` Mutation (`convex/quotations.ts:859`)

### Current behaviour (the bug)
```ts
// Always rebuilds all snapshots regardless of what changed
const package_snapshot = { name: selectedPackage.name, ... };
await ctx.db.patch(quotation._id, { package_snapshot, ... });
```

### New behaviour

```ts
const packageChanged = args.payload.package_id !== quotation.package_id;
const flightChanged  = args.payload.flight_id  !== quotation.flight_id;

// Only rebuild snapshot if the package itself was swapped
const package_snapshot = packageChanged
  ? buildPackageSnapshot(selectedPackage)       // fresh from live data
  : quotation.package_snapshot;                 // preserve original

// Only rebuild flight snapshot if the flight was swapped
const flight_snapshot = flightChanged
  ? buildFlightSnapshot(selectedFlight)
  : quotation.flight_snapshot;

// Hotels are tied to the package; rebuild only on package swap
const hotels_snapshot = packageChanged
  ? buildHotelsSnapshot(hotelsForPkg, mealsByHotelId)
  : quotation.hotels_snapshot;
```

Extract snapshot builders into shared helpers so both `create` and `update` call the same code:

```ts
function buildPackageSnapshot(pkg: PackageDoc) {
  return {
    name: pkg.name,
    year: pkg.year,
    duration: pkg.duration,
    transport: pkg.transport,
    package_code: pkg.package_code,
    inclusions: pkg.inclusions,
    exclusions: pkg.exclusions,
    package_updated_at: pkg.updated_at,   // ← written here
  };
}

function buildFlightSnapshot(flight: FlightDoc) {
  return {
    id: String(flight._id),
    month: flight.month,
    flight: flight.flight,
    departure_date: flight.departure_date,
    departure_sector: flight.departure_sector,
    return_date: flight.return_date,
    return_sector: flight.return_sector,
  };
}

function buildHotelsSnapshot(hotels, mealsByHotelId) {
  return hotels.map(hotel => ({
    hotel_type: hotel.hotel_type,
    name: hotel.name,
    placeholder: hotel.placeholder,
    enabled: hotel.enabled,
    meals: mealsByHotelId.get(String(hotel._id)) ?? [],
  }));
}
```

---

## New Mutation: `refreshSnapshot` (`convex/quotations.ts`)

An explicit user-triggered action that refreshes the snapshot without changing anything else on the quotation (no item changes, no status change).

```ts
export const refreshSnapshot = mutation({
  args: { quotation_id: v.string() },
  handler: async (ctx, args) => {
    const quotation = await findQuotationByStringId(ctx, args.quotation_id);
    if (!quotation) throw new Error("Quotation not found");

    const [allPackages, allFlights, allPackageHotels, allPackageMeals] =
      await Promise.all([...]);

    const selectedPackage = allPackages.find(...);
    if (!selectedPackage) throw new Error("Package no longer exists");

    const selectedFlight = allFlights.find(...);
    // flight may have been removed — handle gracefully

    const package_snapshot  = buildPackageSnapshot(selectedPackage);
    const flight_snapshot   = selectedFlight ? buildFlightSnapshot(selectedFlight) : quotation.flight_snapshot;
    const hotels_snapshot   = buildHotelsSnapshot(...);

    await ctx.db.patch(quotation._id, {
      package_snapshot,
      flight_snapshot,
      hotels_snapshot,
      updated_at: new Date().toISOString(),
    });

    await ctx.db.insert("quotation_logs", {
      action: "snapshot_refreshed",
      description: `Snapshot manually refreshed to package version ${selectedPackage.updated_at}`,
      ...
    });
  }
});
```

---

## Staleness Computation in Queries

Add a `stale_fields` string array to the return value of `getQuotationFullDetails` and `getQuotationForEdit`. This tells the UI exactly what changed, not just that something changed.

```ts
// Inside getQuotationFullDetails / getQuotationForEdit

const pkgSnap   = quotation.package_snapshot;
const flightSnap = quotation.flight_snapshot;

const stale_fields: string[] = [];

// Package staleness: compare stored updated_at vs current
if (
  pkgSnap?.package_updated_at !== undefined &&
  selectedPackage &&
  selectedPackage.updated_at !== pkgSnap.package_updated_at
) {
  stale_fields.push("package");
}

// Flight staleness: compare key fields (no updated_at on flights)
const liveFlight = availableFlights.find(f => String(f._id) === quotation.flight_id);
if (flightSnap && liveFlight) {
  if (
    liveFlight.departure_date   !== flightSnap.departure_date  ||
    liveFlight.return_date      !== flightSnap.return_date     ||
    liveFlight.departure_sector !== flightSnap.departure_sector ||
    liveFlight.return_sector    !== flightSnap.return_sector
  ) {
    stale_fields.push("flight");
  }
}

// Return alongside the existing data
return {
  ...existingReturnValue,
  stale_fields,   // [] = fresh, ["package"] = pkg changed, ["flight"] = flight dates changed
};
```

### Old records (no `package_updated_at`)

When `pkgSnap.package_updated_at` is `undefined` the staleness check is skipped — we don't know. The UI should surface these as a softer "snapshot age unknown" indicator, not the same hard warning as a confirmed stale record.

```ts
const snapshot_version_known = pkgSnap?.package_updated_at !== undefined;
// return this flag alongside stale_fields
```

---

## Quotation List Staleness

`getQuotationList` (the paginated list query) needs a lightweight staleness flag — doing a full field comparison for every row is expensive. Instead:

```ts
// In list query: one-pass approach
// Load packages once, build a map of package_id → updated_at
const packageUpdatedAtById = new Map(
  allPackages.map(p => [String(p._id), p.updated_at])
);

// Per quotation row:
const currentPkgUpdatedAt = packageUpdatedAtById.get(quotation.package_id);
const is_stale =
  quotation.package_snapshot?.package_updated_at !== undefined &&
  currentPkgUpdatedAt !== quotation.package_snapshot.package_updated_at;
```

This costs one full packages scan per list query but avoids N individual package lookups.

---

## UI Changes

### Quotation list row
- Amber warning icon `⚠` next to the reference number when `is_stale = true`
- Tooltip: "Package updated since this quotation was created"
- Grey clock icon when `snapshot_version_known = false` (old record)

### Edit page (`QuotationBuilder.tsx`)
When `loaderData.stale_fields.length > 0` render a banner above the form:

```
⚠  The package/flight for this quotation has been updated since it was created.
   The PDF still reflects the original package.
   [Keep original]  [Refresh to latest package]
```

- **Keep original** — dismisses banner, saves normally (snapshot preserved by new update logic)
- **Refresh to latest** — calls `refreshSnapshot` mutation, reloads form, banner disappears

### Review / PDF page
When `loaderData.stale_fields.length > 0`:

```
⚠  This PDF reflects the package as it was when the quotation was created.
   The package has since been updated. [ Refresh snapshot ]
```

---

## Migration for Existing Records

No data migration is strictly required. The `package_updated_at` field is optional in the schema, so:

- Existing records: `package_updated_at = undefined` → staleness unknown → soft indicator
- New records going forward: `package_updated_at` written at create time
- Explicitly refreshed records: `package_updated_at` updated to current value

Optionally, a one-time backfill mutation can write the current `package.updated_at` into existing snapshots. This marks them all as "fresh as of now" — acceptable if we accept that any changes before today are lost to history (which they already are).

---

## Implementation Order

1. **`convex/schema.ts`** — add `package_updated_at: v.optional(v.string())` to `package_snapshot`
2. **`convex/quotations.ts`** — extract `buildPackageSnapshot`, `buildFlightSnapshot`, `buildHotelsSnapshot` helpers
3. **`convex/quotations.ts` — `create`** — use helper (adds `package_updated_at`)
4. **`convex/quotations.ts` — `update`** — preserve snapshots when IDs unchanged; use helper when they change
5. **`convex/quotations.ts` — `refreshSnapshot`** — new mutation
6. **`convex/quotations.ts` — `getQuotationFullDetails` + `getQuotationForEdit`** — add `stale_fields` + `snapshot_version_known` to return
7. **`convex/quotations.ts` — list query** — add lightweight `is_stale` flag per row
8. **`app/features/quotation/`** — UI: stale banner on edit + review, stale badge on list row
