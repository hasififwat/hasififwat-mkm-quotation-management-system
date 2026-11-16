# Issue 29 decisions

Required base is fae2c23d738bce0cbadd2882634aab7f9b6f36e1 on migration/nextjs-upgrade. Main lacks required repairs.

Saved room selections own quoted price and pax. Current package options own availability. Render both without changing saved selections.

The correction stays inside HotelSelection. Saved snapshot refresh, new-draft conflict recovery, backend writes, add-ons, discounts, and totals are unchanged.

Disabled rooms remain selected by default. Staff can explicitly remove them, then select an available replacement. Removed disabled options disappear. The package editor prevents deleting referenced room types. The existing backend rejection of a physically missing room type remains outside this ticket.

The authenticated baseline used the real builder and private package update handler. Disabled Quad RM1200 x2 was invisible in the editor. Selecting Double RM1800 x1 and saving produced RM4200 in the quotation list.

The private backend uses DATABASE_UDF_USER_TIMEOUT_SECONDS=30 and DATABASE_UDF_SYSTEM_TIMEOUT_SECONDS=60 due host load and password hash timeout. Health timeout is 10 seconds. The ticket-private helper allows a longer web compilation deadline. No application auth code changed.

Port3310 belonged to another worktree. Only this instance moved to3319. Dedicated hostname q005-rooms.localhost isolates auth cookies. No shared backend or other worktree was modified.

Missing deslop/control-ui plugins did not run. Available actual browser tools, regression tests, lint, and independent source review substitute within their actual scope.
