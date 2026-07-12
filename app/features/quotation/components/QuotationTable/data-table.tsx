import type {
	Cell,
	ColumnDef,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	Eye,
	Loader2,
	MoreHorizontal,
	PencilIcon,
	Trash,
} from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router";
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
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualSorting: true,
		state: {
			sorting: sorting ?? [],
			columnVisibility,
		},
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

	const renderFormattedDate = useCallback((dateString: string) => {
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, "0");
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch (_e) {
			return dateString;
		}
	}, []);

	const renderAmount = useCallback((amount: number) => {
		return new Intl.NumberFormat("ms-MY", {
			style: "currency",
			currency: "MYR",
		}).format(amount);
	}, []);

	const renderDropdownMenu = useCallback((quotation: Quotation) => {
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
					<DropdownMenuItem className="text-destructive focus:text-destructive">
						<Trash className="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}, []);

	const renderCell = useCallback(
		(cell: Cell<TData, unknown>) => {
			const columnId = cell.column.id;
			const cellValue = cell.getValue();
			const row = cell.row.original as Quotation;

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

			if (columnId === "package") {
				return renderPackageCell(row.package);
			}

			if (columnId === "total_amount") {
				return renderAmount(row.total_amount);
			}

			if (columnId === "created_at" || columnId === "updated_at") {
				return renderFormattedDate(cellValue as string);
			}

			if (columnId === "status") {
				const status = cellValue as string;
				let variant: "default" | "secondary" | "destructive" | "outline" =
					"default";

				switch (status) {
					case "draft":
						variant = "secondary";
						break;
					case "sent":
						variant = "outline";
						break;
					case "accepted":
						variant = "default";
						break;
					case "revised":
						variant = "outline";
						break;
					case "superseded":
						variant = "secondary";
						break;
					case "rejected":
						variant = "destructive";
						break;
				}

				const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
				return <Badge variant={variant}>{capStatus}</Badge>;
			}

			if (columnId === "action") {
				return renderDropdownMenu(row);
			}

			return flexRender(cell.column.columnDef.cell, cell.getContext());
		},
		[renderFormattedDate, renderPackageCell, renderDropdownMenu, renderAmount],
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
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
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
