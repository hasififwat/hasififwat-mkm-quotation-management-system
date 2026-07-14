# Quotation Feature Audit

**Date:** 2026-07-12
**Scope:** `app/features/quotation/`, `app/routes/_protected/quotation.*`

---

## Fixed Issues (resolved in this session)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Review page crashes for null `initialData` — redirect was commented out | `quotation.review.tsx:33` | 🔴 High |
| 2 | `flight_id` not validated on step 2; error invisible at submission | `QuotationBuilder.tsx:612, 639` | 🔴 High |
| 3 | `flight_id` not cleared when package changes — stale ID submitted | `QuotationBuilder.tsx:895` | 🔴 High |
| B | `hijriYear` used wall-clock year instead of package year for sequence numbering | `convex/quotations.ts:314` | 🔴 High |
| 1b | Non-null assertions `selectedPackage!.name/year/duration` unsafe if package deleted | `convex/quotations.ts:779` | 🟡 Med |

### Fix details

**#1 — `quotation.review.tsx`**
- Added `import { redirect } from "react-router"`
- Uncommented `if (!initialData) return redirect("/quotations")`
- Removed two debug `console.log` calls

**#2 — `QuotationBuilder.tsx`**
- Added `"flight_id"` to `trigger()` in `goNext` (step 2 check)
- Added `"flight_id"` to `trigger()` in `handleStepClick` (step 2 guard)

**#3 — `QuotationBuilder.tsx`**
- Added `setValue("flight_id", "")` alongside `setValue("selected_rooms", [])` in the package-change handler

**Bonus — `convex/quotations.ts`**
- Pre-fetches `selectedPackage` before the parallel `Promise.all`
- Computes `hijriYear = getMappedHijriYear(selectedPackage.year)` so cross-season sequence numbers use the package's season, not the server's current year
- Removed `allPackages` from the parallel query (no longer needed there)

**#1b — `convex/quotations.ts`**
- Replaced `selectedPackage!.name/year/duration` with `selectedPackage?.name/year/duration ?? ""` in `getQuotationFullDetails`

---

## Edit Quotation Behaviour

> Investigated via `convex/quotations.ts:update` (line 811) and `app/routes/_protected/quotation.edit.tsx`.

**What happens on save:**

1. **Snapshots are fully overwritten** — `package_snapshot`, `flight_snapshot`, `hotels_snapshot` are re-fetched from the live package/flight/hotel tables and written over whatever was stored at creation time. If the package was edited between original creation and this save, the PDF will now reflect the current package state (different inclusions, hotel names, duration, etc.), not what was originally quoted.

2. **Items are delete-then-reinsert** — all `quotation_items` for the quotation are deleted, then re-created from scratch. There is a brief window of inconsistency: if the process fails between the delete and the reinsert, the quotation ends up with zero items and an incorrect `total_amount`. Convex mutations are atomic per individual operation but not across the full sequence of deletes and inserts.

3. **Quotation number is preserved** — `hijri_year`, `sequence_num`, and `revision` are not touched. The same reference number is kept.

4. **`revision` is never incremented** — edits are silent overwrites with no version bump. There is no way to tell from the record alone whether a quotation has been edited or how many times.

---

### Edit-specific Issues

**#19 — Editing overwrites the original snapshot with current live package data**
- **File:** `convex/quotations.ts:969`
- **Severity:** 🟡 Med
- **Detail:** The `update` mutation unconditionally replaces `package_snapshot`, `flight_snapshot`, and `hotels_snapshot` with values pulled from the live tables at save time. If a package's inclusions, hotel names, or duration were changed after the quotation was created, editing and saving the quotation silently changes what appears on the PDF — even if the user only intended to update the status or notes.
- **Fix direction:** Only refresh snapshots if the `package_id` or `flight_id` changed from what's stored. If they're the same, preserve the existing snapshot.

**#20 — Items are delete-then-reinsert with no atomicity guarantee**
- **File:** `convex/quotations.ts:1012`
- **Severity:** 🟡 Med
- **Detail:** All existing `quotation_items` are deleted before the new ones are inserted. A mid-mutation failure leaves the quotation with zero items and a stale `total_amount`. Convex does not wrap multiple `db.delete`/`db.insert` calls in a single atomic transaction.
- **Fix direction:** Consider a replace-in-place strategy (match by room_type, patch price/pax, delete extras, insert new) or at minimum write new items before deleting old ones.

**#21 — No revision tracking on edits**
- **File:** `convex/quotations.ts:1060`
- **Severity:** 🟠 Low
- **Detail:** `revision` is read to build the quotation number log entry but is never incremented. Every version of the quotation carries the same reference number with no indication it was changed. The `quotation_logs` table records an "updated" action, but the quotation document itself has no edit counter.

