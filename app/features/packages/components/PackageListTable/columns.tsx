import type { ColumnDef } from "@tanstack/react-table";
import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type PackageWithRooms = FunctionReturnType<
	typeof api.packages.listWithRooms
>[number];

export const columns: ColumnDef<PackageWithRooms>[] = [
	{ accessorKey: "name", header: "Package Name" },
	{ id: "sections", header: "Sections" },
	{ accessorKey: "season", header: "Season" },
	{ accessorKey: "status", header: "Status" },
];
