# Deep Package Staleness Detection

**Status:** Planned  
**Prerequisite:** `docs/QUOTATION-SNAPSHOT-STALENESS.md` (Phase 1 — already implemented)

---

## Background

Phase 1 (implemented) introduced snapshot immutability and staleness detection using a **timestamp comparison**:

```
is_stale = package.updated_at !== package_snapshot.package_updated_at
```

This works but is **shallow** — it fires whenever the package record is touched, regardless of whether the change actually affects the quotation. A typo fix in `exclusions` triggers the same stale warning as a room price increase.

This document describes the upgrade to **field-level diff**, which only flags a quotation stale when the data that materially affects the PDF or pricing has actually changed.

---

## Problem with the Current Approach

| Edit made to package | Current behaviour | Desired behaviour |
|---|---|---|
| Room price increased | ⚠ stale (correct) | ⚠ stale: room pricing |
| Inclusions text reworded | ⚠ stale (false positive) | ⚠ stale: inclusions |
| Minor typo fix in exclusions | ⚠ stale (false positive) | ⚠ stale: exclusions |
| Internal admin note (not in snapshot) | ⚠ stale (false positive) | ✅ clean |

With deep diff, each stale indicator is specific — agents know exactly what changed and can decide if it warrants re-issuing the quotation.

---

## Decision: No Package Update Log

A package change log (audit trail of every field edit) was considered and **explicitly rejected** for this feature.

**Why it's not needed:**
- The snapshot stored on the quotation IS the "before" state
- The live package IS the "after" state
- A direct field diff between those two gives everything needed for staleness detection AND for showing the user what changed

**What a log would add:**
- Who made the change and when
- History of intermediate states between creation and now

These are audit/compliance concerns, not staleness concerns. They should be built separately if required, not coupled to staleness detection.

---

## Implementation Plan

### Phase 1 — Field-diff existing snapshot fields *(no schema change)*

`package_snapshot` already stores: `name`, `year`, `duration`, `transport`, `package_code`, `inclusions`, `exclusions`.

**Change `computeStaleFields` in `convex/quotations.ts`:**

Replace the single timestamp check:
```ts
// Before (shallow)
if (currentPackage.updated_at !== pkgSnap.package_updated_at) {
  stale_fields.push("package");
}
```

With per-field comparisons:
```ts
// After (deep)
if (pkgSnap.name         !== currentPackage.name)         stale_fields.push("package.name");
if (pkgSnap.year         !== currentPackage.year)         stale_fields.push("package.year");
if (pkgSnap.duration     !== currentPackage.duration)     stale_fields.push("package.duration");
if (pkgSnap.transport    !== currentPackage.transport)    stale_fields.push("package.transport");
if (pkgSnap.inclusions   !== currentPackage.inclusions)   stale_fields.push("package.inclusions");
if (pkgSnap.exclusions   !== currentPackage.exclusions)   stale_fields.push("package.exclusions");
if (pkgSnap.package_code !== currentPackage.package_code) stale_fields.push("package.code");
```

`package_updated_at` is retained in the schema as a fallback for old records — `snapshot_version_known` logic is unchanged.

**Old records (no `package_updated_at`):** The existing `snapshot_version_known = false` path handles these gracefully — fall through to field diff if snapshot fields exist, soft indicator if they don't.

---

### Phase 2 — Add room prices to snapshot *(schema change required)*

Room prices live in `package_rooms` (`package_id`, `room_type`, `price`, `enabled`). They are package-scoped, not hotel-scoped, so they belong in `package_snapshot`.

**`convex/schema.ts` — extend `package_snapshot`:**
```ts
package_snapshot: v.optional(v.object({
  name: v.string(),
  year: v.string(),
  duration: v.string(),
  transport: v.optional(v.string()),
  package_code: v.optional(v.string()),
  inclusions: v.optional(v.string()),
  exclusions: v.optional(v.string()),
  package_updated_at: v.optional(v.string()),
  // NEW
  rooms: v.optional(v.array(v.object({
    room_type: v.string(),
    price: v.number(),
    enabled: v.boolean(),
  }))),
})),
```

**`buildPackageSnapshot` — accept rooms:**
```ts
function buildPackageSnapshot(
  pkg: { name, year, duration, transport, package_code, inclusions, exclusions, updated_at },
  rooms: Array<{ room_type: string; price: number; enabled: boolean }>
) {
  return {
    ...existing fields...,
    rooms: rooms.map(r => ({ room_type: r.room_type, price: r.price, enabled: r.enabled })),
  };
}
```

