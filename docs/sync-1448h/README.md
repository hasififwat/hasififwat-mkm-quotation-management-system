# MKM Season 1448H (2026/2027) Sync

Working documents for aligning the database with the updated Master Price List and MFF flight schedule.

## Files

| File | What it is |
|---|---|
| `season-codes.csv` | Season code → date range reference. Bridge for deriving season from MFF departure dates. |
| `package-mapping.csv` | Full price list × DB comparison — all package/season combinations, match status, prices. |
| `package-mapping.md` | Human-readable version of the above with new/matched/orphan breakdown. |
| `price-diff.md` | Room price comparison — what changed between price list and DB. |
| `price-diff.csv` | Machine-readable price diff (status: matched / changed / no_db_package / no_pl_entry). |
| `flight-diff.md` | MFF vs DB flight comparison — added / removed / edited / no-DB-package. |
| `flight-diff.csv` | Machine-readable flight diff. |
| `plan-create-packages.md` | Step-by-step plan for creating the 37 missing packages (Track A clone + Track B manual). |

## Scripts (in `scripts/`)

| Script | Purpose |
|---|---|
| `extract-price-list.js` | Parse price list CSV → generate season-codes.csv + package-mapping files (includes hotels, meals, transport) |
| `compare-prices.js` | Compare price list prices vs live DB room prices → generate price-diff files |
| `compare-mff-flights.js` | Compare MFF flight schedule vs live DB flights → generate flight-diff files |
| `update-prices.js` | Apply price changes from price list to DB (dry run by default, `--apply` to write) |
| `fix-package-seasons.js` | Fix packages with `season = "2026/2027"` by deriving from flight dates |
| `clone-package.js` | *(to build)* Clone existing package to a new season with updated prices |

## Progress

- [x] Step 1 — Update prices on 15 existing packages ✅ done 2026-07-13
- [x] Staleness detection — all pre-existing quotations now flagged stale on `room_pricing` ✅
- [x] `package-mapping.csv` enriched with hotels, meals, transport from DB (MATCHED) and price list (NEW) ✅
- [x] PDF cross-check — confirmed data integrity, found issues listed below ✅
- [ ] Step 2 — Create 38 missing packages (26 via clone script, 12 manual) — see `plan-create-packages.md`
- [ ] Step 3 — Update flight schedule (import new flights, confirm removals) — blocked until Step 2 done

## Outstanding Issues (found during PDF cross-check)

### 1. Transport naming — 4 DB packages need update

These packages have `BAS & FREE SPEED TRAIN` in the DB but the price list says `BAS & PERCUMA SPEED TRAIN`:

| Package | Season |
|---|---|
| MENARA JAM | `LS - OCT` |
| UMJ PLUS | `LS - OCT` |
| MENARA JAM | `MS - NOV` |
| MENARA JAM | `LS - JAN` |

Fix: update `transport` field on these 4 packages via Convex dashboard or a patch script.

### 2. PLATINUM pricing anomaly — needs user confirmation

For 3 seasons, PLATINUM QDP price is **higher than DBL** (normally DBL ≥ QDP):

| Season | DBL | QDP |
|---|---|---|
| `LS - JULY TO SEP` | to confirm | QDP > DBL |
| `LS - OCT` | to confirm | QDP > DBL |
| `MS - NOV` | to confirm | QDP > DBL |

This may be intentional for the PLATINUM tier. Confirm before creating packages.
