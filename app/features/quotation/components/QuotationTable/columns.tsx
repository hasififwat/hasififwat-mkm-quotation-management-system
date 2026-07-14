import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { quotationRowSchema } from "~/features/quotation/schema";

export type Quotation = z.infer<typeof quotationRowSchema>;

function SortableHeader({
	column,
	label,
}: {
	column: Column<Quotation, unknown>;
	label: string;
}) {
	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-3 h-8 gap-1 font-medium"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
		>
			{label}
			{column.getIsSorted() === "asc" ? (
				<ArrowUp className="h-3.5 w-3.5" />
			) : column.getIsSorted() === "desc" ? (
				<ArrowDown className="h-3.5 w-3.5" />
			) : (
				<ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
			)}
		</Button>
	);
}

export const COLUMN_LABELS: Record<string, string> = {
	quotation_number: "Ref No.",
	client_name: "Client",
	package: "Package",
	umrah_dates: "Umrah Dates",
	status: "Status",
	total_amount: "Amount",
	created_at: "Created At",
	updated_at: "Updated At",
};

function formatUmrahDate(isoDate: string): string {
	// Parse as local date to avoid timezone shifting the day
	const [year, month, day] = isoDate.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	const dd = String(date.getDate()).padStart(2, "0");
	const mmm = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const yyyy = date.getFullYear();
	return `${dd} ${mmm} ${yyyy}`;
}

export const columns: ColumnDef<Quotation>[] = [
	{ accessorKey: "quotation_number", header: "Ref No." },
	{ accessorKey: "client_name", header: "Client" },
	{ accessorKey: "package", header: "Package" },
	{
		id: "umrah_dates",
		header: "Umrah Dates",
		cell: ({ row }) => {
			const snap = row.original.flight_snapshot;
			const flight = snap ?? row.original.selected_flight;
			if (!flight?.departure_date || !flight?.return_date) {
				return <span className="text-muted-foreground text-xs">—</span>;
			}
			return (
				<span className="whitespace-nowrap text-sm">
					{formatUmrahDate(flight.departure_date)}{" – "}{formatUmrahDate(flight.return_date)}
				</span>
			);
		},
	},
	{ accessorKey: "status", header: "Status" },
	{ accessorKey: "total_amount", header: "Amount" },
	{
		accessorKey: "created_at",
		header: ({ column }) => <SortableHeader column={column} label="Created At" />,
		enableSorting: true,
	},
	{
		accessorKey: "updated_at",
		header: ({ column }) => <SortableHeader column={column} label="Updated At" />,
		enableSorting: true,
	},
];
