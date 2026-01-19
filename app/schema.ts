import { z } from "zod";

// =========================================
// 1. DOMAIN / FORM SCHEMAS
// (Used for your UI, Forms, and Business Logic)
// =========================================

export const hotelDetailsSchema = z.object({
  id: z.string().optional(),
  name: z.string().default(""), // Defaults prevent "undefined" errors in forms
  enabled: z.boolean().default(false),
  meals: z.array(z.string()).default([]),
  placeholder: z.string().default(""),
});

export const roomTypeSchema = z.object({
  id: z.string().optional(),
  room_type: z.string(),
  price: z.number().min(0), // "coerce" handles strings like "100" from inputs
  enabled: z.boolean().default(false),
});

export const packageDetailsSchema = z.object({
  id: z.string().optional(), // Optional for new packages
  name: z.string().min(1, "Name is required"),
  duration: z.string(),

  hotels: z.object({
    makkah: hotelDetailsSchema,
    madinah: hotelDetailsSchema,
    taif: hotelDetailsSchema,
  }),

  inclusions: z.string(),
  exclusions: z.string(),
  rooms: z.array(roomTypeSchema),

  status: z.enum(["published", "unpublished"]),
});

// =========================================
// 2. SUPABASE API SCHEMAS
// (Matches the exact shape of your database/API)
// =========================================

export const supabaseHotelDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  meals: z.array(z.string()),
  placeholder: z.string(),
});

export const supabaseInclusionItemSchema = z.object({
  id: z.string(),
  sort_order: z.number(),
  description: z.string(),
});

export const supabaseExclusionItemSchema = z.object({
  id: z.string(),
  sort_order: z.number(),
  description: z.string(),
});

export const supabaseRoomTypeSchema = z.object({
  id: z.string(),
  room_type: z.string(),
  price: z.number(),
  enabled: z.boolean(),
});

export const supabaseFlightDetailsSchema = z.object({
  id: z.string(),
  month: z.string(),
  return_date: z.string(),
  return_sector: z.string(),
  departure_date: z.string(),
  departure_sector: z.string(),
});

export const supabasePackageDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  package_code: z.string(),
  year: z.string(),
  duration: z.string(),
  transport: z.string().nullable(), // DB allows nulls
  status: z.enum(["published", "unpublished"]),
  created_at: z.string(),
  updated_at: z.string(),

  flights: z.array(supabaseFlightDetailsSchema),

  // Database JSON objects might be null or have optional keys
  hotels: z
    .object({
      makkah: supabaseHotelDetailsSchema.optional(),
      madinah: supabaseHotelDetailsSchema.optional(),
      taif: supabaseHotelDetailsSchema.optional(),
    })
    .nullable(),

  inclusions: z.array(supabaseInclusionItemSchema),
  exclusions: z.array(supabaseExclusionItemSchema),
  rooms: z.array(supabaseRoomTypeSchema),
});

// =========================================
// 3. QUOTATION SCHEMAS
// =========================================

export const quotationDataSchema = z.object({
  referenceNumber: z.string(),
  date: z.string(), // or z.date() if you use Date objects
  clientName: z.string(),
  salesperson: z.string(),
  office: z.string(),
  packageId: z.string(),
  flightType: z.string(),
  roomType: z.enum(["double", "triple", "quad"]),

  // Handles your "number | ''" requirement for empty form inputs
  pax: z.union([z.number(), z.literal("")]),

  startDate: z.string(),
  endDate: z.string(),
});

export const savedQuotationSchema = quotationDataSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  totalPrice: z.number(),
});

// =========================================
// 4. EXPORT TYPES (THE IMPORTANT PART)
// Use these types in your code. They are auto-generated from Zod.
// =========================================

// Domain Types
export type HotelDetails = z.infer<typeof hotelDetailsSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type PackageDetails = z.infer<typeof packageDetailsSchema>;
export type PackageDetailsForm = z.input<typeof packageDetailsSchema>;

// Supabase Types
export type SupabaseHotelDetails = z.infer<typeof supabaseHotelDetailsSchema>;
export type SupabaseInclusionItem = z.infer<typeof supabaseInclusionItemSchema>;
export type SupabaseExclusionItem = z.infer<typeof supabaseExclusionItemSchema>;
export type SupabaseRoomType = z.infer<typeof supabaseRoomTypeSchema>;
export type SupabaseFlightDetails = z.infer<typeof supabaseFlightDetailsSchema>;
export type SupabasePackageDetails = z.infer<
  typeof supabasePackageDetailsSchema
>;

// Quotation Types
export type QuotationData = z.infer<typeof quotationDataSchema>;
export type SavedQuotation = z.infer<typeof savedQuotationSchema>;
