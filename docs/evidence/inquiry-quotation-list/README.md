# Expanded Inquiry quotation list

Tested `76b887d8f8c886247d3ea45621632e1c83500655` in Chromium at `http://localhost:3556` with synthetic records and a disposable Convex backend.

The client page rendered one Inquiry table. Enter expanded the open Inquiry and displayed all four quotations as list items in creation order, newest first. Space collapsed it. The closed Inquiry displayed its one quotation, and following **View Inquiry** from the accepted saved revision displayed all three quotations in that Inquiry.

Active quotations offered **Edit current** and the quotation action menu. The review action opened the right saved terms and kept acceptance disabled until confirmation. The closed quotation had no edit link. The checks fit at 320, 390, and 1440 px with zero horizontal overflow or browser errors.

[Desktop](desktop.png) · [Mobile](mobile.png)

TypeScript, scoped ESLint, and all 31 focused tests passed. The test browser closed. The local demo remains running for review.
