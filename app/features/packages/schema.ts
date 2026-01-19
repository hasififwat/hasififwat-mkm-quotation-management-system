import { z } from "zod";

// 1. Hotel Sub-Schema
const hotelSchema = z.object({
  name: z.string().default(""),
  enabled: z.boolean().default(false),
  meals: z.array(z.string()).default([]),
  placeholder: z.string().default(""),
});

// 2. Room Sub-Schema
const roomSchema = z.object({
  label: z.string(),
  // z.coerce.number() handles "1250.00" -> 1250 automatically
  value: z.number().min(0, "Price must be positive"),
  enabled: z.boolean().default(false),
});

// 3. Main Package Schema
export const packageSchema = z.object({
  // Optional ID (New packages won't have one yet)
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

// 4. Export the Type to use in your components
export type PackageFormValues = z.infer<typeof packageSchema>;
