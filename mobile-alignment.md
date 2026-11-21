# Mobile footer alignment

Tested `2c6499e2d1ed72b260ddc1337c8d69887f7ae5d1` in T3 Preview at `http://localhost:3677`.

The first pass let the two rows align independently. Staff saw Previous and Next drift left and Cancel and Save drift right at 320 px. Equal-width columns align both rows with the form fields. The mobile controls are at least 44 px high. The longer revision label wraps within its column.

[First pass at 320 px](after-mobile.png) · [Aligned edit footer](mobile-aligned-edit.png) · [Final create footer](mobile-aligned-create-final.png) · [Save new revision](mobile-aligned-revision.png)

[Browser measurements](mobile-matrix.json) cover 36 live layout cases across all steps in desktop and mobile widths of 1280, 375, and 320 px, in both themes. They record matching column edges, controls that fit, and the expected destinations and visible actions. Keyboard Cancel returned to the saved quote. Keyboard Save showed the busy state and both create and edit persisted through review reload and editor reopen.

A disposable view passed the same 36 layout cases for the longer revision label. Only the copied routes passed the display flag to the real builder. The gate stayed off, and the run had two legacy quotation rows and zero revision receipts before cleanup.

The 77 focused tests, scoped ESLint, type checking, production build, and diff check passed. The preview closed, all three owned ports closed, and the disposable database, account, keys, and source copy were removed. [Cleanup receipt](mobile-cleanup.json)

[Original verification](README.md) records the earlier reproduction and guarded save at the prior PR head.
