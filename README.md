# Issue 79 verification

T3 Preview drove the real Edit Quotation page at `http://localhost:3679/quotations/edit/n57frg8t465eczdpkj332evv7h8jnmmx`. The baseline was `58890ed1137a3c4e3c1a8279165d0140c662f93e`. The corrected editor was `73709cca735e2af223c673c5d9dff1cd666d6b1e`. The test used an owned loopback Next.js server and disposable local Convex database. The fixture helper installed controls only in the disposable backend. The conflict triggers used the real quotation update and package room-price mutations.

| Scenario | Observed result |
| --- | --- |
| Saved quotation changed after editor load | The loaded token was rejected when staff opened the review. The saved state matched before and after, and the browser made zero update POSTs. The conflict panel explained the outcome and focused **Review latest changes**. |
| Staff opened the latest comparison | The editor displayed saved Quad at RM 1,200 and current Quad at RM 1,400. The saved state and update POST count stayed the same. Focus moved to the comparison heading. |
| Catalog changed while the comparison was open | The explicit confirmation for RM 1,400 returned a real HTTP 409 after the catalog changed to RM 1,450. The saved state stayed the same and focus returned to the recovery button. |
| Staff reopened review and confirmed | The comparison showed current Quad at RM 1,450. Reopening made zero additional update POSTs and left the saved record unchanged. The next explicit confirmation returned HTTP 200. A fresh backend comparison showed zero material differences. |
| Staff opened and reloaded the saved view | Keyboard activation opened a separate read-only view with the saved PIC, branch, room price, and total. The verification warning remained until confirmation. Reloading the saved view after confirmation showed the warning cleared, Quad still RM 1,200 × 4, and a total of RM 5,000. The editor kept the draft PIC, branch, and notes. |

The conflict fit in T3 Preview at 375 and 1,402 CSS px in both themes. Tab and Shift+Tab reached the recovery actions and exposed visible focus. Enter opened the saved tab and, on the editor’s recovery button, opened the comparison. Tab from the focused comparison heading reached **Confirm refresh**. T3’s accessibility tree exposed the alert, heading, explanation, button, and new-tab link. The alert had `aria-atomic="true"`. macOS reported `AXIsProcessTrusted: false`. Native screen-reader speech was unavailable.

The copy refers to the rejected refresh attempt. The pre-header Chromium replay and unconfirmed response handling belong to the #78 investigation. [Issue 78 evidence](https://github.com/hasififwat/hasififwat-mkm-quotation-management-system/blob/91d29a7833d9c4cbe0f38ce0741436bb95bb121d/README.md)

[Baseline conflict](baseline.json) · [Baseline HTTP 409](baseline-confirmation.json) · [Conflict before review](after-pre-review-conflict.json) · [Layout, focus, and browser accessibility](layout-and-accessibility.json) · [Conflict at confirmation](review-concurrency.json) · [Successful confirmation](explicit-confirmation.json) · [Saved tab](saved-tab.json) · [Saved reload](saved-after-reload.json)

[Saved view before confirmation](saved-before-confirmation.png) · [Saved view after confirmation and reload](saved-after-reload.png). The saved-view captures are cropped above the PDF payment instructions.

188 scoped tests passed. Next type generation, TypeScript, targeted ESLint, and the diff check exited zero. [Test output](tests.txt) · [Static checks](static-checks.txt)

The owned editor tab closed. T3 marked the saved tab unclaimed and refused to close it. Next and Convex stopped, all three loopback ports refused connections, and the disposable source, SQLite data, storage, account, JWT, and signing files were removed. [Cleanup receipt](cleanup.json)
