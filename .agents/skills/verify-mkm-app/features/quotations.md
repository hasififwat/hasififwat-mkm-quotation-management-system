# Quotations

Agents search quotations, select a client/package/flight/room in the builder,
save a quotation, and review the saved result.

## Sub-features

- `quotation-search`: client/package text filters the list.
- `quotation-builder-entry`: both list and client-history entries open the builder.
- `quotation-save-review`: saved fields and amounts survive reopening and reload.

## How to get to it (user POV)

- Choose `Quotations` or open `/quotations` for `Travel Quotations`.
- Use `Create Quotation` to open `/quotations/create`.
- Expand a client with no quotations at `/clients` and choose `Create quotation`
  (`/quotations/create?client_id=...` using the actual fixture ID from the link).
- Existing records have `/quotations/edit/...` and `/quotations/review/...` routes;
  open the record's actual UI link rather than inventing an ID.

## Driving it with T3 preview

Preconditions: signed-in verification agent and disposable client, package,
flight belonging to that package, and enabled room fixtures. The package's year
must be supported by the backend's Gregorian-to-Hijri mapping.

- **Search.** At `/quotations`, require `Travel Quotations`. Fill the input with
  placeholder `Search by client or package name...`; require the `q` parameter
  and expected quotation after debounce, then clear it and check restoration.
- **List entry.** Click `Create Quotation`; require `/quotations/create` with
  `PIC Name`, `Branch`, `Client Name`, and `Package` fields.
- **Client entry.** Use the actual `Create quotation` link in the client row;
  require the builder and inspect its selected client. The route currently does
  not consume `client_id`; report a missing preselection if observed instead of
  selecting the client manually and declaring this entry point passed.
- **Save.** Fill `#pic_name` and `#branch`, choose the fixture using
  `Select a client` and `Select a package`, then use `Flight Selection`. Choose
  the fixture's room and its `pax-...` control from the current snapshot, set a
  positive count, record displayed prices and total, and click `Save`. Require a
  successful result, then reopen the saved quotation from `/quotations`.
- **Review.** Follow that record's review link, require its quotation number,
  client, flight dates, room count, and total. Reload and check the same values.
  If testing PDF download, capture the downloaded file and inspect its contents
  separately; the on-screen review alone does not prove the exported document.

## Gotchas

- Do not use test-only endpoints or internal state setters to manufacture a
  successful save. Creating the quote must go through the actual builder.
- Room availability and flight association depend on the selected package.
  Missing data is a failed precondition, not permission to weaken the journey.
- A client-history entry and list entry are separate paths. Initial creation
  source currently ignores the client query parameter; inspect this on changes.
- Authentication enforcement in the backend is a separate property covered by
  `$verify-quotation-integrity`; a successful UI guard is not that proof.
