import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      rooms: dedupeById(roomsByPackageId.get(pkg._id) ?? []),
      flights: dedupeById(flightsByPackageId.get(pkg._id) ?? []),
      hotels: dedupeById(hotelsByPackageId.get(pkg._id) ?? []).map((hotel) => ({
        ...hotel,
        meals: dedupeById(mealsByPackageHotelId.get(hotel._id) ?? []).map(
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

    const packageFlights = await ctx.db
      .query("package_flights")
      .withIndex("by_package_id", (q) => q.eq("package_id", pkg._id))
      .collect();

    const packageHotels = await ctx.db
      .query("package_hotels")
      .withIndex("by_package_id", (q) => q.eq("package_id", pkg._id))
      .collect();

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
      rooms: dedupeById(packageRooms),
      flights: dedupeById(packageFlights),
      hotels: dedupeById(packageHotels).map((hotel) => ({
        ...hotel,
        meals: dedupeById(mealsByPackageHotelId.get(hotel._id) ?? []).map(
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
    const nextSeason =
      args.payload.season?.trim() || existingPackage.season || args.payload.year;

    await ctx.db.patch(args.id, {
      name: args.payload.name,
      duration: args.payload.duration,
      season: nextSeason,
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
    const allExistingHotels = dedupeById(existingHotels);

    for (const hotel of allExistingHotels) {
      const existingMeals = await ctx.db
        .query("package_meals")
        .withIndex("by_package_hotel_id", (q) => q.eq("package_hotel_id", hotel._id))
        .collect();

      for (const meal of dedupeById(existingMeals)) {
        await ctx.db.delete(meal._id);
      }

      await ctx.db.delete(hotel._id);
    }

    const existingRooms = await ctx.db
      .query("package_rooms")
      .withIndex("by_package_id", (q) => q.eq("package_id", existingPackage._id))
      .collect();
    for (const room of dedupeById(existingRooms)) {
      await ctx.db.delete(room._id);
    }

    const existingFlights = await ctx.db
      .query("package_flights")
      .withIndex("by_package_id", (q) => q.eq("package_id", existingPackage._id))
      .collect();
    for (const flight of dedupeById(existingFlights)) {
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
            flight: flight.code,
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
            flight: flight.code,
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

export const backfillMissingHotelsFromTemplates = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const now = new Date().toISOString();

    const [packages, packageHotels, hotelTemplates] = await Promise.all([
      ctx.db.query("packages").collect(),
      ctx.db.query("package_hotels").collect(),
      ctx.db.query("hotel_templates").collect(),
    ]);

    const existingTypesByPackageId = new Map<
      (typeof packages)[number]["_id"],
      Set<string>
    >();

    for (const hotel of packageHotels) {
      const packageId = hotel.package_id;
      if (typeof packageId === "string") {
        continue;
      }

      const normalizedType = hotel.hotel_type.trim().toLowerCase();
      const existing = existingTypesByPackageId.get(packageId);
      if (existing) {
        existing.add(normalizedType);
      } else {
        existingTypesByPackageId.set(packageId, new Set([normalizedType]));
      }
    }

    let insertedCount = 0;
    const insertedByTemplateType: Record<string, number> = {};

    for (const pkg of packages) {
      const existingTypes =
        existingTypesByPackageId.get(pkg._id) ?? new Set<string>();

      for (const template of hotelTemplates) {
        const normalizedTemplateType = template.hotel_type.trim().toLowerCase();
        if (existingTypes.has(normalizedTemplateType)) {
          continue;
        }

        if (!dryRun) {
          await ctx.db.insert("package_hotels", {
            package_id: pkg._id,
            hotel_type: template.hotel_type,
            name: template.name || "",
            enabled: template.enabled,
            placeholder: template.placeholder,
            created_at: now,
          });
        }

        existingTypes.add(normalizedTemplateType);
        insertedCount += 1;
        insertedByTemplateType[template.hotel_type] =
          (insertedByTemplateType[template.hotel_type] ?? 0) + 1;
      }

      existingTypesByPackageId.set(pkg._id, existingTypes);
    }

    return {
      dryRun,
      packageCount: packages.length,
      templateCount: hotelTemplates.length,
      insertedCount,
      insertedByTemplateType,
    };
  },
});

export const reconcilePackageHotelsFromTemplates = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    keepBeforeIso: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const now = new Date().toISOString();
    const keepBeforeIso = args.keepBeforeIso;

    const [packages, packageHotels, hotelTemplates, packageMeals] =
      await Promise.all([
        ctx.db.query("packages").collect(),
        ctx.db.query("package_hotels").collect(),
        ctx.db.query("hotel_templates").collect(),
        ctx.db.query("package_meals").collect(),
      ]);

    const packageIdByKey = new Map(
      packages.map((pkg) => [String(pkg._id), pkg._id]),
    );

    const templateByType = new Map(
      hotelTemplates.map((template) => [
        template.hotel_type.trim().toLowerCase(),
        template,
      ]),
    );

    const mealCountByHotelId = new Map<string, number>();
    for (const meal of packageMeals) {
      const key = String(meal.package_hotel_id);
      mealCountByHotelId.set(key, (mealCountByHotelId.get(key) ?? 0) + 1);
    }

    const hotelsByPackageAndType = new Map<string, (typeof packageHotels)[number][]>();
    for (const hotel of packageHotels) {
      const packageKey = String(hotel.package_id);
      if (!packageIdByKey.has(packageKey)) {
        continue;
      }

      const normalizedType = hotel.hotel_type.trim().toLowerCase();
      if (!templateByType.has(normalizedType)) {
        continue;
      }

      const groupKey = `${packageKey}::${normalizedType}`;
      const existing = hotelsByPackageAndType.get(groupKey);
      if (existing) {
        existing.push(hotel);
      } else {
        hotelsByPackageAndType.set(groupKey, [hotel]);
      }
    }

    let insertedCount = 0;
    let deletedHotelCount = 0;
    let deletedMealCount = 0;
    const insertedByTemplateType: Record<string, number> = {};

    for (const pkg of packages) {
      const packageKey = String(pkg._id);

      for (const [normalizedType, template] of templateByType) {
        const groupKey = `${packageKey}::${normalizedType}`;
        const hotels = hotelsByPackageAndType.get(groupKey) ?? [];

        if (hotels.length === 0) {
          if (!dryRun) {
            await ctx.db.insert("package_hotels", {
              package_id: pkg._id,
              hotel_type: template.hotel_type,
              name: template.name || "",
              enabled: template.enabled,
              placeholder: template.placeholder,
              created_at: now,
            });
          }

          insertedCount += 1;
          insertedByTemplateType[template.hotel_type] =
            (insertedByTemplateType[template.hotel_type] ?? 0) + 1;
          continue;
        }

        if (hotels.length === 1) {
          continue;
        }

        const sortedHotels = [...hotels].sort((a, b) => {
          const aCreated = a.created_at || "";
          const bCreated = b.created_at || "";

          const aBeforeCutoff =
            keepBeforeIso && aCreated ? (aCreated < keepBeforeIso ? 1 : 0) : 0;
          const bBeforeCutoff =
            keepBeforeIso && bCreated ? (bCreated < keepBeforeIso ? 1 : 0) : 0;
          if (aBeforeCutoff !== bBeforeCutoff) {
            return bBeforeCutoff - aBeforeCutoff;
          }

          const aMealCount = mealCountByHotelId.get(String(a._id)) ?? 0;
          const bMealCount = mealCountByHotelId.get(String(b._id)) ?? 0;
          if (aMealCount !== bMealCount) {
            return bMealCount - aMealCount;
          }

          if (aCreated !== bCreated) {
            return aCreated.localeCompare(bCreated);
          }

          return String(a._id).localeCompare(String(b._id));
        });

        const duplicateHotels = sortedHotels.slice(1);
        for (const duplicate of duplicateHotels) {
          const duplicateMealRows = packageMeals.filter(
            (meal) => String(meal.package_hotel_id) === String(duplicate._id),
          );

          if (!dryRun) {
            for (const meal of duplicateMealRows) {
              await ctx.db.delete(meal._id);
            }
            await ctx.db.delete(duplicate._id);
          }

          deletedMealCount += duplicateMealRows.length;
          deletedHotelCount += 1;
        }
      }
    }

    return {
      dryRun,
      packageCount: packages.length,
      templateCount: hotelTemplates.length,
      insertedCount,
      deletedHotelCount,
      deletedMealCount,
      insertedByTemplateType,
    };
  },
});