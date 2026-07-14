import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

 inquiries: defineTable({
    client_id: v.union(v.id("clients"), v.string()),
    status: v.union(v.literal("open"), v.literal("won"), v.literal("lost")),
    
    title: v.string(),
    
    // Timestamps for clean data health
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_client_id", ["client_id"])
    .index("by_status", ["status"]),


  clients: defineTable({
    name: v.string(),
    phone_number: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_phone_number", ["phone_number"]),

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
    archived: v.optional(v.boolean()),
    created_at: v.string(),
    updated_at: v.string(),
  }),

  package_flights: defineTable({
    package_id: v.union(v.id("packages"), v.string()),
    month: v.string(),
    flight: v.optional(v.string()),
    return_flight: v.optional(v.string()),
    departure_date: v.string(),
    departure_sector: v.string(),
    return_date: v.string(),
    return_sector: v.string(),
    source: v.optional(v.union(v.literal("sync"), v.literal("manual"))),
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
    email: v.optional(v.string()),
    full_name: v.string(),
    branch: v.string(),
    updated_at: v.string(),
    unit: v.optional(v.string()),
  }).index("by_email", ["email"]),

quotations: defineTable({
    // The link to our inquiry state machine
    inquiry_id: v.optional(v.union(v.id("inquiries"), v.string())), 

    hijri_year: v.string(),
    sequence_num: v.number(),
    revision: v.number(),
    client_name: v.string(),
    package_id: v.string(),
    
    // Status Model Hardening: Strict type checks for transitions
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("revised"),
      v.literal("superseded")
    ),
    
    total_amount: v.number(),
    notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
    created_by: v.string(),
    creator_id: v.optional(v.id("profiles")),
    pic_name: v.string(),
    branch: v.string(),
    flight_id: v.string(),
    client_id: v.string(),

    package_snapshot: v.optional(v.object({
      name: v.string(),
      year: v.string(),
      duration: v.string(),
      transport: v.optional(v.string()),
      package_code: v.optional(v.string()),
      inclusions: v.optional(v.string()),
      exclusions: v.optional(v.string()),
      package_updated_at: v.optional(v.string()),
      rooms: v.optional(v.array(v.object({
        room_type: v.string(),
        price: v.number(),
        enabled: v.boolean(),
      }))),
    })),
    flight_snapshot: v.optional(v.object({
      id: v.string(),
      month: v.string(),
      flight: v.optional(v.string()),
      departure_date: v.string(),
      departure_sector: v.string(),
      return_date: v.string(),
      return_sector: v.string(),
    })),
    hotels_snapshot: v.optional(v.array(v.object({
      hotel_type: v.string(),
      name: v.optional(v.string()),
      placeholder: v.string(),
      enabled: v.boolean(),
      meals: v.array(v.string()),
    }))),
  })
    .index("by_inquiry_id", ["inquiry_id"])
    .index("by_client_id", ["client_id"])
    .index("by_package_id", ["package_id"])
    .index("by_hijri_year", ["hijri_year"])
    .index("by_updated_at", ["updated_at"])
    .index("by_creator_id", ["creator_id"]),

  quotation_items: defineTable({
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
    quotation_id: v.string(),
    action: v.string(),
    description: v.string(),
    performed_by: v.string(),
    created_at: v.string(),
    snapshot_data: v.optional(v.string()),
  }).index("by_quotation_id", ["quotation_id"]),

  room_templates: defineTable({
    name: v.string(),
    price:v.number(),
    enabled: v.boolean(),
    sort_order: v.number(),
    created_at: v.string(),
  }),
});