# Issue 78 verification

T3 Preview ran the real editor against a disposable loopback Next.js and Convex fixture. The baseline was `cede772ab08f9b30e88b4d1648b2b9ff00432357`. The corrected editor was `611f6e9aca6e989ca9d818a22b7d411b5de1e4f3`. Both ran at `http://localhost:3678/quotations/edit/n57e211v1x5s4qbjby5pxh6nf58jndvz`.

| Scenario | Editor | Saved record |
| --- | --- | --- |
| HTTP 500 injected before forwarding | “We couldn’t confirm the refresh” leads the alert. Keyboard focus reaches the saved-record link first. | The new tab still lists room prices or availability under Details requiring verification. The snapshot token and saved values stayed the same. |
| Catalog price edited from RM 1,250 to RM 1,275 during review | Real Convex conflict returned HTTP 409. The editor explained that nothing was refreshed and offered the latest review. | Comparing before and after showed no write. Opening the latest review also made no write. |
| Reviewed confirmation after the conflict | Confirming the comparison at RM 1,275 displayed “Snapshot refreshed”. The unsaved PIC remained in the editor. | A separate saved view and reload showed the warning cleared, Quad still RM 1,200 × 4, and a total of RM 5,000. |
| Response body truncated after real HTTP 200 | Chromium reported `ERR_CONTENT_LENGTH_MISMATCH`. The same unconfirmed alert appeared. | The snapshot token changed. Opening the saved view with Enter and reloading showed the warning cleared and RM 5,000 total. The original tab retained unsaved PIC, branch, and notes. |

The HTTP 500 alert fit at 375 and 1,402 CSS px in both themes. Tab reached confirmation, then Enter caused the test request. The result put focus on the new-tab link. Tab and Shift+Tab moved between it and the secondary review action. The T3 browser accessibility tree exposed the alert, title, instructions, and separate link with its new-tab cue. The alert's DOM had `aria-atomic="true"`. macOS reported `AXIsProcessTrusted: false`, so no platform screen-reader speech or announcement event was observed.

An initial proxy probe closed the connection before sending headers. Chromium retried the request and received the genuine conflict from the replay after the first request committed. The final test truncated the body after headers so the editor received a read failure. The proxy log records both probes. Browser-level request replay and refresh idempotency are outside this presentation fix.

[Browser observations](browser-verification.json) · [Saved-value comparisons](persistence.json) · [Fixture proxy](fixture-proxy.mjs) · [Proxy events](fixture-proxy.log) · [Cleanup receipt](cleanup.json)

217 targeted tests passed. Next type generation, TypeScript, targeted ESLint, and diff checks exited zero. [Tests](tests.txt) · [Type generation](typegen.txt) · [TypeScript](typecheck.txt) · [ESLint](lint.txt) · [Diff check](diff.txt)

The editor tab closed. T3 marked the saved tabs as unclaimed and refused to close them. Next, Convex, and the fixture proxy stopped. All loopback ports refused connections. The disposable source directory, SQLite data, storage, credentials, and signing material were removed.
