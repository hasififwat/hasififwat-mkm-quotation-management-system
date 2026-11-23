# Legacy quotation Save verification

The local Next.js app ran at `http://127.0.0.1:3603` with an owned SQLite Convex backend on ports 14043 and 14044. Baseline captures used `48d6c728a994b7434d60043ac5dd3bbd1fa5f2b9`. The fixed captures used source files verified byte-for-byte against `ab9b33f0dc852c3739b9780ac36ae3577f4bf02e`. Chrome used a synthetic staff session with two draft tabs. A fixture script changed the replacement flight via the real catalogue mutation.

| Case | Baseline | Fixed |
| --- | --- | --- |
| Two drafts on one quotation | Both saves returned HTTP 200. The second save cleared the note and changed the total to RM2,400. [Reopened baseline](01-before-note-overwritten.png). | The first save returned HTTP 200. The stale tab returned HTTP 409 and kept its quantity of two. Opening the latest quotation in a second view and reloading showed the saved note and RM1,200 total. [Conflict](04-after-stale-draft-conflict.png), [reopened note](05-after-note-persisted.png). |
| Replacement flight changed after selection | The editor showed January 1. Save returned HTTP 200 and review showed January 3 with RM2,400. [Editor](02-before-flight-in-editor.png), [saved PDF preview](03-before-flight-saved.png). | Save returned HTTP 409. A fresh read still showed January 10 and RM1,200. **Review latest package** displayed January 3 and preserved the quantity of two. Saving again returned HTTP 200. The saved review showed January 3 and RM2,400 after reload. [Conflict](06-after-replacement-conflict.png), [new date](07-after-reviewed-flight.png), [saved review](08-after-reviewed-flight-persisted.png). |

The browser used RM1,200 per person and increased quantity to two. The actual-handler regression also verifies the ticket's custom RM1,350 price and RM2,700 total. Both actual-handler tests failed before the fix because the stale saves succeeded.

Both the edit and full-details queries supplied fresh read-back. [Before](before-browser-readback.json), [after rejection](rejected-browser-readback.json), [after reviewed retry](accepted-browser-readback.json).

The browser and web process were stopped. The fixture cleanup removed the disposable backend, its database, storage, generated credentials, and source copy. All three local ports were closed.
