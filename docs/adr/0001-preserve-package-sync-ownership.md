# Preserve manual package edits during CSV sync

A package can start as `manual` and be promoted to `sync` when it matches the CSV. When a staff edit changes sync-managed transport, hotels, meals, or rooms, the editor compares against the saved package before replacing its child rows and changes the source from `sync` to `unsync`. Later imports skip package overwrites and promotion for `unsync` packages so they preserve those staff edits. Inclusions and exclusions belong to the manual editor, so editing them alone preserves the current source.

PLATINUM packages are outside the price-list sync workflow because they follow a separate package process. When a schedule row matches a manual flight, sync can adopt the flight by changing its source without rewriting its itinerary.

[Package edit and promotion](../../convex/packages.ts) · [CSV plan](../../src/features/packages/sync/parsers.ts) · [Package sync tests](../../scripts/sync-room-prices.test.mjs)
