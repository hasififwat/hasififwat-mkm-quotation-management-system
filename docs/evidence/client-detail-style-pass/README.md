# Client detail styling verification

Tested `af1e3ef1db62137a56c0d5273e6937f30cb886c4` at `http://localhost:3556/clients/k174n2xbxp26jr6gynhzff033h8jt66b`. The before and after captures use Inquiry History Demo, dark mode, a 1536 × 1024 CSS viewport, and all three Inquiry rows collapsed. The completed Clients directory supplies the shared column. The Staff UI style guide and the Packages and Quotations patterns supply the shared card, table, and button styles.

| Pass | Visible result |
| --- | --- |
| Desktop column | The detail cards move from x=408 at 960 px wide to x=388 at 1,000 px wide. The separate All Clients link remains above the summary. |
| Client summary | The three fact values increase from 14 to 18 px. One Create Quotation button opens the client-prefilled route. |
| Inquiry table | The Inquiry heading, disclosure, Status column, and Value column align. The three collapsed row heights remain 72, 63, and 68.5 px. |
| Saved revisions | The explanation sits under the heading. The card is 197 px tall, down from 230 px. The outline action opens the exact historical revision. |
| Narrow heading | At 390 px, the history title fits on one line. At 320 px, it wraps across two lines without horizontal scrolling. |

Verified All Clients navigation and that Create Quotation preselects Inquiry History Demo. The Open, Closed, and Accepted disclosures show four active quotations, one closed quotation, and one accepted quotation with two closed alternatives, respectively. View saved revision opens historical revision `1448H-0010` without an edit action and links to the current revision.

The live light and dark layouts fit at desktop. Narrow checks passed at 390 and 320 px. TypeScript, scoped ESLint, and 41 focused tests passed. The check used existing disposable fixtures and wrote no application records. The verification tab closed and the local preview stays available.

[Before, dark](before-dark.png) · [After, dark](after-dark.png) · [After, light](after-light.png) · [After, narrow](after-narrow.png) · [Narrow history](after-narrow-history.png)
