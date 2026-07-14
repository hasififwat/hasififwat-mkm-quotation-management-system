# App Features Documentation

MKM Quotation Management System — Frontend Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Routing Structure](#routing-structure)
4. [Authentication](#authentication)
5. [Feature: Quotation Management](#feature-quotation-management)
6. [Feature: Package Management](#feature-package-management)
7. [Feature: Flight Management](#feature-flight-management)
8. [Feature: Client Management](#feature-client-management)
9. [Feature: Dashboard](#feature-dashboard)
10. [Shared UI Components](#shared-ui-components)
11. [Layout & Navigation](#layout--navigation)
12. [Data Flow Patterns](#data-flow-patterns)
13. [Business Logic Reference](#business-logic-reference)
14. [File Structure](#file-structure)

---

## Overview

MKM Quotation Management System is an internal web app for managing Umrah travel quotations. Staff create quotations for clients by selecting travel packages, flights, room configurations, and add-ons, then export the result as a branded PDF.

**Core workflow**:
1. Define travel packages (hotels, rooms, flights, pricing)
2. Create client records
3. Build quotations by combining a client + package + flight + rooms
4. Export and share as a PDF

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + React Router 7 (SSR) |
| Backend | Convex (real-time database + functions) |
| Auth | Supabase Auth + SSR cookies |
| Styling | TailwindCSS 4 + CVA (class-variance-authority) |
| UI Primitives | Radix UI |
| UI Components | shadcn/ui |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Tables | TanStack React Table 8 |
| PDF Export | @react-pdf/renderer |
| CSV Parsing | PapaParse |
| Theming | next-themes (dark/light) |
| Toasts | Sonner |
| Date Utilities | date-fns |
| Bundler | Vite 7 |
| Type Checking | TypeScript 5 |
| Linting | Biome |

---

## Routing Structure

All routes under `/_protected` require an authenticated Supabase session. Unauthenticated requests are redirected to `/`.

```
/                           → Login page
/sign-up                    → Registration page
/logout                     → Server action (clears session)

/_protected/                → Protected layout (auth check + profile load)
  /dashboard                → Dashboard (placeholder stats)
  /packages                 → Package list
  /packages/create          → Create package (multi-step form)
  /packages/create-from-schedule  → Import packages from CSV
  /packages/edit/:pid       → Edit package
  /quotations               → Quotation list (paginated)
  /quotations/create        → Create quotation
  /quotations/edit/:qid     → Edit quotation
  /quotations/review/:qid   → PDF preview & download
  /quotations/duplicates    → Find & delete duplicate quotations
  /clients                  → Client list (placeholder)
  /clients/create           → Create client (placeholder)
  /flights                  → Flight schedule management
  /resources/create-client  → Standalone client creation endpoint
```

---

## Authentication

### Flow

1. **Login** (`/`): Email + password form. On submit, calls `supabase.auth.signInWithPassword()`. On success, redirects to `/packages`.
2. **Session check**: The `_protected` layout loader runs on every protected page request. It calls `getServerClient()` and `AuthService.getFullProfile()`. If no profile is found, it redirects to `/`.
3. **Logout** (`/logout`): POST form action that calls `supabase.auth.signOut()` and redirects to `/`.

### Key Files

| File | Purpose |
|------|---------|
| `app/routes/login.tsx` | Login page + server action |
| `app/routes/logout.tsx` | Logout server action |
| `app/routes/_protected.tsx` | Protected layout with session guard |
| `app/services/auth-service.tsx` | Supabase profile RPC calls |
| `app/lib/supabase/server.ts` | Supabase SSR client factory |

### Auth Service

```ts
AuthService.getFullProfile(supabaseClient)
// Calls Supabase RPC: get_my_full_profile
// Returns: { full_name, email, branch, unit, ... }

AuthService.getUserProfileByEmail(supabaseClient, email)
// Calls Supabase RPC: get_profile_by_email
```

---

## Feature: Quotation Management

**Directory**: `app/features/quotation/`

The core feature of the app. Staff create, edit, and export Umrah travel quotations.

### Pages

#### `/quotations` — Quotation Listing

Displays all quotations in a sortable, searchable, paginated table.

**Key behaviors**:
- **Normal mode**: Cursor-based pagination via Convex `listPaginated`. Sorted by `updated_at` (default) or `created_at`, ascending or descending.
- **Search mode**: Loads all quotations, filters in-memory by `client_name` or package `name`, then paginates with offset. Search is debounced.
- **Column visibility**: Toggle which columns are shown (name, status, amount, dates, etc.)
- **Sorting**: Click column headers; cursor resets on sort change.

**Convex calls**:
- `api.quotations.listPaginated` — paginated list
- `api.quotations.count` — total count (for search result count)

---

#### `/quotations/create` — Create Quotation

Multi-step form (QuotationBuilder) for building a new quotation.

**Step 1 — Client Details**:
- Select existing client from searchable dropdown, OR create a new client inline via modal
- Enter PIC (person in charge) name
- Select branch
- Optional notes

**Step 2 — Package Selection**:
- Select package from searchable dropdown
- On package selection: available flights and rooms load automatically
- Select a flight (departure + return dates shown)
- Select room types with pax count (pricing shows per-pax amount)
- Running total updates live

**Step 3 — Add-ons & Discounts**:
- Add-ons: extra services (description, quantity, unit price)
- Discounts: reductions (description, quantity, amount)
- Grand total = rooms subtotal + add-ons − discounts

On submit → server action → `api.quotations.create` → redirect to `/quotations`.

**Validation** (Zod):
- `client_id` required
- `package_id` required
- `flight_id` required
- At least one room with pax > 0
- All prices must be positive numbers

---

#### `/quotations/edit/:qid` — Edit Quotation

Same QuotationBuilder form, pre-populated from `api.quotations.getQuotationForEdit`.

On submit → `api.quotations.update`.

---

#### `/quotations/review/:qid` — PDF Preview

Renders the quotation as a formatted PDF document using `@react-pdf/renderer`.

**PDF contents**:
- Company header / logo
- Client information
- Quotation reference number
- Package details (name, duration, transport)
- Selected flight (departure, return, sectors)
- Hotel information
- Room pricing breakdown (type × pax × price = subtotal)
- Add-ons
- Discounts
- Grand total
- Terms & Conditions (5 Malay conditions, hardcoded)

**Download**: Button triggers browser PDF download as `{clientName}_{quotationNumber}.pdf`.

**Mobile preview**: Scaled-down version (`PDFPreviewMobile`) for small screens.

---

#### `/quotations/duplicates` — Duplicate Finder

Calls `api.quotations.findDuplicates` to identify quotations sharing the same client + package + flight + amount. Allows bulk deletion.

---

### Components

| Component | Purpose |
|-----------|---------|
| `QuotationBuilder.tsx` | Multi-step create/edit form |
| `QuotationListing.tsx` | Listing page wrapper |
| `QuotationTable/data-table.tsx` | TanStack Table implementation |
| `PDFPreview.tsx` | Full-screen PDF renderer |
| `PDFPreviewMobile.tsx` | Scaled mobile PDF renderer |
| `CreateClientModal.tsx` | Inline client creation modal |

### Zod Schemas (`features/quotation/schema.ts`)

| Schema | Purpose |
|--------|---------|
| `quotationFormSchema` | Form validation for builder |
| `quotationRowSchema` | Response shape for listing |
| `quotationFullDetailsSchema` | Full details for PDF render |

### Quotation Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Created but not yet sent to client |
| `sent` | Sent to client |
| `accepted` | Client has accepted |
| `rejected` | Client has declined |
| `revised` | A revision has been created |
| `superseded` | Replaced by a newer quotation |

---

## Feature: Package Management

**Directory**: `app/features/packages/`

Manages Umrah travel packages — the base product from which quotations are built.

### Pages

#### `/packages` — Package List

Displays all packages. Supports search by name. Each row shows name, year, duration, room count, status badge.

**Status toggle**: Published/Unpublished can be toggled inline via `api.packages.updatePackageStatus`.

---

#### `/packages/create` — Create Package

6-step PackageBuilder form:

**Step 1 — Basic Details**:
- Package name
- Year (e.g. 2026/2027)
- Duration (e.g. "9 Days 7 Nights")
- Transport (airline)
- Status (published/unpublished)

**Step 2 — Hotels & Meals**:
- Hotels pre-loaded from `hotel_templates`
- Toggle each hotel type (Makkah, Madinah, Taif, etc.)
- Select meal types per hotel (breakfast, half-board, full-board, etc.)
- Enter hotel name

**Step 3 — Inclusions & Exclusions**:
- Long-form text areas for what's included and excluded in the package price

**Step 4 — Pricing (Rooms)**:
- Room types pre-loaded from `room_templates` (sorted by `sort_order`)
- Set price per pax for each room type (Double, Triple, Quad, etc.)
- Toggle room availability

**Step 5 — Flights**:
- Add flight records: month, flight code, departure date/sector, return date/sector
- Multiple flights per package supported

**Step 6 — Preview**:
- Full summary of all entered data before save

On save → `api.packages.createPackage`.

---

#### `/packages/edit/:pid` — Edit Package

Same PackageBuilder pre-populated from `api.packages.getById`.

On save → `api.packages.updatePackage`.

> **Note**: Hotels and rooms are deleted and reinserted on update. Flights with an existing `_id` are patched; new ones are inserted.

---

#### `/packages/create-from-schedule` — Import from CSV

Allows bulk package creation by uploading a flight schedule CSV.

**CSV format**:

| Column | Description |
|--------|-------------|
| `month` | Month name or abbreviation |
| `season` | Package season (e.g. "RAMADAN") |
| `pakej` | Package name(s), semicolon-separated |
| `departure` | Departure date |
| `return` | Return date |
| `departureSector` | e.g. "KUL-JED" |
| `returnSector` | e.g. "JED-KUL" |
| `code` | Flight code |

**Import process**:
1. Upload CSV → parsed by PapaParse
2. Headers normalized (lowercase, special chars removed)
3. Dates parsed (supports `dd-MMM-yy`, `dd/mm/yyyy`, Malay month names)
4. Package name aliases applied (e.g. `UMJ` → `MENARA JAM`)
5. Flights grouped by package + season
6. Existing packages flagged (won't duplicate)
7. ImportPreview shown for review
8. ImportSettingModal allows seasonal pricing overrides
9. On confirm → `api.packages.createPackageWithFlight` (bulk)

---

### Components

| Component | Purpose |
|-----------|---------|
| `PackageBuilder.tsx` | Multi-step create/edit form |
| `PackageList.tsx` | List with search |
| `PackageListTable/` | TanStack Table for packages |
| `PackagePreviewCard.tsx` | Read-only package summary |
| `ImportPreview.tsx` | CSV import review screen |
| `ImportSettingModal.tsx` | Configure seasonal pricing |
| `SelectPackageButton.tsx` | Used in quotation builder to pick a package |
| `SetSeasonalPriceButton.tsx` | Set per-season room price overrides |
| `YearSelect.tsx` | Year dropdown picker |

### Package Upload Context

`Context/PackageUploadContext.tsx` manages state during multi-package CSV upload, including per-package seasonal pricing overrides.

### Utility Functions (`utils.ts`)

| Function | Purpose |
|----------|---------|
| `normalizePackageMutationPayload()` | Transforms form data → Convex mutation args |
| `transformConvexPackage()` | Transforms API response → form-friendly structure |

---

## Feature: Flight Management

**Directory**: `app/features/flights/`

### Page: `/flights`

Displays all flight schedules linked to packages. Supports view, search, and management.

### Components

| Component | Purpose |
|-----------|---------|
| `FlightMaster.tsx` | Main page component |
| `FlightListings.tsx` | Flight list display |
| `data-table.tsx` | TanStack Table |
| `columns.tsx` | Column definitions (month, code, departure, return, sector, package) |

### Flight Import Hook: `useExtractPackage`

**File**: `app/hooks/useExtractPackage.tsx`

Core logic for parsing flight schedule CSVs:

1. Reads uploaded file via PapaParse
2. Normalizes headers
3. Parses and validates dates (multiple formats, Malay abbreviations)
4. Resolves package name aliases
5. Queries Convex to flag existing packages
6. Groups flights by package + season
7. Returns structured data for ImportPreview

**Package name aliases**:

| Alias | Resolves to |
|-------|------------|
| `UMJ` | MENARA JAM |
| `UMJ P` | UMJ PREMIUM |
| _(others defined in hook)_ | |

**Supported date formats**:
- `dd-MMM-yy` (e.g. `15-JAN-26`)
- `dd/mm/yyyy` (e.g. `15/01/2026`)
- Malay abbreviations: MAC = MAR, OGOS = AUG, etc.

---

## Feature: Client Management

**Directory**: `app/features/clients/`

**Status**: Partially implemented. Pages exist as placeholders.

### Components

| Component | Purpose |
|-----------|---------|
| `ClientBuider.tsx` | Client creation form |
| `ClientForm.tsx` | React Hook Form for client data |
| `ClientList.tsx` | Client listing |
| `ClientListingPage.tsx` | Page wrapper |
| `ClientTable/` | TanStack Table |
| `clientStore.ts` | Local state for client data |

### Client Fields

| Field | Type |
|-------|------|
| `name` | string |
| `phone_number` | string (optional) |

### Inline Client Creation

During quotation creation, staff can create a new client without leaving the form via **CreateClientModal** (`features/quotation/components/CreateClientModal.tsx`). This calls `api.clients.create` and immediately makes the new client selectable.

---

## Feature: Dashboard

**Directory**: `app/features/dashboard/`

**Status**: Placeholder. Currently displays:
- Welcome message
- 4 static stat cards (Total Users, Active Projects, Analytics, Settings)
- Static Recent Activity feed

Intended to eventually show live quotation analytics and activity.

---

## Shared UI Components

**Directory**: `app/components/ui/`

Built on shadcn/ui (Radix UI primitives + Tailwind).

### Core Components

| Component | Description |
|-----------|-------------|
| `button.tsx` | Button with variants: default, destructive, outline, secondary, ghost, link |
| `card.tsx` | Card with Header, Content, Footer, Title, Description |
| `input.tsx` | Text input |
| `field.tsx` | Form field with label, error, description |
| `select.tsx` | Dropdown select (Radix) |
| `dialog.tsx` | Modal dialog (Radix) |
| `popover.tsx` | Floating content (Radix) |
| `dropdown-menu.tsx` | Dropdown menu (Radix) |
| `sheet.tsx` | Side drawer panel |
| `sidebar.tsx` | Navigation sidebar (with Provider, Menu, MenuButton) |
| `checkbox.tsx` | Checkbox (Radix) |
| `switch.tsx` | Toggle switch (Radix) |
| `separator.tsx` | Horizontal divider |
| `label.tsx` | Form label (Radix) |
| `tooltip.tsx` | Hover tooltip (Radix) |
| `accordion.tsx` | Collapsible sections (Radix) |
| `combobox.tsx` | Searchable select combo |
| `multi-select.tsx` | Multi-selection dropdown |
| `calendar.tsx` | Date picker calendar (react-day-picker) |
| `season-badge.tsx` | Colored badge for package seasons |
| `command.tsx` | Command palette (cmdk) |
| `sonner.tsx` | Toast notifications wrapper |

### Custom Components

| Component | File | Purpose |
|-----------|------|---------|
| `SearchableDropdown` | `app/components/SearchableDropdown.tsx` | Dropdown with text search, used in quotation builder for client/package/flight selection |
| `DatePicker` | `app/components/DatePicker.tsx` | Calendar date picker wrapper |

---

## Layout & Navigation

**File**: `app/layout/SidebarLayout.tsx`

The main app shell rendered for all authenticated routes.

**Structure**:
- **Header**: Logo ("MKM Quotation") + theme toggle button
- **Sidebar navigation**:
  - Packages → `/packages`
  - Quotations → `/quotations`
- **Footer**: User profile card (avatar, full name, email) + Sign Out button
- **Main content**: Children rendered in scrollable area

**Theme**: Supports dark/light toggle via `ThemeToggle` + `next-themes`.

**Responsive**: Mobile sidebar triggered via hamburger button.

---

## Data Flow Patterns

The app uses three patterns for interacting with Convex, depending on the use case.

### Pattern 1: Server-side loader query

Used for initial page data. Runs on the server before the page renders.

```ts
// In a route loader:
export async function clientLoader() {
  const client = new ConvexHttpClient(convexUrl);
  const data = await client.query(api.quotations.listPaginated, { ... });
  return { data };
}

// In the component:
const { data } = useLoaderData();
```

**Used for**: Quotation listing, package listing, quotation edit/review pages.

---

### Pattern 2: Client-side useQuery (real-time)

Used when data should update automatically when the backend changes.

```ts
const packages = useQuery(api.packages.listWithRooms, { searchTerm });
```

**Used for**: Package search, live data that needs to refresh.

---

### Pattern 3: Server action with mutation

Used for create / update / delete operations submitted via form.

```ts
// In route action:
export async function action({ request }) {
  const client = new ConvexHttpClient(convexUrl);
  const payload = await request.json();
  await client.mutation(api.quotations.create, payload);
  return redirect("/quotations");
}
```

**Used for**: All form submissions (create/update quotation, create/update package, create client, delete).

---

### Convex API Reference

| Endpoint | Type | Used by |
|----------|------|---------|
| `api.quotations.list` | Query | Legacy/backup |
| `api.quotations.listPaginated` | Query | Quotation listing |
| `api.quotations.count` | Query | Search result count |
| `api.quotations.getQuotationForEdit` | Query | Edit form |
| `api.quotations.getQuotationFullDetails` | Query | PDF preview |
| `api.quotations.findDuplicates` | Query | Duplicates page |
| `api.quotations.create` | Mutation | Create form |
| `api.quotations.update` | Mutation | Edit form |
| `api.quotations.deleteById` | Mutation | Duplicates page |
| `api.packages.list` | Query | Various |
| `api.packages.listWithRooms` | Query | Package list + quotation builder |
| `api.packages.getById` | Query | Edit form |
| `api.packages.getPackageTemplate` | Query | Create form (hotel/room seeds) |
| `api.packages.checkExistingPackagesForYear` | Query | CSV import |
| `api.packages.createPackage` | Mutation | Create form |
| `api.packages.updatePackage` | Mutation | Edit form |
| `api.packages.updatePackageStatus` | Mutation | Status toggle in list |
| `api.packages.createPackageWithFlight` | Mutation | CSV import |
| `api.clients.list` | Query | Quotation builder client dropdown |
| `api.clients.create` | Mutation | Inline client creation |

---

## Business Logic Reference

### Quotation Number Format

```
{HIJRI_YEAR}-{SEQUENCE_NUM:04d}[-R{REVISION}]

Examples:
  1448H-0001        First quotation of year 1448H
  1448H-0023        23rd quotation
  1448H-0023-R1     First revision of quotation 23
  1448H-0023-R2     Second revision of quotation 23
```

### Hijri Year Mapping

| Package Year | Hijri Year |
|-------------|------------|
| 2025/2026 | 1447H |
| 2026/2027 | 1448H |
| 2027/2028 | 1449H |
| 2028/2029 | 1450H |

### Total Amount Calculation

```
Total = (Σ room.unit_price × room.quantity)
      + (Σ addon.unit_price × addon.quantity)
      − (Σ discount.unit_price × discount.quantity)
```

All amounts rounded to 2 decimal places.

### Currency Display

- Malaysian Ringgit (RM)
- Formatted via `Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" })`
- Example: `RM 5,400.00`

### Terms & Conditions

5 hardcoded Malay T&Cs appended to every PDF quotation (defined in `constants.ts`):

1. Prices subject to change based on payment timeline, hotel/transport/visa availability
2. T&C valid for specified period; changes after validity at customer's cost
3. Initial deposit RM 1,000/pax required to bank account
4. Contact numbers for inquiries
5. Full payment due 60 days before flight departure

### Search Behavior

Quotation search works as follows:
- Input is debounced (prevents excessive API calls while typing)
- In search mode: All quotations loaded, filtered client-side by `client_name` or package `name` (case-insensitive)
- Pagination switches from cursor-based → offset-based in search mode
- Clearing search returns to cursor-based pagination

---

## File Structure

```
/
├── app/
│   ├── root.tsx                    # App entry, ConvexProvider setup
│   ├── routes.ts                   # React Router route definitions
│   ├── app.css                     # Global styles
│   │
│   ├── routes/
│   │   ├── login.tsx
│   │   ├── sign-up.tsx
│   │   ├── logout.tsx
│   │   ├── _protected.tsx          # Auth guard layout
│   │   └── _protected/
│   │       ├── dashboard.tsx
│   │       ├── quotation.index.tsx
│   │       ├── quotation.create.tsx
│   │       ├── quotation.edit.tsx
│   │       ├── quotation.review.tsx
│   │       ├── quotation.duplicates.tsx
│   │       ├── package.index.tsx
│   │       ├── package.create.tsx
│   │       ├── package.create-from-schedule.tsx
│   │       ├── package.edit.tsx
│   │       ├── flight.index.tsx
│   │       ├── client.index.tsx
│   │       └── client.create.tsx
│   │
│   ├── features/
│   │   ├── quotation/
│   │   │   ├── QuotationBuilder.tsx
│   │   │   ├── QuotationListing.tsx
│   │   │   ├── schema.ts
│   │   │   └── components/
│   │   │       ├── QuotationTable/
│   │   │       ├── PDFPreview.tsx
│   │   │       ├── PDFPreviewMobile.tsx
│   │   │       └── CreateClientModal.tsx
│   │   ├── packages/
│   │   │   ├── PackageBuilder.tsx
│   │   │   ├── PackageList.tsx
│   │   │   ├── schema.ts
│   │   │   ├── utils.ts
│   │   │   ├── Context/PackageUploadContext.tsx
│   │   │   └── components/
│   │   │       ├── PackageListTable/
│   │   │       ├── PackagePreviewCard.tsx
│   │   │       ├── ImportPreview.tsx
│   │   │       ├── ImportSettingModal.tsx
│   │   │       ├── SelectPackageButton.tsx
│   │   │       └── YearSelect.tsx
│   │   ├── flights/
│   │   │   ├── FlightMaster.tsx
│   │   │   ├── FlightListings.tsx
│   │   │   └── components/
│   │   │       ├── data-table.tsx
│   │   │       └── columns.tsx
│   │   ├── clients/
│   │   │   ├── ClientBuider.tsx
│   │   │   ├── ClientForm.tsx
│   │   │   ├── ClientList.tsx
│   │   │   ├── ClientListingPage.tsx
│   │   │   ├── clientStore.ts
│   │   │   └── components/ClientTable/
│   │   ├── dashboard/
│   │   └── authentication/
│   │       ├── LoginForm.tsx
│   │       ├── RegistrationForm.tsx
│   │       └── ProtectedRoute.tsx
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── SearchableDropdown.tsx
│   │   └── DatePicker.tsx
│   │
│   ├── layout/
│   │   └── SidebarLayout.tsx
│   │
│   ├── hooks/
│   │   ├── useDebounce.tsx
│   │   └── useExtractPackage.tsx   # CSV flight parser
│   │
│   ├── services/
│   │   ├── auth-service.tsx
│   │   └── quotation-service.tsx   # Legacy, not actively used
│   │
│   └── lib/
│       └── supabase/
│           └── server.ts           # Supabase SSR client factory
│
├── convex/                         # Backend (see CONVEX-BACKEND.md)
├── constants.ts                    # App-wide constants (T&Cs, etc.)
├── types.ts                        # Shared TypeScript types
└── utils.ts                        # Shared utility functions
```
