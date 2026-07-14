# Plan: Create Missing Packages

## Context

38 price list entries have no matching DB package. Packages cannot be created as empty shells —
each needs `inclusions`, `exclusions`, `hotels` (with meal configs), `rooms` (with prices), and
eventually `flights`. The strategy is to split the 38 into two tracks.

---

## Two Tracks

### Track A — Clone from existing package of the same type (26 packages)

These are packages where an identical package name already exists in the DB under a different
season. We clone its content (inclusions, exclusions, hotels, meals, room types) and only change
the season code and room prices.

**Can be fully automated by script.**

### Track B — New package types with no existing template (11 packages)

These are new package names that have never existed in the DB. They need hotel configurations
and content set manually — either via the UI or a seed script with explicit values.

---

## Track A — Clone Candidates

| # | New Package | Season | Clone From | Season |
|---|---|---|---|---|
| 1 | MAWADDAH LITE | `MS - NOV` | MAWADDAH LITE | `LS - OCT` |
| 2 | MENARA JAM PREMIUM | `MS - NOV` | MENARA JAM PREMIUM | `LS - JULY TO SEP` |
| 3 | UMJ PLUS | `LS - JAN` | UMJ PLUS | `MS - NOV` |
| 4 | MENARA JAM PREMIUM | `LS - JAN` | MENARA JAM PREMIUM | `LS - JULY TO SEP` |
| 5 | MAWADDAH LITE | `LS - JAN` | MAWADDAH LITE | `LS - OCT` |
| 6 | MENARA JAM | `PS - DEC` | MENARA JAM | `MS - NOV` |
| 7 | UMJ PLUS | `PS - DEC` | UMJ PLUS | `MS - NOV` |
| 8 | MENARA JAM PREMIUM | `PS - DEC` | MENARA JAM PREMIUM | `LS - JULY TO SEP` |
| 9 | MAWADDAH LITE | `PS - DEC` | MAWADDAH LITE | `LS - OCT` |
| 10 | MAWADDAH | `PS - DEC` | MAWADDAH | `MS - NOV` |
| 11 | MANASIK HAJI | `PS - DEC` | MANASIK HAJI | `MS - NOV` |
| 12 | MENARA JAM | `SS - MAC` | MENARA JAM | `MS - NOV` |
| 13 | MENARA JAM PREMIUM | `SS - MAC` | MENARA JAM PREMIUM | `LS - JULY TO SEP` |
| 14 | MAWADDAH LITE | `SS - MAC` | MAWADDAH LITE | `LS - OCT` |
| 15 | MAWADDAH | `SS - MAC` | MAWADDAH | `MS - NOV` |
| 16 | MANASIK HAJI | `SS - MAC` | MANASIK HAJI | `MS - NOV` |
| 17 | SAMBUT RAMADHAN - MAWADDAH | `RS - FEB` | MAWADDAH | `MS - NOV` |
| 18 | SAMBUT RAMADHAN - UMJ | `RS - FEB` | MENARA JAM | `MS - NOV` |
| 19 | AWAL RAMADHAN - MAWADDAH | `RS - FEB` | MAWADDAH | `MS - NOV` |
| 20 | AWAL RAMADHAN - UMJ | `RS - FEB` | MENARA JAM | `MS - NOV` |
| 21 | PERTENGAHAN RAMADHAN - MAWADDAH | `RS - FEB` | MAWADDAH | `MS - NOV` |
| 22 | PERTENGAHAN RAMADHAN - UMJ | `RS - FEB` | MENARA JAM | `MS - NOV` |
| 23 | AKHIR RAMADHAN - MAWADDAH | `RS - FEB` | MAWADDAH | `MS - NOV` |
| 24 | AKHIR RAMADHAN - UMJ | `RS - FEB` | MENARA JAM | `MS - NOV` |
| 25 | MENARA JAM | `RS - FEB` | MENARA JAM | `MS - NOV` |
| 26 | MAWADDAH | `RS - FEB` | MAWADDAH | `MS - NOV` |

