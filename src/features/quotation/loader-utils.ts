import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type QuotationPackagesResult = FunctionReturnType<
	typeof api.packages.listWithRooms
>;
export type QuotationPackage = QuotationPackagesResult[number];
export type ClientsListResult = FunctionReturnType<typeof api.clients.list>;
