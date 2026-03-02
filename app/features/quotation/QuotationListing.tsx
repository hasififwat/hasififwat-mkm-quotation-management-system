import { columns, type Quotation } from "./components/QuotationTable/columns";
import { DataTable } from "./components/QuotationTable/data-table";

interface Props {
	data: unknown[];
	isLoading?: boolean;
}

const QuotationListing: React.FC<Props> = ({ data, isLoading = false }) => {
	// Logic for preview can be added here later
	const handlePreview = (quotation: Quotation) => {
		console.log("Preview quotation", quotation);
	};

	return (
		<div>
			<DataTable
				columns={columns}
				data={data as Quotation[]}
				handlePreview={handlePreview}
				isLoading={isLoading}
			/>
		</div>
	);
};

export default QuotationListing;
