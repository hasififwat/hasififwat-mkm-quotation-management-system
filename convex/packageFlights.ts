import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addFlight = mutation({
  args: {
    package_id: v.id("packages"),
    month: v.string(),
    dep_flight: v.optional(v.string()),
    ret_flight: v.optional(v.string()),
    departure_date: v.string(),
    departure_sector: v.string(),
    return_date: v.string(),
    return_sector: v.string(),
    source: v.optional(v.union(v.literal("sync"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("package_flights", {
      package_id: args.package_id,
      month: args.month,
      flight: args.dep_flight || undefined,
      return_flight: args.ret_flight || undefined,
      departure_date: args.departure_date,
      departure_sector: args.departure_sector,
      return_date: args.return_date,
      return_sector: args.return_sector,
      source: args.source ?? "manual",
      created_at: now,
    });
    return String(id);
  },
});

export const deleteFlight = mutation({
  args: { id: v.id("package_flights") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const setSourceManual = mutation({
  args: {},
  handler: async (ctx) => {
    const flights = await ctx.db.query("package_flights").collect();
    let count = 0;
    for (const f of flights) {
      if (!f.source) {
        await ctx.db.patch(f._id, { source: "manual" });
        count++;
      }
    }
    return count;
  },
});

export const promoteToSync = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      const f = await ctx.db.get(id as unknown as Parameters<typeof ctx.db.get>[0]);
      if (f && f.source === "manual") {
        await ctx.db.patch(f._id, { source: "sync" });
      }
    }
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const [flights, packages] = await Promise.all([
      ctx.db.query("package_flights").collect(),
      ctx.db.query("packages").collect(),
    ]);
    const pkgMap = new Map(packages.map((p) => [String(p._id), p]));
    return flights.map((f) => {
      const pkg = pkgMap.get(String(f.package_id));
      return {
        _id:              String(f._id),
        package_id:       String(f.package_id),
        package_name:     pkg?.name     ?? "",
        package_season:   pkg?.season   ?? "",
        month:            f.month,
        flight:           f.flight ?? "",
        return_flight:    f.return_flight ?? "",
        departure_date:   f.departure_date,
        departure_sector: f.departure_sector,
        return_date:      f.return_date,
        return_sector:    f.return_sector,
        source:           f.source ?? "manual",
      };
    });
  },
});
