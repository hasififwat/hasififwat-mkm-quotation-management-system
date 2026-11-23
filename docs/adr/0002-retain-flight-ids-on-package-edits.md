# Retain flight identifiers on package edits

Quotations store the flight record identifier. Package edits update existing flights in place so quotations keep their association even when a flight’s details change. The package editor inserts new flight records and checks quotation references before deleting omitted flights.

[Package mutation](../../convex/packages.ts) · [Reference protection tests](../../scripts/package-references.test.mjs)
