# Client detail Inquiry timeline

Tested commit `3947ef5ce4f520661f2bdf51034dc0f00878ec34` in Chrome against the disposable Inquiry History Demo fixture. The preview ran at `http://localhost:3561/clients/k174n2xbxp26jr6gynhzff033h8jt66b`.

## Captures

| View | Evidence |
| --- | --- |
| Previous desktop detail | [Dark, 1536 × 1024](../client-detail-style-pass/after-dark.png) |
| Desktop, Open Inquiry | [Dark, 1536 × 1024](desktop-open-dark.png) |
| Accepted Inquiry before the quotation row fix | [Dark, 1536 × 1024](https://raw.githubusercontent.com/hasififwat/hasififwat-mkm-quotation-management-system/bb8d33d616e7b7dba202e4da890bac2fff1572a1/docs/evidence/client-inquiry-timeline/desktop-accepted-dark.png) |
| Desktop, Accepted Inquiry | [Dark, 1536 × 1024](desktop-accepted-dark.png) · [Light, 1536 × 1024](desktop-accepted-light.png) |
| Phone, 390 × 844 viewport | [Collapsed](mobile-collapsed-dark.png) · [Open Inquiry expanded](mobile-expanded-dark.png) · [Accepted Inquiry expanded](mobile-accepted-dark.png) |

## Browser checks

- The Accepted pane fits each package name and travel date range on one line at 1536 px. The closure explanation appears below the quotation details. Read-only rows have space for one Preview action.
- Timeline cards show the Open countdown, the Closed timestamp in Malaysia time, and the Accepted quotation reference. The quotation pane displays individual prices. In this fixture, the opening and closing times fall within the same minute. The page fits at 320 px without horizontal scrolling.
- Desktop starts with the open Inquiry selected and shows four preview and edit links in the adjacent pane. Enter selects the closed Inquiry and shows its single read-only option. The accepted Inquiry shows three previews, including the exact accepted revision, and has zero edit links.
- Resizing to phone width keeps the selected Inquiry and moves its quotations inline. Reloading the phone view collapses the cards. Space expands the open Inquiry, and the accepted Inquiry's fragment link expands the correct card.
- All Clients returns to the directory. Create Quotation preselects Inquiry History Demo. View saved revision opens read-only revision `1448H-0010`.

TypeScript, scoped ESLint, and 41 focused tests passed. The full suite passed 735 tests and reported 13 failures in `scripts/recoverable-save.test.mjs`. The same failures reproduce on the previous PR head because its test mock lacks `flushSync`.

The browser run used the existing disposable fixture in read-only mode. The temporary Chrome session and web server closed after capture.
