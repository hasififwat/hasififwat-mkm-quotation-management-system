# Issue 73 browser evidence

The tested commit is `8c12349a2775a9b489f63b4f5dbfaecf0f4f2387`. The baseline is `9aba264c5781a41a0e230f728a3fa56aa5a621e8`. T3 Preview used `http://localhost:3673` with a disposable Convex backend.

## Actual create and edit routes

- [Before](before-mobile.png) and [after](after-mobile.png) show the first edit step in dark mode at 320 px. In the baseline, Enter on the focused Cancel link moved to Package Selection. At the tested commit, it opened the saved quote.
- [Desktop light](after-desktop.png) shows the hierarchy at 1280 px. [Keyboard focus](focused-previous.png), [validation](validation-create.png), and [saving](busy-create.png) show other footer states.
- [Browser measurements](browser-proof.json) cover all three steps in create and edit at 320 and 1280 px in both themes. The browser checked visible controls, touch-width containment, shared button sizing, Tab order and focus, disabled controls while saving, and both Cancel destinations.
- Create reached review as 1448H-0002. Edit saved first-step changes and returned to review for 1448H-0001. Both reviews reloaded, and reopening the editors showed the saved notes.

## Revision footer

[Save new revision at 320 px](save-new-revision.png) used disposable copies of the two page entry points that only pass the display flag to the real builder. The release gate stayed off. [Browser measurements](revision-view-proof.json) cover the same 24 layout combinations and include a guarded create attempt. The browser observed the disabled saving state and a 422 rejection, then returned to the editable footer. Before and after dumps matched exactly at two quotation rows and zero revision receipts. Focused tests exercised revision append and recovery behavior.

## Checks and cleanup

The 77 tests in `quotation-save`, `quotation-create-retry`, `quotation-revision-ui`, `quotation-revision-saves`, `recoverable-save`, and `revision-http-boundary` passed. Scoped ESLint, Next.js type generation followed by type checking, the production build, and the Git diff check passed.

The preview tab and owned listeners on ports 3673, 3674, 13873, and 13874 closed. Cleanup removed both quotations, the SQLite database, the source snapshot, the synthetic account, and generated signing keys. [Cleanup receipt](cleanup.json)
