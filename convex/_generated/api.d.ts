/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as quotationPdfArtifacts from "../quotationPdfArtifacts.js";
import type * as quotationPdfWorker from "../quotationPdfWorker.js";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as constants from "../constants.js";
import type * as http from "../http.js";
import type * as inquiries from "../inquiries.js";
import type * as packageFlights from "../packageFlights.js";
import type * as packages from "../packages.js";
import type * as profiles from "../profiles.js";
import type * as quotationRevisionUi from "../quotationRevisionUi.js";
import type * as quotationRevisionSaves from "../quotationRevisionSaves.js";
import type * as quotationFamilyMigration from "../quotationFamilyMigration.js";
import type * as quotationFamilies from "../quotationFamilies.js";
import type * as quotations from "../quotations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  quotationPdfArtifacts: typeof quotationPdfArtifacts;
  quotationPdfWorker: typeof quotationPdfWorker;
  auth: typeof auth;
  clients: typeof clients;
  constants: typeof constants;
  http: typeof http;
  inquiries: typeof inquiries;
  packageFlights: typeof packageFlights;
  packages: typeof packages;
  profiles: typeof profiles;
  quotationRevisionUi: typeof quotationRevisionUi;
  quotationRevisionSaves: typeof quotationRevisionSaves;
  quotationFamilyMigration: typeof quotationFamilyMigration;
  quotationFamilies: typeof quotationFamilies;
  quotations: typeof quotations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggregate: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregate">;
};
