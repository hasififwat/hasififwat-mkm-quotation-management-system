"use client";

import FlightMaster from "~/features/flights/FlightMaster";

export default function FlightListPage() {
	return (
		<div className="workspace-page max-w-7xl space-y-4 md:space-y-6 animate-fadeIn">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">
						Travel Packages
					</h2>
					<p className="text-muted-foreground text-xs md:text-sm">
						Manage your Umrah offerings and custom travel bundles.
					</p>
				</div>
			</div>
			<FlightMaster />
			
		</div>
	);
}
