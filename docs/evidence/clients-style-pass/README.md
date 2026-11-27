# Clients list styling verification

Verified `834afd4d3a467bd956b42d4fe34c5d3cf4c0da4e` at `http://localhost:3556/clients`. The desktop captures use the same dark theme, 1536 × 1024 CSS viewport, and expanded **Inquiry History Demo** row. Packages and Quotations provided the toolbar, action, and list layout reference patterns. The Staff UI style guide supplied the shared component and theme choices.

| Pass | Visible result at 1536 × 1024 |
| --- | --- |
| Baseline | 1,200 px list, a separate toolbar card, 53 px client rows, and 65 px quotation rows. The Next button ended at y=1268.5 px. |
| Header and width | The title and 1,000 px card share the centered `ListPageLayout`. The page has one **Create Client** action. |
| Card | One card contains the Agent filter, search, table, and pager. The filter and search both measure 36 px high. |
| Client rows | 37 px rows and revised desktop column proportions bring the 10 client rows closer together. |
| Inquiry inset | 49 px quotation rows show all four options and their Preview and Edit links. The Next button ends at y=958.5 px, 310 px higher than the baseline. |
| Narrow columns | At 390 px the Name column grows from 68 px in the baseline to 260 px. The expanded client's name and dates stay readable. Desktop geometry stays the same. |

The browser checks covered phone search, filtered empty results, Agent filtering and clearing, both paging directions, Enter and Space, the open and latest closed Inquiry, all three history entries, and navigation to the correct saved revision and edit form. Light and dark mode render the same geometry. The table fit at 320, 390, 640, 768, 1024, and 1536 px. TypeScript, scoped ESLint, and 41 focused tests passed.

The screenshots use existing disposable fixtures. The test wrote no application records. The browser tab closed and the local preview stays available.

[Before, dark](before-dark.png) · [After, dark](after-dark.png) · [After, light](after-light.png) · [After, narrow](after-narrow.png) · [Filtered empty state](filtered-empty.png)
