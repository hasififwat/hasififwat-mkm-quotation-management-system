# Navigation Performance Analysis — Quotation & Client Pages

**Date:** 2026-07-12  
**Scope:** `/quotations` and `/clients` listing pages

---

## Summary

Both pages are slow due to the same two structural problems: every navigation makes two sequential network round-trips before anything can render, and the Convex queries do full table scans on large tables even when showing a paginated 10-row view.

---

## Problem 1 — Sequential Auth + Data Fetch on Every Navigation

Both pages use `clientLoader.hydrate = true` with a `serverLoader` that validates the Supabase session:

```
User navigates → serverLoader() [Supabase auth RTT] → clientLoader() [Convex HTTP RTT] → render
```

These are **serialized**. Convex cannot start fetching until Supabase responds. Every page transition pays 2× network round-trip time before the UI can update.

**Files:**
- `app/routes/_protected/quotation.index.tsx` — `loader` + `clientLoader`
- `app/routes/_protected/client.index.tsx` — `loader` + `clientLoader`

---

## Problem 2 — Full Table Scans on Every Paginated Query

### Quotation listing — `listPaginated` (`convex/quotations.ts:353`)

The query correctly uses the `by_updated_at` index to paginate 10 quotations, but then immediately collects **all** packages and **all** package_flights to join display names:

```ts
const [allPackages, allFlights] = await Promise.all([
    ctx.db.query("packages").collect(),           // ALL packages
    ctx.db.query("package_flights").collect(),    // ALL flights
]);
```

Only the ~10 `package_id`s and `flight_id`s on the current page are needed, but the entire tables are read.

### Client listing — `listWithStatsPaginated` (`convex/clients.ts:84`)

Same pattern. Paginates 10 clients correctly, then scans all quotations:

```ts
const [allQuotations, packages] = await Promise.all([
    ctx.db.query("quotations").collect(),   // ALL quotations
    ctx.db.query("packages").collect(),     // ALL packages
]);
```

The `by_client_id` index exists on quotations and is unused here.

### Agent names — `getAgentNames` (`convex/clients.ts:76`)

Called on every client page load alongside the main listing query. Scans all quotations just to deduplicate `pic_name`:

```ts
const quotations = await ctx.db.query("quotations").collect();
return [...new Set(quotations.map((q) => q.pic_name))].sort();
```

---

## Problem 3 — Search Fetches the Entire Database, Filters Client-Side

**Quotation search** (`convex/quotations.ts:206` — `list` query):

Called when `searchTerm` is non-empty. Scans ALL quotations + ALL packages + ALL package_flights, ships the full result set to the `clientLoader`, which then filters in JavaScript:

```ts
// clientLoader (quotation.index.tsx)
const all = await client.query(api.quotations.list, {});
const filtered = all.filter(q => ...);  // client-side filter
```

**Client search** (`convex/clients.ts:26` — `listWithStats`):

Same pattern. ALL clients + ALL quotations + ALL packages, filtered in the loader.

---

## Problem 4 — `getWithQuotations` Scans All Clients to Find One (`convex/clients.ts:139`)

```ts
const clients = await ctx.db.query("clients").collect();
const client = clients.find((c) => String(c._id) === args.client_id);
```

This scans the entire clients table for a known ID. Should be a single `ctx.db.get()` call.

---

## Fix Priority

| # | Issue | File / Line | Effort | Impact |
|---|-------|-------------|--------|--------|
| 1 | Sequential Supabase + Convex on every navigation | Both `clientLoader`s | Medium | High — eliminates 1 RTT per navigation |
| 2 | `listPaginated` scans ALL packages + flights | `quotations.ts:370` | Low | High — eliminates O(N) scan per page view |
| 3 | `listWithStatsPaginated` scans ALL quotations | `clients.ts:89` | Low | High — eliminates O(N) scan per page view |
| 4 | Search scans full DB, filters client-side | Both pages | Medium | Medium — depends on data size |
| 5 | `getAgentNames` scans ALL quotations | `clients.ts:79` | Low | Medium — runs on every client page load |
| 6 | `getWithQuotations` scans full clients table | `clients.ts:139` | Low | Low — used only on client detail page |

---

## Recommended Fixes

### Fix 2 — `listPaginated`: targeted lookups instead of full scans

Collect only the IDs referenced by the current page, then fetch with `ctx.db.get()`:

```ts
// After paginating quotations into result.page:
const packageIds = [...new Set(result.page.map(q => q.package_id))];
const flightIds  = [...new Set(result.page.map(q => q.flight_id))];

const [packages, flights] = await Promise.all([
    Promise.all(packageIds.map(id => ctx.db.get(id as Id<"packages">))),
    Promise.all(flightIds.map(id => ctx.db.get(id as Id<"package_flights">))),
]);
```

### Fix 3 — `listWithStatsPaginated`: use `by_client_id` index

Instead of collecting all quotations and filtering in memory, query per client using the existing index:

```ts
const quotationsByClient = new Map<string, ...>();
await Promise.all(
    page.page.map(async (client) => {
        const qs = await ctx.db
            .query("quotations")
            .withIndex("by_client_id", q => q.eq("client_id", String(client._id)))
            .collect();
        quotationsByClient.set(String(client._id), qs);
    })
);
```

### Fix 5 — `getAgentNames`: add index or store PIC names separately

Option A: Add `.index("by_pic_name", ["pic_name"])` to the quotations schema and use an indexed query.  
Option B: Store unique agent names in the existing `profiles` table and query that instead.

### Fix 6 — `getWithQuotations`: replace full scan with `db.get()`

```ts
// Before:
const clients = await ctx.db.query("clients").collect();
const client = clients.find((c) => String(c._id) === args.client_id);

// After:
const client = await ctx.db.get(args.client_id as Id<"clients">);
```

### Fix 1 — Reduce auth overhead

Cache the Supabase session in a short-lived cookie so the `serverLoader` can validate the session from the cookie without a live Supabase round-trip, OR move auth to the top-level `_protected.tsx` layout loader so it only runs once on initial load instead of on every child route navigation.
