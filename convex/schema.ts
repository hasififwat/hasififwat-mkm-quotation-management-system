import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { en } from "zod/v4/locales";

export default defineSchema({
  clients: defineTable({
    supabase_id: v.string(),
    name: v.string(),
    phone_number: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_supabase_id", ["supabase_id"]),

  hotel_templates: defineTable({
    hotel_type: v.string(),
    name: v.optional(v.string()),
    placeholder: v.string(),
    enabled: v.boolean(),
    created_at: v.string(),
  }),

  packages: defineTable({
    name: v.string(),
    duration: v.string(),
    season: v.optional(v.string()),
    transport: v.optional(v.string()),
    status: v.string(),
    year: v.string(),
    package_code: v.optional(v.string()),
    inclusions: v.optional(v.string()),
    exclusions: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  }),

  package_flights: defineTable({
    package_id: v.union(v.id("packages"), v.string()),
    month: v.string(),
    departure_date: v.string(),
    departure_sector: v.string(),
    return_date: v.string(),
    return_sector: v.string(),
    created_at: v.string(),
  }).index("by_package_id", ["package_id"]),

  package_hotels: defineTable({
    package_id: v.union(v.id("packages"), v.string()),
    hotel_type: v.string(),
    name: v.optional(v.string()),
    enabled: v.boolean(),
    placeholder: v.string(),
    created_at: v.string(),
  }).index("by_package_id", ["package_id"]),

  package_meals: defineTable({
    package_hotel_id: v.union(v.id("package_hotels"), v.string()),
    meal_type: v.string(),
    created_at: v.string(),
  }).index("by_package_hotel_id", ["package_hotel_id"]),

  package_rooms: defineTable({
    package_id: v.union(v.id("packages"), v.string()),
    room_type: v.string(),
    price: v.number(),
    enabled: v.boolean(),
    created_at: v.string(),
  }).index("by_package_id", ["package_id"]),

  profiles: defineTable({
    supabase_id: v.string(),
    full_name: v.string(),
    branch: v.string(),
    updated_at: v.string(),
    unit: v.optional(v.string()),
  }).index("by_supabase_id", ["supabase_id"]),

  quotations: defineTable({
    supabase_id: v.string(),
    hijri_year: v.string(),
    sequence_num: v.number(),
    revision: v.number(),
    client_name: v.string(),
    package_id: v.string(),
    status: v.string(),
    total_amount: v.number(),
    notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
    created_by: v.string(),
    pic_name: v.string(),
    branch: v.string(),
    flight_id: v.string(),
    client_id: v.string(),
  })
    .index("by_client_id", ["client_id"])
    .index("by_package_id", ["package_id"]),

  quotation_items: defineTable({
    supabase_id: v.string(),
    quotation_id: v.string(),
    item_type: v.string(),
    description: v.string(),
    package_room_id: v.string(),
    quantity: v.number(),
    unit_price: v.number(),
    original_price: v.optional(v.number()),
    created_at: v.string(),
  }).index("by_quotation_id", ["quotation_id"]),

  quotation_logs: defineTable({
    supabase_id: v.string(),
    quotation_id: v.string(),
    action: v.string(),
    description: v.string(),
    performed_by: v.string(),
    created_at: v.string(),
    snapshot_data: v.optional(v.string()),
  }).index("by_quotation_id", ["quotation_id"]),

  room_templates: defineTable({
    supabase_id: v.string(),
    name: v.string(),
    price:v.number(),
    enabled: v.boolean(),
    sort_order: v.number(),
    created_at: v.string(),
  }),
});