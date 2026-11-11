import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function requireQuotationReferencesPreserved(
  ctx: Pick<MutationCtx, "db">,
  packageId: Id<"packages">,
  existingRooms: Doc<"package_rooms">[],
  removedFlightIds: ReadonlySet<string>,
  incomingRoomTypes: ReadonlySet<string>,
): Promise<void> {
  const removedRoomTypes = new Set(existingRooms.map(room => room.room_type)
    .filter(type => !incomingRoomTypes.has(type)));
  if (!removedFlightIds.size && !removedRoomTypes.size) return;

  const roomsById = new Map(existingRooms.map(room => [String(room._id), room.room_type]));
  const quotations = await ctx.db.query("quotations")
    .withIndex("by_package_id", q => q.eq("package_id", String(packageId))).collect();
  const affected: string[] = [];
  for (const quotation of quotations) {
    const missing: string[] = [];
    if (removedFlightIds.has(quotation.flight_id)) missing.push(`flight ${quotation.flight_id}`);
    if (removedRoomTypes.size) {
      const items = await ctx.db.query("quotation_items")
        .withIndex("by_quotation_id", q => q.eq("quotation_id", String(quotation._id))).collect();
      const types = new Set(items.filter(item => item.item_type === "room")
        .map(item => roomsById.get(item.package_room_id) ?? item.description));
      for (const type of types) {
        if (removedRoomTypes.has(type)) missing.push(`room type '${type}'`);
      }
    }
    if (missing.length) {
      const reference = `${quotation.hijri_year}-${String(quotation.sequence_num).padStart(4, "0")}${quotation.revision > 0 ? `-R${quotation.revision}` : ""}`;
      affected.push(`${reference} (${quotation._id}) needs ${missing.join(" and ")}`);
    }
  }
  if (affected.length) {
    const remaining = affected.length > 5 ? ` Another ${affected.length - 5} quotations are affected.` : "";
    throw new ConvexError({
      code: "PACKAGE_REFERENCE_CONFLICT",
      message: `The package was not saved. ${affected.slice(0, 5).join("; ")}.${remaining} Keep these flights and room types, or change the affected quotations before removing them. Your complete draft is still here.`,
    });
  }
}
