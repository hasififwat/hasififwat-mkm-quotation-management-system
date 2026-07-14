# Packages Feature Audit

**Date:** 2026-07-12
**Scope:** `app/features/packages/`

---

## Fixed Issues (resolved in this session)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `validateCurrentStep` returned `true` even when `trigger()` failed (e.g. name < 3 chars) | `PackageBuilder.tsx:119` | 🔴 High |
| 2 | Header back button was always wrapped in `<Link to="/packages">`, discarding form state on non-first steps | `PackageBuilder.tsx:46` | 🔴 High |
| 3 | Action (edit/delete) column never declared in column definitions — dropdown never rendered | `components/PackageListTable/columns.tsx` | 🔴 High |
| 4 | `sort_order` in `transformConvexPackage` always resolved to `undefined ?? 0`; replaced with array index | `utils/transformConvexPackage.ts:64` | 🟡 Med |
| 5 | `ImportPreview` accessed `room.room_type` — field is `room.name` in the form schema | `components/ImportPreview.tsx:83` | 🟡 Med |

---

## Open Issues

### 🟡 Medium

**#6 — Default year `"2026"` passes validation but matches no dropdown option**
- **File:** `routes/_protected/package.create.tsx:24`
- **Detail:** `year: new Date().getFullYear().toString()` produces `"2026"`. `UmrahYearSelect` only offers `"2025/2026"` and `"2026/2027"`. The schema validates `min(1)` so `"2026"` passes silently — the select shows empty and `"2026"` can be saved to the DB.

**#7 — `UmrahYearSelect` and `SelectPackageButton` year options are hardcoded**
- **Files:** `components/YearSelect.tsx:35`, `components/SelectPackageButton.tsx:128`
- **Detail:** Options are static string literals. Both files need a code change every year.

**#8 — `handleDelete` fires without confirmation and uses Supabase instead of Convex**
- **File:** `components/PackageListTable/data-table.tsx:127`
- **Detail:** Delete is irreversible with no confirmation dialog. Uses legacy `UmrahPackageService.deletePackage(supabase, pkgId)` while every other mutation in the feature uses Convex.

**#12 — Room sort order in `PackagePreviewModal` hardcodes only 3 room types, duplicated**
- **File:** `PackagePreviewModal.tsx:188, 342`
- **Detail:** `{ Quad: 1, Triple: 2, Double: 3 }` — any new room type falls to position 99. The sort block is copy-pasted identically in `generatePreviewText` and `renderContent`.

---

### 🟠 Low

**#9 — Meal label logic is count-based, not value-based**
- **Files:** `components/PackagePreviewCard/PackagePreviewCard.tsx:84`, `PackagePreviewModal.tsx:148`
- **Detail:** `length === 2 → "HALFBOARD"`, `length === 3 → "FULLBOARD"` regardless of which meals are selected. Repeated in two places.

**#10 — Duplicate text lines produce duplicate React keys**
- **File:** `components/PackagePreviewCard/PackagePreviewCard.tsx:104, 118`
- **Detail:** `inclusionsText.split("\n").map((line) => <li key={line}>...)` — identical lines (common in template-copied text) produce duplicate keys and React warnings.

**#11 — `HotelDetails` uses wrong form context generic**
- **File:** `components/Form/HotelDetails.tsx:43`
- **Detail:** `useFormContext<IPackageDetails>()` should be `useFormContext<IPackageDetailsForm>()` to match the form declaration in `PackageBuilder`.

**#13 — `roomNum` defaults to `"2"` for unknown room types, duplicated**
- **File:** `PackagePreviewModal.tsx:198, 355`
- **Detail:** `room.room_type === "Quad" ? "4" : room.room_type === "Triple" ? "3" : "2"` — any new room type prints `Bilik 2`. Duplicated between `generatePreviewText` and `renderContent`.

**#14 — Dead state with a typo in the setter name**
- **File:** `PackagePreviewModal.tsx:55`
- **Detail:** `const [_openCombobox, _setOpenComboboxx] = useState(false)` — triple-x typo in setter; both values are unused anywhere in the component.

**#15 — Flight month groups are not sorted in calendar order**
- **File:** `PackagePreviewModal.tsx:71`
- **Detail:** `flightsByMonth` is built by iterating `pkg.flights` in DB insertion order. If flights are stored out of sequence, month groups appear out of order in the combobox.
