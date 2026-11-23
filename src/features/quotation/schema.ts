import { z } from "zod";
import { descriptionError, priceError } from "../../domain/submission-validation";

export const addsOnSchema = z.object({
	id: z.string().optional(),
	temp_id: z.string().optional(),
	name: z.string().superRefine((value, ctx) => {
		const error = descriptionError(value);
		if (error) ctx.addIssue({ code: "custom", message: error });
	}),
	price: z.number({ error: (issue) => priceError(issue.input) }).superRefine((value, ctx) => {
		const error = priceError(value);
		if (error) ctx.addIssue({ code: "custom", message: error });
	}),
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
		.enum(["draft", "sent", "accepted", "rejected", "revised", "superseded"])
		.default("draft"),
});

const packageInQuotationDetailsSchema = z.object({
	id: z.string().uuid().nullable(),
	name: z.string(),
	year: z.string().nullable(),
	duration: z.string().nullable(),
});

const flightDetailsSchema = z.object({
	id: z.string(),
	month: z.string(),
	flight: z.string().optional(),
	return_date: z.string(),
	return_sector: z.string(),
	departure_date: z.string(),
	departure_sector: z.string(),
});

export const quotationRowSchema = z.object({
    family_id: z.string().nullable().optional(),
	id: z.string(),
	quotation_number: z.string().nullable(),

	client_name: z.string(),
	client_id: z.string(),
	pic_name: z.string(),
	branch: z.string(),

	status: z.enum([
		"draft",
		"sent",
		"accepted",
		"rejected",
		"revised",
		"superseded",
	]),
	total_amount: z.coerce.number(),

	notes: z.string(),
	hijri_year: z.string(),

	created_at: z.string(),
	updated_at: z.string(),

	is_stale: z.boolean().optional(),

	package: packageInQuotationDetailsSchema,

	selected_flight: flightDetailsSchema.nullable(),
	flight_snapshot: z.object({
		departure_date: z.string(),
		return_date: z.string(),
	}).passthrough().nullable().optional(),
});

const quotationRowArraySchema = z.array(quotationRowSchema);

export type GetAllQuotationsResponseSchema = z.infer<
	typeof quotationRowArraySchema
>;
export type QuotationFormInput = z.input<typeof quotationFormSchema>;
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;


const flightSchema = z.object({
	id: z.string(),
	month: z.string(),
	flight: z.string().optional(),
	departure_date: z.string(),
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

const selectedRoomSchema = z.object({
	id: z.string(),
	package_room_id: z.string(),
	room_type: z.string(),
	price: z.number(),
	pax: z.number(),
	subtotal: z.number(),
});

const selectedAddonSchema = z.object({
	id: z.string(),
	name: z.string(),
	price: z.number(),
	pax: z.number(),
	subtotal: z.number(),
});

export const quotationFullDetailsSchema = z.object({
	id: z.string(),
	reference_number: z.string(),
	status: z.enum([
		"draft",
		"sent",
		"accepted",
		"rejected",
		"revised",
		"superseded",
	]),
	client_name: z.string(),
	pic_name: z.string(),
	branch: z.string(),
	notes: z.string(),
	total_amount: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	hijri_year: z.string(),

	package: packageFullSchema,

	selected_flight: flightSchema.nullable(),

	items: z.object({
		selected_rooms: z.array(selectedRoomSchema),
		adds_ons: z.array(selectedAddonSchema),
		discounts: z.array(selectedAddonSchema),
	}),
});

export type QuotationFullDetails = z.infer<typeof quotationFullDetailsSchema>;
