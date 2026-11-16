import { v } from "convex/values";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const key = "family-v1";
const cursorValidator = v.union(v.string(), v.null());
function batchSize(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Limit must be an integer from 1 to 50");
  return limit;
}
async function live(ctx: QueryCtx, table: "packages" | "package_flights" | "clients" | "package_rooms", id: string) {
  const normalized = ctx.db.normalizeId(table, id);
  return normalized ? await ctx.db.get(normalized) : null;
}
async function classify(ctx: QueryCtx, row: Doc<"quotations">) {
  const blockers: string[] = [];
  const gaps: string[] = [];
  if (!row.hijri_year.trim() || !Number.isSafeInteger(row.sequence_num) || row.sequence_num < 1 || !Number.isSafeInteger(row.revision) || row.revision < 0) blockers.push("invalid_reference");
  const base = await ctx.db.query("quotations").withIndex("by_reference", q => q.eq("hijri_year", row.hijri_year).eq("sequence_num", row.sequence_num)).take(2);
  if (base.length > 1) blockers.push("ambiguous_base_reference");
  const exact = await ctx.db.query("quotations").withIndex("by_reference_revision", q => q.eq("hijri_year", row.hijri_year).eq("sequence_num", row.sequence_num).eq("revision", row.revision)).take(2);
  if (exact.length > 1) blockers.push("duplicate_revision_reference");
  if (row.revision > 0) gaps.push("unknown_predecessors");
  if (!row.package_snapshot) gaps.push("missing_package_snapshot");
  if (!row.flight_snapshot) gaps.push("missing_flight_snapshot");
  if (!row.hotels_snapshot) gaps.push("missing_hotels_snapshot");
  if (!row.package_snapshot?.rooms) gaps.push("missing_rooms_snapshot");
  for (const [table, id, name] of [["packages", row.package_id, "package"], ["package_flights", row.flight_id, "flight"], ["clients", row.client_id, "client"]] as const) {
    if (!await live(ctx, table, id)) gaps.push(`missing_live_${name}`);
  }
  const items = await ctx.db.query("quotation_items").withIndex("by_quotation_id", q => q.eq("quotation_id", String(row._id))).take(101);
  if (items.length > 100) blockers.push("item_inventory_limit");
  if (items.length === 0) gaps.push("missing_items");
  for (const item of items) {
    if (item.item_type === "room" && !await live(ctx, "package_rooms", item.package_room_id)) gaps.push("missing_live_room");
    if (item.item_type === "room" && !item.description.trim()) gaps.push("missing_saved_room_label");
  }
  const families = await ctx.db.query("quotation_families").withIndex("by_reference", q => q.eq("hijri_year", row.hijri_year).eq("sequence_num", row.sequence_num)).take(2);
  if (families.length > 1) blockers.push("duplicate_family_reference");
  if (row.family_id) {
    const family = await ctx.db.get(row.family_id);
    const members = await ctx.db.query("quotations").withIndex("by_family_revision", q => q.eq("family_id", row.family_id)).take(2);
    if (!family || family.hijri_year !== row.hijri_year || family.sequence_num !== row.sequence_num || family.current_revision_id !== row._id || family.archived !== (row.archived ?? false) || members.length !== 1 || families[0]?._id !== row.family_id) blockers.push("inconsistent_membership");
    if (row.previous_revision_id || row.legacy_provenance !== "legacy_unknown" || row.document_schema_version !== 0 || row.saved_by !== undefined || row.issue_date !== undefined || row.snapshot_completeness !== "unknown") blockers.push("inconsistent_legacy_metadata");
    const counter = await ctx.db.query("quotation_reference_counters").withIndex("by_hijri_year", q => q.eq("hijri_year", row.hijri_year)).unique();
    if (!counter || counter.high_water < row.sequence_num) blockers.push("missing_reference_reservation");
  } else if (families.length || row.previous_revision_id || row.legacy_provenance !== undefined || row.document_schema_version !== undefined || row.saved_by !== undefined || row.issue_date !== undefined || row.snapshot_completeness !== undefined) blockers.push("partial_membership");
  return { id: row._id, hijri_year: row.hijri_year, sequence_num: row.sequence_num, revision: row.revision, archived: row.archived ?? false, family_id: row.family_id ?? null, classification: blockers.length ? "blocked" : row.family_id ? "migrated" : "singleton", blockers, gaps: [...new Set(gaps)] };
}

