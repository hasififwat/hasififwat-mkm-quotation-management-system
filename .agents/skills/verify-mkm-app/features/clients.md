# Clients

Agents search clients and expand quotation history. A new client can be created
inside the quotation builder; the list also exposes a standalone creation path.

## Sub-features

- `client-search`: name/phone search filters the list.
- `client-history`: expanding a client shows their quotations.
- `client-create-list`: the `New Client` entry should open a usable creation form.
- `client-create-builder`: the quotation builder saves a new client through a modal.

## How to get to it (user POV)

- Choose `Clients` in the sidebar or open `/clients`.
- Choose `New Client` (`/clients/create`) from the list.
- Open `/quotations/create`, then `Create New Client` beside `Client Name`.
- A client with no quotations exposes `Create quotation` after expanding its row.

## Driving it with T3 preview

Preconditions: verification agent plus a disposable client fixture with a known
name/phone. History checks require a quotation linked to that client.

- **Search.** At `/clients`, require `Clients`; type the known name or phone into
  `Search by name or phone number...`. Require the `q` URL parameter and matching
  row. Clear it and require the unfiltered fixture again.
- **History.** Scope to the fixture's row and click its `Expand` button. Require
  its known quotation number and amount. Click `Collapse` and require the details
  to disappear. Record a missing quotation fixture as an unmet precondition.
- **List creation.** Click `New Client`. Require a usable client form at
  `/clients/create` with `Name`, `Phone`, `Create Client`, and `Cancel`.
  Submit blank fields and require native validation with no creation request.
  Fill a unique synthetic name and phone. Click `Create Client`, require the
  Clients list, search for the fixture, and reload to prove persistence.
  For a failed save, require a visible alert and preserved inputs before retry.
- **Builder creation.** At `/quotations/create`, click `Create New Client`.
  In the `Create New Client` dialog, fill `#name` (`Client Name`) and
  `#phone_number` (`Phone Number`); click `Create Client`. Use a unique synthetic
  fixture name. Reopen `/clients`, search for it, and reload to prove persistence.
  If a duplicate warning appears, capture it; `Create Anyway` is a separate
  intentional duplicate journey, not the default way to pass creation.

## Gotchas

- Verify the standalone route and the builder modal separately. They share the
  creation form, but each has its own completion behavior.
- The builder's new-client POST uses `/api/clients/create`. A modal closing is
  insufficient evidence of the record being saved.
- Creation requires disposable backend data and an agreed fixture cleanup path;
  the normal client UI has no demonstrated deletion control in this seed map.
