import type { ColumnDef } from "@tanstack/react-table";
import type { z } from "zod";
import type { quotationRowSchema } from "~/features/quotation/schema";

export type Quotation = z.infer<typeof quotationRowSchema>;

export const COLUMN_LABELS: Record<string, string> = {
	quotation_number: "Ref No.",
	client_name: "Client",
	package: "Package",
	status: "Status",
	total_amount: "Amount",
};

export const columns: ColumnDef<Quotation>[] = [
	{ id: "expand", header: "", enableSorting: false },
	{ accessorKey: "quotation_number", header: "Ref No." },
	{ accessorKey: "client_name", header: "Client" },
	{ accessorKey: "package", header: "Package" },
	{ accessorKey: "status", header: "Status" },
	{ accessorKey: "total_amount", header: "Amount" },
	{ id: "action", header: "", enableSorting: false },
];
