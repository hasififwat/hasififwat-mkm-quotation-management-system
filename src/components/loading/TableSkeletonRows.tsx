import { Skeleton } from "~/components/ui/skeleton";
import { TableCell } from "~/components/ui/table";

export function TableSkeletonRows({
	columns,
	rows = 4,
}: {
	columns: number;
	rows?: number;
}) {
	return Array.from({ length: rows }, (_, row) => (
		<tr key={row} aria-hidden="true" className="border-b">
			{Array.from({ length: columns }, (_, column) => (
				<TableCell key={column} className="py-3">
					<Skeleton className="h-4 w-3/4 max-w-32" />
				</TableCell>
			))}
		</tr>
	));
}