---

## Open Issues

### 🟡 Medium Severity

**#4 — Header back button always navigates away regardless of current step**
- **File:** `QuotationBuilder.tsx:668`
- **Detail:** The `<ChevronLeft>` header button is unconditionally wrapped in `<Link to="/quotations">`. On steps 2–3 it discards all form input without warning. The footer "Previous" button correctly calls `goBack()` — the header should match that behaviour on non-first steps.

**#5 — Delete button in the action dropdown has no click handler**
- **File:** `components/QuotationTable/data-table.tsx:150`
- **Detail:** The `<DropdownMenuItem>` for Delete has no `onClick`. Clicking it is a silent no-op.

**#6 — Action column missing from column definitions**
- **File:** `components/QuotationTable/columns.tsx:56`
- **Detail:** `data-table.tsx` handles `columnId === "action"` to render the dropdown menu, but `columns.tsx` never declares `{ id: "action" }`. The dropdown (including Delete) is unreachable. Preview and Edit still work via inline links in the `quotation_number` cell renderer.

**#7 — Search loads all quotations without pagination**
- **File:** `routes/_protected/quotation.index.tsx:64`
- **Detail:** When `searchTerm` is set, the loader calls `api.quotations.list({})` with no limit, fetching every record to filter client-side. The non-search path uses cursor-based pagination correctly. Performance degrades linearly with record count.

**#8 — Save button always visible in edit mode on every step**
- **File:** `QuotationBuilder.tsx:948`
- **Detail:** `currentStep !== "extras" && !qid` hides Save only when creating. During edit (`qid` exists), Save renders on all three steps alongside Next, letting users bypass flight/room selection and submit incomplete data.

**#15 — `FlightSelection` shows empty dropdown with no message when package has no flights**
- **File:** `QuotationBuilder.tsx:544`
- **Detail:** If `selectedPackage.flights` is empty, `FlightSelection` renders a `<Select>` with no `<SelectItem>` children — the user sees a blank "Select" placeholder, cannot pick anything, and then gets a `flight_id` validation error with no explanation for why. Should render an informational message ("No flights available for this package") instead.

**#16 — PDF scale can go negative on very narrow viewports**
- **File:** `routes/_protected/quotation.review.tsx:56`
- **Detail:** `Math.min((containerWidth - padding) / pdfWidth, 1)` — if `containerWidth` is less than the `padding` value (32 px), the result is negative. `Math.min` caps at 1 but has no lower-bound clamp. The PDF renders at a negative `transform: scale()` and becomes invisible. Fix: `Math.max(0.1, Math.min((containerWidth - padding) / pdfWidth, 1))`.

**#17 — `CreateClientModal` shows no feedback on network/server error**
- **File:** `components/CreateClientModal.tsx:29`
- **Detail:** The `useEffect` only handles `fetcher.data?.success` and `fetcher.data?.alreadyExists`. If the fetcher request fails (network error, 500 response), neither branch runs — the modal stays open, the button returns to "Submit", and the user has no idea what happened. A third branch should handle `fetcher.data === undefined && fetcher.state === "idle"` after a submission attempt.

---

### 🟠 Low Severity

**#9 — `DiscountSection` uses untyped `useFormContext()`**
- **File:** `QuotationBuilder.tsx:377`
- **Detail:** `const { control } = useFormContext()` is missing the `<QuotationFormValues>` generic. `AddOnSection` directly above it uses the typed version. Field name and value type errors in the discount section won't be caught by TypeScript.

**#10 — `getMealLabel` and `getListItems` duplicated across both PDF components**
- **Files:** `PDFPreview.tsx:25, 45` and `PDFPreviewMobile.tsx:11, 31`
- **Detail:** Both functions are copy-pasted identically into each file. `getMealLabel` also carries the same fragile count-based logic (`length === 3 → "FULL BOARD"`, `length === 2 → "HALF BOARD"`) seen in the packages feature. Both should live in `utils.ts`.

**#11 — Duplicate inclusion/exclusion lines produce duplicate React keys**
- **Files:** `PDFPreview.tsx:537, 549` and `PDFPreviewMobile.tsx:252, 259`
- **Detail:** Keys are derived from the line content (`key={\`inclusion-${inclusion}\`}`). Identical lines (common in template-copied text) produce duplicate keys and React warnings.

**#12 — `generateRefNumber` uses Gregorian year with a Hijri "H" label**
- **File:** `utils.ts:13`
- **Detail:** `new Date().getFullYear()` returns the Gregorian year (e.g. `2026`), but the format `MKM/2026H/XXXX` implies Hijri. If "H" is meant to signify Hijri year the value should be ~1447, not 2026.

