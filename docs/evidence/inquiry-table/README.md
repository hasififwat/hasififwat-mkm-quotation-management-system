# Inquiry table verification

Tested the layout at commit `792cf39e624ff41674fb573e3b65ae0990424095` in Chromium at `http://localhost:3556` with an isolated Next.js server and a disposable Convex backend. All clients, quotations, and staff accounts were synthetic.

## Comparison layout

The measurement covers the full Inquiries section, including its heading and actions. Each result is the median of five page loads with the same quotations. The five heights agreed for every tested design and fixture.

| Scenario | Cards | Table | Height reduction |
| --- | ---: | ---: | ---: |
| Six open options at 1440 px | 830 px | 550 px | 34% |
| Six open options at 390 px | 1,498 px | 890 px | 41% |
| Two options after acceptance at 1440 px | 386 px | 362 px | 6% |
| Two options after acceptance at 390 px | 582 px | 482 px | 17% |

The full-width table needed horizontal scrolling on mobile. The first responsive version kept all fields visible but wrapped amounts and status badges. The final table puts the dates under the quotation reference and package on narrower screens. It passed overflow and badge clipping checks at seven viewport widths from 320 px to 1440 px.

[Before](before-desktop-open.png) · [Desktop comparison](desktop-open.png) · [Desktop outcome](desktop-accepted.png) · [Mobile outcome](mobile-accepted.png) · [Measurement samples](measurements.json)

## Acceptance

At 390 px, the keyboard opened the March quotation's row menu and selected **Review to accept**. The confirmation showed the saved package, flight dates, and total. The accept button stayed disabled until the staff member confirmed the saved terms. After acceptance and reload, March showed **Accepted** and all five alternatives showed **Closed**. The saved revision page confirmed that March was accepted and read-only.

[Mobile confirmation](mobile-confirmation.png) · [Outcome after reload](desktop-after-reload.png)

All 24 focused Inquiry and quotation UI tests passed. TypeScript and ESLint also passed. The local servers stopped and the disposable database and generated credentials were removed. The previous [backend verification](../inquiry/README.md) covers concurrent saves and inactivity expiry.
