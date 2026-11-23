# Interpret the source spreadsheets before comparing packages and flights

The Master Flight File comparison derives date-to-season mappings from the price-list mapping output so both inputs use the same season boundaries. The legacy comparison reads the airline code carried down from previous spreadsheet rows and can override it from the actual flight number. Bare four-digit numbers, sometimes followed by a letter, identify Malaysia Airlines charters in that input. Year-only `2026/2027` legacy packages remain outside schedule removals in the browser sync flow.

Matched Master Price List packages retain the database hotel, meal, and transport values. New packages use spreadsheet values. In the source layout, hotel columns 20–21 list Aziziah then Taif, while nights columns 16–17 and meals columns 24–25 use the reverse order. Matched mapping rows can represent meals as full names separated by `+`, alongside the shorthand used by the source spreadsheet. Leisure packages use a different price structure and are skipped.

[Legacy MFF comparison](../../scripts/compare-mff-flights.js) · [Price-list extraction](../../scripts/extract-price-list.js) · [Browser sync parsers](../../src/features/packages/sync/parsers.ts)
