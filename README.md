# Flight Selection theme verification

Baseline `0f964d68a1cdd6424a881baebac1416231028478` and fix `454693c3624f38fa161cb05b35352672474e35e8` ran in T3 Chromium 152. The loopback preview was `http://localhost:3674/quotations/create` at 1120 × 640 CSS pixels.

## Reproduce

1. At the commit under test, use `scripts/revision-ui/README.md` to start an owned Convex SQLite instance, seed the synthetic account and package, and start Next from the source snapshot. Keep the revision gate at its default.
2. Add a second flight to the seeded package through `packageFlights:addFlight` on the owned Convex instance. Use January 15 to 26, 2027, with sectors KUL-MED and JED-KUL. The seeded flight starts January 1.
3. Open the loopback app in a private T3 Preview tab and sign in as the synthetic account. Open Create Quotation, select the synthetic client, advance to Package Selection, and select Revision verification package.
4. Set T3 Preview's system appearance to light. Use the app's theme button to test dark and light. The default overlay scrollbar consumes 0 px. To get a classic scrollbar in this tab, add the temporary rule `html::-webkit-scrollbar { width: 16px; }`. Confirm `innerWidth - document.documentElement.clientWidth` is 16 px while the page is scrollable and the menu is closed. Remove that rule for the overlay case.
5. Scroll to 125 px and open Flight Selection. Read root and body styles, viewport geometry, main and trigger bounds, and the scroll lock. Select the second option by pointer. Reopen with Enter, select the first option with Home and Enter, then reopen to check Escape and outside click. Check focus, the selected flight, and the cleared body lock after the menu exits. Press PageDown and verify the document scrolls.

## Results

Classic mode expanded the visual viewport from 1104 to 1120 px on open. The 16 px body margin kept the main right edge at 1104 and the trigger at x = 335–1025. The offset was 0 px in overlay mode. Neither mode moved the trigger or produced horizontal overflow. In dark classic mode, the open edge sample changed from RGB 255,255,255 to RGB 10,10,10, matching the adjacent page. Scroll position stayed at 125 px until PageDown moved it to 266.5 px. The Umrah Year dropdown on `/packages/create` also selected, dismissed, restored focus, and allowed PageDown.

The appearance override and classic gutter rule were confined to the owned tab. The test exercised Chromium with a real layout-reserving gutter. It did not change the host OS appearance or scrollbar settings.

The 100 scoped Node tests, Next type generation, TypeScript, scoped ESLint for the adjacent layout, providers, Select and builder, production build, and diff check passed. Expanding ESLint to the unchanged ThemeProvider reports its existing `react-hooks/set-state-in-effect` error.

The private tab was closed. The owned Next and SQLite Convex processes exited and ports 3674, 13974 and 13975 were checked closed. The source snapshot, synthetic credentials, signing keys, session, database, and storage were removed.
