import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const availability = query({ args: {}, handler: async ctx => {
  const actor = await getAuthUserId(ctx);
  if (!actor) throw new Error("Not authenticated");
  const [release, migration] = await Promise.all([
    ctx.db.query("quotation_revision_release").withIndex("by_key", q => q.eq("key", "revision-v1")).unique(),
    ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", "family-v1")).unique(),
  ]);
  const mode = !migration ? "legacy" as const : !migration.done ? "migration" as const : !release?.enabled ? "maintenance" as const : "active" as const;
  return { mode, actor: String(actor), enabled: mode === "active", frozen: !!migration };
}});

export const source = query({args: {revision_id: v.id("quotations")}, handler: async (ctx, {revision_id}) => {
  if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
  const row = await ctx.db.get(revision_id);
  if (!row) throw new Error("Quotation not found");
  const previous = row.previous_revision_id ? await ctx.db.get(row.previous_revision_id) : null;
  return {id: previous?._id ?? null, reference: previous ? `${previous.hijri_year}-${String(previous.sequence_num).padStart(4, "0")}${previous.revision ? `-R${previous.revision}` : ""}` : null};
}});
