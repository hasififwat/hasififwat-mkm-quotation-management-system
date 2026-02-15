import type { ColumnDef } from "@tanstack/react-table";
import type { SupabasePackageDetails } from "~/features/quotation/legacy/types";

export const columns: ColumnDef<SupabasePackageDetails>[] = [
	{ accessorKey: "name", header: "Package Name" },

	{ accessorKey: "action", header: "" },
];