**#13 — `_paxCount` computed in `PDFPreview` but never rendered**
- **File:** `PDFPreview.tsx:109`
- **Detail:** `const _paxCount = rooms.reduce(...)` is computed and prefixed with `_` (unused). `PDFPreviewMobile` renders `{pkg.name} - {paxCount} PAX` in the table. The desktop PDF omits the pax count entirely.

**#14 — Redundant `startsWith` in `isTableLoading` condition**
- **File:** `routes/_protected/quotation.index.tsx:152`
- **Detail:** `pendingPathname.startsWith("/quotations") && pendingPathname === "/quotations"` — the equality check implies the `startsWith`, making the latter dead code. Likely intended to prevent showing the spinner when navigating to `/quotations/create`.

**#18 — `toLocaleUpperCase()` used inconsistently in both PDF components**
- **Files:** `PDFPreview.tsx:187, 227` and `PDFPreviewMobile.tsx:100, 118`
- **Detail:** `branch` and `pkg.name` call `toLocaleUpperCase()` while every other field uses `toUpperCase()`. `toLocaleUpperCase()` is locale-aware — in rare system locales it can return different characters. All uppercase conversions in the PDF should use `toUpperCase()` for consistency.

---

## Summary Table

| # | Issue | File | Severity | Status |
|---|-------|------|----------|--------|
| 1 | Review page crashes for null `initialData` (redirect commented out) | `quotation.review.tsx:33` | 🔴 High | ✅ Fixed |
| 2 | `flight_id` not validated on step 2; error invisible at submission | `QuotationBuilder.tsx:612` | 🔴 High | ✅ Fixed |
| 3 | `flight_id` not cleared when package changes | `QuotationBuilder.tsx:895` | 🔴 High | ✅ Fixed |
| B | `hijriYear` derived from wall-clock year instead of package year | `convex/quotations.ts:314` | 🔴 High | ✅ Fixed |
| 1b | Non-null assertions on `selectedPackage` in `getQuotationFullDetails` | `convex/quotations.ts:779` | 🟡 Med | ✅ Fixed |
| 4 | Header back button always navigates away regardless of step | `QuotationBuilder.tsx:668` | 🟡 Med | Open |
| 5 | Delete button has no click handler | `data-table.tsx:150` | 🟡 Med | Open |
| 6 | Action column missing from column definitions | `columns.tsx:56` | 🟡 Med | Open |
| 7 | Search loads all quotations at once, no pagination | `quotation.index.tsx:64` | 🟡 Med | Open |
| 8 | Save button always visible in edit mode on all steps | `QuotationBuilder.tsx:948` | 🟡 Med | Open |
| 15 | Empty flights → blank dropdown with no explanation | `QuotationBuilder.tsx:544` | 🟡 Med | Open |
| 16 | PDF scale goes negative on very narrow viewports | `quotation.review.tsx:56` | 🟡 Med | Open |
| 17 | `CreateClientModal` shows no feedback on network/server error | `CreateClientModal.tsx:29` | 🟡 Med | Open |
| 9 | `DiscountSection` missing form context generic | `QuotationBuilder.tsx:377` | 🟠 Low | Open |
| 10 | `getMealLabel` + `getListItems` duplicated across both PDF components | `PDFPreview.tsx:25,45` + `PDFPreviewMobile.tsx:11,31` | 🟠 Low | Open |
| 11 | Duplicate inclusion/exclusion lines → duplicate React keys (×2 files) | `PDFPreview.tsx:537`, `PDFPreviewMobile.tsx:252` | 🟠 Low | Open |
| 12 | `generateRefNumber` uses Gregorian year with Hijri "H" label | `utils.ts:13` | 🟠 Low | Open |
| 13 | `_paxCount` computed in `PDFPreview` but never rendered | `PDFPreview.tsx:109` | 🟠 Low | Open |
| 14 | Redundant `startsWith` in `isTableLoading` | `quotation.index.tsx:152` | 🟠 Low | Open |
| 18 | `toLocaleUpperCase()` used inconsistently in PDF components | `PDFPreview.tsx:187,227` + `PDFPreviewMobile.tsx:100,118` | 🟠 Low | Open |
| 19 | Editing overwrites original snapshot with current live package data | `convex/quotations.ts:969` | 🟡 Med | Open |
| 20 | Items delete-then-reinsert with no atomicity — mid-failure leaves zero items | `convex/quotations.ts:1012` | 🟡 Med | Open |
| 21 | No revision increment on edit — silent overwrites, no version trail | `convex/quotations.ts:1060` | 🟠 Low | Open |
