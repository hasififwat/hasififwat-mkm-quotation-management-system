"use client";

import type {
	Cell,
	ColumnDef,
	ExpandedState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import {
	Archive,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Eye,
	MoreHorizontal,
	PencilIcon,
} from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TableSkeletonRows } from "@/components/loading/TableSkeletonRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Quotation } from "./columns";
import { QuotationExpandedRow } from "./QuotationExpandedRow";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
    archived?: boolean;
	handlePreview?: (quotation: TData) => void;
	isLoading?: boolean;
	isDone?: boolean;
	isFirstPage?: boolean;
	onPreviousPage?: () => void;
	onNextPage?: () => void;
	sorting?: SortingState;
	onSortChange?: (sorting: SortingState) => void;
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data = [],
    archived = false,
	isLoading = false,
	isDone = true,
	isFirstPage = true,
	onPreviousPage,
	onNextPage,
	sorting,
	onSortChange,
	columnVisibility = {},
	onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
	const archiveQuotation = useMutation(api.quotations.archiveQuotation);
	const router = useRouter();
    const archiveFamily = useMutation(api.quotationFamilies.archive);
	const [expanded, setExpanded] = useState<ExpandedState>({});

	const handleArchive = useCallback(
		async (quotation: Quotation) => {
			if (!confirm("Archive this family? Saved revisions remain available in history.")) return;
			try {
				if (quotation.family_id) await archiveFamily({family_id: quotation.family_id as Id<"quotation_families">});
                else await archiveQuotation({ id: quotation.id as Id<"quotations"> });
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Could not archive quotation family");
			}
		},
		[archiveQuotation, archiveFamily, router],
	);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: () => true,
		manualSorting: true,
		state: {
			sorting: sorting ?? [],
			columnVisibility,
			expanded,
		},
		onExpandedChange: setExpanded,
		onSortingChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(sorting ?? []) : updater;
			onSortChange?.(next);
		},
		onColumnVisibilityChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(columnVisibility) : updater;
			onColumnVisibilityChange?.(next);
		},
	});

	const renderPackageCell = useCallback(
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

	const renderAmount = useCallback((amount: number) => {
		return new Intl.NumberFormat("ms-MY", {
			style: "currency",
			currency: "MYR",
		}).format(amount);
	}, []);

	const renderDropdownMenu = useCallback(
		(quotation: Quotation) => {
			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<Link href={`/quotations/review/${quotation.id}`}>
							<DropdownMenuItem>
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</DropdownMenuItem>
						</Link>
                        {quotation.family_id && <Link href={`/quotations/${quotation.id}/history`}>
                            <DropdownMenuItem>Family history</DropdownMenuItem>
                        </Link>}
						{!archived && <Link href={`/quotations/edit/${quotation.id}`}>
							<DropdownMenuItem>
								<PencilIcon className="mr-2 h-4 w-4" />
								Edit current
							</DropdownMenuItem>
						</Link>}
						{!archived && <DropdownMenuItem
							onClick={() => handleArchive(quotation)}
							className="text-muted-foreground"
						>
							<Archive className="mr-2 h-4 w-4" />
							{quotation.family_id ? "Archive family" : "Archive"}
						</DropdownMenuItem>}
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
		[handleArchive, archived],
	);

	const renderCell = useCallback(
		(cell: Cell<TData, unknown>) => {
			const columnId = cell.column.id;
			const cellValue = cell.getValue();
			const row = cell.row.original as Quotation;

			if (columnId === "expand") {
				const isExpanded = cell.row.getIsExpanded();
				return (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={cell.row.getToggleExpandedHandler()}
					>
						<ChevronDown
							className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
						/>
					</Button>
				);
			}

			if (columnId === "quotation_number") {
				return (
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-1.5">
							<Link
								href={`/quotations/review/${row.id}`}
								className="font-mono text-sm hover:underline font-bold text-primary"
							>
								{row.quotation_number || "N/A"}
							</Link>
							{row.is_stale && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger className="cursor-help text-amber-500 text-xs">⚠</TooltipTrigger>
										<TooltipContent side="top">
											Some saved details may be missing or out of date. Select Preview to check the quotation.
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						<div className="flex items-center gap-2 h-3">
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground w-fit hover:text-primary"
								asChild
							>
								<Link href={`/quotations/review/${row.id}`}>Preview</Link>
							</Button>
							{!archived && <><Separator orientation="vertical" />
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground w-fit hover:text-primary"
								asChild
							>
								<Link href={`/quotations/edit/${row.id}`}>Edit current</Link>
							</Button></>}
						</div>
					</div>
				);
			}

			if (columnId === "client_name") {
				return (
					<Link
						href={`/clients/${row.client_id}`}
						className="hover:underline text-sm"
					>
						{row.client_name}
					</Link>
				);
			}

			if (columnId === "package") {
				return renderPackageCell(row.package);
			}

			if (columnId === "total_amount") {
				return renderAmount(row.total_amount);
			}

			if (columnId === "status") {
				const status = cellValue as string;
				let variant: "default" | "secondary" | "destructive" | "outline" =
					"default";
				switch (status) {
					case "draft": variant = "secondary"; break;
					case "sent": variant = "outline"; break;
					case "accepted": variant = "default"; break;
					case "revised": variant = "outline"; break;
					case "superseded": variant = "secondary"; break;
					case "rejected": variant = "destructive"; break;
				}
				const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
				return <Badge variant={variant}>{capStatus}</Badge>;
			}

			if (columnId === "action") {
				return renderDropdownMenu(row);
			}

			return flexRender(cell.column.columnDef.cell, cell.getContext());
		},
		[renderPackageCell, renderDropdownMenu, renderAmount, archived],
	);

	const rows = table.getRowModel().rows;
	const visibleColCount = table.getVisibleLeafColumns().length;

	return (
		<div className="overflow-x-auto min-w-full">
			<p role="status" className="sr-only">
				{isLoading ? "Loading quotations…" : ""}
			</p>
			<div className="relative">
				<Table className="min-w-full">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className="whitespace-nowrap">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody aria-busy={isLoading}>
						{isLoading && rows.length === 0 ? (
							<TableSkeletonRows columns={visibleColCount} />
						) : rows.length > 0 ? (
							rows.map((row) => (
								<Fragment key={row.id}>
									<TableRow data-state={row.getIsSelected() && "selected"}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="whitespace-nowrap">
												{renderCell(cell)}
											</TableCell>
										))}
									</TableRow>
									{row.getIsExpanded() && (
										<TableRow className="hover:bg-transparent">
											<TableCell className="p-0" />
											<TableCell
												colSpan={row.getVisibleCells().length - 1}
												className="p-0 border-b"
											>
												<QuotationExpandedRow
													quotation={row.original as Quotation}
												/>
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={visibleColCount}
									className="h-24 text-center"
								>
									No quotations found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			{(onPreviousPage || onNextPage) && (
				<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
					<Button
						variant="outline"
						size="sm"
						onClick={onPreviousPage}
						disabled={isFirstPage || isLoading}
						className="gap-1"
					>
						<ChevronLeft className="h-4 w-4" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onNextPage}
						disabled={isDone || isLoading}
						className="gap-1"
					>
						Next
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
