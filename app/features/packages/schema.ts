import { z } from "zod";
import { FlightImportSchema } from "../flights/schema";

const hotelSchemaApiRes = z.object({
	_id: z.string(),
	_creationTime: z.number(),
	name: z.string().optional().default(""),
	enabled: z.boolean().default(false),

	placeholder: z.string().default(""),
	hotel_type: z.string().default(""),
});

const hotelSchema = hotelSchemaApiRes.extend({
	meals: z.array(z.string()).default([]),
});

const roomSchemaApiRes = z.object({
	_id: z.string(),
	name: z.string().min(3, "Room name is required"),
	price: z.number().min(0, "Price must be positive"),
	enabled: z.boolean().default(false),
	sort_order: z.number(),
});

const roomSchema = roomSchemaApiRes;

export const packageSchema = z.object({
	_id: z.string().optional(),

	year: z.string().min(1, " Year is required (e.g., '2026/2027')"),

	name: z.string().min(3, "Package name must be at least 3 characters"),
	duration: z.string().min(1, "Duration is required (e.g., '12 Days')"),
	transport: z.string().default(""),

	// TODO: we need more satus options in the future (e.g., 'draft', 'archived')
	status: z.enum(["published", "unpublished"]).default("unpublished"),

	// Nested Objects
	hotels: z.array(hotelSchema),

	// Arrays of Strings
	inclusions: z.string().default(""),
	exclusions: z.string().default(""),

	// Array of Objects
	rooms: z.array(roomSchema).default([]),

	//Array of flights
	flights: z.array(FlightImportSchema).default([]),
});

export const selectedPackageSchema = z.array(
	z.object({
		name: z.string().min(3, "Package name must be at least 3 characters"),
		season: z.string().min(1, "Season is required"),
		flights: z
			.array(FlightImportSchema)
			.min(1, "At least one flight is required"),
		selected: z.boolean(),
	}),
);

export const seasonalRoomPriceSchema = z.object({
	room_type: z.string().min(1, "Room type is required"),
	price: z.number().min(0, "Price must be 0 or greater"),
	enabled: z.boolean(),
});

export const seasonalPricingSchema = z.object({
	season: z.string().min(1, "Season is required"),
	rooms: z.array(seasonalRoomPriceSchema),
});

export const selectedPackageFormSchema = z.object({
	year: z.string().min(1, "Year is required"),
	packages: selectedPackageSchema,
	seasonal_prices: z.array(seasonalPricingSchema).default([]),
});

export type IHotelDetailsApi = z.infer<typeof hotelSchemaApiRes>;
export type IHotelDetails = z.infer<typeof hotelSchema>;
export type IRoomDetailsApi = z.infer<typeof roomSchemaApiRes>;
export type IRoomDetails = z.infer<typeof roomSchema>;
export type ISeasonalRoomPrice = z.infer<typeof seasonalRoomPriceSchema>;
export type ISeasonalPricing = z.infer<typeof seasonalPricingSchema>;

export type IPackageDetails = z.infer<typeof packageSchema>;
export type IPackageDetailsForm = z.input<typeof packageSchema>;
export type ISelectedPackageSchema = z.infer<typeof selectedPackageSchema>;
export type ISelectedPackageFormSchema = z.input<
	typeof selectedPackageFormSchema
>;
