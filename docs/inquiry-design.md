# Inquiry

Staff can prepare several quotations while a client decides what to book. If a client is choosing between March and April, both quotations belong to one Inquiry. Accepting March closes April and ends that Inquiry. A separate trip gets its own Inquiry once the current one closes.

## Creating and comparing quotations

- A client can have at most one open Inquiry at a time, shared across staff.
- Staff use **New Quotation**. Saving the first quotation opens an Inquiry. Subsequent new quotations for that client join the open Inquiry, which the form identifies before save.
- The client's page groups the quotations in each Inquiry so staff can compare package, travel date, and total price.
- A price correction saves a revision of the existing quotation. The comparison shows the current version as one option, and the earlier versions remain in that quotation's history.
- To correct a quotation saved for the wrong client, staff close it and create a new one for the right client. The new quotation follows that client's Inquiry workflow.
- New quotations enter this workflow from launch. Staff can continue to find earlier quotations in their existing lists.

## Accepting and closing

- Staff accept the current saved quotation after confirming that its terms match what the client agreed to. If the client agreed to an earlier price, staff can save that price as the current quotation before accepting it.
- Acceptance records the exact saved revision, closes the Inquiry, and closes every other active quotation in it. The accepted quotation becomes read-only. The closed alternatives stay visible and read-only with the reason **Another quotation was accepted**.
- Staff can close one quotation while keeping the Inquiry open. If the client rules out April, March stays available for consideration.
- Staff can close an Inquiry without selecting a quotation. This closes its remaining active quotations. If the client returns later, staff start a new Inquiry and can refer to the earlier quotations.
- Staff can undo a mistaken acceptance while the client has no other open Inquiry. This reopens the Inquiry and restores the accepted option and the options closed by that acceptance. Options closed beforehand stay closed.

## Inactivity

An open Inquiry closes automatically after 14 days without activity. The timer starts when the Inquiry opens or reopens and restarts when staff add a quotation, save a quotation edit, or record a client follow-up. Staff can record a follow-up when the client is still deciding and the quotation terms stay the same. Automatic closure closes the Inquiry and all its remaining active quotations. The Inquiry history shows **Closed due to inactivity**.

The client's page shows the time remaining on the open Inquiry, such as **Closes in 3 days** when three days remain.

## Data integrity

Creating the first quotation and opening its Inquiry happen in one transaction. If two staff members try to open an Inquiry for the same client at the same time, only one Inquiry opens. If the destination changes while staff are preparing a new quotation, the form asks them to review it before saving. Acceptance and undo each commit the Inquiry and quotation changes together. If a newer revision appears before staff accept, they review the current terms again.

Automatic closure checks the latest activity in the same transaction that closes the Inquiry and its quotations. Activity recorded before the deadline keeps the Inquiry open even if an earlier closure was already scheduled.

The one-open rule uses the canonical client identity. If staff merge duplicate client records and both have open Inquiries, they need to resolve one Inquiry before the merge. The app records who accepted, closed, or undid an acceptance and when they did it.

## Release and verification

The Inquiry workflow uses the quotation revision release. The deployment must complete the family migration and enable revision saves before staff can create and manage Inquiries.

Run `FAMILY_BACKEND_BINARY=/path/to/convex-local-backend node scripts/check-inquiry-backend.mjs` to check simultaneous first saves, the exact 14-day deadline, follow-up renewal, and the scheduled closure on an isolated Convex backend.

See [domain terms](../GLOSSARY.md) and the [storage decision](adr/0009-attach-inquiries-to-quotation-families.md).
