import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { assertFamilyArchivable, familyInquiryContext } from "./lib/inquiryLifecycle";

export const history = query({
  args: { family_id: v.id("quotation_families") },
  handler: async (ctx, {family_id}) => {
    if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
    const family = await ctx.db.get(family_id);
    if (!family) throw new Error("Quotation family not found");
    const revisions = await ctx.db.query("quotations").withIndex("by_family_revision", q => q.eq("family_id", family_id)).collect();
    const inquiry = await familyInquiryContext(ctx, family);
    return {family, revisions: revisions.sort((a,b) => a.revision - b.revision), ...(inquiry ? { inquiry } : {})};
  },
});

export const archive = mutation({
  args: { family_id: v.id("quotation_families") },
  handler: async (ctx, {family_id}) => {
    const actor = await getAuthUserId(ctx);
    if (!actor) throw new Error("Not authenticated");
    const release = await ctx.db.query("quotation_revision_release").withIndex("by_key", q => q.eq("key", "revision-v1")).unique();
    const migration = await ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", "family-v1")).unique();
    if (!release?.enabled || !migration?.done) throw new Error("Quotation revision release is inactive");
    const family = await ctx.db.get(family_id);
    if (!family) throw new Error("Quotation family not found");
    assertFamilyArchivable(family);
    if (family.archived) return {family_id, archived: true};
    await ctx.db.patch(family_id, {archived: true});
    await ctx.db.insert("quotation_logs", {
      quotation_id: family.current_revision_id, action: "family_archived",
      description: "Quotation family archived", performed_by: actor,
      created_at: new Date().toISOString(), snapshot_data: JSON.stringify({family_id}),
    });
    return {family_id, archived: true};
  },
});
