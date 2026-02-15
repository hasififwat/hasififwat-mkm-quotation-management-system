import type { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<any>[] = [
	{ accessorKey: "name", header: "Package Name" },

	{ accessorKey: "year", header: "Season" },

	{ accessorKey: "action", header: "" },
];
