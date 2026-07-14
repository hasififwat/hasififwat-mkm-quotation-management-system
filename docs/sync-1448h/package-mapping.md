# Package × Season Mapping

Generated from: **MASTER PRICE LIST MKM 1448H (2026/2027)**

## Summary

| | Count |
|---|---|
| Price list rows (with pricing) | 55 |
| Matched to DB | 17 |
| New (not in DB yet) | 38 |
| DB packages not in price list | 21 |
| DB packages with bad season value | 15 |

---

## Season Code Reference

| Season Code | Full Name | Start | End |
|---|---|---|---|
| `SLS - JUN` | Super Low Season (Jun) | 2026-06-18 | 2026-06-30 |
| `LS - JULY TO SEP` | Low Season (Jul – Sep) | 2026-07-01 | 2026-09-30 |
| `LS - OCT` | Low Season (Oct) | 2026-10-01 | 2026-10-31 |
| `MS - NOV` | Mid Season (Nov 1–24) | 2026-11-01 | 2026-11-24 |
| `PPS - NOV` | Pre-Peak Season (Nov 25–30) | 2026-11-25 | 2026-11-30 |
| `PS - DEC` | Super Peak Season (Dec – 15 Jan) | 2026-12-01 | 2027-01-15 |
| `LS - JAN` | Pre-Peak / Low Season (16–30 Jan) | 2027-01-16 | 2027-01-30 |
| `RS - FEB` | Ramadhan Season (Feb – 13 Mac) | 2027-02-01 | 2027-03-13 |
| `SS - MAC` | Syawal Season (14–24 Mac) | 2027-03-14 | 2027-03-24 |

> **MFF bridge rule**: given a flight `departure_date`, find the season code by checking which date range it falls into.

---

## MFF Package Name → Canonical Name

Used by the MFF normalization script to map column-30 values to canonical package names.

| MFF Name (col 30) | Canonical Name |
|---|---|
| `UMJ` | MENARA JAM |
| `UMJ SV` | MENARA JAM |
| `UMJ P` | MENARA JAM PREMIUM |
| `UMJ PREMIUM` | MENARA JAM PREMIUM |
| `UMJ PLUS` | UMJ PLUS |
| `MAWADDAH` | MAWADDAH |
| `MAWADDAH SV` | MAWADDAH |
| `MAWADDAH - SV (BRANCH SABAH GROUP)` | MAWADDAH |
| `MAWADDAH LITE` | MAWADDAH LITE |
| `MANASIK` | MANASIK HAJI |
| `MANASIK HAJI` | MANASIK HAJI |

---

## Matched Packages (Price List ↔ DB)

| Season Code | Canonical Name | DB Name | DB ID | Status |
|---|---|---|---|---|
| `LS - JULY TO SEP` | MENARA JAM | MENARA JAM | `jd74k6ss3bsntrq0g3rbnh8std81zx0h` | published |
| `LS - JULY TO SEP` | MENARA JAM PREMIUM | MENARA JAM PREMIUM | `jd7355epkasg5d9qwsbjyr14z581y495` | published |
| `LS - JULY TO SEP` | MAWADDAH LITE | MAWADDAH LITE | `jd79c4xpapdcmd8myp3pjgnkwn81yw25` | published |
| `LS - JULY TO SEP` | MAWADDAH | MAWADDAH | `jd7cff92c5055j761r418et2t981y460` | published |
| `LS - JULY TO SEP` | MANASIK HAJI | MANASIK HAJI | `jd70dd7vz0wkrfa6ewb653g80581yys0` | published |
| `LS - OCT` | MENARA JAM | MENARA JAM  | `jd7ec8q2pq96dnc45vkqhg9bwd81zq09` | published |
| `LS - OCT` | UMJ PLUS | UMJ PLUS | `jd7d3xy71zwdmn60c395ns6bad81yrqa` | published |
| `LS - OCT` | MAWADDAH LITE | MAWADDAH LITE | `jd7ck36vrqzcf3r24yxwct8xb981y8x7` | published |
| `LS - OCT` | MAWADDAH | MAWADDAH | `jd7052xe1q4wc6xzgw4xhzazqx81z14s` | published |
| `LS - OCT` | MANASIK HAJI | MANASIK HAJI | `jd77tkvbmrjmej03xc60qkpzvn81yw5q` | published |
| `MS - NOV` | MENARA JAM | MENARA JAM | `jd79amzh68q6z5pvxtpx2h1h8x81z4d2` | published |
| `MS - NOV` | UMJ PLUS | UMJ PLUS | `jd7b614hn78gw6jnnfmjqw71t981zwfw` | unpublished |
| `MS - NOV` | MAWADDAH | MAWADDAH | `jd7cxx4hrdkxtbzdnyqza6bwa981y014` | published |
| `MS - NOV` | MANASIK HAJI | MANASIK HAJI | `jd75j5z12ay8xdha2ekyerdjbh81zv9r` | unpublished |
| `LS - JAN` | MENARA JAM | MENARA JAM | `jd7b3qcdjhnbx480vymw770js581yyh4` | published |
| `LS - JAN` | MAWADDAH | MAWADDAH | `jd776sgh9p5bg1s828k8df8y4x81ze5e` | published |
| `LS - JAN` | MANASIK HAJI | MANASIK HAJI | `jd75843nm590jap5ts4scrvy8h81zvnr` | unpublished |

