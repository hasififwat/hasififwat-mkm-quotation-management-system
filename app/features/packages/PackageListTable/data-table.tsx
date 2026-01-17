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
import { Copy, MoreHorizontal, PencilIcon, Trash } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  handlePreview: (pkg: TData) => void;
  handleEdit: (pkg: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  handlePreview,
  handleEdit,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderPackageCell = useCallback(
    (package_name?: string, duration?: string, year?: string, pkg?: TData) => {
      return (
        <div>
          <div className="font-medium">
            <Button onClick={() => handlePreview(pkg as TData)} variant="ghost">
              <Copy />
            </Button>

            {package_name ?? "N/A"}
          </div>
          <div className="flex gap-1 text-xs text-muted-foreground">
            <span>{duration ?? "-"}</span>
            <span>|</span>
            <span>{year ?? "-"}</span>
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

  const renderDropdownMenu = useCallback(() => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Trash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [handleEdit]);

  const renderCell = useCallback(
    (cell: Cell<TData, unknown>) => {
      const columnId = cell.column.id;
      const cellValue = cell.getValue();

      if (columnId === "name") {
        const row = cell.row.original as TData & {
          name: string;
          duration: string;
          year: string;
        };
        return renderPackageCell(
          row.name,
          row.duration,
          row.year,
          cell.row.original,
        );
      }

      if (columnId === "created_at" || columnId === "updated_at") {
        return renderFormattedDate(cellValue as string);
      }

      if (columnId === "status") {
        const status = cellValue as "published" | "unpublished";
        const variant = status === "published" ? "default" : "secondary";
        const capStatus = status.charAt(0).toUpperCase() + status.slice(1);

        return <Badge variant={variant}>{capStatus}</Badge>;
      }

      if (columnId === "action") {
        return renderDropdownMenu();
      }

      return flexRender(cell.column.columnDef.cell, cell.getContext());
    },
    [renderFormattedDate, renderPackageCell, renderDropdownMenu],
  );
  return (
    <div className="overflow-hidde">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
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
                  console.log("cell:", cell);
                  console.log("row:", row);
                  return (
                    <TableCell key={cell.id}>{renderCell(cell)}</TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
