# Issue 72 browser verification

Baseline `225d907383dae24990257c7b19011823323c9545`. Checked head `0e448aa972e8ed3989833bcc00106e93f1efebdc` against `migration/nextjs-upgrade`.

T3 Preview used `http://localhost:3672/quotations/create` and `http://localhost:3672/clients/create` with Next.js 16.3.4 and a dedicated Convex SQLite backend. The fixture used synthetic records, an isolated password account, and generated signing keys.

| Check | Observed result |
| --- | --- |
| Baseline | Enter in Name sent a second create request. The new client appeared in the quotation picker, and the count for the phone rose from one to two. At 375 px, the form expanded to 1162 px inside a 343 px dialog. |
| Reuse | Enter in Name and Phone kept the warning open and sent zero create requests. Tab reached **Use existing client** first. Enter selected the original client. The client count stayed at one in Convex and in the Clients list after reload. |
| Override | Tab reached **Create Anyway** next. Space sent one create request and selected the new client. Both matching records appeared in the Clients list after reload. |
| Mobile and themes | At 320 and 375 px in both themes, the warning displayed the complete long name once, including the unbroken portion. Both actions fit and the keyboard focus ring appeared on each action. |
| Standalone | Blank fields blocked submission. Enter saved a unique client and returned to Clients. Reuse returned to Clients with one matching record. Explicit override added a second record that persisted after reload. |

## Screenshots

- [Baseline warning at 375 px, light](before-mobile-light.png) and [unintended selection after Enter](before-enter-result.png).
- [Fixed warning at 375 px, light](after-mobile-light.png) and [320 px, dark](after-mobile-dark.png).
- [Existing client selected](existing-selected.png), [explicit override selected](override-selected.png), and [matching rows after reload](override-list-reloaded.png).
- [Standalone save after reload](standalone-list-reloaded.png).

The existing quotation picker and Clients list clip very long unbroken names. The warning and its actions are the layout scope of this PR.

## Checks and cleanup

- [Regression test before the fix](focused-before.txt) and [five passing focused tests](focused-after.txt). The regression commit is `e88962727e44e049b810313c02369118133bd28f`.
- [716 passing tests](full-suite.txt) from `node --test scripts/*.test.mjs`. Scoped ESLint, [production build](build.txt), [typecheck](typecheck.txt), and `git diff --check` passed.
- The preview tab and both owned services stopped. The source snapshot, database, records, account, tokens, signing keys, and storage were removed. [Cleanup proof](cleanup-proof.json).