> **Note on Ramadhan packages (#17–26):** The hotel structure is borrowed from the closest
> standard package. The hotel *names* will need to be updated to match the actual Ramadhan hotels
> after creation — but the room types, meal configs, and inclusions/exclusions will be a
> reasonable starting point.

---

## Track B — New Package Types (Manual)

These require explicit hotel configs and content. Create via the UI package editor.

| # | Package | Season | Notes |
|---|---|---|---|
| 1 | MAWADDAH PLUS | `LS - JULY TO SEP` | Premium Mawaddah variant — similar hotel config to MAWADDAH but possibly different hotel tier |
| 2 | MENARA JAM LITE | `PS - DEC` | Budget Menara Jam variant — fewer days (11D9N), lower price |
| 3 | MENARA JAM SENAI | `PS - DEC` | JB departure variant — may have different hotel or reduced Madinah nights |
| 4 | HAJI FADHIL - EJEN | `MS - NOV` | Agent-specific package — hotel data in package-mapping.csv (EMAAR ROYAL / SAFWA T3) |
| 5 | UNIMAP | `MS - NOV` | Institution-specific package — hotel data in package-mapping.csv (NOZOL ROYAL INN / PULLMAN ZAMZAM) |
| 6 | PLATINUM | `LS - JULY TO SEP` | High-end package — needs custom hotel config (likely 5-star); **confirm pricing anomaly first** |
| 7 | PLATINUM | `LS - OCT` | Same — **confirm pricing anomaly first** |
| 8 | PLATINUM | `MS - NOV` | Same — **confirm pricing anomaly first** |
| 9 | PLATINUM | `PS - DEC` | Same |
| 10 | PLATINUM | `LS - JAN` | Same |
| 11 | PLATINUM | `SS - MAC` | Same |

> **MUSIM HAJI (SLS - JUN):** Already exists in DB under `season = "2026/2027"`. Per decision to
> keep `2026/2027` packages untouched, skip this.

---

## Script: `scripts/clone-package.js`

Build a script that:

1. **Accepts** a source package ID and a list of targets: `[{ name, season, rooms }]`
2. **Fetches** the source package's full content (hotels, meals, room types, inclusions, exclusions, duration, transport)
3. **Creates** a new package per target with:
   - New `name` and `season`
   - Same `duration`, `inclusions`, `exclusions`, `transport`, `year`
   - Same hotel config (hotel_type, placeholder, meals) — hotel *names* blanked out so they're clearly placeholders
   - Same room types (enabled/disabled) but **new prices** from price list
   - **No flights** (added in step 3)
4. **Dry run by default**, `--apply` to write

### What the script needs to look up

Price list prices are already in `docs/price-diff.csv` (status = `no_db_package` rows).
The script can read this file directly rather than re-parsing the price list CSV.

---

## Execution Order

### Phase 1 — Run clone script (Track A)

```bash
node scripts/clone-package.js --apply
```

Creates 26 packages automatically. Takes ~2 minutes.

### Phase 2 — Create Track B packages via UI

Open `/packages/create` for each of the 11 packages. Prioritise by season
(PS-DEC packages are most urgent — they have the most MFF flights waiting).

Order:
1. MENARA JAM LITE (PS-DEC)
2. MENARA JAM SENAI (PS-DEC)
3. MAWADDAH PLUS (LS-JULY-TO-SEP)
4. PLATINUM × 6 seasons (can use the same hotel config, different prices)
5. HAJI FADHIL - EJEN (MS-NOV)
6. UNIMAP (MS-NOV)

### Phase 3 — Verify

```bash
node scripts/compare-prices.js "/path/to/MASTER PRICE LIST.csv"
```

Expect the "no DB package" count to drop from 37 → ~11 (Track B packages not yet created),
then to 0 once Track B is done.

### Phase 4 — Import flights (Step 3 of the overall plan)

```bash
node scripts/compare-mff-flights.js "/path/to/MFF VERSION 6.csv"
```

---

## Pre-flight Fixes (do before creating packages)

### Fix transport naming on 4 DB packages

These packages have `BAS & FREE SPEED TRAIN` but should be `BAS & PERCUMA SPEED TRAIN`:

| Package | Season |
|---|---|
| MENARA JAM | `LS - OCT` |
| UMJ PLUS | `LS - OCT` |
| MENARA JAM | `MS - NOV` |
| MENARA JAM | `LS - JAN` |

Update via Convex dashboard or a one-off patch mutation.

---

## Key Decisions Needed Before Starting

1. **Ramadhan hotel names** — what hotels does each Ramadhan sub-package use?
   The clone will blank hotel names. They need to be filled in before publishing.

2. **PLATINUM hotel config** — 5-star hotels? Number of nights? This is the most manual of the Track B packages.

3. **PLATINUM pricing anomaly** — QDP > DBL for `LS-JULY`, `LS-OCT`, `MS-NOV`. Intentional for this tier?

4. **MENARA JAM LITE vs MENARA JAM** — LITE is 11D9N vs standard 12D10N. Does it use fewer Madinah nights or fewer Makkah nights?

5. **MENARA JAM SENAI** — JB departure. Different hotel from standard, or same package with different departure airport?

6. **Status on creation** — clone script will create all packages as `unpublished`.
   Confirm before setting any to `published`.
