import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function readCurrentQuotations(ctx: Pick<QueryCtx, "db">, archived = false): Promise<Doc<"quotations">[]> {
  const [families, legacy] = await Promise.all([
    ctx.db.query("quotation_families").withIndex("by_archived", q => q.eq("archived", archived)).collect(),
    ctx.db.query("quotations").withIndex("by_family_revision", q => q.eq("family_id", undefined)).collect(),
  ]);
  const current = await Promise.all(families.map(async family => {
    const revision = await ctx.db.get(family.current_revision_id);
    return revision?.family_id === family._id ? revision : null;
  }));
  return [
    ...current.filter((revision): revision is Doc<"quotations"> => revision !== null),
    ...legacy.filter(revision => Boolean(revision.archived) === archived),
  ];
}

export function quotationReference(quotation: Doc<"quotations">) {
  const base = `${quotation.hijri_year}-${String(quotation.sequence_num).padStart(4, "0")}`;
  return quotation.revision > 0 ? `${base}-R${quotation.revision}` : base;
}

export function quotationMatches(quotation: Doc<"quotations">, search: string, legacyPackageName = "") {
  const term = search.trim().toLowerCase();
  const packageName = quotation.package_snapshot?.name ?? (quotation.family_id || quotation.frozen_document ? "" : legacyPackageName);
  return [quotation.client_name, packageName, quotationReference(quotation)].some(value => value.toLowerCase().includes(term));
}

export function currentPage<T extends { _id: string; created_at: string; updated_at: string }>(
  rows: T[], opts: {cursor: string | null; numItems: number}, sortBy: "created_at" | "updated_at" = "updated_at", direction: "asc" | "desc" = "desc",
) {
  const compare = (a: T, b: T) => (a[sortBy].localeCompare(b[sortBy]) || a._id.localeCompare(b._id)) * (direction === "asc" ? 1 : -1);
  const sorted = [...rows].sort(compare);
  let remaining = sorted;
  if (opts.cursor) {
    const cursor = JSON.parse(opts.cursor) as {value: string; id: string; sortBy: string; direction: string};
    if (cursor.sortBy !== sortBy || cursor.direction !== direction || typeof cursor.value !== "string" || typeof cursor.id !== "string") throw new Error("Invalid quotation cursor");
    remaining = sorted.filter(row => ((row[sortBy].localeCompare(cursor.value) || row._id.localeCompare(cursor.id)) * (direction === "asc" ? 1 : -1)) > 0);
  }
  const page = remaining.slice(0, opts.numItems);
  const last = page.at(-1);
  return {page, isDone: remaining.length <= page.length, continueCursor: last ? JSON.stringify({value:last[sortBy],id:last._id,sortBy,direction}) : ""};
}
