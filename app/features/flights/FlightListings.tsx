import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import type { FlightData } from "./schema";

interface Props {
	data: FlightData[];
}

const FlightListings: React.FC<Props> = ({ data }) => {
	// Logic for preview can be added here later

	return (
		<div>
			<DataTable columns={columns} data={data} />
		</div>
	);
};

export default FlightListings;