---

## New Packages — Need to be Created in DB

| Season | Canonical Name | Price List Package | Segment | QDP | DBL | Prices? |
|---|---|---|---|---|---|---|
| `SLS - JUN` | **MUSIM HAJI** | SEASONAL | MUSIM HAJI - 11H9M | 8490 | 9490 | ✓ |
| `SLS - JUN` | **MUSIM HAJI** | SEASONAL | MUSIM HAJI - 12H10M | 8690 | 9690 | ✓ |
| `LS - JULY TO SEP` | **MAWADDAH PLUS** | MAWADDAH | PLUS 13D11N (20 AUG) | 9390 | 11290 | ✓ |
| `LS - JULY TO SEP` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 25790 | 22390 | ✓ |
| `LS - OCT` | **MENARA JAM PREMIUM** | MENARA JAM | PREMIUM | 12990 | 15690 | ✓ |
| `LS - OCT` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 26790 | 23390 | ✓ |
| `MS - NOV` | **MENARA JAM PREMIUM** | MENARA JAM | PREMIUM | 13490 | 16290 | ✓ |
| `MS - NOV` | **MAWADDAH LITE** | MAWADDAH | LITE | 8290 | 9590 | ✓ |
| `MS - NOV` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 27790 | 24390 | ✓ |
| `MS - NOV` | **HAJI FADHIL - EJEN** | HAJI FADHIL - EJEN | SAFWAH (4 NOV - 14 NOV) | 8790 | 10590 | ✓ |
| `MS - NOV` | **UNIMAP** | UNIMAP | UMJ (29 NOV - 9 DEC) | 9890 | 10890 | ✓ |
| `PS - DEC` | **MENARA JAM LITE** | MENARA JAM | LITE | 11990 | 13990 | ✓ |
| `PS - DEC` | **MENARA JAM** | MENARA JAM | STANDARD - DIRECT | 13690 | 16890 | ✓ |
| `PS - DEC` | **UMJ PLUS** | MENARA JAM | UMJ PLUS 13D11N | 12990 | 16290 | ✓ |
| `PS - DEC` | **MENARA JAM SENAI** | MENARA JAM | UMJ SENAI (JB) - 8DEC | 11990 | 14990 | ✓ |
| `PS - DEC` | **MENARA JAM PREMIUM** | MENARA JAM | PREMIUM | 15790 | 19490 | ✓ |
| `PS - DEC` | **MAWADDAH LITE** | MAWADDAH | LITE | 9790 | 12190 | ✓ |
| `PS - DEC` | **MAWADDAH** | MAWADDAH | STANDARD - DIRECT | 12190 | 15490 | ✓ |
| `PS - DEC` | **MANASIK HAJI** | MAWADDAH | MANASIK HAJI | 11690 | 14290 | ✓ |
| `PS - DEC` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 26390 | 29890 | ✓ |
| `LS - JAN` | **UMJ PLUS** | MENARA JAM | UMJ PLUS 13D11N | 11290 | 13790 | ✓ |
| `LS - JAN` | **MENARA JAM PREMIUM** | MENARA JAM | PREMIUM | 13490 | 16290 | ✓ |
| `LS - JAN` | **MAWADDAH LITE** | MAWADDAH | LITE | 8290 | 9590 | ✓ |
| `LS - JAN` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 24390 | 27790 | ✓ |
| `RS - FEB` | **SAMBUT RAMADHAN - MAWADDAH** | SAMBUT | MAWADDAH | 11490 | 14890 | ✓ |
| `RS - FEB` | **SAMBUT RAMADHAN - UMJ** | SAMBUT | UMJ | 12690 | 15990 | ✓ |
| `RS - FEB` | **AWAL RAMADHAN - MAWADDAH** | AWAL | MAWADDAH | 11790 | 15890 | ✓ |
| `RS - FEB` | **AWAL RAMADHAN - UMJ** | AWAL | UMJ | 13390 | 17290 | ✓ |
| `RS - FEB` | **PERTENGAHAN RAMADHAN - MAWADDAH** | PERTENGAHAN | MAWADDAH | 12490 | 17290 | ✓ |
| `RS - FEB` | **PERTENGAHAN RAMADHAN - UMJ** | PERTENGAHAN | UMJ | 14790 | 18590 | ✓ |
| `RS - FEB` | **AKHIR RAMADHAN - MAWADDAH** | AKHIR | MAWADDAH | 18890 | 30590 | ✓ |
| `RS - FEB` | **AKHIR RAMADHAN - UMJ** | AKHIR | UMJ | 23990 | 32890 | ✓ |
| `SS - MAC` | **MENARA JAM** | MENARA JAM | STANDARD - DIRECT | 9690 | 11590 | ✓ |
| `SS - MAC` | **MENARA JAM PREMIUM** | MENARA JAM | PREMIUM | 12890 | 15690 | ✓ |
| `SS - MAC` | **MAWADDAH LITE** | MAWADDAH | LITE | 8490 | 9790 | ✓ |
| `SS - MAC` | **MAWADDAH** | MAWADDAH | STANDARD - DIRECT | 8890 | 10590 | ✓ |
| `SS - MAC` | **MANASIK HAJI** | MAWADDAH | MANASIK HAJI | 8790 | 9990 | ✓ |
| `SS - MAC` | **PLATINUM** | PLATINUM | FIT - DATE BELUM ADA | 23490 | 26890 | ✓ |

