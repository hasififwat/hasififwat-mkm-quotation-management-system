import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function getLegacySupabaseId(doc: unknown): string | undefined {
  const value = (doc as { supabase_id?: unknown }).supabase_id;
  return typeof value === "string" ? value : undefined;
}

function dedupeById<T extends { _id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item._id, item])).values());
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("packages").collect();
  },
});

export const listWithRooms = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let packages = await ctx.db.query("packages").collect();
    
    // Filter by search term if provided
    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const searchLower = args.searchTerm.toLowerCase();
      packages = packages.filter((pkg) => 
        pkg.name.toLowerCase().includes(searchLower)
      );
    }
    const packageRooms = await ctx.db.query("package_rooms").collect();
    const packageFlights = await ctx.db.query("package_flights").collect();
    const packageHotels = await ctx.db.query("package_hotels").collect();
    const packageMeals = await ctx.db.query("package_meals").collect();

    const roomsByPackageId = new Map<(typeof packageRooms)[number]["package_id"], (typeof packageRooms)[number][]>();
    const flightsByPackageId = new Map<(typeof packageFlights)[number]["package_id"], (typeof packageFlights)[number][]>();
    const hotelsByPackageId = new Map<(typeof packageHotels)[number]["package_id"], (typeof packageHotels)[number][]>();
    const mealsByPackageHotelId = new Map<(typeof packageMeals)[number]["package_hotel_id"], (typeof packageMeals)[number][]>();

    for (const room of packageRooms) {
      const existingRooms = roomsByPackageId.get(room.package_id);

      if (existingRooms) {
        existingRooms.push(room);
      } else {
        roomsByPackageId.set(room.package_id, [room]);
      }
    }

    for (const flight of packageFlights) {
      const existingFlights = flightsByPackageId.get(flight.package_id);

      if (existingFlights) {
        existingFlights.push(flight);
      } else {
        flightsByPackageId.set(flight.package_id, [flight]);
      }
    }

    for (const hotel of packageHotels) {
      const existingHotels = hotelsByPackageId.get(hotel.package_id);

      if (existingHotels) {
        existingHotels.push(hotel);
      } else {
        hotelsByPackageId.set(hotel.package_id, [hotel]);
      }
    }

    for (const meal of packageMeals) {
      const existingMeals = mealsByPackageHotelId.get(meal.package_hotel_id);

      if (existingMeals) {
        existingMeals.push(meal);
      } else {
        mealsByPackageHotelId.set(meal.package_hotel_id, [meal]);
      }
    }

    return packages.map((pkg) => ({
      ...pkg,
      rooms: dedupeById(
        [pkg._id, getLegacySupabaseId(pkg)]
          .filter((id): id is (typeof packageRooms)[number]["package_id"] => Boolean(id))
          .flatMap((id) => roomsByPackageId.get(id) ?? []),
      ),
      flights: dedupeById(
        [pkg._id, getLegacySupabaseId(pkg)]
          .filter((id): id is (typeof packageFlights)[number]["package_id"] => Boolean(id))
          .flatMap((id) => flightsByPackageId.get(id) ?? []),
      ),
      hotels: dedupeById(
        [pkg._id, getLegacySupabaseId(pkg)]
          .filter((id): id is (typeof packageHotels)[number]["package_id"] => Boolean(id))
          .flatMap((id) => hotelsByPackageId.get(id) ?? []),
      ).map((hotel) => ({
        ...hotel,
        meals: dedupeById(
          [hotel._id, getLegacySupabaseId(hotel)]
            .filter((id): id is (typeof packageMeals)[number]["package_hotel_id"] => Boolean(id))
            .flatMap((id) => mealsByPackageHotelId.get(id) ?? []),
        ).map(
          (meal) => meal.meal_type,
        ),
      })),
    }));
  },
});
export const getById = query({
  args: {
    id: v.id("packages"),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.id);
    if (!pkg) {
      return null;
    }

    const packageRooms = await ctx.db
      .query("package_rooms")
      .withIndex("by_package_id", (q) => q.eq("package_id", pkg._id))
      .collect();
    const legacyPackageId = getLegacySupabaseId(pkg);
    const legacyPackageRooms = legacyPackageId
      ? await ctx.db
          .query("package_rooms")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];

    const packageFlights = await ctx.db
      .query("package_flights")
      .withIndex("by_package_id", (q) => q.eq("package_id", pkg._id))
      .collect();
    const legacyPackageFlights = legacyPackageId
      ? await ctx.db
          .query("package_flights")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];

    const packageHotels = await ctx.db
      .query("package_hotels")
      .withIndex("by_package_id", (q) => q.eq("package_id", pkg._id))
      .collect();
    const legacyPackageHotels = legacyPackageId
      ? await ctx.db
          .query("package_hotels")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];

    const packageMeals = await ctx.db.query("package_meals").collect();
    const mealsByPackageHotelId = new Map<(typeof packageMeals)[number]["package_hotel_id"], (typeof packageMeals)[number][]>();

    for (const meal of packageMeals) {
      const existingMeals = mealsByPackageHotelId.get(meal.package_hotel_id);

      if (existingMeals) {
        existingMeals.push(meal);
      } else {
        mealsByPackageHotelId.set(meal.package_hotel_id, [meal]);
      }
    }

    return {
      ...pkg,
      rooms: dedupeById([...packageRooms, ...legacyPackageRooms]),
      flights: dedupeById([...packageFlights, ...legacyPackageFlights]),
      hotels: dedupeById([...packageHotels, ...legacyPackageHotels]).map((hotel) => ({
        ...hotel,
        meals: dedupeById(
          [hotel._id, getLegacySupabaseId(hotel)]
            .filter((id): id is (typeof packageMeals)[number]["package_hotel_id"] => Boolean(id))
            .flatMap((id) => mealsByPackageHotelId.get(id) ?? []),
        ).map(
          (meal) => meal.meal_type,
        ),
      })),
    };
  },
});

