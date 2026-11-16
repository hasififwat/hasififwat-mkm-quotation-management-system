import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function assertLegacyWritesAllowed(ctx: Pick<QueryCtx, "db">) {
  const migration = await ctx.db.query("quotation_family_migrations")
    .withIndex("by_key", (q) => q.eq("key", "family-v1")).unique();
  if (migration) throw new Error("Quotation writes are frozen for family migration");
}

export async function reserveBaseReference(ctx: Pick<MutationCtx, "db">, hijriYear: string) {
  const [quotations, families, receipts, counter] = await Promise.all([
    ctx.db.query("quotations").withIndex("by_reference", (q) => q.eq("hijri_year", hijriYear)).order("desc").take(1),
    ctx.db.query("quotation_families").withIndex("by_reference", (q) => q.eq("hijri_year", hijriYear)).order("desc").take(1),
    ctx.db.query("quotation_create_receipts").withIndex("by_reference", (q) => q.eq("result.hijri_year", hijriYear)).order("desc").take(1),
    ctx.db.query("quotation_reference_counters").withIndex("by_hijri_year", (q) => q.eq("hijri_year", hijriYear)).unique(),
  ]);
  const sequences = [
    counter?.high_water ?? 0,
    ...quotations.map((quotation) => quotation.sequence_num),
    ...families.map((family) => family.sequence_num),
    ...receipts.filter((receipt) => receipt.result.hijri_year === hijriYear).map((receipt) => receipt.result.sequence_num),
  ];
  if (sequences.some((sequence) => !Number.isSafeInteger(sequence) || sequence < 0)) {
    throw new Error("Invalid retained quotation reference");
  }
  const sequence = sequences.reduce((maximum, value) => Math.max(maximum, value), 0) + 1;
  if (!Number.isSafeInteger(sequence)) throw new Error("Quotation reference sequence exhausted");
  if (counter) await ctx.db.patch(counter._id, { high_water: sequence });
  else await ctx.db.insert("quotation_reference_counters", { hijri_year: hijriYear, high_water: sequence });
  return sequence;
}

export async function assertRevisionVacant(
  ctx: Pick<QueryCtx, "db">,
  familyId: Id<"quotation_families">,
  revision: number,
) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid quotation revision");
  const existing = await ctx.db.query("quotations")
    .withIndex("by_family_revision", (q) => q.eq("family_id", familyId).eq("revision", revision)).unique();
  if (existing) throw new Error("Quotation family revision already exists");
}

export function assertMutableLegacyQuotation(quotation: Doc<"quotations">) {
  if (quotation.family_id || quotation.frozen_document || quotation.document_schema_version !== undefined) {
    throw new Error("Immutable quotation revisions cannot be changed by legacy operations");
  }
}
