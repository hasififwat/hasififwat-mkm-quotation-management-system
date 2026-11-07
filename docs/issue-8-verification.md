# Issue 8 verification

## Reproduction before the fix

On 2026-11-07, commit `e98314b847fd7813de30a068f8a23e0efa470d28`
failed the client-history entry check in a fresh browser run.
The local Next.js app ran at `http://127.0.0.1:3108` against
`https://glad-wombat-72.convex.cloud`.

1. Sign in with the existing verification account.
2. Open the quotation builder and create `QA-I8 20261107 0551 Client`
   through its existing client modal.
3. Reload Clients. Confirm this client has zero quotations.
4. Expand its row and click its actual **Create quotation** link.
5. Wait for the builder to hydrate.

Observed URL:
`/quotations/create?client_id=j5707vth5vxwmc41p3ar5hnk458hsn2t`.

Observed accessibility tree:

```text
combobox
  text: Select a client
```

The create page does not read search parameters. The builder receives
`initialData={null}` and initializes only PIC name and branch.
No quotation was saved during this failing entry check.

The disposable client ID is `j5707vth5vxwmc41p3ar5hnk458hsn2t`.
Cleanup and passing evidence will be recorded after verification.
