"use client";

import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import type { FlightData } from "./schema";

interface Props {
	data: FlightData[];
	isLoading?: boolean;
}

const FlightListings: React.FC<Props> = ({ data, isLoading }) => {
	// Logic for preview can be added here later

	return (
		<div>
			<DataTable columns={columns} data={data} isLoading={isLoading} />
		</div>
	);
};

export default FlightListings;
