import { columns, type Quotation } from "./components/QuotationTable/columns";
import { DataTable } from "./components/QuotationTable/data-table";

interface Props {
	data: Quotation[];
}

const QuotationListing: React.FC<Props> = ({ data }) => {
	// Logic for preview can be added here later
	const handlePreview = (quotation: Quotation) => {
		console.log("Preview quotation", quotation);
	};

	return (
		<div>
			<DataTable columns={columns} data={data} handlePreview={handlePreview} />
		</div>
	);
};

export default QuotationListing;
