# Issue 80 verification

T3 Preview ran the real Next.js app at `http://localhost:3682/quotations/create?client_id=k17a88ms8vfepdvv0bvdnxsnx98jmt8s`. The owned proxy forwarded to Next.js on port 3681. Convex used a fresh local SQLite database. Every account and record was synthetic.

Baseline was `ea0fdb66df28f08b6bc7fc5b3a1c070f3840e575`. The fixed head was `cc2b5943781d3400f274cb972efed56c45b92995`.

| Theme and viewport | Package conflict before | Package conflict after | Unconfirmed save before | Unconfirmed save after |
| --- | --- | --- | --- | --- |
| Light, 1280 × 850 | [PNG](before-conflict-light-wide.png) | [PNG](after-conflict-light-wide.png) | [PNG](before-unknown-light-wide.png) | [PNG](after-unknown-light-wide.png) |
| Dark, 1280 × 850 | [PNG](before-conflict-dark-wide.png) | [PNG](after-conflict-dark-wide.png) | [PNG](before-unknown-dark-wide.png) | [PNG](after-unknown-dark-wide.png) |
| Light, 375 × 812 | [PNG](before-conflict-light-narrow.png) | [PNG](after-conflict-light-narrow.png) | [PNG](before-unknown-light-narrow.png) | [PNG](after-unknown-light-narrow.png) |
| Dark, 375 × 812 | [PNG](before-conflict-dark-narrow.png) | [PNG](after-conflict-dark-narrow.png) | [PNG](before-unknown-dark-narrow.png) | [PNG](after-unknown-dark-narrow.png) |

- A room price change in the disposable catalog triggered a real HTTP 409. Tab reached the [review button](focus-conflict-dark-narrow.png). While Convex was paused briefly, Enter exposed the [disabled loading state](loading-conflict-dark-narrow.png). The resumed query opened Package Selection. The entered fields and saved rows matched, and the server saw only the initial create POST.
- The proxy truncated the response body after the next intentional Save committed with HTTP 200. Tab reached the [new-tab link on wide dark](focus-unknown-dark-wide.png) and [narrow light](focus-unknown-light-narrow.png). Chromium exposed the accessible name “Check Quotations in a new tab.” Enter opened [Travel Quotations in a second tab](second-tab-quotations.png), where 1448H-0003 appeared at RM 4,041.00. Its [reopened fields survived reload](second-tab-saved-reload.png). The editor URL, draft, saved rows and save request trace matched across link activation. The 200 and truncated-body diagnostics in the browser describe one request.
- A subsequent explicit Save returned the same record and left the saved rows byte-for-byte identical. [Runtime observations](proof.json)
- The 95 focused tests passed. Next route type generation, TypeScript, ESLint on QuotationBuilder, and the diff check passed. A pre-typegen TypeScript run saw identical Next image-type diagnostics at base and head. Route type generation resolved them.
- The baseline also emitted a React uncontrolled-input diagnostic when adding fixture line items. Native screen-reader speech was outside this Chromium run.
- The editor tab closed and the database, credentials, snapshot, and processes were removed. T3 kept the browser-opened tab unclaimed and rejected automatic close. [Cleanup](cleanup.json)
