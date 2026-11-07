# Route and operation coverage

This reference accounts for the App Router pages and POST handlers, registered Convex functions, and deliberate exclusions at the [recorded snapshot](README.md#snapshot). The machine-readable mapping is [coverage.json](coverage.json). All routes are code-traced. See the feature documents for inputs, permissions, effects, failures, and investigation entry points.

## Application routes

Page URLs omit the `(protected)` route group because it is not a URL segment. Page authentication is described in [AUTH-002](authentication.md#auth-002) and [APP-03](infrastructure.md#app-03). The proxy explicitly guards package APIs. Other API routes rely on their own handler behavior.

| Route | Kind | Source | Feature reference |
| --- | --- | --- | --- |
| `/clients/[cid]` | page | [Implementation](../../src/app/%28protected%29/clients/[cid]/page.tsx) | [CLIENT-003](clients.md#client-003) |
| `/clients/create` | page | [Implementation](../../src/app/%28protected%29/clients/create/page.tsx) | [CLIENT-005](clients.md#client-005) |
| `/clients` | page | [Implementation](../../src/app/%28protected%29/clients/page.tsx) | [CLIENT-001](clients.md#client-001) |
| `/dashboard` | page | [Implementation](../../src/app/%28protected%29/dashboard/page.tsx) | [DASH-001](dashboard.md#dash-001) |
| `/flights/audit` | page | [Implementation](../../src/app/%28protected%29/flights/audit/page.tsx) | [FLIGHT-001](flights.md#flight-001) |
| `/flights` | page | [Implementation](../../src/app/%28protected%29/flights/page.tsx) | [FLIGHT-005](flights.md#flight-005) |
| `/packages/create-from-schedule` | page | [Implementation](../../src/app/%28protected%29/packages/create-from-schedule/page.tsx) | [PKG-005](packages.md#pkg-005), [FLIGHT-003](flights.md#flight-003) |
| `/packages/create` | page | [Implementation](../../src/app/%28protected%29/packages/create/page.tsx) | [PKG-002](packages.md#pkg-002), [FLIGHT-002](flights.md#flight-002) |
| `/packages/edit/[pid]` | page | [Implementation](../../src/app/%28protected%29/packages/edit/[pid]/page.tsx) | [PKG-002](packages.md#pkg-002), [FLIGHT-002](flights.md#flight-002) |
| `/packages` | page | [Implementation](../../src/app/%28protected%29/packages/page.tsx) | [PKG-001](packages.md#pkg-001) |
| `/packages/stats` | page | [Implementation](../../src/app/%28protected%29/packages/stats/page.tsx) | [PKG-004](packages.md#pkg-004) |
| `/packages/sync` | page | [Implementation](../../src/app/%28protected%29/packages/sync/page.tsx) | [PKG-006](packages.md#pkg-006), [FLIGHT-004](flights.md#flight-004) |
| `/quotations/create` | page | [Implementation](../../src/app/%28protected%29/quotations/create/page.tsx) | [QUOTE-003](quotations.md#quote-003) |
| `/quotations/duplicates` | page | [Implementation](../../src/app/%28protected%29/quotations/duplicates/page.tsx) | [QUOTE-007](quotations.md#quote-007) |
| `/quotations/edit/[qid]` | page | [Implementation](../../src/app/%28protected%29/quotations/edit/[qid]/page.tsx) | [QUOTE-004](quotations.md#quote-004), [QUOTE-005](quotations.md#quote-005) |
| `/quotations` | page | [Implementation](../../src/app/%28protected%29/quotations/page.tsx) | [QUOTE-001](quotations.md#quote-001), [QUOTE-002](quotations.md#quote-002) |
| `/quotations/review/[qid]` | page | [Implementation](../../src/app/%28protected%29/quotations/review/[qid]/page.tsx) | [QUOTE-006](quotations.md#quote-006), [QUOTE-005](quotations.md#quote-005) |
| `/api/clients/create` | POST | [Implementation](../../src/app/api/clients/create/route.ts) | [CLIENT-004](clients.md#client-004) |
| `/api/packages/create-with-flight` | POST | [Implementation](../../src/app/api/packages/create-with-flight/route.ts) | [PKG-005](packages.md#pkg-005) |
| `/api/packages/create` | POST | [Implementation](../../src/app/api/packages/create/route.ts) | [PKG-002](packages.md#pkg-002) |
| `/api/packages/update` | POST | [Implementation](../../src/app/api/packages/update/route.ts) | [PKG-002](packages.md#pkg-002) |
| `/api/quotations/create` | POST | [Implementation](../../src/app/api/quotations/create/route.ts) | [QUOTE-003](quotations.md#quote-003) |
| `/api/quotations/update` | POST | [Implementation](../../src/app/api/quotations/update/route.ts) | [QUOTE-004](quotations.md#quote-004), [QUOTE-005](quotations.md#quote-005) |
| `/logout` | page | [Implementation](../../src/app/logout/page.tsx) | [AUTH-006](authentication.md#auth-006) |
| `/` | page | [Implementation](../../src/app/page.tsx) | [AUTH-001](authentication.md#auth-001) |
| `/sign-up` | page | [Implementation](../../src/app/sign-up/page.tsx) | [AUTH-003](authentication.md#auth-003) |

## Registered Convex operations

Public means a client-callable registration. It does not mean that an operation permits anonymous use. Check the feature description for the actual identity check. `auth:store` is internal. No application inquiry operation is registered.

| Operation | Registration | Visibility | Source | Feature reference |
| --- | --- | --- | --- | --- |
| `auth:isAuthenticated` | `query` | public | [Implementation](../../convex/auth.ts) | [AUTH-002](authentication.md#auth-002) |
| `auth:signIn` | `action` | public | [Implementation](../../convex/auth.ts) | [AUTH-001](authentication.md#auth-001), [AUTH-007](authentication.md#auth-007) |
| `auth:signOut` | `action` | public | [Implementation](../../convex/auth.ts) | [AUTH-006](authentication.md#auth-006) |
| `auth:store` | `internalMutation` | internal | [Implementation](../../convex/auth.ts) | [AUTH-007](authentication.md#auth-007) |
| `clients:create` | `mutation` | public | [Implementation](../../convex/clients.ts) | [CLIENT-004](clients.md#client-004) |
| `clients:findDuplicateClients` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-006](clients.md#client-006) |
| `clients:getAgentNames` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-001](clients.md#client-001) |
| `clients:getWithQuotations` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-003](clients.md#client-003) |
| `clients:list` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-004](clients.md#client-004) |
| `clients:listWithStats` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-001](clients.md#client-001), [CLIENT-002](clients.md#client-002) |
| `clients:listWithStatsPaginated` | `query` | public | [Implementation](../../convex/clients.ts) | [CLIENT-001](clients.md#client-001), [CLIENT-002](clients.md#client-002) |
| `clients:mergeClients` | `mutation` | public | [Implementation](../../convex/clients.ts) | [CLIENT-006](clients.md#client-006) |
| `packageFlights:addFlight` | `mutation` | public | [Implementation](../../convex/packageFlights.ts) | [FLIGHT-004](flights.md#flight-004), [FLIGHT-006](flights.md#flight-006) |
| `packageFlights:deleteFlight` | `mutation` | public | [Implementation](../../convex/packageFlights.ts) | [FLIGHT-004](flights.md#flight-004), [FLIGHT-006](flights.md#flight-006) |
| `packageFlights:listAll` | `query` | public | [Implementation](../../convex/packageFlights.ts) | [FLIGHT-001](flights.md#flight-001), [FLIGHT-004](flights.md#flight-004), [FLIGHT-006](flights.md#flight-006) |
| `packageFlights:promoteToSync` | `mutation` | public | [Implementation](../../convex/packageFlights.ts) | [FLIGHT-004](flights.md#flight-004), [FLIGHT-006](flights.md#flight-006) |
| `packageFlights:setSourceManual` | `mutation` | public | [Implementation](../../convex/packageFlights.ts) | [FLIGHT-006](flights.md#flight-006) |
| `packages:archivePackage` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-003](packages.md#pkg-003) |
| `packages:backfillMissingHotelsFromTemplates` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:checkExistingPackagesForYear` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-005](packages.md#pkg-005) |
| `packages:createPackage` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-002](packages.md#pkg-002) |
| `packages:createPackageWithFlight` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-005](packages.md#pkg-005) |
| `packages:getById` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-002](packages.md#pkg-002) |
| `packages:getPackageTemplate` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-002](packages.md#pkg-002), [PKG-005](packages.md#pkg-005) |
| `packages:list` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:listWithHotelsAndMeals` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-006](packages.md#pkg-006) |
| `packages:listWithQuotationCounts` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-004](packages.md#pkg-004) |
| `packages:listWithRoomPricesOnly` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:listWithRooms` | `query` | public | [Implementation](../../convex/packages.ts) | [PKG-001](packages.md#pkg-001), [PKG-002](packages.md#pkg-002) |
| `packages:patchRoomPrices` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:patchSeason` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:promotePackageToSync` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-006](packages.md#pkg-006) |
| `packages:reconcilePackageHotelsFromTemplates` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:setPackagesSourceManual` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-007](packages.md#pkg-007) |
| `packages:syncPackageFromCsv` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-006](packages.md#pkg-006) |
| `packages:updatePackage` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-002](packages.md#pkg-002) |
| `packages:updatePackageStatus` | `mutation` | public | [Implementation](../../convex/packages.ts) | [PKG-003](packages.md#pkg-003) |
| `profiles:createProfileForEmail` | `mutation` | public | [Implementation](../../convex/profiles.ts) | [AUTH-005](authentication.md#auth-005) |
| `profiles:createUserAccount` | `mutation` | public | [Implementation](../../convex/profiles.ts) | [AUTH-003](authentication.md#auth-003) |
| `profiles:getMyProfile` | `query` | public | [Implementation](../../convex/profiles.ts) | [AUTH-004](authentication.md#auth-004) |
| `profiles:migrateQuotationCreators` | `mutation` | public | [Implementation](../../convex/profiles.ts) | [AUTH-005](authentication.md#auth-005) |
| `profiles:removeLegacySupabaseIds` | `mutation` | public | [Implementation](../../convex/profiles.ts) | [AUTH-005](authentication.md#auth-005) |
| `profiles:setProfileEmail` | `mutation` | public | [Implementation](../../convex/profiles.ts) | [AUTH-005](authentication.md#auth-005) |
| `quotations:archiveQuotation` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-002](quotations.md#quote-002) |
| `quotations:count` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-008](quotations.md#quote-008) |
| `quotations:create` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-003](quotations.md#quote-003) |
| `quotations:deleteById` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-007](quotations.md#quote-007) |
| `quotations:findDuplicates` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-007](quotations.md#quote-007) |
| `quotations:getItemsByQuotationId` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-002](quotations.md#quote-002) |
| `quotations:getQuotationForEdit` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-004](quotations.md#quote-004), [QUOTE-005](quotations.md#quote-005) |
| `quotations:getQuotationFullDetails` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-006](quotations.md#quote-006), [QUOTE-005](quotations.md#quote-005) |
| `quotations:list` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-001](quotations.md#quote-001) |
| `quotations:listPaginated` | `query` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-001](quotations.md#quote-001) |
| `quotations:refreshSnapshot` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-005](quotations.md#quote-005) |
| `quotations:repairStaleFlightIds` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-008](quotations.md#quote-008) |
| `quotations:resequenceByCreatedAt` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-008](quotations.md#quote-008) |
| `quotations:update` | `mutation` | public | [Implementation](../../convex/quotations.ts) | [QUOTE-004](quotations.md#quote-004) |

## Auth HTTP routes

[`convex/http.ts`](../../convex/http.ts) calls `auth.addHttpRoutes`. The installed Password-only configuration registers `GET /.well-known/openid-configuration` and `GET /.well-known/jwks.json` on the Convex site host. These are HTTP actions, separate from the query and mutation inventory. OAuth callback prefixes are conditional in the installed library and are not enabled by this Password-only configuration. [AUTH-007](authentication.md#auth-007) traces the installed library source.

## Framework files and explicit exclusions

| Source or category | Reason and ownership |
| --- | --- |
| `convex/inquiries.ts` | Empty module. Inquiry table and quotation inquiry_id exist, but this module registers no operations. |
| `convex/http.ts` | Auth HTTP router registration is covered separately in coverage.md, not a Convex query or mutation. |
| `convex/_generated/` | Generated binding helpers, not application operation implementations. |
| `convex/schema.ts` | Table definitions, covered by infrastructure data relationships and feature documents. |
| `convex/auth.config.ts` | Auth provider configuration, covered by AUTH. |
| `convex/convex.config.ts` | Aggregate component registration, covered by APP. No application operation export. |
| `convex/constants.ts` | PAGE_SIZE constant, not a registered operation. |
| `public/` | Static assets and schedule sample, not App Router pages or handlers. |
| `src/app/layout.tsx`, `providers.tsx`, protected `layout.tsx` | Shared composition and auth providers, covered by [APP-03 and APP-04](infrastructure.md#app-03). They are not page routes. |
| `src/app/(protected)/loading.tsx`, `src/app/not-found.tsx` | Framework loading and missing-page states, covered by [APP-05](infrastructure.md#app-05). |
| `src/app/globals.css`, `favicon.ico`, `src/types/images.d.ts` | Styling, static metadata, and asset typing. These do not define independent business actions. |
| Reusable controls, hooks, and utilities | Shared dependencies are described in [infrastructure](infrastructure.md). Consumer-specific behavior belongs to the feature using them. |

## Developer maintenance scripts

These scripts are developer tools rather than application pages. They were inspected, not executed against a deployment. Their current `convex run` commands do not supply an explicit user identity. Package handlers require one, as explained in the [repository setup notes](../../README.md#package-access). Do not interpret the scripts as verified maintenance workflows.

| Script | Feature ownership and operations |
| --- | --- |
| [compare-prices.js](../../scripts/compare-prices.js) | Package price comparison using `packages:listWithRooms`. |
| [extract-price-list.js](../../scripts/extract-price-list.js) | Package and template comparison using `packages:list` and `packages:listWithHotelsAndMeals`; writes local comparison documents when run. |
| [update-prices.js](../../scripts/update-prices.js) | Package price repair using `packages:listWithRoomPricesOnly` and `packages:patchRoomPrices`. Its apply path includes `convex run --push`. |
| [fix-package-seasons.js](../../scripts/fix-package-seasons.js) | Season repair using `packages:list`, `packageFlights:listAll`, and `packages:patchSeason`. Its apply path includes `convex run --push`. |
| [compare-mff-flights.js](../../scripts/compare-mff-flights.js) | Flight schedule comparison using `packages:list` and `packageFlights:listAll`. |

## Coverage check

Run `node docs/feature-map/check.mjs` to compare the checked-out route and operation inventory with this mapping and check documentation links. The checker is structural. The [verification record](verification.md) describes executed checks and the [findings table](findings.md) records remaining limits.
