import type { ColumnDef } from "@tanstack/react-table";
import type { z } from "zod";
import type { quotationRowSchema } from "~/features/quotation/schema";

export type Quotation = z.infer<typeof quotationRowSchema>;

export const columns: ColumnDef<Quotation>[] = [
	{ accessorKey: "quotation_number", header: "Ref No." },
	{ accessorKey: "client_name", header: "Client" },
	{ accessorKey: "package", header: "Package" },
	{ accessorKey: "status", header: "Status" },
	{ accessorKey: "total_amount", header: "Amount" },
	{ accessorKey: "created_at", header: "Date" },
];
