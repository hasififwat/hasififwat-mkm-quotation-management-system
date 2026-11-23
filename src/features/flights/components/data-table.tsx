"use client";

import type { Cell, ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback } from "react";
import { TableSkeletonRows } from "@/components/loading/TableSkeletonRows";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { FlightData } from "../schema";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	handlePreview?: (quotation: TData) => void;
	isLoading?: boolean;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const _renderPackageCell = useCallback(
		(pkg: { name: string; duration?: string | null; year?: string | null }) => {
			return (
				<div>
					<div className="font-medium">{pkg.name}</div>
					<div className="flex gap-1 text-xs text-muted-foreground">
						<span>{pkg.year ?? "-"}</span>
					</div>
				</div>
			);
		},
		[],
	);





	const renderCell = useCallback((cell: Cell<TData, unknown>) => {
		const columnId = cell.column.id;
		const row = cell.row.original as FlightData;

		if (columnId === "year_key") {
			return <div className="font-mono text-sm">{row.year_key || "N/A"}</div>;
		}








		return flexRender(cell.column.columnDef.cell, cell.getContext());
	}, []);

	const rows = table.getRowModel().rows;

	return (
		<div className="overflow-x-auto min-w-full">
			<p role="status" className="sr-only">
				{isLoading ? "Loading flight file rows…" : ""}
			</p>
			<Table className="min-w-full">
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead key={header.id} className="whitespace-nowrap">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody aria-busy={isLoading}>
					{isLoading && rows.length === 0 ? (
						<TableSkeletonRows columns={table.getVisibleLeafColumns().length} />
					) : rows.length > 0 ? (
						rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
							>
								{row.getVisibleCells().map((cell) => {
									return (
										<TableCell key={cell.id} className="whitespace-nowrap">
											{renderCell(cell)}
										</TableCell>
									);
								})}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No flight found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
