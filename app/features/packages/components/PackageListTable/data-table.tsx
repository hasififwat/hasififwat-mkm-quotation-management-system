import type { Cell, ColumnDef } from "@tanstack/react-table";

import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ConvexHttpClient } from "convex/browser";
import { Copy, Loader2, MoreHorizontal, PencilIcon, Trash } from "lucide-react";
import { useCallback, useState } from "react";
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
import { createClient } from "~/lib/supabase/client";
import { UmrahPackageService } from "~/services/package-service";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	handlePreview: (pkg: TData) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	handlePreview,
}: DataTableProps<TData, TValue>) {
	const [statusLoadingById, setStatusLoadingById] = useState<
		Record<string, boolean>
	>({});
	const [statusOverridesById, setStatusOverridesById] = useState<
		Record<string, "published" | "unpublished">
	>({});

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
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

						{/* <Button
							variant="ghost"
							size="sm"
							className="h-auto p-0 text-xs text-muted-foreground w-fit hover:text-primary"
							asChild
						>
							<Link to={`/packages/edit/${pkg?._id}`}>Edit</Link>
						</Button> */}
					</div>
				</div>
			);
		},
		[handlePreview],
	);

	//Format 2026-01-16T19:10:06.730972+00:00 16/01/2026
	const renderFormattedDate = useCallback((dateString: string) => {
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}, []);

	const handleDelete = useCallback((pkgId: string) => {
		const supabase = createClient();

		UmrahPackageService.deletePackage(supabase, pkgId);
	}, []);

	const handleStatusChange = useCallback(
		async (pkgId: string, nextStatus: "published" | "unpublished") => {
			const convexUrl = import.meta.env.VITE_CONVEX_URL;
			if (!convexUrl) {
				console.error("VITE_CONVEX_URL is not set");
				return;
			}

			setStatusLoadingById((prev) => ({
				...prev,
				[pkgId]: true,
			}));

			try {
				const client = new ConvexHttpClient(convexUrl);
				await client.mutation(
					"packages:updatePackageStatus" as never,
					{
						id: pkgId,
						status: nextStatus,
					} as never,
				);

				setStatusOverridesById((prev) => ({
					...prev,
					[pkgId]: nextStatus,
				}));
			} catch (error) {
				console.error("Failed to update package status", error);
			} finally {
				setStatusLoadingById((prev) => ({
					...prev,
					[pkgId]: false,
				}));
			}
		},
		[],
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

			if (columnId === "season") {
				const season = (cellValue as string | undefined) ?? "";
				return (
					<div className="flex justify-center">
						<SeasonBadge season={season} />
					</div>
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
												<span
													className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`}
												/>
												{capStatus}
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
					hotels?: Array<{
						enabled?: boolean;
						name?: string;
						meals?: string[];
					}>;
					rooms?: Array<{
						enabled?: boolean;
						price?: number;
					}>;
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
	return (
		<div className="overflow-hidden">
			<TooltipProvider>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const columnId = header.column.id;
									const isCenteredColumn =
										columnId === "season" || columnId === "status";
									return (
										<TableHead
											key={header.id}
											className={isCenteredColumn ? "text-center" : ""}
										>
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
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => {
										const isCenteredColumn =
											cell.column.id === "season" ||
											cell.column.id === "status";
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
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
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
