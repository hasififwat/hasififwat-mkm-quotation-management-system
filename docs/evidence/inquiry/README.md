# Inquiry verification

Tested `4927b13592003d752cf3657b6e10ad2c1b1246f6` at `http://localhost:3546` with an isolated Chromium browser and a disposable Convex backend. Staff and client records were synthetic.

## Browser

Staff used **New Quotation** to save March Comfort for RM2,400 and April Premium for RM3,050 to one Inquiry. The client page showed both sets of travel dates, both totals, and the inactivity countdown. Staff opened the March review dialog, confirmed the saved terms, and accepted it. After reload, March showed **Accepted** and April showed **Closed** with the reason **Another quotation was accepted**. April's saved review and direct edit URL confirmed that it was read-only. The client page fit a 390-pixel viewport without horizontal overflow. Package Usage counted the accepted and closed quotations in their respective categories.

[Comparison](comparison.png) · [Acceptance confirmation](accept-confirmation.png) · [After reload](accepted-after-reload.png) · [Direct edit](closed-read-only.png) · [Mobile](accepted-mobile.png)

## Backend

Two simultaneous first saves from separate staff sessions recorded one open Inquiry. The stale save could join after reviewing the new destination. A second run used different quotation reference years to exercise the open-Inquiry rule without sharing a reference counter.

The controlled clock kept the Inquiry open one millisecond before the 14-day limit and closed it at the limit. A follow-up on simulated day 13 started a fresh 14 days. The old deadline left the Inquiry open, and the new deadline closed it. The production scheduled mutation also closed a short-deadline fixture without a browser call.

[Authenticated backend results](backend.json) · [Independent reference race](standalone-backend.json)

App and Convex TypeScript checks passed. The quotation integrity checker ran 2,160 cases and detected all six guard-removal mutations. The full Node suite passed 729 of 742 tests. The same 13 recoverable-save tests failed on the base branch because its mock omits `react-dom.flushSync`.

Both local servers stopped, and the disposable SQLite database, synthetic accounts, and generated credentials were removed.
