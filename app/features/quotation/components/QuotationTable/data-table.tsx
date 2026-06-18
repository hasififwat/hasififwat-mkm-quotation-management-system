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
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Eye,
	Loader2,
	MoreHorizontal,
	PencilIcon,
	Trash,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	pageIndex?: number;
	pageSize?: number;
	isDone?: boolean;
	totalKnownPages?: number;
	onPreviousPage?: () => void;
	onNextPage?: () => void;
	onGoToPage?: (page: number) => void;
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
	pageIndex = 0,
	pageSize = 25,
	isDone = true,
	totalKnownPages = 1,
	onPreviousPage,
	onNextPage,
	onGoToPage,
	sorting,
	onSortChange,
	columnVisibility = {},
	onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
	const [pagePickerOpen, setPagePickerOpen] = useState(false);
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
						<Link
							to={`/quotations/review/${row.id}`}
							className="font-mono text-sm hover:underline font-bold text-primary"
						>
							{row.quotation_number || "N/A"}
						</Link>
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
						break; // or success if available
					case "confirmed":
						variant = "default";
						break;
					case "rejected":
						variant = "destructive";
						break;
					case "expired":
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
				<div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
					<Popover open={pagePickerOpen} onOpenChange={setPagePickerOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								role="combobox"
								aria-expanded={pagePickerOpen}
								disabled={isLoading}
								className="gap-1 min-w-[100px] justify-between text-sm"
							>
								<span className="text-muted-foreground">Page</span>
								<span className="font-medium">{pageIndex + 1}</span>
								<ChevronsUpDown className="h-3 w-3 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[140px] p-0" align="start">
							<Command>
								<CommandInput placeholder="Jump to page..." />
								<CommandList>
									<CommandEmpty>No page found.</CommandEmpty>
									<CommandGroup>
										{Array.from(
											{ length: totalKnownPages },
											(_, i) => i + 1,
										).map((p) => (
											<CommandItem
												key={p}
												value={String(p)}
												onSelect={() => {
													setPagePickerOpen(false);
													if (p !== pageIndex + 1) onGoToPage?.(p);
												}}
											>
												<Check
													className={`h-4 w-4 ${
														p === pageIndex + 1 ? "opacity-100" : "opacity-0"
													}`}
												/>
												Page {p}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={onPreviousPage}
							disabled={pageIndex === 0 || isLoading}
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
				</div>
			)}
		</div>
	);
}
