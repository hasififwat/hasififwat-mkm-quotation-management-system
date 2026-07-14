import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addFlight = mutation({
  args: {
    package_id: v.id("packages"),
    month: v.string(),
    departure_date: v.string(),
    departure_sector: v.string(),
    return_date: v.string(),
    return_sector: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("package_flights", {
      package_id: args.package_id,
      month: args.month,
      departure_date: args.departure_date,
      departure_sector: args.departure_sector,
      return_date: args.return_date,
      return_sector: args.return_sector,
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
        departure_date:   f.departure_date,
        departure_sector: f.departure_sector,
        return_date:      f.return_date,
        return_sector:    f.return_sector,
      };
    });
  },
});
