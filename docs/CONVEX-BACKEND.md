# Convex Backend Documentation

MKM Quotation Management System — Backend Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Schema Reference](#schema-reference)
4. [Quotations Module](#quotations-module)
5. [Packages Module](#packages-module)
6. [Clients Module](#clients-module)
7. [Profiles Module](#profiles-module)
8. [Inquiries Module](#inquiries-module)
9. [Data Patterns & Architecture](#data-patterns--architecture)
10. [Utility Functions](#utility-functions)

---

## Overview

The backend is powered by [Convex](https://convex.dev) — a reactive database with built-in real-time sync. All backend logic lives in the `convex/` directory. No separate API server is needed; Convex functions are called directly from the frontend via `useQuery` / `useMutation` hooks or the `ConvexHttpClient` in server loaders.

**Plugin used**: `@convex-dev/aggregate` for aggregation operations.

---

## Configuration

### `convex/convex.config.ts`

```ts
import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex/component";

const app = defineApp();
app.use(aggregate);
export default app;
```

### `convex/constants.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `PAGE_SIZE` | `10` | Default page size for paginated queries |

---

## Schema Reference

All tables are defined in `convex/schema.ts`.

### `clients`

Stores client contact information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Client full name |
| `phone_number` | string | no | Contact phone |
| `created_at` | string (ISO) | yes | Creation timestamp |
| `updated_at` | string (ISO) | yes | Last update timestamp |

_No indexes._

---

### `inquiries`

Tracks sales inquiry status (not yet implemented).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | `Id<"clients">` or string | yes | Linked client |
| `status` | `"open" \| "won" \| "lost"` | yes | Inquiry status |
| `title` | string | yes | Inquiry title |
| `created_at` | string (ISO) | yes | |
| `updated_at` | string (ISO) | yes | |

**Indexes**: `by_client_id`, `by_status`

---

### `packages`

Travel package definitions (Umrah packages).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Package name |
| `duration` | string | yes | e.g. "9 Days 7 Nights" |
| `season` | string | no | e.g. "RAMADAN", "SYAWAL" |
| `transport` | string | no | e.g. "MAS", "AIR ASIA" |
| `status` | `"published" \| "unpublished"` | yes | Visibility status |
| `year` | string | yes | e.g. "2026/2027" |
| `package_code` | string | no | Short code identifier |
| `inclusions` | string | no | What's included (long text) |
| `exclusions` | string | no | What's excluded (long text) |
| `created_at` | string (ISO) | yes | |
| `updated_at` | string (ISO) | yes | |

_No indexes._

---

### `package_flights`

Flight schedules linked to a package.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `package_id` | `Id<"packages">` or string | yes | Parent package |
| `month` | string | yes | e.g. "JAN", "FEB" |
| `flight` | string | no | Flight code |
| `departure_date` | string | yes | ISO date string |
| `departure_sector` | string | yes | e.g. "KUL-JED" |
| `return_date` | string | yes | ISO date string |
| `return_sector` | string | yes | e.g. "JED-KUL" |
| `created_at` | string (ISO) | yes | |

**Index**: `by_package_id`

---

### `package_hotels`

Hotel configurations per package (Makkah, Madinah, Taif, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `package_id` | `Id<"packages">` or string | yes | Parent package |
| `hotel_type` | string | yes | e.g. "makkah", "madinah" |
| `name` | string | no | Hotel name |
| `enabled` | boolean | yes | Whether this hotel is included |
| `placeholder` | string | yes | Display placeholder text |
| `created_at` | string (ISO) | yes | |

**Index**: `by_package_id`

---

### `package_meals`

Meal types available at a hotel.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `package_hotel_id` | `Id<"package_hotels">` or string | yes | Parent hotel |
| `meal_type` | string | yes | e.g. "breakfast", "half-board" |
| `created_at` | string (ISO) | yes | |

**Index**: `by_package_hotel_id`

---

### `package_rooms`

Room types and their prices per package.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `package_id` | `Id<"packages">` or string | yes | Parent package |
| `room_type` | string | yes | e.g. "Double", "Triple", "Quad" |
| `price` | number | yes | Price per pax (RM) |
| `enabled` | boolean | yes | Whether selectable |
| `created_at` | string (ISO) | yes | |

**Index**: `by_package_id`

---

### `hotel_templates`

Master list of hotel types used when creating new packages.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hotel_type` | string | yes | e.g. "makkah", "madinah" |
| `name` | string | no | Default hotel name |
| `placeholder` | string | yes | UI placeholder text |
| `enabled` | boolean | yes | Active status |
| `created_at` | string (ISO) | yes | |

_No indexes._

---

### `room_templates`

Master list of room types used when creating new packages.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | e.g. "Double", "Triple", "Quad" |
| `price` | number | yes | Default price |
| `enabled` | boolean | yes | Active status |
| `sort_order` | number | yes | Display order |
| `created_at` | string (ISO) | yes | |

_No indexes._

---

### `profiles`

User profile data (linked to Supabase Auth users).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | string | yes | Display name |
| `branch` | string | yes | Office branch |
| `unit` | string | no | Business unit |
| `updated_at` | string (ISO) | yes | |

_No indexes._

---

### `quotations`

Main quotation records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inquiry_id` | `Id<"inquiries">` or string | no | Linked inquiry |
| `hijri_year` | string | yes | e.g. "1448H" |
| `sequence_num` | number | yes | Auto-incremented per hijri year |
| `revision` | number | yes | Revision counter (0 = initial) |
| `client_name` | string | yes | Denormalized client name |
| `package_id` | string | yes | Linked package ID |
| `status` | enum | yes | See status list below |
| `total_amount` | number | yes | Total in RM |
| `notes` | string | no | Internal notes |
| `created_at` | string (ISO) | yes | |
| `updated_at` | string (ISO) | yes | |
| `created_by` | string | yes | User identifier |
| `pic_name` | string | yes | Person in charge name |
| `branch` | string | yes | Originating branch |
| `flight_id` | string | yes | Linked flight ID |
| `client_id` | string | yes | Linked client ID |

**Quotation Statuses**: `draft` | `sent` | `accepted` | `rejected` | `revised` | `superseded`

**Indexes**: `by_inquiry_id`, `by_client_id`, `by_package_id`, `by_hijri_year`, `by_updated_at`

---

### `quotation_items`

Line items belonging to a quotation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quotation_id` | string | yes | Parent quotation ID |
| `item_type` | `"room" \| "addon" \| "discount"` | yes | Category of item |
| `description` | string | yes | Item label |
| `package_room_id` | string | yes | Linked room ID (or empty for addon/discount) |
| `quantity` | number | yes | Pax count |
| `unit_price` | number | yes | Price per pax |
| `original_price` | number | no | Pre-discount price (for discounts) |
| `created_at` | string (ISO) | yes | |

**Index**: `by_quotation_id`

---

### `quotation_logs`

Audit trail for all quotation changes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quotation_id` | string | yes | Parent quotation ID |
| `action` | string | yes | e.g. "created", "updated" |
| `description` | string | yes | Human-readable summary |
| `performed_by` | string | yes | User identifier |
| `created_at` | string (ISO) | yes | |
| `snapshot_data` | string | no | JSON snapshot of quotation state |

**Index**: `by_quotation_id`

---

## Quotations Module

**File**: `convex/quotations.ts`

### Queries

#### `list()`
Returns all quotations sorted by `created_at` descending.

**Returns**: Array of quotation view objects
```ts
{
  id: string;
  quotation_number: string;   // e.g. "1448H-0001" or "1448H-0001-R1"
  client_name: string;
  pic_name: string;
  branch: string;
  status: string;
  total_amount: number;
  notes?: string;
  hijri_year: string;
  created_at: string;
  updated_at: string;
  package: { id: string; name: string; year: string; duration: string } | null;
  selected_flight: { ... } | null;
}
```

---

#### `listPaginated(paginationOpts, sortBy?, sortDir?)`
Cursor-based paginated list with sorting support.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `paginationOpts` | Convex pagination opts | required | Cursor + numItems |
| `sortBy` | `"updated_at" \| "created_at"` | `"updated_at"` | Sort field |
| `sortDir` | `"asc" \| "desc"` | `"desc"` | Sort direction |

**Returns**: `{ ...paginationResult, page: QuotationViewObject[] }`

Uses `by_updated_at` index when sorting by `updated_at`. Falls back to full scan for `created_at` sort.

---

#### `count(searchTerm?)`
Returns the total count of quotations. When `searchTerm` is provided, counts matching quotations only (matches against `client_name` or package `name`, case-insensitive).

---

#### `getQuotationForEdit(target_quotation_id)`
Returns a minimal quotation object suitable for pre-filling the edit form.

**Returns**:
```ts
{
  id: string;
  reference_number: string;
  pic_name: string;
  branch: string;
  client_id: string;
  notes?: string;
  package_id: string;
  flight_id: string;
  selected_rooms: RoomItem[];
  adds_ons: AddonItem[];
  discounts: DiscountItem[];
  status: string;
}
```

---

#### `getQuotationFullDetails(target_quotation_id)`
Returns the complete quotation with all nested data needed for the PDF preview.

**Returns**:
```ts
{
  id: string;
  reference_number: string;
  status: string;
  client_name: string;
  pic_name: string;
  branch: string;
  notes?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  hijri_year: string;
  package: {
    id: string; name: string; year: string; duration: string;
    transport?: string; inclusions?: string; exclusions?: string;
    package_code?: string;
    hotels: HotelWithMeals[];
    available_rooms: RoomOption[];
    available_flights: FlightOption[];
  };
  items: {
    selected_rooms: SelectedRoomWithSubtotal[];
    adds_ons: AddonItem[];
    discounts: DiscountItem[];
  };
}
```

---

#### `findDuplicates()`
Finds quotations that share the same `(client_name, package_id, flight_id, total_amount)`.

**Returns**:
```ts
Array<{
  clientName: string;
  packageId: string;
  flightId: string;
  totalAmount: number;
  count: number;
  quotationIds: string[];
  createdDates: string[];
}>
```
Only returns groups with 2 or more quotations.

---

### Mutations

#### `create(payload)`
Creates a new quotation with all line items.

**Args**:
```ts
{
  pic_name: string;
  branch: string;
  client_id: string;
  package_id: string;
  flight_id: string;
  notes?: string;
  status?: string;        // defaults to "draft"
  created_by?: string;
  selected_rooms: Array<{
    package_room_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  adds_ons?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  discounts?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    original_price?: number;
  }>;
}
```

**Validations**:
- Client must exist
- Package must exist
- Flight must exist and belong to the specified package
- At least one room must be selected
- Pax quantities must be positive integers

**Side effects**:
- Auto-generates `sequence_num` (increments per hijri year)
- Creates all `quotation_items` records
- Creates a `quotation_logs` entry with JSON snapshot

**Returns**: `{ id, quotation_number, hijri_year, sequence_num, revision, total_amount, status }`

---

#### `update(payload)`
Updates an existing quotation. Accepts same structure as `create` plus `id`.

**Side effects**:
- Deletes and reinserts all `quotation_items`
- Appends a `quotation_logs` entry

**Returns**: `{ id, quotation_number, total_amount, status }`

---

#### `deleteById(quotationId)`
Deletes a quotation and all associated data.

**Side effects**: Deletes `quotation_items` and `quotation_logs` for this quotation.

**Returns**: `{ success, deletedQuotationId, deletedItemsCount, deletedLogsCount }`

---

#### `resequenceByCreatedAt(dryRun?)`
Admin utility. Re-numbers all quotations within each hijri year based on `created_at` order.

**Returns**: `{ dryRun, totalQuotations, updatedCount, summaryByYear[] }`

---

#### `repairStaleFlightIds(dryRun?)`
Admin utility. Finds quotations whose `flight_id` no longer exists and replaces with the first available flight for that package.

**Returns**: `{ dryRun, staleCount, repairedCount, unresolvableCount, results[] }`

---

## Packages Module

**File**: `convex/packages.ts`

### Queries

#### `list()`
Returns all packages without filtering.

---

#### `listWithRooms(searchTerm?)`
Returns all packages with nested rooms, flights, and hotels (including meals). Optionally filters by `searchTerm` against the package `name` (case-insensitive).

**Returns**:
```ts
Array<{
  ...package,
  rooms: PackageRoom[];
  flights: PackageFlight[];
  hotels: Array<PackageHotel & { meals: PackageMeal[] }>;
}>
```

---

#### `getById(id)`
Returns a single package with full nested details. Returns `null` if not found.

---

#### `getPackageTemplate()`
Returns the master templates used to initialize hotels and rooms for a new package.

**Returns**: `{ hotelTemplates: HotelTemplate[], roomTemplates: RoomTemplate[] }`

Rooms are sorted by `sort_order`.

---

#### `checkExistingPackagesForYear(year, packages)`
Checks whether any of the given packages already exist for the specified year.

**Args**:
```ts
{
  year: string;
  packages: Array<{ name: string; season?: string }>;
}
```

Matches by normalized key: `name::year::season`.

**Returns**: Array of matched existing packages with `_id`, `name`, `year`, `season`.

---

### Mutations

#### `createPackage(payload)`
Creates a package with all nested hotels (and their meals), rooms, and flights.

**Args**:
```ts
{
  name: string; duration: string; season?: string;
  transport?: string; year: string;
  status: "published" | "unpublished";
  inclusions: string; exclusions: string;
  hotels: Array<{
    hotel_type: string; name?: string; enabled: boolean;
    placeholder: string;
    meals: Array<{ meal_type: string }>;
  }>;
  rooms: Array<{
    room_type: string; price: number; enabled: boolean;
  }>;
  flights: Array<{
    month: string; flight?: string;
    departure_date: string; departure_sector: string;
    return_date: string; return_sector: string;
  }>;
}
```

**Returns**: `{ packageDocId }`

---

#### `updatePackage(id, payload)`
Full update of a package. Hotels and rooms are deleted and reinserted. Flights are patched if they have an `_id`, otherwise inserted.

**Returns**: `{ packageId }`

---

#### `updatePackageStatus(id, status)`
Toggles a package between `"published"` and `"unpublished"`.

**Returns**: `{ packageId, status }`

---

#### `createPackageWithFlight(payload)`
Bulk operation for importing packages from a flight schedule.

For each package in the payload:
- If it already exists (matched by name + year + season): updates only the flights
- If new: creates package + hotels from templates + rooms

**Returns**: `{ createdCount, updatedCount, packages[] }`

---

#### `backfillMissingHotelsFromTemplates(dryRun?)`
Admin utility. Finds packages that are missing hotel types defined in `hotel_templates` and inserts the missing ones.

**Returns**: `{ dryRun, packageCount, templateCount, insertedCount, insertedByTemplateType }`

---

#### `reconcilePackageHotelsFromTemplates(dryRun?, keepBeforeIso?)`
Admin utility. Finds and removes duplicate hotel records per package, keeping the most relevant one (by meal count, then creation date).

**Returns**: `{ dryRun, packageCount, templateCount, insertedCount, deletedHotelCount, deletedMealCount, insertedByTemplateType }`

---

## Clients Module

**File**: `convex/clients.ts`

### Queries

#### `list()`
Returns all clients sorted by `created_at` descending.

**Returns**:
```ts
Array<{
  id: string;
  name: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}>
```

---

### Mutations

#### `create(name, phone_number?)`
Creates a new client. Trims whitespace from inputs.

**Returns**: The created client object.

---

## Profiles Module

**File**: `convex/profiles.ts`

### Mutations

#### `removeLegacySupabaseIds()`
Admin utility. Removes the deprecated `supabase_id` field from all profile documents.

**Returns**: `{ total_profiles, cleaned }`

---

## Inquiries Module

**File**: `convex/inquiries.ts`

Currently empty — no functions implemented.

---

## Data Patterns & Architecture

### Quotation Number Generation

```
Format (initial):   {HIJRI_YEAR}-{SEQUENCE:4d}
Format (revision):  {HIJRI_YEAR}-{SEQUENCE:4d}-R{REVISION}

Examples:
  1448H-0001       → First quotation of Hijri year 1448
  1448H-0023-R2    → Second revision of the 23rd quotation
```

Hijri year is auto-mapped from the Gregorian year of the selected package:

| Gregorian Year | Hijri Year |
|----------------|------------|
| 2025/2026 | 1447H |
| 2026/2027 | 1448H |
| 2027/2028 | 1449H |
| 2028/2029 | 1450H |

`sequence_num` auto-increments by scanning all quotations for the current `hijri_year` and taking `max(sequence_num) + 1`.

---

### Total Amount Calculation

```
totalAmount = roomsTotal + addOnsTotal - discountsTotal

where:
  roomsTotal    = sum(room.unit_price × room.quantity)
  addOnsTotal   = sum(addon.unit_price × addon.quantity)
  discountsTotal = sum(discount.unit_price × discount.quantity)
```

All values normalized to 2 decimal places via `Math.round(value * 100) / 100`.

---

### Audit Logging

Every `create` and `update` on a quotation writes a `quotation_logs` entry:

```ts
{
  quotation_id: string;
  action: "created" | "updated";
  description: string;
  performed_by: string;
  created_at: string;
  snapshot_data?: string;  // JSON.stringify of the full quotation state
}
```

---

### Package Hierarchy

```
packages
  └── package_hotels (many, by package_id)
        └── package_meals (many, by package_hotel_id)
  └── package_rooms (many, by package_id)
  └── package_flights (many, by package_id)
```

Template tables (`hotel_templates`, `room_templates`) are used to seed new packages with standard hotel types and room configurations.

---

### Pagination Strategy

- **Normal listing**: Convex cursor-based pagination via `paginationOptsValidator`
- **Search with filter**: Load all, filter in memory, slice by `PAGE_SIZE`
- **Page size**: `PAGE_SIZE = 10`

---

## Utility Functions

Defined in `convex/quotations.ts`:

| Function | Description |
|----------|-------------|
| `buildQuotationNumber(hijriYear, seq, rev)` | Formats quotation reference number |
| `getMappedHijriYear(year)` | Maps Gregorian year string → Hijri year string |
| `normalizeCurrency(value)` | Rounds number to 2 decimal places |
| `buildLineTotal(price, pax)` | Computes `price × pax` then normalizes |
| `parseCreatedAt(value)` | Parses ISO date string to milliseconds |
| `findQuotationByStringId(ctx, id)` | Full-scan lookup by string ID |

Defined in `convex/packages.ts`:

| Function | Description |
|----------|-------------|
| `dedupeById(arr)` | Removes duplicate documents by `_id` |
