import { enqueueRevisionPdf } from "./quotationPdfArtifacts";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v, type Infer } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { reserveBaseReference, assertRevisionVacant } from "./lib/quotationFamilyIdentity";
import { auditOptionSave, editInquiryOption, inquiryDestination, placeNewOption } from "./lib/inquiryLifecycle";
import { quotationSelectionContext } from "../src/domain/quotation-selection-context";
import { getMappedHijriYear } from "../src/domain/umrah-years";
import { requireDescriptions, requirePrices, requireFlightDates } from "../src/domain/submission-validation";

const pricedLine = { price: v.number(), pax: v.number() };
const replacement = v.object({
  mode: v.literal("replace"), package_id: v.id("packages"), flight_id: v.id("package_flights"),
  reviewed_context: v.string(),
  rooms: v.array(v.object({ room_type: v.string(), ...pricedLine })),
});
const fields = {
  request_key: v.string(), pic_name: v.string(), branch: v.string(), notes: v.string(),
  client: v.union(v.object({ mode: v.literal("retain") }), v.object({ mode: v.literal("replace"), id: v.id("clients") })),
  selection: v.union(replacement, v.object({ mode: v.literal("retain"), rooms: v.optional(v.array(v.object({source_item_id: v.id("quotation_items"), ...pricedLine}))) })),
  extras: v.union(v.object({ mode: v.literal("retain") }), v.object({ mode: v.literal("replace"),
    addons: v.array(v.object({ name: v.string(), ...pricedLine })),
    discounts: v.array(v.object({ name: v.string(), ...pricedLine })),
  })),
};
export const saveCommand = v.union(
  v.object({ operation: v.literal("create"), inquiry_destination: v.optional(inquiryDestination), ...fields }),
  v.object({ operation: v.literal("append"), family_id: v.id("quotation_families"),
    source_revision_id: v.id("quotations"), expected_current_id: v.id("quotations"),
    expected_inquiry_cycle: v.optional(v.number()), ...fields }),
);
export type SaveCommand = Infer<typeof saveCommand>;
export type SavedItem = Omit<Doc<"quotation_items">, "_id" | "_creationTime" | "quotation_id" | "created_at">;
export type FrozenQuotationDocumentV1 = Pick<Doc<"quotations">,
  "client_id" | "client_name" | "package_id" | "flight_id" | "package_snapshot" |
  "flight_snapshot" | "hotels_snapshot" | "pic_name" | "branch" | "notes" | "total_amount"> & {
  version: 1; quotation_number: string; issue_date: string; saved_by: string;
  status: "draft"; client_phone: string | null; return_flight: string | null;
  items: SavedItem[]; provenance: "legacy_unknown" | null;
};
function conflict(code: string, message: string): never { throw new ConvexError({ code, message }); }
export function canonicalSave(command: SaveCommand): string {
  return JSON.stringify(command, (key, value) => key === "request_key" ? undefined :
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}
function price(value: number) {
  requirePrices([{price: value}], "Line");
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) throw new Error("Invalid price");
  return Math.round(value * 100) / 100;
}
function quantity(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Quantity must be a positive integer");
  return value;
}
function line(item_type: string, description: string, package_room_id: string, value: {price: number; pax: number}): SavedItem {
  const amount = price(value.price);
  return { item_type, description, package_room_id, quantity: quantity(value.pax),
    unit_price: item_type === "discount" ? -amount : amount, original_price: amount };
}

