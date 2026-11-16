# Current family consumers

Staff need one current quotation per family in operational screens. Saved revisions keep their own identities and values.

The shared reader selects explicit current pointers before filtering, sorting, counting, and pagination. Family archive state owns visibility. Legacy ungrouped rows retain their row archive behavior. Broken pointers never promote an older revision.

Two independent design helpers compared a derived current collection with a materialized operational document. The derived collection won because existing queries already collect rows. Materializing labels and totals would require changes to save and client merge writers owned by other tickets. Collection reads remain a scaling limit, as they were before this change.

`quotations.listPaginated` accepts `searchTerm`, `package_id`, canonical `client_id`, and `visibility` of `current`, `archived`, or `history`. History contains revisions excluded from current operational results, including archived families. Package statistics link to that separate history filter. Cursor values contain the sort value and exact ID. Saved labels and base or full references drive search. Saved client IDs remain available as `saved_client_id`; `client_id` resolves canonical navigation.

`quotationFamilies.history({family_id})` returns `{family, revisions}`. Revisions are ordered by ascending revision number. Exact review IDs remain usable under authentication. Ticket #59 owns the complete history route and editing experience.

`quotationFamilies.archive({family_id})` authenticates and requires the existing revision release. It patches family visibility and inserts one `family_archived` event against the current revision. Repeated requests preserve the pointer and add no event. It never patches quotation or item content. The release remains disabled in repository configuration.

Client reads resolve transitive aliases before grouping and pagination. Current counts and `total_quoted_value` exclude archived families and old revisions. Client detail exposes `historical_quotations` separately with exact IDs and saved names. Package operational counts use the same current set. Existing reference guards still inspect retained data.

Model the Domain shaped the shared current reader. Prove It Works requires actual registered handlers, disposable Convex transactions, and authenticated UI evidence. The external issue-table file and deslop plugin were absent, so review uses the supplied columns and direct diff cleanup.
