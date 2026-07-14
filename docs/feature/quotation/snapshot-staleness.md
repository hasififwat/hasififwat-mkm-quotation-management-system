# Quotation Snapshot & Staleness Detection

**Status:** Implemented  
**Related files:** `convex/quotations.ts`, `convex/schema.ts`, `app/features/quotation/stale-labels.ts`

---

## Overview

A quotation's PDF must always reflect what was agreed at the time it was created — not the current live state of the package. This feature implements two things:

1. **Snapshot immutability** — saving or editing a quotation never overwrites the original snapshot unless the user deliberately switches to a different package or flight.
2. **Staleness detection** — when a package or flight changes after a quotation was snapshotted, the quotation surfaces specific indicators so agents know exactly what changed.

---

## Core Concept

At creation time, three snapshots are written onto the quotation document:

| Snapshot field | What it captures |
|---|---|
| `package_snapshot` | Package metadata + room prices at creation time |
| `flight_snapshot` | Flight dates and sectors at creation time |
| `hotels_snapshot` | Hotel names, types, availability at creation time |

These snapshots are **never overwritten** on a normal save — they are only rebuilt when:
- The user selects a **different package** (triggers `package_snapshot` + `hotels_snapshot` rebuild)
- The user selects a **different flight** (triggers `flight_snapshot` rebuild)
- The user explicitly clicks **"Refresh snapshot"** (triggers all three)

---

## How Staleness is Detected

At read time, `computeStaleFields()` compares the frozen snapshot against the current live data and returns a list of specific changed fields.

### Package metadata — field-level diff

Each field stored in `package_snapshot` is compared directly against the live package:

```ts
if (pkgSnap.name         !== currentPackage.name)         → "package.name"
if (pkgSnap.year         !== currentPackage.year)         → "package.year"
if (pkgSnap.duration     !== currentPackage.duration)     → "package.duration"
if (pkgSnap.transport    !== currentPackage.transport)    → "package.transport"
if (pkgSnap.inclusions   !== currentPackage.inclusions)   → "package.inclusions"
if (pkgSnap.exclusions   !== currentPackage.exclusions)   → "package.exclusions"
if (pkgSnap.package_code !== currentPackage.package_code) → "package.code"
```

A typo fix in `exclusions` only emits `"package.exclusions"` — it does not flag the entire quotation as generically stale.

### Room pricing — price map diff

Room prices (from `package_rooms`) are embedded in `package_snapshot.rooms[]` at creation time. At read time, a price map is built from the snapshot and compared against live `package_rooms`:

```ts
// Any room type whose price changed → "room_pricing"
// Any new room type added to the package → "room_pricing"
```

### Hotel changes — matched by hotel_type

Hotels from `hotels_snapshot` are matched to live `package_hotels` by `hotel_type` (stable identifier):

```ts
// Hotel name changed → "hotels"
// Hotel enabled/disabled → "hotels"
// New hotel type added → "hotels"
```

### Flight changes — field-level diff

Flight staleness compares key scheduling fields directly:

```ts
if flight no longer exists in package → "flight.removed"
if departure_date changed             → "flight"
if return_date changed                → "flight"
if departure_sector changed           → "flight"
if return_sector changed              → "flight"
```

`flight.removed` takes priority — if the linked flight has been deleted from `package_flights`, the field comparison is skipped entirely since there is nothing to compare against.

---

## `stale_fields` Values and Labels

The `stale_fields: string[]` returned by queries maps to human-readable labels via `app/features/quotation/stale-labels.ts`:

| Key | Label |
|---|---|
| `package.name` | package name |
| `package.year` | package year |
| `package.duration` | duration |
| `package.transport` | transport |
| `package.inclusions` | inclusions |
| `package.exclusions` | exclusions |
| `package.code` | package code |
| `room_pricing` | room pricing |
| `hotels` | hotel details |
| `flight` | flight schedule |
| `flight.removed` | flight no longer exists |

---

## Schema

### `package_snapshot` (on `quotations` table)

```ts
package_snapshot: v.optional(v.object({
  name: v.string(),
  year: v.string(),
  duration: v.string(),
  transport: v.optional(v.string()),
  package_code: v.optional(v.string()),
  inclusions: v.optional(v.string()),
  exclusions: v.optional(v.string()),
  package_updated_at: v.optional(v.string()),  // retained for backward compat
  rooms: v.optional(v.array(v.object({
    room_type: v.string(),
    price: v.number(),
    enabled: v.boolean(),
  }))),
}))
```

