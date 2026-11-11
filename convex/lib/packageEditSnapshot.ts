import { PACKAGE_EDIT_CONFLICT_MESSAGE } from "../../src/domain/package-edit-conflict";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type PackageEditSnapshot = {
  package: Doc<"packages">;
  rooms: Doc<"package_rooms">[];
  flights: Doc<"package_flights">[];
  hotels: Doc<"package_hotels">[];
  meals: Doc<"package_meals">[];
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function packageEditToken(snapshot: PackageEditSnapshot): string {
  const ordered = <T extends { _id: string }>(rows: T[]) => [...rows].sort((a, b) => a._id.localeCompare(b._id));
  return `package-edit-v1:${canonical({
    package: snapshot.package,
    rooms: ordered(snapshot.rooms),
    flights: ordered(snapshot.flights),
    hotels: ordered(snapshot.hotels),
    meals: ordered(snapshot.meals),
  })}`;
}

export async function readPackageEditSnapshot(ctx: Pick<QueryCtx, "db">, id: Id<"packages">): Promise<PackageEditSnapshot | null> {
  const pkg = await ctx.db.get(id);
  if (!pkg) return null;
  const [rooms, flights, hotels] = await Promise.all([
    ctx.db.query("package_rooms").withIndex("by_package_id", q => q.eq("package_id", id)).collect(),
    ctx.db.query("package_flights").withIndex("by_package_id", q => q.eq("package_id", id)).collect(),
    ctx.db.query("package_hotels").withIndex("by_package_id", q => q.eq("package_id", id)).collect(),
  ]);
  const meals = (await Promise.all(hotels.map(h => ctx.db.query("package_meals").withIndex("by_package_hotel_id", q => q.eq("package_hotel_id", h._id)).collect()))).flat();
  return { package: pkg, rooms, flights, hotels, meals };
}

export function requireCurrentPackageEdit(expected: string | undefined, snapshot: PackageEditSnapshot): void {
  if (!expected || expected !== packageEditToken(snapshot)) {
    throw new ConvexError({
      code: "PACKAGE_EDIT_CONFLICT",
      message: PACKAGE_EDIT_CONFLICT_MESSAGE,
    });
  }
}
