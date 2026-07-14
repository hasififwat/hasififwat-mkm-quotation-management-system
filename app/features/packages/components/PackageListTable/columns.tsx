import type { ColumnDef } from "@tanstack/react-table";
import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type PackageWithRooms = FunctionReturnType<
	typeof api.packages.listWithRooms
>[number];

export const columns: ColumnDef<PackageWithRooms>[] = [
	{ accessorKey: "name", header: "Package Name", enableSorting: true },
	{ id: "sections", header: "Sections", enableSorting: false },
	{ accessorKey: "status", header: "Status", enableSorting: false },
	{ id: "source", accessorKey: "source", header: "Source", enableSorting: false },
	{ accessorKey: "created_at", header: "Created", enableSorting: true },
	{ id: "action", header: "", enableSorting: false },
];
