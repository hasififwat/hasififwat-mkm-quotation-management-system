import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { revisionReleaseMode } from "./lib/quotationFamilyIdentity";

export const availability = query({ args: {}, handler: async ctx => {
  const actor = await getAuthUserId(ctx);
  if (!actor) throw new Error("Not authenticated");
  const mode = await revisionReleaseMode(ctx);
  return { mode, actor: String(actor), enabled: mode === "active", frozen: mode !== "legacy" };
}});

export const source = query({args: {revision_id: v.id("quotations")}, handler: async (ctx, {revision_id}) => {
  if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
  const row = await ctx.db.get(revision_id);
  if (!row) throw new Error("Quotation not found");
  const previous = row.previous_revision_id ? await ctx.db.get(row.previous_revision_id) : null;
  return {id: previous?._id ?? null, reference: previous ? `${previous.hijri_year}-${String(previous.sequence_num).padStart(4, "0")}${previous.revision ? `-R${previous.revision}` : ""}` : null};
}});
