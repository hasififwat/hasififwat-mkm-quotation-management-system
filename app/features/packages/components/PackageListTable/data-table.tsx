import type { Cell, ColumnDef } from "@tanstack/react-table";

import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ExpandedState, GroupingState, SortingState } from "@tanstack/react-table";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronDown,
	Copy,
	Loader2,
	MoreHorizontal,
	PencilIcon,
	Trash,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { SeasonBadge } from "~/components/ui/season-badge";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	handlePreview: (pkg: TData) => void;
	isLoading?: boolean;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	handlePreview,
	isLoading = false,
}: DataTableProps<TData, TValue>) {
	const updatePackageStatus = useMutation(api.packages.updatePackageStatus);
	const [statusLoadingById, setStatusLoadingById] = useState<
		Record<string, boolean>
	>({});
	const [statusOverridesById, setStatusOverridesById] = useState<
		Record<string, "published" | "unpublished">
	>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [expanded, setExpanded] = useState<ExpandedState>(true);
	const [grouping] = useState<GroupingState>(["season"]);
	const [columnVisibility] = useState<Record<string, boolean>>({ season: false });

	// Add hidden season column used only for grouping
	const allColumns = useMemo<ColumnDef<TData, unknown>[]>(
		() => [
			{ id: "season", accessorKey: "season" } as ColumnDef<TData, unknown>,
			...columns,
		],
		[columns],
	);

	const table = useReactTable({
		data,
		columns: allColumns,
		getCoreRowModel: getCoreRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		onExpandedChange: setExpanded,
		groupedColumnMode: false,
		state: { sorting, grouping, expanded, columnVisibility },
	});

	const renderPackageCell = useCallback(
		(
			package_name?: string,
			_duration?: string,
			_year?: string,
			pkg?: TData & { _id: string },
		) => {
			return (
				<div className="flex items-start gap-2">
					<div className="w-7.5 shrink-0">
						<Button
							onClick={() => handlePreview(pkg as TData)}
							size="icon"
							variant="ghost"
							className="h-8 w-8"
						>
							<Copy className="h-4 w-4" />
						</Button>
					</div>

					<div className="font-medium flex-1 flex flex-col gap-1">
						<Link to={`/packages/edit/${pkg?._id}`} className="hover:underline">
							{package_name ?? "N/A"}
						</Link>
						<span className="text-xs text-muted-foreground">
							{_duration ?? "N/A"} . {_year}
						</span>
					</div>
				</div>
			);
		},
		[handlePreview],
	);

	const renderFormattedDate = useCallback((dateString: string) => {
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}, []);

	const handleDelete = useCallback((_pkgId: string) => {
		console.warn("Package deletion not yet implemented in Convex");
	}, []);

	const handleStatusChange = useCallback(
		async (pkgId: string, nextStatus: "published" | "unpublished") => {
			setStatusLoadingById((prev) => ({ ...prev, [pkgId]: true }));
			try {
				await updatePackageStatus({ id: pkgId as Id<"packages">, status: nextStatus });
				setStatusOverridesById((prev) => ({ ...prev, [pkgId]: nextStatus }));
			} catch (error) {
				console.error("Failed to update package status", error);
			} finally {
				setStatusLoadingById((prev) => ({ ...prev, [pkgId]: false }));
			}
		},
		[updatePackageStatus],
	);

	const renderDropdownMenu = useCallback(
		(pkg: TData & { _id: string }) => {
			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<Link to={`/packages/edit/${pkg._id}`}>
							<DropdownMenuItem>
								<PencilIcon />
								Edit
							</DropdownMenuItem>
						</Link>
						<DropdownMenuItem onClick={() => handleDelete(pkg._id)}>
							<Trash />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
		[handleDelete],
	);

	const renderCell = useCallback(
		(cell: Cell<TData, unknown>) => {
			const columnId = cell.column.id;
			const cellValue = cell.getValue();

			const renderSectionItem = (label: string, filled: boolean) => (
				<Tooltip key={label}>
					<TooltipTrigger>
						<Badge
							variant="outline"
							className="h-5 px-2 text-[10px] leading-none font-medium"
						>
							<span
								className={`h-1.5 w-1.5 rounded-full ${
									filled ? "bg-emerald-500" : "bg-red-500"
								}`}
							/>
							{label}
						</Badge>
					</TooltipTrigger>
					<TooltipContent>
						{filled ? `${label} completed` : `${label} is missing`}
					</TooltipContent>
				</Tooltip>
			);

			if (columnId === "name") {
				const row = cell.row.original as TData & {
					_id: string;
					name: string;
					duration: string;
					year: string;
				};
				return renderPackageCell(
					row.name,
					row.duration,
					row.year,
					cell.row.original as TData & { _id: string },
				);
			}

			if (columnId === "created_at" || columnId === "updated_at") {
				return renderFormattedDate(cellValue as string);
			}

			if (columnId === "status") {
				const row = cell.row.original as TData & {
					_id: string;
					status: "published" | "unpublished";
				};

				const packageId = row._id;
				const status = statusOverridesById[packageId] ?? row.status;
				const isUpdating = Boolean(statusLoadingById[packageId]);
				const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
				const statusDotClass =
					status === "published" ? "bg-emerald-500" : "bg-red-500";

				return (
					<div className="flex justify-center">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="h-auto p-0 hover:bg-transparent"
									disabled={isUpdating}
								>
									<Badge
										variant="outline"
										className="h-5 px-2 text-[10px] leading-none font-medium cursor-pointer"
									>
										{isUpdating ? (
											<>
												<Loader2 className="h-3 w-3 animate-spin" />
												Updating...
											</>
										) : (
											<>
												<span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
												{capStatus}
												<ChevronDown className="h-3 w-3" />
											</>
										)}
									</Badge>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem
									disabled={isUpdating || status === "published"}
									onClick={() => handleStatusChange(packageId, "published")}
								>
									Publish
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isUpdating || status === "unpublished"}
									onClick={() => handleStatusChange(packageId, "unpublished")}
								>
									Unpublish
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			}

			if (columnId === "sections") {
				const row = cell.row.original as TData & {
					hotels?: Array<{ enabled?: boolean; name?: string; meals?: string[] }>;
					rooms?: Array<{ enabled?: boolean; price?: number }>;
					inclusions?: string;
					exclusions?: string;
					flights?: unknown[];
				};

				const hasHotelDetails = (row.hotels ?? []).some(
					(hotel) =>
						hotel.enabled ||
						Boolean(hotel.name?.trim()) ||
						(hotel.meals?.length ?? 0) > 0,
				);
				const hasRoomDetails = (row.rooms ?? []).some(
					(room) => room.enabled || (room.price ?? 0) > 0,
				);
				const hasInclusionExclusion = Boolean(
					row.inclusions?.trim() || row.exclusions?.trim(),
				);
				const hasFlightsDetails = (row.flights?.length ?? 0) > 0;

				return (
					<div className="flex flex-wrap gap-1">
						{renderSectionItem("Hotel Details", hasHotelDetails)}
						{renderSectionItem("Room Details", hasRoomDetails)}
						{renderSectionItem("Inclusion/ Exclusion", hasInclusionExclusion)}
						{renderSectionItem("Flights Details", hasFlightsDetails)}
					</div>
				);
			}

			if (columnId === "action") {
				return renderDropdownMenu(cell.row.original as TData & { _id: string });
			}

			return flexRender(cell.column.columnDef.cell, cell.getContext());
		},
		[
			renderFormattedDate,
			renderPackageCell,
			renderDropdownMenu,
			handleStatusChange,
			statusLoadingById,
			statusOverridesById,
		],
	);

	const visibleColCount = table.getVisibleLeafColumns().length;

	return (
		<div className="overflow-hidden">
			<TooltipProvider>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const columnId = header.column.id;
									const isCenteredColumn = columnId === "status";
									const canSort = header.column.getCanSort();
									const sorted = header.column.getIsSorted();
									return (
										<TableHead
											key={header.id}
											className={isCenteredColumn ? "text-center" : ""}
										>
											{header.isPlaceholder ? null : canSort ? (
												<button
													type="button"
													onClick={header.column.getToggleSortingHandler()}
													className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
												>
													{flexRender(header.column.columnDef.header, header.getContext())}
													{sorted === "asc" ? (
														<ArrowUp className="h-3.5 w-3.5" />
													) : sorted === "desc" ? (
														<ArrowDown className="h-3.5 w-3.5" />
													) : (
														<ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
													)}
												</button>
											) : (
												flexRender(header.column.columnDef.header, header.getContext())
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={visibleColCount} className="h-24 text-center">
									<div className="inline-flex items-center gap-2 text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading data...
									</div>
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => {
								if (row.getIsGrouped()) {
									const season = (row.getValue("season") as string | undefined) ?? "";
									const isExpanded = row.getIsExpanded();
									return (
										<TableRow
											key={row.id}
											className="cursor-pointer bg-muted/20 hover:bg-muted/40 border-y"
											onClick={row.getToggleExpandedHandler()}
										>
											<TableCell colSpan={visibleColCount} className="py-2.5">
												<div className="flex items-center gap-2">
													<ChevronDown
														className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${!isExpanded ? "-rotate-90" : ""}`}
													/>
													<SeasonBadge season={season} />
													<span className="text-xs text-muted-foreground">
														{row.subRows.length} package{row.subRows.length !== 1 ? "s" : ""}
													</span>
												</div>
											</TableCell>
										</TableRow>
									);
								}
								return (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => {
											const isCenteredColumn = cell.column.id === "status";
											return (
												<TableCell
													key={cell.id}
													className={`${cell.column.id === "action" ? "w-16" : ""} ${isCenteredColumn ? "text-center" : ""}`}
												>
													{renderCell(cell)}
												</TableCell>
											);
										})}
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={visibleColCount} className="h-24 text-center">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TooltipProvider>
		</div>
	);
}
