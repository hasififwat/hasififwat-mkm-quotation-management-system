import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { columns, type Quotation } from "./components/QuotationTable/columns";
import { DataTable } from "./components/QuotationTable/data-table";

interface Props {
	data: unknown[];
	isLoading?: boolean;
	isDone?: boolean;
	isFirstPage?: boolean;
	onPreviousPage?: () => void;
	onNextPage?: () => void;
	sorting?: SortingState;
	onSortChange?: (sorting: SortingState) => void;
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (v: VisibilityState) => void;
}

const QuotationListing: React.FC<Props> = ({
	data,
	isLoading = false,
	isDone,
	isFirstPage,
	onPreviousPage,
	onNextPage,
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
				isDone={isDone}
				isFirstPage={isFirstPage}
				onPreviousPage={onPreviousPage}
				onNextPage={onNextPage}
				sorting={sorting}
				onSortChange={onSortChange}
				columnVisibility={columnVisibility}
				onColumnVisibilityChange={onColumnVisibilityChange}
			/>
		</div>
	);
};

export default QuotationListing;
