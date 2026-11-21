# Package save confirmation verification

Issue #75. Tested head `f5bb34b6720e632d22666e6938f28cd7548bf2b0` against migration base `56ef8742676065b6009bbc100a857b03239d84df` in T3 Preview at `http://localhost:3675/packages/create` and the edit URL returned by the save. The local services have been stopped.

The browser fixture contained 100 synthetic itinerary lines. Before the change, the save result appeared 2,379 CSS pixels above the viewport after Save Package. At the tested head, the status and both 32 px actions appeared without manual scrolling after confirmation. The four combinations of 320 px and 1280 px with both themes fit without horizontal overflow. The two actions stayed available after the builder's header Back, Basic Details, and return to Preview.

The primary link reopened the exact saved package after create and after an edit on the same URL. A separate view and reload showed the saved values. Back to Packages opened the list. Keyboard activation handed focus to the primary link, Tab moved to the secondary link, and the rings were visible in desktop dark and mobile light. The same mounted empty status node received the success message. T3's accessibility tree exposed the result as an atomic status. The verification did not use spoken screen-reader output.

A disposable request-body override triggered a real HTTP 400 and left Save available. An edit in a stale tab produced the conflict recovery. In another run, a fixture-only browser wrapper dropped the actual successful response after the Convex commit. The builder showed the unconfirmed warning and blocked retry. The downloaded draft had outcome `unknown`. The record was found in the Packages list and reopened after reload.

All 218 scoped tests passed. Changed-file ESLint, Next route type generation and TypeScript, the production build, and `git diff --check` passed. The mobile focus images came from the same head's local production build. Both tabs were closed, the owned processes were stopped, and disposable database, credentials, and signing keys were removed. Ports 3675, 14275, and 14276 refused connections afterward.

[Browser measurements](verification.json) · [Fixture cleanup](cleanup.json)
