import { z } from "zod";
import { FlightImportSchema } from "../flights/schema";

const hotelSchema = z.object({
	name: z.string().default(""),
	enabled: z.boolean().default(false),
	meals: z.array(z.string()).default([]),
	placeholder: z.string().default(""),
});

const roomSchema = z.object({
	label: z.string(),
	// z.coerce.number() handles "1250.00" -> 1250 automatically
	value: z.number().min(0, "Price must be positive"),
	enabled: z.boolean().default(false),
});

export const packageSchema = z.object({
	id: z.string().optional(),

	name: z.string().min(3, "Package name must be at least 3 characters"),
	duration: z.string().min(1, "Duration is required (e.g., '12 Days')"),
	transport: z.string().default(""),

	status: z.enum(["published", "unpublished"]).default("unpublished"),

	// Nested Objects
	hotels: z.object({
		makkah: hotelSchema,
		madinah: hotelSchema,
		taif: hotelSchema,
	}),

	// Arrays of Strings
	inclusions: z.array(z.string()).default([]),
	exclusions: z.array(z.string()).default([]),

	// Array of Objects
	rooms: z.array(roomSchema),
});

export const selectedPackageSchema = z.array(
	z.object({
		name: z.string().min(3, "Package name must be at least 3 characters"),
		flights: z
			.array(FlightImportSchema)
			.min(1, "At least one flight is required"),
		selected: z.boolean(),
	}),
);

export const selectedPackageFormSchema = z.object({
	season: z.string().min(1, "Season is required"),
	packages: selectedPackageSchema,
});

export type PackageFormValues = z.infer<typeof packageSchema>;
export type ISelectedPackageSchema = z.infer<typeof selectedPackageSchema>;
export type ISelectedPackageFormSchema = z.infer<
	typeof selectedPackageFormSchema
>;
