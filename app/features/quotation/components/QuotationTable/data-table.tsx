import type { Cell, ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PencilIcon, Trash, Eye } from "lucide-react";
import { Link } from "react-router";
import type { Quotation } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  handlePreview?: (quotation: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  handlePreview,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
    } catch (e) {
      return dateString;
    }
  }, []);

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
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    [handlePreview],
  );

  const renderCell = useCallback(
    (cell: Cell<TData, unknown>) => {
      const columnId = cell.column.id;
      const cellValue = cell.getValue();
      const row = cell.row.original as Quotation;

      if (columnId === "quotation_number") {
        return (
          <div className="font-mono text-sm">
            {row.quotation_number || "N/A"}
          </div>
        );
      }

      if (columnId === "package") {
        return renderPackageCell(row.package);
      }

      if (columnId === "total_amount") {
        return renderAmount(row.total_amount);
      }

      if (columnId === "created_at") {
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No quotations found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
