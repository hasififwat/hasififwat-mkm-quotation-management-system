# Source comment audit

The sweep covered the first-party application, Convex handlers, JavaScript and TypeScript configuration, maintenance scripts, and verification code in checkout `dcd35dcc1871`. It included 252 JavaScript and TypeScript files, one CSS file, and five Python files. Generated output, installed agent tooling, historical evidence, local scratch, and documentation prose were outside the source audit.

The audit classified 605 comments. It removed 422 tautologies and 134 stale comments, filed issues for 15 excuses, and moved 34 decision comments into ADRs. Comments touched 709 physical source lines. The sweep removed 678 whole lines and removed inline comment text from lines that still contain code.

Line numbers refer to the checkout before the sweep. A range covers the listed category throughout that range.

| Source | Tautology | Stale | Excuse | Decision Record |
| --- | --- | --- | --- | --- |
| `convex/clients.ts` | 28, 30, 184, 191, 203, 216, 234, 239, 297, 308, 333–334 | — | — | — |
| `convex/packages.ts` | 87, 90, 467, 531, 568 | — | — | 422–423 ([0001](adr/0001-preserve-package-sync-ownership.md)), 468 ([0001](adr/0001-preserve-package-sync-ownership.md)), 567 ([0002](adr/0002-retain-flight-ids-on-package-edits.md)), 1312 ([0001](adr/0001-preserve-package-sync-ownership.md)) |
| `convex/profiles.ts` | — | — | 124 ([#93](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/93)) | 12 ([0007](adr/0007-join-profiles-by-password-account-email.md)) |
| `convex/quotations.ts` | 344, 358, 1534, 1541, 1553, 1565, 1603 | — | 1577–1584 ([#92](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/92)) | — |
| `convex/schema.ts` | 15, 150, 160 | — | — | — |
| `eslint.config.mjs` | 8, 10 | — | — | — |
| `next.config.ts` | — | — | — | 4 ([0004](adr/0004-defer-the-browser-pdf-renderer.md)) |
| `scripts/compare-mff-flights.js` | 30, 33, 82–84, 100, 112–116, 127–129, 145–147, 161–166, 176, 181, 202, 205, 229–231, 237–239, 253, 264, 271–273, 321, 326, 347, 349, 366, 381, 394, 407 | 2–14, 348 | — | 31–32 ([0003](adr/0003-interpret-csv-input-contracts.md)), 190–191 ([0003](adr/0003-interpret-csv-input-contracts.md)) |
| `scripts/compare-prices.js` | 30–32, 52–54, 83–86, 120, 146, 163–165, 173, 181–183, 210, 219–221, 227, 247, 275, 290, 292, 312, 346, 359, 371, 394, 396 | 2–14, 291, 395 | 188 ([#94](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/94)), 196 ([#94](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/94)) | — |
| `scripts/extract-price-list.js` | 31–34, 54–56, 101–103, 131, 140, 145, 204–206, 234–236, 240, 247, 276, 284, 287, 309–311, 451–453 | 2–16, 86 | — | 78 ([0003](adr/0003-interpret-csv-input-contracts.md)), 260–261 ([0003](adr/0003-interpret-csv-input-contracts.md)), 277–278 ([0003](adr/0003-interpret-csv-input-contracts.md)) |
| `scripts/fix-package-seasons.js` | 2–11, 21–23, 43–45, 51–53, 58, 66, 81, 105, 128–130 | — | 91 ([#95](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/95)) | — |
| `scripts/update-prices.js` | 22–24, 125, 128, 142–144, 158–160, 173, 176, 180, 184, 195, 204–206, 230, 232 | 2–11 | 126–127 ([#94](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/94)), 231 ([#94](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/94)) | — |
| `src/app/(protected)/clients/page.tsx` | — | 13 | — | — |
| `src/app/(protected)/flights/audit/page.tsx` | 50, 59, 75, 87, 105, 119 | — | — | — |
| `src/app/(protected)/loading.tsx` | 3–6 | — | — | — |
| `src/app/(protected)/packages/create/page.tsx` | 17, 76 | — | — | — |
| `src/app/(protected)/packages/edit/[pid]/page.tsx` | 26 | — | — | — |
| `src/app/(protected)/packages/sync/page.tsx` | 68, 122, 133, 156, 162, 176, 189, 228, 360, 520, 690, 710, 766, 793, 832, 845, 905, 918, 942, 964, 994, 1008, 1017, 1033, 1129, 1330, 1367, 1376, 1420, 1436, 1476, 1499 | — | — | — |
| `src/app/(protected)/quotations/duplicates/page.tsx` | 70, 86 | — | — | — |
| `src/app/(protected)/quotations/page.tsx` | 132, 215 | — | — | — |
| `src/app/(protected)/quotations/review/[qid]/pdf-preview-pane.tsx` | — | — | — | 22–26 ([0004](adr/0004-defer-the-browser-pdf-renderer.md)) |
| `src/app/(protected)/quotations/review/[qid]/review-client.tsx` | 36–37, 39–40, 46, 78, 81 | — | — | 11–15 ([0004](adr/0004-defer-the-browser-pdf-renderer.md)) |
| `src/app/layout.tsx` | — | — | — | 8–9 ([0005](adr/0005-self-host-application-fonts.md)) |
| `src/app/logout/page.tsx` | — | 6–10 | — | — |
| `src/components/DatePicker.tsx` | 18, 34, 46 | — | — | — |
| `src/components/ui/input-group.tsx` | 20, 26, 29 | — | — | — |
| `src/components/ui/multi-select.tsx` | 21, 24, 35, 39, 42, 54, 65, 68, 71, 75, 88, 91, 94, 100, 266, 273, 304, 317, 342, 404, 409, 420, 449, 469, 519 | 45, 48–51, 57–61, 224 | 80–85 ([#96](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/96)), 338 ([#96](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/96)), 365 ([#96](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/96)), 437 ([#96](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/96)) | — |
| `src/components/ui/sidebar.tsx` | 71–72, 84, 90, 95, 111–112, 216, 235, 429, 564, 608 | — | — | — |
| `src/components/ui/tree-select.tsx` | 48, 53, 66, 74, 77, 87, 89, 100, 113, 124, 143 | — | — | — |
| `src/features/authentication/components/LoginForm.tsx` | 42 | — | — | — |
| `src/features/clients/ClientDetailPage.tsx` | 62, 70, 114, 138, 143 | — | — | — |
| `src/features/clients/ClientsListingPage.tsx` | 241, 337, 418, 563 | — | 254 ([#97](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/97)) | 232–233 ([0006](adr/0006-keep-search-input-independent-of-navigation.md)), 236 ([0006](adr/0006-keep-search-input-independent-of-navigation.md)) |
| `src/features/dashboard/components/Dashboard.tsx` | 15, 23, 78 | — | — | — |
| `src/features/flights/FlightListings.tsx` | — | 12 | — | — |
| `src/features/flights/FlightMaster.tsx` | 102, 105, 108, 121–126, 163 | 15, 23, 165–168 | — | — |
| `src/features/flights/components/columns.tsx` | 7 | — | — | — |
| `src/features/flights/components/data-table.tsx` | — | 11–17, 26, 61–71, 73–78, 80–95, 97–110, 114, 121–123, 125–127, 129–131, 133–136, 138–157, 159–161, 163–165 | — | — |
| `src/features/packages/PackageBuilder.tsx` | 407 | — | — | — |
| `src/features/packages/PackageList.tsx` | 16 | — | — | — |
| `src/features/packages/PackagePreviewModal.tsx` | 72, 106, 166, 169, 171–172, 179, 182, 187, 210, 213, 220, 233, 247, 250, 313, 390 | 241, 258, 262–269 | — | — |
| `src/features/packages/components/Form/FlightDetails.tsx` | 141, 150, 152, 178, 210, 212, 235, 257, 280 | — | — | — |
| `src/features/packages/components/Form/HotelDetails.tsx` | 72–73, 76, 102 | — | — | — |
| `src/features/packages/components/Form/RoomDetails.tsx` | 29, 43, 66, 69, 87 | — | — | — |
| `src/features/packages/components/PackageListTable/data-table.tsx` | 85 | — | — | — |
| `src/features/packages/components/SelectPackageButton.tsx` | 100 | — | — | — |
| `src/features/packages/schema.ts` | 63, 66, 70, 73 | 60 | — | — |
| `src/features/packages/sync/parsers.ts` | 434, 606, 658, 699, 816 | 296, 435, 607 | — | 85 ([0003](adr/0003-interpret-csv-input-contracts.md)), 275–276 ([0001](adr/0001-preserve-package-sync-ownership.md)), 327 ([0001](adr/0001-preserve-package-sync-ownership.md)), 349 ([0001](adr/0001-preserve-package-sync-ownership.md)), 415 ([0003](adr/0003-interpret-csv-input-contracts.md)), 426 ([0001](adr/0001-preserve-package-sync-ownership.md)), 803 ([0001](adr/0001-preserve-package-sync-ownership.md)) |
| `src/features/packages/sync/types.ts` | 49, 149, 153 | — | — | — |
| `src/features/quotation/QuotationBuilder.tsx` | 120, 652, 894, 1019, 1027, 1068, 1105, 1127, 1181, 1201 | 1223–1227 | — | — |
| `src/features/quotation/components/PDFPreviewMobile.tsx` | 58, 66, 73, 75, 108, 145, 161, 177, 189, 191, 195, 235, 238, 247, 268, 273 | — | — | — |
| `src/features/quotation/components/QuotationTable/QuotationExpandedRow.tsx` | 63, 65, 91, 98, 115, 126, 139, 161 | — | — | — |
| `src/features/quotation/components/QuotationTable/data-table.tsx` | 65, 70, 73, 374 | — | — | — |
| `src/features/quotation/schema.ts` | 6, 56, 67, 73, 98, 101, 117, 119, 124, 159, 177, 179, 199, 202–203, 208, 212 | 50–51, 71, 89, 92 | — | — |
| `src/features/theme/provider/ThemeProvider.tsx` | 31 | — | 53 ([#98](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/98)) | — |
| `src/hooks/useDebounce.tsx` | 14, 19, 21, 37, 48 | — | — | 25 ([0006](adr/0006-keep-search-input-independent-of-navigation.md)), 27 ([0006](adr/0006-keep-search-input-independent-of-navigation.md)) |
| `src/hooks/useExtractPackage.tsx` | 111, 127 | — | — | — |
| `src/layout/SidebarLayout.tsx` | — | 28–32 | 88 ([#99](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/issues/99)) | — |
| `src/lib/convex-server.ts` | — | — | — | 4–7 ([0008](adr/0008-allow-a-server-only-convex-endpoint.md)) |

## Lint ratchet

Run `pnpm lint:comments` to check source comments independently. The regular `pnpm lint` command also checks them. The checks use ESLint, PostCSS, and Python tokenization. Python 3 is required to scan the repository’s Python scripts.

The ratchet matches each grandfathered comment by file, exact text, and occurrence count. Deleting a grandfathered comment requires pruning its entry. The initial sweep left the baseline empty. The baseline now retains one note from the newer integration branch about TanStack resetting the initial package season expansion.
