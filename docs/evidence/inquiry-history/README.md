# Inquiry history verification

Tested `d743579f2b573787a0a3a24c02a799867607493d` in Chromium at `http://localhost:3556`. The client and quotations were synthetic. The app and its Convex database ran on loopback.

The client had one open, one manually closed, and one accepted Inquiry. The table displayed three collapsed rows with the open Inquiry first. Enter opened the first row and Space closed it. Opening the manually closed row showed its one quotation.

The open Inquiry contained four quotations. Expansion showed the two newest families in creation order. An older quotation had a newer revision and appeared with that revision when staff selected **Show 2 earlier quotations**. The accepted Inquiry linked directly to its accepted revision. That revision's **View Inquiry** link opened the matching row, and changing the URL fragment opened a different row.

The table fit 320 px and 390 px viewports without horizontal overflow. Advancing the browser's elapsed time by two days changed the countdown from 14 to 12 days. Expanding the row preserved the 12-day display. On the phone layout, staff accepted June after confirming the saved terms. After reload, June's saved revision was linked as accepted and all three alternatives were closed.

[Previous cards](before.png) · [Collapsed history](collapsed.png) · [Expanded history](expanded.png) · [Mobile history](mobile.png)

TypeScript, scoped ESLint, and 31 Inquiry, revision UI, and revision save tests passed. The Chromium test session closed, and Undo acceptance restored the demo to its open state. The localhost app and disposable database remain running for the preview.
