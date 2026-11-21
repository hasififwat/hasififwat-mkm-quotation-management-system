# Compact mobile footer

Tested `a983ec7c8d157dd761afda41a0879c0217e8dae3` in T3 Preview at `http://localhost:3683`.

The earlier grid stretched all buttons and wrapped the revision label. The compact footer uses the shared 36 px button height and widths based on each label. Previous and Cancel share a left edge. Next and Save share a right edge. At 320 px, Save new revision fits on one line with its icon and measures 169 × 36 px.

[Previous revision layout](mobile-aligned-revision.png) · [Compact revision layout](compact-revision.png) · [Compact standard edit](compact-edit.png) · [Compact create final step](compact-create.png)

[Regular layout measurements](regular-footer-matrix.json) cover 36 live combinations across three steps in create and edit, 320, 375, and 1280 px, and both themes. The browser checked actions, button dimensions, row alignment, Cancel, keyboard Save, and the disabled saving states. Both saves persisted through review reload and editor reopen. The first create request returned 401. Signing in again and repeating the creation succeeded. The fixture finished with two quotation rows and zero revision receipts.

[Revision layout measurements](revision-footer-matrix.json) cover another 36 cases. The disposable copies of each route supplied the display flag to the actual builder. The release gate stayed off. This run covers the label and layout.

The 77 focused tests, scoped ESLint, type checking, production build, and Git diff check passed. The preview tab and its three ports closed. The disposable database, account, signing keys, and source copy were removed. [Cleanup receipt](compact-cleanup.json)

[Browser action and persistence receipt](compact-matrix.json) records the keyboard and save results. The two layout files pin the tested head and identify which route setup produced each case.
