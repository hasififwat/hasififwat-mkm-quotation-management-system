# Clients Audit

**Date**: 2026-07-12  
**Scope**: `convex/clients.ts`, `convex/schema.ts`, `app/features/clients/`, `app/features/quotation/components/CreateClientModal.tsx`, `app/routes/resources.create-client.tsx`

---

## Status

| # | Finding | Status |
|---|---------|--------|
| 1 | No uniqueness enforcement — duplicates can be created freely | ✅ Fixed 2026-07-12 |
| 2 | Standalone client page (`ClientForm`) is disconnected from Convex | ⬜ Open |
| 3 | `phone_number` is optional in schema but required in the modal | ✅ Fixed 2026-07-12 |
| 4 | Existing data is poisoned — unknown number of duplicate clients | ✅ Fixed 2026-07-12 |

---

## Summary

The clients subsystem is partially implemented. The only active client creation path is the `CreateClientModal` inside the quotation builder. Uniqueness is now enforced via phone normalisation with a soft-warn flow — if a matching phone is found, the modal surfaces the existing client and lets staff choose. Poisoned data (duplicate records from before enforcement) was audited and merged. The standalone client management page (`/clients/create`) saves to local React state and never touches Convex, making it completely inert — this remains open.

---

## Findings

### 1. No uniqueness enforcement ✅ Fixed 2026-07-12

**Files**: `convex/clients.ts`, `convex/schema.ts`, `app/features/quotation/components/CreateClientModal.tsx`, `app/routes/resources.create-client.tsx`

`clients.create` now normalises the incoming phone and checks for an existing client with the same number before inserting. On match it returns `{ alreadyExists: true, existing }` instead of inserting. `CreateClientModal` detects this and shows an amber warning banner with a "Use [NAME]" button. Staff can either use the existing client or force-create anyway (`force: true` bypasses the check). A `by_phone_number` index was added to `schema.ts` to make future indexed lookups efficient.

---

### 2. Standalone client page is disconnected from Convex

**Files**: `app/features/clients/ClientForm.tsx`, `app/features/clients/clientStore.ts`

`ClientForm` (used on `/clients/create`) saves via `clientStore.save(client)` — a local React state store. It never calls a Convex mutation. Anything saved through this page is lost on refresh and never reaches the database.

This page also has a different data model from the real clients table:

| Field | Convex schema | `ClientForm` local state |
|-------|--------------|--------------------------|
| `name` | ✅ | ✅ |
| `phone_number` | ✅ | `phone` (different key) |
| — | — | `email` (not in schema) |
| — | — | `address` (not in schema) |

The Convex schema and the standalone form have diverged. The page is effectively dead.

---

### 3. `phone_number` is optional in schema but required in the modal ✅ Fixed 2026-07-12

**Files**: `convex/schema.ts:22`

`phone_number` was tightened from `v.optional(v.string())` to `v.string()` in the schema after the poisoned data (blank-phone duplicates) was cleaned up. The constraint now matches what the modal already required at the UI level.

---

### 4. Existing data is poisoned ✅ Fixed 2026-07-12

**Phase 1 — Audit (complete)**

`findDuplicateClients` query added and run against production. Results:

- **120 total clients** scanned
- **6 duplicate name groups** found (13 affected clients)
- Groups with consistent phone across members: 2 (clearly same person)
- Groups with inconsistent phones across members: 4 (reviewed manually)

**Phase 2 — Merge (complete)**

Merges performed using `mergeClients` mutation. Rule applied: merge only if all members share the same normalised phone — different phone = different person, no merge.

| Group | Action | Quotations relinked |
|-------|--------|---------------------|
| Shared phone group 1 | Merged 2 → 1 canonical | 1 |
| Shared phone group 2 | Merged 2 → 1 canonical | 1 |
| Different-phone groups (4) | Left as separate clients | — |

Result: **4 duplicate records removed**, **2 quotation `client_id` references relinked**, **120 → 116 clients**.

**Phase 3 — Uniqueness enforcement (complete)**

See Finding #1 above. `phone_number` is now required in the schema and checked at mutation time.

---

## Resolution Plan ✅ All phases complete 2026-07-12

Three phases were required in strict order to avoid a uniqueness-constraint race with un-merged duplicates.

---

### Phase 1 — Audit ✅ Complete

Added `findDuplicateClients` query to `convex/clients.ts`. Groups by normalised name, counts quotations per member, flags phone consistency. Run against production — see Finding #4 for results.

---

### Phase 2 — Merge duplicates ✅ Complete

Added `mergeClients` mutation to `convex/clients.ts`. Relinks quotation `client_id` references to the canonical, then deletes the duplicates. Run against production — 4 records removed, 2 quotations relinked.

Merge rule applied: same normalised phone = same person (merge). Different phones = leave as separate clients.

---

### Phase 3 — Enforce uniqueness going forward ✅ Complete

`clients.create` now normalises the incoming phone and soft-warns on match. `phone_number` tightened to required in schema. `by_phone_number` index added.

Phone normalisation rule: strip all non-digit characters, then convert `60...` country-code prefix → `0...`.

---

## Two Systems Problem

The standalone client page (`/clients/create`, `ClientForm.tsx`) needs to be rebuilt to write to Convex before Phase 3 is useful. As long as the page is disconnected, staff have no way to view, search, or manage the real client list. The quotation builder dropdown is the only client discovery surface.

The schema fields that `ClientForm` captures (`email`, `address`) are not in the Convex schema. A decision is needed on whether to add those fields to the schema or drop them from the form.

---

## Related Files Reference

| File | Role |
|------|------|
| `convex/clients.ts` | `list`, `create` (soft-warn dedup), `findDuplicateClients`, `mergeClients` |
| `convex/schema.ts:20–26` | Client table — `phone_number` required, `by_phone_number` index |
| `convex/quotations.ts` | Stores `client_id` as string + `client_name` as snapshot |
| `app/features/clients/ClientForm.tsx` | Standalone form — writes to local state only, never Convex |
| `app/features/clients/clientStore.ts` | Local React state store — not a database |
| `app/features/quotation/components/CreateClientModal.tsx` | Only active client creation path |
| `app/routes/resources.create-client.tsx` | Server action backing the modal |