export async function saveRevision(ctx: MutationCtx, actor: string, command: SaveCommand) {
  if (!actor) throw new Error("Not authenticated");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command.request_key)) throw new Error("Invalid request key");
  const content = canonicalSave(command);
  const receipt = await ctx.db.query("quotation_save_receipts").withIndex("by_actor_request_key", q => q.eq("actor", actor).eq("request_key", command.request_key)).unique();
  if (receipt) {
    if (receipt.content !== content) conflict("QUOTATION_ATTEMPT_CONFLICT", "This request key already saved different content. Keep your draft and review the saved quotation.");
    return receipt.result;
  }
  const release = await ctx.db.query("quotation_revision_release").withIndex("by_key", q => q.eq("key", "revision-v1")).unique();
  const migration = await ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", "family-v1")).unique();
  if (!release?.enabled || !migration?.done) throw new Error("Quotation revision release is inactive");
  const nowMs = Date.now();
  let source: Doc<"quotations"> | null = null;
  let family: Doc<"quotation_families"> | null = null;
  let option: Awaited<ReturnType<typeof editInquiryOption>> | Awaited<ReturnType<typeof placeNewOption>> = null;
  if (command.operation === "append") {
    family = await ctx.db.get(command.family_id);
    source = await ctx.db.get(command.source_revision_id);
    if (!family || !source || source.family_id !== family._id || source.hijri_year !== family.hijri_year || source.sequence_num !== family.sequence_num) throw new Error("Invalid family and source identity");
    if (family.archived) throw new Error("Quotation family is archived");
    if (family.current_revision_id !== command.expected_current_id || source._id !== command.expected_current_id) conflict("QUOTATION_STALE_EDITOR", "A newer revision exists. Your draft has not been saved. Keep your entries and review the current revision.");
    option = await editInquiryOption(ctx, family, command.client.mode, command.expected_inquiry_cycle, nowMs);
  }
  const savedItems = source ? await ctx.db.query("quotation_items").withIndex("by_quotation_id", q => q.eq("quotation_id", source!._id)).collect() : [];
  const retained = savedItems.map(({_id, _creationTime, quotation_id, created_at, ...item}) => item);
  let client_id: string, client_name: string;
  let client_phone: string | null = null;
  let return_flight: string | null = null;
  if (command.client.mode === "retain") {
    if (!source) throw new Error("Create requires a client selection");
    ({client_id, client_name} = source);
    const frozen = source.frozen_document ? JSON.parse(source.frozen_document) : null;
    client_phone = frozen?.client_phone ?? null;
  } else {
    if (command.operation === "create") {
      if (!command.inquiry_destination) conflict("INQUIRY_DESTINATION_CHANGED", "Review the Inquiry destination before saving your draft.");
      option = await placeNewOption(ctx, command.client.id, command.inquiry_destination, nowMs);
    }
    const client = await ctx.db.get(option && "client_id" in option ? option.client_id : command.client.id);
    if (!client) throw new Error("Client not found");
    client_id = client._id; client_name = client.name; client_phone = client.phone_number ?? null;
  }
  let package_id: string, flight_id: string, year: string;
  let package_snapshot: Doc<"quotations">["package_snapshot"];
  let flight_snapshot: Doc<"quotations">["flight_snapshot"];
  let hotels_snapshot: Doc<"quotations">["hotels_snapshot"];
  let items: SavedItem[];
  if (command.selection.mode === "retain") {
    if (!source) throw new Error("Create requires a reviewed selection");
    ({package_id, flight_id, package_snapshot, flight_snapshot, hotels_snapshot} = source);
    year = source.hijri_year;
    return_flight = source.frozen_document ? JSON.parse(source.frozen_document).return_flight ?? null : null;
    const requested = command.selection.rooms;
    if (requested) {
      if (!requested.length || new Set(requested.map(room => room.source_item_id)).size !== requested.length) throw new Error("Invalid retained rooms");
      items = requested.map(value => {
        const saved = savedItems.find(item => item._id === value.source_item_id && item.item_type === "room");
        if (!saved) throw new Error("Room does not belong to source revision");
        return line("room", saved.description, saved.package_room_id, value);
      });
    } else items = retained.filter(item => item.item_type === "room");
  } else {
    const selection = command.selection;
    const pkg = await ctx.db.get(selection.package_id);
    const flight = await ctx.db.get(selection.flight_id);
    if (!pkg || pkg.archived) throw new Error("Package unavailable");
    if (!flight || String(flight.package_id) !== String(pkg._id)) throw new Error("Selected flight does not belong to the selected package");
    requireFlightDates(flight);
    const [rooms, flights, hotels, meals] = await Promise.all([
      ctx.db.query("package_rooms").withIndex("by_package_id", q => q.eq("package_id", pkg._id)).collect(),
      ctx.db.query("package_flights").withIndex("by_package_id", q => q.eq("package_id", pkg._id)).collect(),
      ctx.db.query("package_hotels").withIndex("by_package_id", q => q.eq("package_id", pkg._id)).collect(),
      ctx.db.query("package_meals").collect(),
    ]);
    if (selection.reviewed_context !== quotationSelectionContext(pkg, rooms, flights, hotels, meals)) conflict("QUOTATION_SELECTION_CONFLICT", "The selection changed. Keep your draft and review the latest package.");
    if (!selection.rooms.length) throw new Error("At least one room is required");
    requirePrices(rooms, "Package room");
    items = selection.rooms.map(value => {
      const matches = rooms.filter(room => room.room_type === value.room_type);
      if (matches.length !== 1 || !matches[0].enabled) throw new Error("Selected room unavailable or ambiguous");
      return line("room", value.room_type, matches[0]._id, value);
    });
    return_flight = flight.return_flight ?? null;
    package_id = pkg._id; flight_id = flight._id; year = getMappedHijriYear(pkg.year);
    package_snapshot = { name: pkg.name, year: pkg.year, duration: pkg.duration, transport: pkg.transport,
      package_code: pkg.package_code, inclusions: pkg.inclusions, exclusions: pkg.exclusions,
      package_updated_at: pkg.updated_at, rooms: rooms.map(({room_type,price,enabled}) => ({room_type,price,enabled})) };
    flight_snapshot = { id: flight._id, month: flight.month, flight: flight.flight, departure_date: flight.departure_date,
      departure_sector: flight.departure_sector, return_date: flight.return_date, return_sector: flight.return_sector };
    hotels_snapshot = hotels.map(hotel => ({hotel_type: hotel.hotel_type, name: hotel.name, placeholder: hotel.placeholder, enabled: hotel.enabled,
      meals: meals.filter(meal => String(meal.package_hotel_id) === String(hotel._id)).map(meal => meal.meal_type)}));
  }
  if (command.extras.mode === "retain") {
    if (!source) throw new Error("Create requires explicit extras");
    items.push(...retained.filter(item => item.item_type !== "room"));
  } else {
    requireDescriptions(command.extras.addons, "Add-on"); requireDescriptions(command.extras.discounts, "Discount");
    items.push(...command.extras.addons.map(value => line("addon", value.name, "", value)),
      ...command.extras.discounts.map(value => line("discount", value.name, "", value)));
  }
  const totalCents = items.reduce((sum, item) => {
    const cents = Math.round(item.unit_price * 100) * item.quantity;
    if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(sum + cents)) throw new Error("Quotation amount exceeds safe cents");
    return sum + cents;
  }, 0);
  const revision = source ? source.revision + 1 : 0;
  if (family) await assertRevisionVacant(ctx, family._id, revision);
  const hijri_year = family?.hijri_year ?? year;
  const sequence_num = family?.sequence_num ?? await reserveBaseReference(ctx, hijri_year);
  const now = new Date(nowMs).toISOString();
  const quotation_number = `${hijri_year}-${String(sequence_num).padStart(4,"0")}${revision ? `-R${revision}` : ""}`;
  const business = { client_id, client_name, package_id, flight_id, package_snapshot, flight_snapshot, hotels_snapshot,
    pic_name: command.pic_name, branch: command.branch, notes: command.notes, total_amount: totalCents / 100 };
  const document: FrozenQuotationDocumentV1 = {version: 1, quotation_number, issue_date: now, saved_by: actor,
    status: "draft", ...business, client_phone, return_flight, items, provenance: source?.legacy_provenance ?? null};
  const id = await ctx.db.insert("quotations", { ...business, hijri_year, sequence_num, revision,
    family_id: family?._id, previous_revision_id: source?._id, saved_by: actor, created_by: actor,
    inquiry_id: source?.inquiry_id,
    issue_date: now, created_at: now, updated_at: now, status: "draft", archived: false,
    snapshot_completeness: package_snapshot && flight_snapshot && hotels_snapshot ? "partial" : "unknown",
    legacy_provenance: source?.legacy_provenance,
    document_schema_version: 1,
    frozen_document: JSON.stringify(document),
  });
  let family_id: Id<"quotation_families">;
  if (family) { family_id = family._id; await ctx.db.patch(family_id, {current_revision_id: id}); }
  else {
    family_id = await ctx.db.insert("quotation_families", {hijri_year, sequence_num, current_revision_id: id, archived: false, inquiry_id: option?.inquiry_id});
    await ctx.db.patch(id, {family_id});
  }
  for (const item of items) await ctx.db.insert("quotation_items", {...item, quotation_id: id, created_at: now});
  await ctx.db.insert("quotation_logs", {quotation_id: id, action: source ? "revision_saved" : "created",
    description: `Saved ${quotation_number}`, performed_by: actor, created_at: now});
  if (option) await auditOptionSave(ctx, option, actor, family_id, id, nowMs);
  await enqueueRevisionPdf(ctx, id, document);
  const result = {id, family_id, quotation_number, revision};
  await ctx.db.insert("quotation_save_receipts", {actor, request_key: command.request_key, content, result});
  return result;
}

export const save = mutation({ args: {command: saveCommand}, handler: async (ctx, {command}) => {
  const actor = await getAuthUserId(ctx);
  if (!actor) throw new Error("Not authenticated");
  return saveRevision(ctx, actor, command);
}});
