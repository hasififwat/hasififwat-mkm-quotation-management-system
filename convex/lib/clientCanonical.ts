import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function canonicalClientId(ctx: Pick<QueryCtx, "db">, clientId: Id<"clients">): Promise<Id<"clients">> {
  const seen = new Set<string>();
  let current = clientId;
  while (true) {
    if (seen.has(current)) throw new Error("Client alias cycle");
    seen.add(current);
    const alias = await ctx.db.query("client_aliases").withIndex("by_alias_client_id", q => q.eq("alias_client_id", current)).unique();
    if (!alias) return current;
    current = alias.canonical_client_id;
  }
}

export async function associateClients(ctx: MutationCtx, actor: string, canonicalId: Id<"clients">, duplicateIds: Id<"clients">[]) {
  if (duplicateIds.includes(canonicalId) || new Set(duplicateIds).size !== duplicateIds.length) throw new Error("Invalid duplicate client selection");
  const canonical = await ctx.db.get(canonicalId);
  if (!canonical) throw new Error("Canonical client not found");
  const target = await canonicalClientId(ctx, canonicalId);
  const targetClient = await ctx.db.get(target);
  if (!targetClient) throw new Error("Canonical client not found");
  const duplicates = await Promise.all(duplicateIds.map(async id => {
    if (!await ctx.db.get(id)) throw new Error("Duplicate client not found");
    if (id === target) throw new Error("Client merge would create an alias cycle");
    await canonicalClientId(ctx, id);
    return {id, alias: await ctx.db.query("client_aliases").withIndex("by_alias_client_id", q => q.eq("alias_client_id", id)).unique()};
  }));
  const now = new Date().toISOString();
  for (const {id, alias} of duplicates) {
    const values = {canonical_client_id: target, updated_by: actor, updated_at: now};
    if (alias) await ctx.db.patch(alias._id, values);
    else await ctx.db.insert("client_aliases", {alias_client_id: id, ...values});
  }
  return {canonicalId: target, canonicalName: targetClient.name, relinkedQuotations: 0, removedClients: [] as string[], associatedClients: duplicateIds};
}
