import type { FlightData } from "../schema";

export type FlightColumn = {
	header: string;
	accessorKey: keyof FlightData; // This is the magic part
};

export const columns: FlightColumn[] = [
	{ accessorKey: "season_key", header: "Season" },
	{ accessorKey: "pakej", header: "Ref No." },
	{ accessorKey: "code", header: "Client" },
	{ accessorKey: "month", header: "Package" },
	{ accessorKey: "departure", header: "Status" },
	{ accessorKey: "return", header: "Amount" },
	{ accessorKey: "package_name", header: "Date" },
	{ accessorKey: "sector_departure", header: "" },
];
