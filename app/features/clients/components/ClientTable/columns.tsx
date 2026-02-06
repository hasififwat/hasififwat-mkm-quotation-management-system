import type { ColumnDef } from "@tanstack/react-table";
import type { SupabasePackageDetails } from "~/features/quotation/legacy/types";

export const columns: ColumnDef<SupabasePackageDetails>[] = [
	{ accessorKey: "name", header: "Package Name" },
	{ accessorKey: "status", header: "Status" },
	{ accessorKey: "created_at", header: "Created At" },
	{ accessorKey: "updated_at", header: "Updated At" },
	{ accessorKey: "action", header: "" },
];
