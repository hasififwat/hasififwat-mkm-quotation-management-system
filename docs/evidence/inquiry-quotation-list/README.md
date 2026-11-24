# Inquiry table and quotation list

Tested `85a48e18754df2eda80aecb3817702e222629d1f` in Chromium at `http://localhost:3556` with synthetic records and a disposable Convex backend.

The client page renders one Inquiry table. Each row shows when the Inquiry opened, how many quotations it holds, a colour-coded status pill (Open with its countdown, Closed, or Accepted with the winning reference), and its value: the price range of active quotations, or the accepted total. Expanding a row lists every quotation, newest first. Each item shows the package, reference, package year, travel dates, status, amount, and, for active quotations, edit and action-menu buttons. The accepted quotation is highlighted, and closed quotations are muted with their closure reason.

On narrow screens the value column collapses into the row summary. The checks fit at 320, 390, and 1440 px in light and dark themes, with zero horizontal overflow or browser errors. Keyboard Enter and Space toggle a row, and the accept review dialog kept acceptance disabled until confirmation.

[Open, desktop](desktop.png) · [Open, mobile](mobile.png) · [Accepted, light](accepted-light.png) · [Closed, dark](closed-dark.png)

TypeScript, scoped ESLint, and all 31 focused tests passed.
