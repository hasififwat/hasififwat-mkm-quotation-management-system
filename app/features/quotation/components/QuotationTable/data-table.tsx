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
import { useMutation } from "convex/react";
import {
	Archive,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Eye,
	Loader2,
	MoreHorizontal,
	PencilIcon,
} from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { Link, useRevalidator } from "react-router";
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
	handlePreview?: (quotation: TData) => void;
	isLoading?: boolean;
	// pagination
	isDone?: boolean;
	isFirstPage?: boolean;
	onPreviousPage?: () => void;
	onNextPage?: () => void;
	// sorting
	sorting?: SortingState;
	onSortChange?: (sorting: SortingState) => void;
	// column visibility
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data = [],
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
	const revalidator = useRevalidator();
	const [expanded, setExpanded] = useState<ExpandedState>({});

	const handleArchive = useCallback(
		async (quotationId: string) => {
			if (!confirm("Archive this quotation? It will be hidden from the listing.")) return;
			try {
				await archiveQuotation({ id: quotationId as Id<"quotations"> });
				revalidator.revalidate();
			} catch (error) {
				console.error("Failed to archive quotation", error);
			}
		},
		[archiveQuotation, revalidator],
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
						<Link to={`/quotations/review/${quotation.id}`}>
							<DropdownMenuItem>
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</DropdownMenuItem>
						</Link>
						<Link to={`/quotations/edit/${quotation.id}`}>
							<DropdownMenuItem>
								<PencilIcon className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
						</Link>
						<DropdownMenuItem
							onClick={() => handleArchive(quotation.id)}
							className="text-muted-foreground"
						>
							<Archive className="mr-2 h-4 w-4" />
							Archive
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
		[handleArchive],
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
								to={`/quotations/review/${row.id}`}
								className="font-mono text-sm hover:underline font-bold text-primary"
							>
								{row.quotation_number || "N/A"}
							</Link>
							{row.is_stale && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger className="cursor-help text-amber-500 text-xs">⚠</TooltipTrigger>
										<TooltipContent side="top">
											Something has changed since this quotation was created — open to see details
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
								<Link to={`/quotations/review/${row.id}`}>Preview</Link>
							</Button>
							<Separator orientation="vertical" />
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground w-fit hover:text-primary"
								asChild
							>
								<Link to={`/quotations/edit/${row.id}`}>Edit</Link>
							</Button>
						</div>
					</div>
				);
			}

			if (columnId === "client_name") {
				return (
					<Link
						to={`/clients/${row.client_id}`}
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
		[renderPackageCell, renderDropdownMenu, renderAmount],
	);

	return (
		<div className="overflow-x-auto min-w-full">
			<div className="relative">
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
						<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading...
						</div>
					</div>
				)}
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
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
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
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No quotations found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			{/* Pagination controls */}
			{(onPreviousPage || onNextPage) && (
				<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100">
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
