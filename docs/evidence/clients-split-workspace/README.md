# Clients split workspace verification

## Expandable client rows

Tested `ab2e4e7b461c170c437508763382e20ee954e219` at `http://localhost:3556/clients` against the disposable Convex preview. Expanding **Inquiry History Demo** showed all four quotations from its open Inquiry. Expanding **Accepted Inquiry Demo** showed two quotations from its last closed Inquiry, including the accepted revision. The full history link opened the client page and showed all three Inquiries for **Inquiry History Demo**.

Chromium passed at 1440 and 390 px in dark mode and 320 px in light mode. The browser checks covered keyboard disclosure, the standalone quotation fallback, the empty state and its create link, search, Agent filtering, and pagination. The light and dark theme variables matched the previous build. TypeScript, scoped ESLint, and 41 focused tests passed. The browser sessions closed and the existing synthetic preview stayed running.

[Desktop open Inquiry](directory-open-desktop.png) · [Desktop last closed Inquiry](directory-closed-desktop.png) · [Mobile expanded row](directory-open-mobile.png) · [Empty row](directory-empty-desktop.png)

## Earlier split workspace

Tested `b208cf1f020490d1fde7fd3fe5cad834cd13c6dc` in Chromium at `http://localhost:3556/clients`. The preview used a disposable Convex database with 28 synthetic clients.

The desktop workspace showed eight current quotations at 1440 × 900. In a shorter viewport, the directory and quotation pane scrolled independently. Selecting a client with Enter kept the directory scroll position and reset the quotation pane. Paging exposed all 28 clients exactly once and reset the directory to the top of each new page.

Search by phone and the Agent filter found the expected clients. A client without quotations had a link to create one. Active Inquiry quotations displayed Edit, and closed or accepted options displayed Preview. The hold gesture copied the saved quotation details. **View client and history** opened the selected client's existing detail page.

The workspace also fit 390 px in dark mode and 320 px in light mode. The browser checks reported zero horizontal overflow or page errors. TypeScript, scoped ESLint, and all 39 focused tests passed.

[Before](before.png) · [Desktop](desktop.png) · [Mobile](mobile.png)

The test browser closed. The local preview and its sample data remain available for review.

## Empty quotation pane

Tested `e4ce6430261db243c7e4b40df4bfb3e2c0650f05` on the same local preview. Selecting a client with no current quotations showed the document icon, message, and outline action as a centered group. The action opened quotation creation with the selected client's ID. Selecting a client with quotations restored the list.

Checked dark mode at 1440 and 390 px and light mode at 320 px. The checks reported zero horizontal overflow or browser errors. TypeScript, scoped ESLint, and the quotation copy regression test passed.

[Desktop empty state](empty-desktop.png) · [Mobile empty state](empty-mobile.png)

## Inquiry groups in the selected client pane

Tested `3c7c29a7d0ecaf938e2faf853aca8e6ce5875117` at `http://localhost:3556/clients` against the disposable Convex preview. The selected client showed one row each for its open, closed, and accepted Inquiries. Expanding them revealed all four, one, and three quotations respectively. The accepted quotation linked to the exact revision, and the open quotation's acceptance dialog opened and was canceled.

Chromium passed at 1440 and 390 px in dark mode and 320 px in light mode. The checks also covered the standalone quotation list, the centered empty state, and the selected client's creation link. TypeScript, scoped ESLint, and 39 focused tests passed. The checks closed their browser sessions and left the synthetic preview running.

[Desktop Inquiry rows](inquiries-desktop.png) · [Expanded Inquiry on mobile](inquiries-mobile.png)
