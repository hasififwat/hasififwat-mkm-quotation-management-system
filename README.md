# Issue 77 browser evidence

The real quotation edit builder ran in T3 Preview on a fresh local Next.js server and disposable Convex database. The data are synthetic.

- Baseline commit `b11d77be1d1e5e34cfa240948c1875c96b8c2521`.
- Tested commit `8ec85bf5ff8a0a8c4afb333dc89cb2fa3ef4ce26`.
- Tested URL `http://localhost:3677/quotations/edit/n579xg764c177fd913p6w3444x8jnkdw`, then **Next** to **Package Selection**. The server and fixture are now removed.

## Alignment

At 375 and 1,402 CSS px, in both light and dark themes, the builder showed selected Double, Triple, and unavailable Quad, plus unselected Single. Both warnings wrapped. Each checkbox center aligned with the first line of its room name. Price, warnings, Pax Count label, input, and total all used an 18 CSS px inset from the card border edge. The text and focus indicator stayed inside the card.

At 1,402 px before the change, the Double checkbox center was 44 px below the name center, the price and warning started 28 px to the right of the Pax inset, and the Double input started 64 px below Triple's. After the change all three differences were 0 px.

In all four width and theme combinations, the visible focus ring fit inside the card. Entering 0 showed **At least 1 pax** with an invalid input. The error stayed visible after focus moved to Quad. At 1,402 px, the adjacent selected cards shared the same Pax label, input, and total offsets with or without the error. At 700 px in dark mode, selected Single aligned with unavailable Quad in the second row.

## Room selection and pricing

- Set Double Pax Count to 3. The total showed RM 30,870 at the retained RM 10,290 price.
- Clicked the Double room name to remove it. The Pax input, total, and warning disappeared. Reselected via Space. The count started at 1 and the total showed the current RM 10,291 price.
- Set Double Pax Count back to 3. The total showed RM 30,873. Triple stayed at RM 24,000.
- Clicked **Remove Quad**. The unavailable card disappeared. Reloaded the edit route and confirmed that the original saved quantities and totals reopened.

The test used the classic edit flow. Browsers without CSS row subgrid use the stacked card layout and do not share vertical tracks. The older-browser fallback and revision cutover route were outside this browser run.

## Checks and cleanup

248 targeted tests passed. Next route type generation, TypeScript, targeted ESLint, and the committed diff check passed. See [test output](tests.log), [static checks](static-checks.log), [browser measurements](verification.json), and [fixture cleanup](cleanup.json). PNGs are crops of T3 Preview captures.