export const getPackageTemplate = query({
  args: {},
  handler: async (ctx) => {
    const hotelTemplates = await ctx.db.query("hotel_templates").collect();
    const roomTemplates = await ctx.db
      .query("room_templates")
      .collect();

    return {
      hotelTemplates,
      roomTemplates: roomTemplates.sort((a, b) => a.sort_order - b.sort_order),
    };
  },
});

export const checkExistingPackagesForYear = query({
  args: {
    year: v.string(),
    packages: v.array(
      v.object({
        name: v.string(),
        season: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existingPackages = await ctx.db.query("packages").collect();

    const normalizedInput = new Set(
      args.packages.map(
        (pkg) =>
          `${pkg.name}::${args.year}::${pkg.season || ""}`,
      ),
    );

    return existingPackages
      .filter((pkg) =>
        normalizedInput.has(`${pkg.name}::${pkg.year}::${pkg.season || ""}`),
      )
      .map((pkg) => ({
        _id: pkg._id,
        name: pkg.name,
        year: pkg.year,
        season: pkg.season,
      }));
  },
});

export const createPackage = mutation({
  args: {
    payload: v.object({
      name: v.string(),
      duration: v.string(),
      season: v.optional(v.string()),
      transport: v.optional(v.string()),
      year: v.string(),
      status: v.union(v.literal("published"), v.literal("unpublished")),
      inclusions: v.string(),
      exclusions: v.string(),
      hotels: v.array(
        v.object({
          _id: v.optional(v.string()),
          name: v.string(),
          enabled: v.boolean(),
          placeholder: v.string(),
          hotel_type: v.string(),
          meals: v.array(v.string()),
        })
      ),
      
      rooms: v.array(
        v.object({
          _id: v.optional(v.string()),
          room_type: v.string(),
          price: v.number(),
          enabled: v.boolean(),
        }),
      ),
      flights: v.array(
        v.object({
          _id: v.optional(v.string()),
          month: v.string(),
          departure_date: v.string(),
          departure_sector: v.string(),
          return_date: v.string(),
          return_sector: v.string(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const packageDocId = await ctx.db.insert("packages", {
      name: args.payload.name,
      duration: args.payload.duration,
      season: args.payload.season || args.payload.year,
      transport: args.payload.transport || "",
      year: args.payload.year,
      status: args.payload.status,
      inclusions: args.payload.inclusions || "",
      exclusions: args.payload.exclusions || "",
      created_at: now,
      updated_at: now,
    });

    for (const hotel of args.payload.hotels) {
      const packageHotelDocId = await ctx.db.insert("package_hotels", {
        package_id: packageDocId,
        hotel_type: hotel.hotel_type,
        name: hotel.name || "",
        enabled: hotel.enabled,
        placeholder: hotel.placeholder || "",
        created_at: now,
      });

      for (const mealType of hotel.meals) {
        await ctx.db.insert("package_meals", {
          package_hotel_id: packageHotelDocId,
          meal_type: mealType,
          created_at: now,
        });
      }
    }

    for (const room of args.payload.rooms) {
      await ctx.db.insert("package_rooms", {
        package_id: packageDocId,
        room_type: room.room_type,
        price: room.price,
        enabled: room.enabled,
        created_at: now,
      });
    }

    for (const flight of args.payload.flights) {
      await ctx.db.insert("package_flights", {
        package_id: packageDocId,
        month: flight.month,
        departure_date: flight.departure_date,
        departure_sector: flight.departure_sector,
        return_date: flight.return_date,
        return_sector: flight.return_sector,
        created_at: now,
      });
    }

    return {
      packageDocId,
    };
  },
});

export const updatePackage = mutation({
  args: {
    id: v.id("packages"),
    payload: v.object({
      name: v.string(),
      duration: v.string(),
      season: v.optional(v.string()),
      transport: v.optional(v.string()),
      year: v.string(),
      status: v.union(v.literal("published"), v.literal("unpublished")),
      inclusions: v.string(),
      exclusions: v.string(),
      hotels: v.array(v.object({
          _id: v.optional(v.string()),
          name: v.string(),
          enabled: v.boolean(),
          placeholder: v.string(),
          hotel_type: v.string(),
          meals: v.array(v.string()),
      })
        
      
      ),
      rooms: v.array(
        v.object({
          _id: v.optional(v.string()),
          room_type: v.string(),
          price: v.number(),
          enabled: v.boolean(),
        }),
      ),
      flights: v.array(
        v.object({
          _id: v.optional(v.string()),
          month: v.string(),
          departure_date: v.string(),
          departure_sector: v.string(),
          return_date: v.string(),
          return_sector: v.string(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const existingPackage = await ctx.db.get(args.id);
    if (!existingPackage) {
      throw new Error("Package not found");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.id, {
      name: args.payload.name,
      duration: args.payload.duration,
      season: args.payload.season || args.payload.year,
      transport: args.payload.transport || "",
      year: args.payload.year,
      status: args.payload.status,
      inclusions: args.payload.inclusions || "",
      exclusions: args.payload.exclusions || "",
      updated_at: now,
    });

    const existingHotels = await ctx.db
      .query("package_hotels")
      .withIndex("by_package_id", (q) => q.eq("package_id", existingPackage._id))
      .collect();
    const legacyPackageId = getLegacySupabaseId(existingPackage);
    const legacyExistingHotels = legacyPackageId
      ? await ctx.db
          .query("package_hotels")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];
    const allExistingHotels = dedupeById([...existingHotels, ...legacyExistingHotels]);

    for (const hotel of allExistingHotels) {
      const existingMeals = await ctx.db
        .query("package_meals")
        .withIndex("by_package_hotel_id", (q) => q.eq("package_hotel_id", hotel._id))
        .collect();
      const legacyHotelId = getLegacySupabaseId(hotel);
      const legacyExistingMeals = legacyHotelId
        ? await ctx.db
            .query("package_meals")
            .withIndex("by_package_hotel_id", (q) => q.eq("package_hotel_id", legacyHotelId))
            .collect()
        : [];

      for (const meal of dedupeById([...existingMeals, ...legacyExistingMeals])) {
        await ctx.db.delete(meal._id);
      }

      await ctx.db.delete(hotel._id);
    }

    const existingRooms = await ctx.db
      .query("package_rooms")
      .withIndex("by_package_id", (q) => q.eq("package_id", existingPackage._id))
      .collect();
    const legacyExistingRooms = legacyPackageId
      ? await ctx.db
          .query("package_rooms")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];
    for (const room of dedupeById([...existingRooms, ...legacyExistingRooms])) {
      await ctx.db.delete(room._id);
    }

    const existingFlights = await ctx.db
      .query("package_flights")
      .withIndex("by_package_id", (q) => q.eq("package_id", existingPackage._id))
      .collect();
    const legacyExistingFlights = legacyPackageId
      ? await ctx.db
          .query("package_flights")
          .withIndex("by_package_id", (q) => q.eq("package_id", legacyPackageId))
          .collect()
      : [];
    for (const flight of dedupeById([...existingFlights, ...legacyExistingFlights])) {
      await ctx.db.delete(flight._id);
    }

    for (const hotel of args.payload.hotels) {
      const packageHotelDocId = await ctx.db.insert("package_hotels", {
        package_id: existingPackage._id,
        hotel_type: hotel.hotel_type,
        name: hotel.name || "",
        enabled: hotel.enabled,
        placeholder: hotel.placeholder || "",
        created_at: now,
      });

      for (const mealType of hotel.meals) {
        await ctx.db.insert("package_meals", {
          package_hotel_id: packageHotelDocId,
          meal_type: mealType,
          created_at: now,
        });
      }
    }

    for (const room of args.payload.rooms) {
      await ctx.db.insert("package_rooms", {
        package_id: existingPackage._id,
        room_type: room.room_type,
        price: room.price,
        enabled: room.enabled,
        created_at: now,
      });
    }

    for (const flight of args.payload.flights) {
      await ctx.db.insert("package_flights", {
        package_id: existingPackage._id,
        month: flight.month,
        departure_date: flight.departure_date,
        departure_sector: flight.departure_sector,
        return_date: flight.return_date,
        return_sector: flight.return_sector,
        created_at: now,
      });
    }

    return {
      packageId: args.id,
    };
  },
});

export const updatePackageStatus = mutation({
  args: {
    id: v.id("packages"),
    status: v.union(v.literal("published"), v.literal("unpublished")),
  },
  handler: async (ctx, args) => {
    const existingPackage = await ctx.db.get(args.id);
    if (!existingPackage) {
      throw new Error("Package not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updated_at: new Date().toISOString(),
    });

    return {
      packageId: args.id,
      status: args.status,
    };
  },
});

export const migrateLegacyPackageRelations = mutation({
  args: {},
  handler: async (ctx) => {
    const packages = await ctx.db.query("packages").collect();
    const packageIdByLegacyId = new Map<string, (typeof packages)[number]["_id"]>();

    for (const pkg of packages) {
      const legacyId = getLegacySupabaseId(pkg);
      if (legacyId) {
        packageIdByLegacyId.set(legacyId, pkg._id);
      }
    }

    const packageHotels = await ctx.db.query("package_hotels").collect();
    const hotelIdByLegacyId = new Map<string, (typeof packageHotels)[number]["_id"]>();

    for (const hotel of packageHotels) {
      const legacyId = getLegacySupabaseId(hotel);
      if (legacyId) {
        hotelIdByLegacyId.set(legacyId, hotel._id);
      }
    }

    let updatedFlights = 0;
    let updatedRooms = 0;
    let updatedHotels = 0;
    let updatedMeals = 0;

    const packageFlights = await ctx.db.query("package_flights").collect();
    for (const flight of packageFlights) {
      if (typeof flight.package_id === "string") {
        const packageId = packageIdByLegacyId.get(flight.package_id);
        if (packageId) {
          await ctx.db.patch(flight._id, { package_id: packageId });
          updatedFlights += 1;
        }
      }
    }

    const packageRooms = await ctx.db.query("package_rooms").collect();
    for (const room of packageRooms) {
      if (typeof room.package_id === "string") {
        const packageId = packageIdByLegacyId.get(room.package_id);
        if (packageId) {
          await ctx.db.patch(room._id, { package_id: packageId });
          updatedRooms += 1;
        }
      }
    }

    for (const hotel of packageHotels) {
      if (typeof hotel.package_id === "string") {
        const packageId = packageIdByLegacyId.get(hotel.package_id);
        if (packageId) {
          await ctx.db.patch(hotel._id, { package_id: packageId });
          updatedHotels += 1;
        }
      }
    }

    const packageMeals = await ctx.db.query("package_meals").collect();
    for (const meal of packageMeals) {
      if (typeof meal.package_hotel_id === "string") {
        const packageHotelId = hotelIdByLegacyId.get(meal.package_hotel_id);
        if (packageHotelId) {
          await ctx.db.patch(meal._id, { package_hotel_id: packageHotelId });
          updatedMeals += 1;
        }
      }
    }

    return {
      updatedFlights,
      updatedRooms,
      updatedHotels,
      updatedMeals,
    };
  },
});

export const createPackageWithFlight = mutation({
  args: {
    payload: v.object({
      year: v.string(),
      packages: v.array(
        v.object({
          name: v.string(),
          season: v.optional(v.string()),
          rooms: v.optional(
            v.array(
              v.object({
                room_type: v.string(),
                price: v.number(),
                enabled: v.boolean(),
              }),
            ),
          ),
          flights: v.array(
            v.object({
              year_key: v.string(),
              pakej: v.string(),
              code: v.string(),
              month: v.string(),
              departure: v.string(),
              return: v.string(),
              package_name: v.string(),
              sector_departure: v.string(),
              sector_return: v.string(),
            }),
          ),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const hotelTemplates = await ctx.db.query("hotel_templates").collect();
    const roomTemplates = await ctx.db.query("room_templates").collect();
    const existingPackages = await ctx.db.query("packages").collect();

    const createdPackageIds: Array<{
      name: string;
      packageId: string;
      action: "created" | "updated";
    }> = [];

    for (const packageItem of args.payload.packages) {
      const packageSeason = packageItem.season || "";

      const matchedPackage = existingPackages.find(
        (pkg) =>
          pkg.name === packageItem.name &&
          pkg.year === args.payload.year &&
          (pkg.season || "") === packageSeason,
      );

      const packageDocId = matchedPackage
        ? matchedPackage._id
        : await ctx.db.insert("packages", {
            name: packageItem.name,
            duration: "12 HARI 10 MALAM",
            season: packageItem.season,
            transport: "",
            year: args.payload.year,
            status: "unpublished",
            inclusions: "",
            exclusions: "",
            created_at: now,
            updated_at: now,
          });

      if (!matchedPackage) {
        for (const hotelTemplate of hotelTemplates) {
          await ctx.db.insert("package_hotels", {
            package_id: packageDocId,
            hotel_type: hotelTemplate.hotel_type,
            name: hotelTemplate.name || "",
            enabled: hotelTemplate.enabled,
            placeholder: hotelTemplate.placeholder,
            created_at: now,
          });
        }

        const roomPriceOverrides = packageItem.rooms ?? [];
        const roomConfig =
          roomPriceOverrides.length > 0
            ? roomPriceOverrides
            : roomTemplates.map((roomTemplate) => ({
                room_type: roomTemplate.name,
                price: roomTemplate.price,
                enabled: roomTemplate.enabled,
              }));

        for (const roomTemplate of roomConfig) {
          await ctx.db.insert("package_rooms", {
            package_id: packageDocId,
            room_type: roomTemplate.room_type,
            price: roomTemplate.price,
            enabled: roomTemplate.enabled,
            created_at: now,
          });
        }
      }

      const existingFlights = await ctx.db
        .query("package_flights")
        .withIndex("by_package_id", (q) => q.eq("package_id", packageDocId))
        .collect();

      for (const flight of packageItem.flights) {
        const matchedFlight = existingFlights.find(
          (existingFlight) =>
            existingFlight.departure_date === flight.departure &&
            existingFlight.return_date === flight.return,
        );

        if (matchedFlight) {
          await ctx.db.patch(matchedFlight._id, {
            month: flight.month,
            departure_date: flight.departure,
            departure_sector: flight.sector_departure,
            return_date: flight.return,
            return_sector: flight.sector_return,
            created_at: now,
          });
        } else {
          await ctx.db.insert("package_flights", {
            package_id: packageDocId,
            month: flight.month,
            departure_date: flight.departure,
            departure_sector: flight.sector_departure,
            return_date: flight.return,
            return_sector: flight.sector_return,
            created_at: now,
          });
        }
      }

      createdPackageIds.push({
        name: packageItem.name,
        packageId: packageDocId,
        action: matchedPackage ? "updated" : "created",
      });
    }

    return {
      createdCount: createdPackageIds.filter((item) => item.action === "created")
        .length,
      updatedCount: createdPackageIds.filter((item) => item.action === "updated")
        .length,
      packages: createdPackageIds,
    };
  },
});