All callers (`create`, `update`, `refreshSnapshot`) already fetch `package_rooms` — pass them into `buildPackageSnapshot`.

**`computeStaleFields` — add room price comparison:**
```ts
if (pkgSnap.rooms && liveRooms) {
  const snapPrices = new Map(pkgSnap.rooms.map(r => [r.room_type, r.price]));
  const priceChanged = liveRooms.some(
    r => snapPrices.has(r.room_type) && snapPrices.get(r.room_type) !== r.price
  );
  const roomAdded = liveRooms.some(r => !snapPrices.has(r.room_type));
  if (priceChanged || roomAdded) stale_fields.push("room_pricing");
}
```

`computeStaleFields` needs a new `liveRooms` parameter, sourced from the already-fetched `package_rooms` in each query.

---

### Phase 3 — Hotel change detection *(no schema change)*

`hotels_snapshot` already stores: `hotel_type`, `name`, `placeholder`, `enabled`, `meals[]`.

Match by `hotel_type` (stable key) and compare fields:

```ts
if (hotelsSnap && liveHotels) {
  const snapMap = new Map(hotelsSnap.map(h => [h.hotel_type, h]));
  const changed = liveHotels.some(live => {
    const snap = snapMap.get(live.hotel_type);
    if (!snap) return true; // hotel added
    if (snap.name !== live.name) return true;
    if (snap.enabled !== live.enabled) return true;
    return false;
  });
  if (changed) stale_fields.push("hotels");
}
```

`computeStaleFields` needs a new `liveHotels` parameter alongside `liveRooms`.

---

### Phase 4 — UI label mapping *(minor)*

`stale_fields` will now contain granular values like `["package.inclusions", "room_pricing"]` instead of just `["package"]`. Map these to human-readable strings for banners and tooltips.

**Add a label map** (in `QuotationBuilder.tsx` and `quotation.review.tsx`):
```ts
const STALE_FIELD_LABELS: Record<string, string> = {
  "package.name":       "package name",
  "package.year":       "package year",
  "package.duration":   "duration",
  "package.transport":  "transport",
  "package.inclusions": "inclusions",
  "package.exclusions": "exclusions",
  "package.code":       "package code",
  "room_pricing":       "room pricing",
  "hotels":             "hotel details",
  "flight":             "flight schedule",
};

const staleLabels = stale_fields.map(f => STALE_FIELD_LABELS[f] ?? f);
// → "inclusions and room pricing have been updated since this quotation was created"
```

---

## What Each Phase Fixes

| Scenario | Before | After Phase 1 | After Phase 2 |
|---|---|---|---|
| Typo fix only | ⚠ false positive | ✅ clean | ✅ clean |
| Inclusions reworded | ⚠ stale (generic) | ⚠ stale: inclusions | ⚠ stale: inclusions |
| Room price changed | ⚠ stale (generic) | ✅ clean (not in snapshot) | ⚠ stale: room pricing |
| Hotel name changed | ⚠ stale (generic) | ✅ clean (not compared) | ⚠ stale: hotel details |
| Flight dates changed | ⚠ stale: flight | ⚠ stale: flight | ⚠ stale: flight |

---

## Files Affected

| File | Change |
|---|---|
| `convex/schema.ts` | Phase 2: add `rooms` array to `package_snapshot` |
| `convex/quotations.ts` | Phase 1–3: replace timestamp check with field diffs in `computeStaleFields`; update `buildPackageSnapshot` signature; update callers |
| `app/features/quotation/QuotationBuilder.tsx` | Phase 4: label map for granular stale fields |
| `app/routes/_protected/quotation.review.tsx` | Phase 4: label map for granular stale fields |

No changes required to `flight_snapshot`, `hotels_snapshot` shape, or the `list`/`listPaginated` lightweight staleness path (which can continue using `package_updated_at` as a fast approximation for the list view).

---

## Recommended Order

1. **Phase 1** first — zero risk, immediate false-positive reduction, no migration
2. **Phase 2** next — highest practical value (room price changes are financially material)
3. **Phase 3** alongside Phase 2 — low effort, same data already fetched
4. **Phase 4** last — polish after data model is stable
