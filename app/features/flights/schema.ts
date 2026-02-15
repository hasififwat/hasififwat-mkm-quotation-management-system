import z from "zod";

export const FlightImportSchema = z.object({
	season_key: z.string(),
	pakej: z.string(),
	code: z.string(),
	month: z.string(),
	departure: z.string(),
	return: z.string(),
	package_name: z.string(),
	sector_departure: z.string(),
	sector_return: z.string(),
});

export type FlightData = z.infer<typeof FlightImportSchema>;