export const inventory = internalQuery({
  args: { table: v.union(v.literal("quotations"), v.literal("quotation_items"), v.literal("quotation_logs"), v.literal("quotation_create_receipts"), v.literal("quotation_families")), cursor: cursorValidator, limit: v.number() },
  handler: async (ctx, args) => {
    const opts = { cursor: args.cursor, numItems: batchSize(args.limit) };
    if (args.table === "quotations") {
      const page = await ctx.db.query("quotations").paginate(opts);
      return { ...page, page: await Promise.all(page.page.map(row => classify(ctx, row))) };
    }
    if (args.table === "quotation_families") {
      const page = await ctx.db.query("quotation_families").paginate(opts);
      const rows = await Promise.all(page.page.map(async family => {
        const current = await ctx.db.get(family.current_revision_id);
        const same = await ctx.db.query("quotation_families").withIndex("by_reference", q => q.eq("hijri_year", family.hijri_year).eq("sequence_num", family.sequence_num)).take(2);
        return { id: family._id, blockers: [...(!current || current.family_id !== family._id ? ["invalid_current_pointer"] : []), ...(same.length > 1 ? ["duplicate_family_reference"] : [])] };
      }));
      return { ...page, page: rows };
    }
    const page = await ctx.db.query(args.table).paginate(opts);
    const rows = await Promise.all(page.page.map(async row => {
      const id = "result" in row ? row.result.id : row.quotation_id;
      const normalized = ctx.db.normalizeId("quotations", id);
      const target = normalized ? await ctx.db.get(normalized) : null;
      const blockers = !target ? ["orphan_reference"] : [];
      if ("result" in row && target && (target.hijri_year !== row.result.hijri_year || target.sequence_num !== row.result.sequence_num || target.revision !== row.result.revision)) blockers.push("receipt_reference_mismatch");
      return { id: row._id, quotation_id: id, blockers };
    }));
    return { ...page, page: rows };
  },
});

export const freeze = internalMutation({
  args: { acknowledgement: v.literal("Reviewed cutover write freeze") },
  handler: async ctx => {
    const existing = await ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", key)).unique();
    if (existing) return existing._id;
    return await ctx.db.insert("quotation_family_migrations", { key, cursor: null, done: false });
  },
});

export const backfill = internalMutation({
  args: { expectedCursor: cursorValidator, limit: v.number(), dryRun: v.optional(v.boolean()), restart: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const numItems = batchSize(args.limit);
    const dryRun = args.dryRun ?? true;
    const run = await ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", key)).unique();
    if (!dryRun && !run) throw new Error("Freeze legacy writers before backfill");
    const cursor = dryRun ? args.expectedCursor : args.restart ? null : run?.cursor ?? null;
    if (args.restart && !run?.done) throw new Error("Only a completed scan can restart");
    if (args.expectedCursor !== cursor) throw new Error("Migration checkpoint conflict");
    if (!dryRun && run?.done && !args.restart) return { done: true, cursor, changed: 0, rows: [] };
    const page = await ctx.db.query("quotations").paginate({ cursor, numItems });
    const rows = await Promise.all(page.page.map(row => classify(ctx, row)));
    if (!dryRun && rows.some(row => row.blockers.length)) throw new Error("Ambiguous or inconsistent quotation identity blocks this batch. Run inventory.");
    let changed = 0;
    for (const [index, row] of page.page.entries()) {
      if (rows[index].blockers.length || row.family_id) continue;
      changed++;
      if (dryRun) continue;
      const familyId = await ctx.db.insert("quotation_families", { hijri_year: row.hijri_year, sequence_num: row.sequence_num, current_revision_id: row._id, archived: row.archived ?? false });
      const counter = await ctx.db.query("quotation_reference_counters").withIndex("by_hijri_year", q => q.eq("hijri_year", row.hijri_year)).unique();
      if (!counter) await ctx.db.insert("quotation_reference_counters", { hijri_year: row.hijri_year, high_water: row.sequence_num });
      else if (counter.high_water < row.sequence_num) await ctx.db.patch(counter._id, { high_water: row.sequence_num });
      await ctx.db.patch(row._id, { family_id: familyId, legacy_provenance: "legacy_unknown", document_schema_version: 0, snapshot_completeness: "unknown" });
    }
    if (!dryRun && run) await ctx.db.patch(run._id, { cursor: page.continueCursor, done: page.isDone });
    return { done: page.isDone, cursor: page.continueCursor, changed, rows };
  },
});