### `flight_snapshot` (on `quotations` table)

```ts
flight_snapshot: v.optional(v.object({
  id: v.string(),
  month: v.string(),
  flight: v.optional(v.string()),
  departure_date: v.string(),
  departure_sector: v.string(),
  return_date: v.string(),
  return_sector: v.string(),
}))
```

### `hotels_snapshot` (on `quotations` table)

```ts
hotels_snapshot: v.optional(v.array(v.object({
  hotel_type: v.string(),
  name: v.optional(v.string()),
  placeholder: v.string(),
  enabled: v.boolean(),
  meals: v.array(v.string()),
})))
```

---

## Backend Functions

### Helper functions (`convex/quotations.ts`)

| Function | Purpose |
|---|---|
| `buildPackageSnapshot(pkg, rooms)` | Builds the `package_snapshot` object including room prices |
| `buildFlightSnapshot(flight)` | Builds the `flight_snapshot` object |
| `buildHotelsSnapshot(hotels, mealsByHotelId)` | Builds the `hotels_snapshot` array |
| `computeStaleFields(pkgSnap, flightSnap, currentPackage, liveFlight, liveRooms, liveHotels, hotelSnap)` | Returns `{ stale_fields, snapshot_version_known }` |

### Mutations

| Mutation | Snapshot behaviour |
|---|---|
| `create` | Always builds all three snapshots fresh |
| `update` | Preserves existing snapshots; rebuilds only if `package_id` or `flight_id` changed |
| `refreshSnapshot` | Explicitly rebuilds all three snapshots from current live data; writes a `quotation_logs` entry |

### Queries

| Query | Staleness output |
|---|---|
| `getQuotationFullDetails` | Returns `stale_fields: string[]` and `snapshot_version_known: boolean` |
| `getQuotationForEdit` | Returns `stale_fields: string[]` and `snapshot_version_known: boolean` |
| `list` | Returns `is_stale: boolean` per row (metadata + flight only; rooms/hotels skipped for performance) |
| `listPaginated` | Same as `list` |

---

## UI Behaviour

### Quotation list

- `⚠` amber badge appears next to the quotation number when `is_stale` is true
- Tooltip: *"Something has changed since this quotation was created — open to see details"*
- Room pricing and hotel staleness are **not** reflected in the list badge (performance trade-off; detail view shows the full picture)

### Edit page (`QuotationBuilder`)

When `stale_fields.length > 0`, an amber banner appears above the form:

> ⚠ This quotation is out of date.  
> The following have changed since this quotation was created: **inclusions, room pricing**.  
> The PDF still reflects the original values.  
> [Refresh snapshot]

- Clicking **Refresh snapshot** submits `{ _intent: "refresh_snapshot" }` to the edit action, which calls `refreshSnapshot` and redirects back to the same page

### Review / PDF page

When `stale_fields.length > 0`, an amber banner appears at the top of the preview:

> ⚠ This PDF reflects the original values. The following have changed since this quotation was created: **inclusions, room pricing**.  
> [Go to edit → refresh snapshot]

### Old records (pre-snapshot)

Quotations created before this feature was introduced have no `package_updated_at` in their snapshot (`snapshot_version_known = false`). A softer grey clock indicator is shown instead of the amber warning. These records can be fully activated by clicking "Refresh snapshot" once.

---

## Performance Notes

- **Detail views** (`getQuotationFullDetails`, `getQuotationForEdit`): full deep diff — all fields, room prices, hotels
- **List views** (`list`, `listPaginated`): lightweight diff — metadata and flight fields only; room pricing and hotel diffs are skipped by passing `[]` for `liveRooms` and `liveHotels`. The `⚠` badge will still appear when package metadata or flight schedule changes, but won't catch room price or hotel name changes until the user opens the quotation
- No package update log is maintained — the snapshot IS the "before" state; the live package is the "after" state. A direct field diff gives everything needed without extra write overhead

---

## Explicitly Rejected Approaches

**Package update log:** A log of every package edit was considered and rejected. The snapshot already stores the "before" state; the live package is the "after" state. A log would add per-edit write overhead and schema complexity without improving staleness detection quality. Audit trail concerns (who changed what and when) are separate and should be built independently if required.

**Timestamp-only comparison (`package_updated_at`):** The initial implementation used a single `package.updated_at !== snapshot.package_updated_at` check. This produced false positives — any edit to the package (even a typo fix) would flag all linked quotations as stale. Replaced by full field-level diff in Phase 1.
