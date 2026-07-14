# Package & Flight Sync — Complete Reference

The sync feature lets you update all packages and flights for a new season in one go by uploading two source files: the **Master Price List** and the **MFF Flight Schedule**. No scripts, no manual data entry.

---

## Table of Contents

1. [What the Sync Does](#1-what-the-sync-does)
2. [Source States: sync / manual / unsync](#2-source-states-sync--manual--unsync)
3. [Input Files](#3-input-files)
4. [Step-by-Step User Guide](#4-step-by-step-user-guide)
5. [Review Screen Explained](#5-review-screen-explained)
6. [What Happens on Apply](#6-what-happens-on-apply)
7. [Key Rules & Edge Cases](#7-key-rules--edge-cases)
8. [Technical Reference](#8-technical-reference)

---

## 1. What the Sync Does

The sync compares two external source files (Price List + MFF) against the database and produces a **plan** of changes:

| Action | Example |
|---|---|
| Create a new package | A new season entry appears in the price list with no matching DB record |
| Update an existing package | Hotel name or transport changed in the price list |
| Add a flight | Departure date in MFF has no matching DB flight record |
| Remove a flight | DB has a flight that no longer appears in the MFF |
| Update a flight | Departure or return sector changed in the MFF |
| Promote manual records | First sync run after migration — existing manual records claimed by sync |

You always **review before applying**. Nothing is written to the database until you click **Apply**.

---

## 2. Source States: sync / manual / unsync

Every package and flight in the database has a `source` field that controls how sync treats it.

### `sync` — MFF-managed

The record was created by a sync run, or was matched and promoted during a sync apply. The sync process **owns** these records: it will update their data and remove stale flights when the MFF changes.

### `manual` — Manually created

The record was created directly in the app, not from any CSV upload. The sync process **never touches** these records. If the MFF happens to match a manual package by name + season, it will be promoted to `sync` on the first apply.

### `unsync` — Was sync, manually edited

The package started as `sync` but a sync-managed field (transport, hotel name, meal plan, or room price) was manually edited in the app. The sync process **skips** it — your edits are preserved. Future uploads will still match it by name but will not overwrite it. The `unsync` badge shows the record came from MFF originally, but is now human-managed.

The transition is **field-aware** — only changes to fields that sync owns will trigger it:

| What the user edits | Effect on `source` |
|---|---|
| Transport / Hotel name / Meal plan / Room price | `sync` → `unsync` |
| Inclusions / Exclusions | Stays `sync` — sync never writes these fields |
| Status (publish / unpublish) | Stays `sync` — done via a separate mutation |

This means you can freely add inclusions and exclusions to a sync-managed package on any day without losing sync coverage for hotels and transport.

> **`unsync` is a one-way exit from sync management.**
> Once a package becomes `unsync`, no future upload will re-promote it back to `sync`. This is intentional — re-promoting would silently overwrite the manual changes that caused the transition in the first place. If you want sync to take control of the package again, a developer must manually patch the `source` field in the database (or a "Reset to sync" button can be added to the UI on request).

> `package_flights` only use `sync` or `manual` — they do not have an `unsync` state. Only packages can be `unsync`.

### Lifecycle diagram

```
                        ┌─────────────────────────────┐
                        │         DATABASE             │
                        │                              │
  App form ──────────►  │  manual                      │
                        │    │                         │
  CSV upload ─────────► │  sync ◄──── promoted on      │
                        │    │        first sync apply │
                        │    │                         │
  Manual edit ────────► │  unsync  (packages only)     │
  of a sync pkg         │    │                         │
                        │    └─ stays unsync on future │
                        │       sync runs              │
                        └─────────────────────────────┘
```

---

## 3. Input Files

You upload two files in the sync UI. Both must be exported as **CSV** before uploading.

### File 1 — Master Price List CSV

**What it is:** The annual price list exported from Excel. One section per package, with room prices, hotel details, and season dates.

**What the parser extracts:**
- Package name (canonical — cleaned and uppercased for matching)
- Season code (e.g. `LS - JULY TO SEP`) derived from raw Excel header (e.g. `LOW SEASON JULY TO SEP`)
- Room prices: QDP, TPL, DBL, SGL
- Duration (e.g. `14H/13M`)
- Transport (e.g. `Saudi Airlines`)
- Hotels: Makkah, Madinah, Aziziah, Taif — name + meal plan
- Season start/end dates (used to derive the year, e.g. `2026/2027`)

**Season code mapping (built-in):**

| Raw Excel header | Season code |
|---|---|
| `LOW SEASON JULY TO SEP` | `LS - JULY TO SEP` |
| `HIGH SEASON OCT TO DEC` | `HS - OCT TO DEC` |
| `PEAK SEASON DEC` | `PS - DEC` |
| `HIGH SEASON JAN TO MAR` | `HS - JAN TO MAR` |
| `LOW SEASON APR TO JUN` | `LS - APR TO JUN` |
| *(and others)* | |

---

### File 2 — MFF Flight Schedule CSV

**What it is:** The Master Flight File exported from Excel. One row per departure date × package × airline.

**Key columns used:**

| Column | Data |
|---|---|
| CODE | Airline code (fill-down — e.g. `SV`, `MH`) |
| PACKAGE | Package name (fill-down) |
| MONTH | Month label (fill-down) |
| Col 3 | Departure date (`YYYY-MM-DD`) |
| Col 4–5 | Departure sector (e.g. `KUL-MED`) |
| Col 8 | Departure flight number (e.g. `SV 5806` or `0152`) |
| Col 9 | Return date |
| Col 10–11 | Return sector |
| Col 14 | Return flight number |
| Col 29 | Seat count (pax) |

**Airline detection:**
The airline stored in the DB is the **full name**, not the flight number. Detection rules:

| Flight number pattern | Airline stored |
|---|---|
| Starts with `SV` | `Saudi Airlines` |
| Starts with `MH` | `Malaysia Airlines` |
| 4 digits optionally + letter (e.g. `0152`) | `Malaysia Airlines` (charter) |

---

## 4. Step-by-Step User Guide

### Upload

1. Go to **Packages → Sync** in the sidebar.
2. In the **Master Price List** drop zone, upload your `.csv` export.
3. In the **MFF Flight Schedule** drop zone, upload your MFF `.csv` export.
4. The plan is computed automatically in the browser once both files are loaded.

> If you upload the same files again, the plan should show **zero changes** (all packages and flights already match). If it shows changes, something in the DB has drifted from the source files.

### Review

Read the plan carefully before applying. See [Section 5](#5-review-screen-explained) for a detailed walkthrough.

### Apply

Click **Apply** when you are satisfied with the plan. A progress bar tracks each phase. When done, a summary shows counts of what was created, updated, added, and removed.

---

## 5. Review Screen Explained

The review screen is split into two sections: **Packages** and **Flights**.

### Packages section

| Badge | Meaning |
|---|---|
| `+N packages` | New packages to be created (never existed in DB) |
| `N updates` | Existing packages with hotel or transport changes |
| `N promoted` | Manual packages matched by MFF — will be marked `sync` |

Clicking a package row expands the list of field changes (e.g. `MAKKAH hotel: Old Hotel → New Hotel`).

New packages show a **clone from** label — they will inherit hotel config from an existing same-name package in another season to save setup time.

> **`PLATINUM` packages are never auto-created** — they require manual setup due to pricing complexity.

---

### Flights section

Flights are grouped by package. Each group header shows the counts for that package.

| Row style | Meaning |
|---|---|
| Green `+` | Flight to be **added** (in MFF, not in DB) |
| Red `−` | Flight to be **removed** (in DB, not in MFF) — `sync` flights only |
| Blue pencil | Flight to be **updated** (sector or airline changed) |
| No badge | Unchanged flight (shown for context, no action taken) |

**Updated flights** appear as a before/after diff row. Columns that changed are highlighted. This is a single update operation — not a remove + add pair.

**Header summary counts** on each package group:
- `+N flights` — pure additions
- `N updated` — edits (shown once, not counted in add or remove)
- `−N flights` — pure removals

> Only `sync` flights can be removed by the sync process. A `manual` flight will never be deleted, even if it no longer appears in the MFF.

---

## 6. What Happens on Apply

Apply runs in two sequential phases.

### Phase 1 — Packages

In order:
1. **Create** new packages (`source: "sync"`, `status: "unpublished"`)
2. **Update** changed packages (hotels, transport, rooms) — `source: "sync"` packages only (skips `unsync`)
3. **Promote** matched manual packages → mark `source: "sync"`

New packages are always created as `unpublished`. An agent must review and publish them before they appear in quotation forms.

### Phase 2 — Flights

In order:
1. **Add** new flights (`source: "sync"`, stores airline name in `flight` column)
2. **Remove** stale flights — only `source: "sync"` flights; manual flights are never removed
3. **Promote** matched manual flights → mark `source: "sync"`

---

## 7. Key Rules & Edge Cases

| Rule | Reason |
|---|---|
| `PLATINUM` excluded from auto-creation | Pricing anomalies require manual review |
| Only `sync` flights can be removed | Prevents accidental deletion of manually-added flights |
| `unsync` packages are skipped on update | Protects manual edits to sync-managed fields from being overwritten |
| Editing inclusions/exclusions does NOT unsync a package | Sync never writes those fields, so editing them is always safe |
| `unsync` packages are **never** re-promoted to `sync` | `unsync` is a one-way exit — re-promoting would silently overwrite the manual edits that caused the transition. Reversing it requires a manual DB patch. |
| New packages are created as `unpublished` | Agents must review before offering to clients |
| Airline stored as full name, not flight number | Easier for agents to read; avoids MFF code ambiguity |
| MH charter flights have bare 4-digit codes | No `MH` prefix in MFF; matched by `/^\d{4}[A-Z]?$/` pattern |
| MFF CODE column fill-down can be wrong | Parser overrides airline using the actual flight number prefix |
| Re-uploading the same files shows zero changes | Idempotent — safe to run multiple times |

---

## 8. Technical Reference

### Parser pipeline

```
parsePriceListCsv(text, dbPackages, dbDetails)
  → PackageMappingRow[]   (one row per package × season)

parseMffCsv(text, mappingRows, dbFlights)
  → FlightDiffRow[]       (one row per departure date × package)

buildSyncPlan(mappingRows, flightRows, existingPackages)
  → SyncPlan
```

All three functions run in-browser inside a `useMemo` on the sync page. No server round-trip until Apply.

---

### `PackageMappingRow` — key fields

| Field | Type | Description |
|---|---|---|
| `canonical_name` | `string` | Uppercased package name used for DB matching |
| `season_code` | `string` | Normalised season (e.g. `LS - JULY TO SEP`) |
| `match_status` | `"MATCHED" \| "NEW" \| "ORPHAN"` | DB match result |
| `db_id` | `string` | DB package `_id` if matched |
| `transport` | `string` | Airline name from price list |
| `makkah_hotel` / `makkah_meals` | `string` | Hotel name + meal plan shorthand (`FB`, `HB`, `BB`) |

---

### `FlightDiffRow` — key fields

| Field | Type | Description |
|---|---|---|
| `status` | `"added" \| "removed" \| "unchanged" \| "edited" \| "no_db_package"` | Diff outcome |
| `airline` | `string` | Airline code from MFF (`SV`, `MH`) |
| `dep_flight` | `string` | Departure flight number |
| `db_flight_id` | `string` | DB `package_flights._id` if matched |
| `db_airline` | `string?` | Airline name currently stored in DB (edited rows only) |
| `notes` | `string` | `"promote"` if manual flight matched (to be promoted on apply) |

---

### `SyncPlan` — structure

```typescript
type SyncPlan = {
  packagesToCreate:  PackageCreateSpec[];   // NEW price list rows
  packagesToUpdate:  PackageUpdateSpec[];   // MATCHED rows with field changes
  packagesToPromote: string[];              // manual DB package IDs → source: "sync"
  flightsToAdd:      FlightAddSpec[];       // MFF rows not in DB
  flightsToRemove:   FlightRemoveSpec[];    // DB sync-flights not in MFF
  flightsToPromote:  string[];             // manual DB flight IDs → source: "sync"
};
```

---

### `source` field — state transitions

```
packages:
  (new via form)      → manual
  (new via sync)      → sync
  (manual + matched)  → sync          (on apply: packagesToPromote)
  (sync + edited)     → unsync        (on updatePackage mutation)
  (unsync + matched)  → unsync        (sync skips it, no re-promotion)

package_flights:
  (new via form)      → manual
  (new via sync)      → sync
  (manual + matched)  → sync          (on apply: flightsToPromote)
  (sync, not in MFF)  → deleted       (removed on apply)
  (manual, not in MFF)→ kept as-is    (never removed by sync)
```

---

### `fltChanged` detection

The parser compares airline **names** (not flight numbers) because the DB stores the full airline name:

```typescript
const mffAirlineName = airlineName(row.airline);   // "Saudi Airlines"
const dbAirlineName  = dbFlight.flight;            // already stored as "Saudi Airlines"
const fltChanged = mffAirlineName !== "" && dbAirlineName !== mffAirlineName;
```

Sector changes are compared directly (`departure_sector`, `return_sector`). A mismatch on either airline or sectors marks the row as `"edited"`.

---

### Files

| Path | Purpose |
|---|---|
| `app/features/packages/sync/parsers.ts` | All in-browser parsing + plan building |
| `app/features/packages/sync/types.ts` | Shared types for all sync data structures |
| `app/routes/_protected/package.sync.tsx` | Sync UI page (upload → review → apply) |
| `convex/packages.ts` | `syncPackageFromCsv`, `updatePackage`, `promotePackageToSync` |
| `convex/packageFlights.ts` | `addFlight`, `deleteFlight`, `promoteToSync` |
| `convex/schema.ts` | `packages.source`, `package_flights.source` field definitions |
| `app/routes/_protected/flight.audit.tsx` | `/flights/audit` — browse all flights with source badges |
