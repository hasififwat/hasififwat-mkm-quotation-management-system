import FlightMaster from "@/features/flights/FlightMaster";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";

export function meta() {
	return [
		{ title: "Create Package - MKM Quotation" },
		{ name: "description", content: "Create a new Umrah package" },
	];
}

export default function FlightRoute() {
	return (
		<ProtectedRoute title="Package Builder">
			<FlightMaster />
		</ProtectedRoute>
	);
}
