import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { columns, type Quotation } from "./components/QuotationTable/columns";
import { DataTable } from "./components/QuotationTable/data-table";

interface Props {
	data: unknown[];
	isLoading?: boolean;
	pageIndex?: number;
	pageSize?: number;
	isDone?: boolean;
	totalKnownPages?: number;
	onPreviousPage?: () => void;
	onNextPage?: () => void;
	onGoToPage?: (page: number) => void;
	sorting?: SortingState;
	onSortChange?: (sorting: SortingState) => void;
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (v: VisibilityState) => void;
}

const QuotationListing: React.FC<Props> = ({
	data,
	isLoading = false,
	pageIndex,
	pageSize,
	isDone,
	totalKnownPages,
	onPreviousPage,
	onNextPage,
	onGoToPage,
	sorting,
	onSortChange,
	columnVisibility,
	onColumnVisibilityChange,
}) => {
	return (
		<div>
			<DataTable
				columns={columns}
				data={data as Quotation[]}
				isLoading={isLoading}
				pageIndex={pageIndex}
				pageSize={pageSize}
				isDone={isDone}
				totalKnownPages={totalKnownPages}
				onPreviousPage={onPreviousPage}
				onNextPage={onNextPage}
				onGoToPage={onGoToPage}
				sorting={sorting}
				onSortChange={onSortChange}
				columnVisibility={columnVisibility}
				onColumnVisibilityChange={onColumnVisibilityChange}
			/>
		</div>
	);
};

export default QuotationListing;
