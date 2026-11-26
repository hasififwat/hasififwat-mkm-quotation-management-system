# Client detail Inquiry timeline

Tested commit `c1e1cd2026d76e8db7cf995fced263a0cb8f071a` in Chrome against the disposable Inquiry History Demo fixture. The preview ran at `http://localhost:3561/clients/k174n2xbxp26jr6gynhzff033h8jt66b`.

## Captures

| View | Evidence |
| --- | --- |
| Previous desktop detail | [Dark, 1536 × 1024](../client-detail-style-pass/after-dark.png) |
| Desktop, Open Inquiry | [Dark, 1536 × 1024](desktop-open-dark.png) |
| Desktop, Accepted Inquiry | [Dark, 1536 × 1024](desktop-accepted-dark.png) · [Light, 1536 × 1024](desktop-accepted-light.png) |
| Phone, 390 × 844 viewport | [Collapsed](mobile-collapsed-dark.png) · [Open Inquiry expanded](mobile-expanded-dark.png) |

## Browser checks

- The Open badge and price range share a line at 1536 px and 390 px. The countdown sits beneath them. The page fits at 320 px without horizontal scrolling.
- Desktop starts with the open Inquiry selected and shows four preview and edit links in the adjacent pane. Enter selects the closed Inquiry and shows its single read-only option. The accepted Inquiry shows three previews, including the exact accepted revision, and has zero edit links.
- Resizing to phone width keeps the selected Inquiry and moves its quotations inline. Reloading the phone view collapses the cards. Space expands the open Inquiry, and the accepted Inquiry's fragment link expands the correct card.
- All Clients returns to the directory. Create Quotation preselects Inquiry History Demo. View saved revision opens read-only revision `1448H-0010`.

TypeScript, scoped ESLint, and 40 focused tests passed. The full suite passed 734 tests and reported 13 failures in `scripts/recoverable-save.test.mjs`. The same failures reproduce on the previous PR head because its test mock lacks `flushSync`.

The browser run used the existing disposable fixture in read-only mode. The temporary Chrome session and web server closed after capture.
