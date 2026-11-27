import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

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
