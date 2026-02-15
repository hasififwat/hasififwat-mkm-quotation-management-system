import { z } from "zod";

export const addsOnSchema = z.object({
	id: z.string().optional(),
	temp_id: z.string().optional(), // For frontend use
	name: z.string(),
	price: z.number().min(0),
	pax: z.number().min(1),
});

export const quotationFormSchema = z.object({
	id: z.string().optional(),
	reference_number: z.string().optional(),

	pic_name: z.string("PIC Name is required").optional(),
	branch: z.string("Branch is required").optional(),

	client_id: z.string("Client is required").min(1, "Client is required"),

	notes: z.string().optional().default(""),
	package_id: z.string("Package id required").min(1, "Package id required"),
	selected_rooms: z
		.array(
			z.object({
				room_type: z.string(),
				price: z.number(),
				pax: z.number().min(1, "At least 1 pax"),
			}),
		)
		.min(1, "At least one room must be selected"),

	flight_id: z.string().min(1, "Flight selection is required"),

	adds_ons: addsOnSchema.array().optional(),
	discounts: addsOnSchema.array().optional(),

	status: z
		.enum(["draft", "sent", "confirmed", "accepted", "rejected"])
		.default("draft"),
});

const packageInQuotationDetailsSchema = z.object({
	id: z.string().uuid().nullable(), // Nullable because it's a LEFT JOIN
	name: z.string(), // SQL Coalesces this to "Unknown Package" if null
	year: z.string().nullable(),
	duration: z.string().nullable(),
});

// 2. Sub-Schema for the Flight Object
const flightDetailsSchema = z.object({
	id: z.string(),
	month: z.string(),
	return_date: z.string(),
	return_sector: z.string(),
	departure_date: z.string(),
	departure_sector: z.string(),
});

// 3. Main Quotation Schema
export const quotationRowSchema = z.object({
	id: z.string(),
	quotation_number: z.string().nullable(), // Can be null if generation logic fails, though unlikely

	// Client & User Info
	client_name: z.string(),
	pic_name: z.string(),
	branch: z.string(),

	status: z.enum([
		"draft",
		"sent",
		"confirmed",
		"accepted",
		"rejected",
		"expired",
	]),
	total_amount: z.coerce.number(),

	notes: z.string(), // SQL ensures this is at least empty string ""
	hijri_year: z.string(),

	// Timestamps (Supabase returns ISO strings)
	created_at: z.string(),
	updated_at: z.string(),

	// Nested Objects
	package: packageInQuotationDetailsSchema,

	// This is nullable because a quotation might not have a flight selected yet
	selected_flight: flightDetailsSchema.nullable(),
});

const quotationRowArraySchema = z.array(quotationRowSchema);

export type GetAllQuotationsResponseSchema = z.infer<
	typeof quotationRowArraySchema
>;
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

// Quotation Full Details Schema  Reviewing

// 1. Helper Schemas
const flightSchema = z.object({
	id: z.string(),
	month: z.string(),
	departure_date: z.string(), // ISO Date String
	return_date: z.string(),
	departure_sector: z.string(),
	return_sector: z.string(),
});

const hotelSchema = z.object({
	hotel_type: z.string(),
	name: z.string(),
	placeholder: z.string(),
	enabled: z.boolean(),
	meals: z.array(z.string()),
});

const availableRoomSchema = z.object({
	id: z.string(),
	room_type: z.string(),
	price: z.number(),
	enabled: z.boolean(),
});

const packageFullSchema = z.object({
	id: z.string(),
	name: z.string(),
	year: z.string(),
	duration: z.string(),
	transport: z.string().optional().nullable(),
	inclusions: z.string().optional().nullable(),
	exclusions: z.string().optional().nullable(),
	package_code: z.string().optional().nullable(),
	hotels: z.array(hotelSchema),
	available_rooms: z.array(availableRoomSchema),
	available_flights: z.array(flightSchema),
});

// 2. Selected Item Schemas
const selectedRoomSchema = z.object({
	id: z.string(),
	package_room_id: z.string(),
	room_type: z.string(),
	price: z.number(),
	pax: z.number(),
	subtotal: z.number(),
});

const selectedAddonSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	price: z.number(),
	pax: z.number(),
	subtotal: z.number(),
});

// 3. Main Response Schema
export const quotationFullDetailsSchema = z.object({
	// Root Fields
	id: z.string(),
	reference_number: z.string(),
	status: z.enum([
		"draft",
		"sent",
		"confirmed",
		"accepted",
		"rejected",
		"expired",
	]),
	client_name: z.string(),
	pic_name: z.string(),
	branch: z.string(),
	notes: z.string(),
	total_amount: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	hijri_year: z.string(),

	// Nested Package Data (Context for the form)
	package: packageFullSchema,

	// Selected Data
	selected_flight: flightSchema.nullable(), // Can be null if no flight selected yet

	items: z.object({
		selected_rooms: z.array(selectedRoomSchema),
		adds_ons: z.array(selectedAddonSchema),
		discounts: z.array(selectedAddonSchema), // Reusing structure since it's identical
	}),
});

// 4. Export the Type
export type QuotationFullDetails = z.infer<typeof quotationFullDetailsSchema>;