> Create these packages in Convex before running the MFF normalization.

---

## DB Packages Not Found in Price List

| DB Name | Season | Status | Note |
|---|---|---|---|
| UMJ PREMIUM | `LS - OCT` | unpublished |  |
| UMJ PREMIUM | `MS - NOV` | unpublished |  |
| MANASIK HAJI SUPER PEAK SEASON | `PS - DEC` | published |  |
| MENARA JAM SUPER PEAK SEASON | `PS - DEC` | published |  |
| UMJ PREMIUM SUPER PEAK SEASON | `PS - DEC` | published |  |
| MAWADDAH SUPER PEAK SEASON | `PS - DEC` | published |  |
| UMJ PLUS  | `2026/2027` | unpublished | ⚠️ Bad season value |
| MANASIK HAJI | `2026/2027` | unpublished | ⚠️ Bad season value |
| MENARA JAM | `2026/2027` | unpublished | ⚠️ Bad season value |
| MUSIM HAJI | `2026/2027` | published | ⚠️ Bad season value |
| MANASIK HAJI PRE PEAK SEASON | `2026/2027` | published | ⚠️ Bad season value |
| UMJ PLUS PRE PEAK SEASON | `2026/2027` | published | ⚠️ Bad season value |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | unpublished | ⚠️ Bad season value |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | unpublished | ⚠️ Bad season value |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | published | ⚠️ Bad season value |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | published | ⚠️ Bad season value |
| UMJ PLUS SUPER PEAK SEASON | `2026/2027` | unpublished | ⚠️ Bad season value |
| UMRAH MUSIM HAJI  | `2026/2027` | unpublished | ⚠️ Bad season value |
| UMJ PLUS SUPER PEAK SEASON | `2026/2027` | published | ⚠️ Bad season value |
| UMJ PLUS JANUARI  | `2026/2027` | published | ⚠️ Bad season value |
| MAWADDAH LITE NOVEMBER | `2026/2027` | published | ⚠️ Bad season value |

---

## DB Packages with Bad Season Value

Season field is set to the year (`2026/2027`) instead of a season code. These need to be corrected.

| DB Name | Current Season | Suggested Fix |
|---|---|---|
| UMJ PLUS  | `2026/2027` | Update to correct season code |
| MANASIK HAJI | `2026/2027` | Update to correct season code |
| MENARA JAM | `2026/2027` | Update to correct season code |
| MUSIM HAJI | `2026/2027` | Update to correct season code |
| MANASIK HAJI PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| UMJ PLUS PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| MENARA JAM PRE PEAK SEASON | `2026/2027` | Update to correct season code |
| UMJ PLUS SUPER PEAK SEASON | `2026/2027` | Update to correct season code |
| UMRAH MUSIM HAJI  | `2026/2027` | Update to correct season code |
| UMJ PLUS SUPER PEAK SEASON | `2026/2027` | Update to correct season code |
| UMJ PLUS JANUARI  | `2026/2027` | Update to correct season code |
| MAWADDAH LITE NOVEMBER | `2026/2027` | Update to correct season code |

---

## Next Steps

1. **Fix bad season values** — update the 15 DB packages that have `season = "2026/2027"`
2. **Create missing packages** — add the 38 packages marked NEW above to Convex
3. **Backfill `package_code`** — set a short slug on each package (e.g. `menara-jam`, `mawaddah-lite`)
4. **Run MFF normalization** using `docs/season-codes.csv` as the date → season lookup and `docs/package-mapping.csv` as the canonical name → DB ID lookup
