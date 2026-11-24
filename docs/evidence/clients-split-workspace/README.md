# Clients split workspace verification

Tested `b208cf1f020490d1fde7fd3fe5cad834cd13c6dc` in Chromium at `http://localhost:3556/clients`. The preview used a disposable Convex database with 28 synthetic clients.

The desktop workspace showed eight current quotations at 1440 × 900. In a shorter viewport, the directory and quotation pane scrolled independently. Selecting a client with Enter kept the directory scroll position and reset the quotation pane. Paging exposed all 28 clients exactly once and reset the directory to the top of each new page.

Search by phone and the Agent filter found the expected clients. A client without quotations had a link to create one. Active Inquiry quotations displayed Edit, and closed or accepted options displayed Preview. The hold gesture copied the saved quotation details. **View client and history** opened the selected client's existing detail page.

The workspace also fit 390 px in dark mode and 320 px in light mode. The browser checks reported zero horizontal overflow or page errors. TypeScript, scoped ESLint, and all 39 focused tests passed.

[Before](before.png) · [Desktop](desktop.png) · [Mobile](mobile.png)

The test browser closed. The local preview and its sample data remain available for review.
