import FlightMaster from "~/features/flights/FlightMaster";

export function meta() {
	return [
		{ title: "Flights Schedule - MKM Quotation" },
		{
			name: "description",
			content: "Import, view and manage flight schedules",
		},
	];
}

export default function FlightListPage() {
	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">
						Travel Packages
					</h2>
					<p className="text-slate-500 text-xs md:text-sm">
						Manage your Umrah offerings and custom travel bundles.
					</p>
				</div>
			</div>
			<FlightMaster />
			
		</div>
	);
}
