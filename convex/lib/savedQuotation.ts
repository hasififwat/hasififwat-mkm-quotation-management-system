import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { FrozenQuotationDocumentV1 } from "../quotationRevisionSaves";

export const quotationBusinessTimeZone = "Asia/Kuala_Lumpur";

export type RevisionContext = {
  state: "legacy" | "current" | "historical";
  can_append: boolean;
  family_id: Id<"quotation_families"> | null;
  source_revision_id: Id<"quotations">;
  current_revision_id: Id<"quotations">;
  expected_current_id: Id<"quotations">;
  is_current: boolean;
  family_created_at: string;
  revision_issue_date: string | null;
  business_time_zone: typeof quotationBusinessTimeZone;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Malformed frozen quotation object");
  return value as Record<string, unknown>;
}
function strings(value: Record<string, unknown>, required: string[], optional: string[] = []) {
  for (const key of required) if (typeof value[key] !== "string") throw new Error(`Malformed frozen quotation ${key}`);
  for (const key of optional) if (value[key] !== undefined && typeof value[key] !== "string") throw new Error(`Malformed frozen quotation ${key}`);
}
function number(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Malformed frozen quotation amount");
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Malformed frozen quotation array");
  return value;
}
function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new Error("Malformed frozen quotation boolean");
}
function validateFrozenDocument(value: unknown): asserts value is FrozenQuotationDocumentV1 {
  const doc = record(value);
  if (doc.version !== 1 || doc.status !== "draft" || (doc.provenance !== null && doc.provenance !== "legacy_unknown")) throw new Error("Unsupported frozen quotation document");
  strings(doc, ["quotation_number", "issue_date", "saved_by", "client_id", "client_name", "package_id", "flight_id", "pic_name", "branch"], ["notes"]);
  if (!Number.isFinite(Date.parse(String(doc.issue_date)))) throw new Error("Malformed frozen quotation issue date");
  for (const key of ["client_phone", "return_flight"]) if (doc[key] !== null && typeof doc[key] !== "string") throw new Error(`Malformed frozen quotation ${key}`);
  number(doc.total_amount);
  for (const value of array(doc.items)) {
    const item = record(value);
    strings(item, ["item_type", "description", "package_room_id"]);
    number(item.quantity); number(item.unit_price);
    if (item.original_price !== undefined) number(item.original_price);
  }
  if (doc.package_snapshot !== undefined) {
    const pkg = record(doc.package_snapshot);
    strings(pkg, ["name", "year", "duration"], ["transport", "package_code", "inclusions", "exclusions", "package_updated_at"]);
    if (pkg.rooms !== undefined) for (const value of array(pkg.rooms)) {
      const room = record(value); strings(room, ["room_type"]); number(room.price); boolean(room.enabled);
    }
  }
  if (doc.flight_snapshot !== undefined) strings(record(doc.flight_snapshot), ["id", "month", "departure_date", "departure_sector", "return_date", "return_sector"], ["flight"]);
  if (doc.hotels_snapshot !== undefined) for (const value of array(doc.hotels_snapshot)) {
    const hotel = record(value); strings(hotel, ["hotel_type", "placeholder"], ["name"]); boolean(hotel.enabled);
    for (const meal of array(hotel.meals)) if (typeof meal !== "string") throw new Error("Malformed frozen quotation meal");
  }
}

export function readSavedQuotation(quotation: Doc<"quotations">, items: Doc<"quotation_items">[]) {
  let frozen: FrozenQuotationDocumentV1 | null = null;
  if (quotation.frozen_document) {
    const value: unknown = JSON.parse(quotation.frozen_document);
    validateFrozenDocument(value);
    frozen = value;
    const fields = ["item_type", "description", "package_room_id", "quantity", "unit_price", "original_price"] as const;
    if (frozen.items.length !== items.length || frozen.items.some((item, index) => fields.some(key => item[key] !== items[index][key]))) {
      throw new Error("Frozen quotation items do not match their revision");
    }
  }
  const reference = `${quotation.hijri_year}-${String(quotation.sequence_num).padStart(4, "0")}${quotation.revision ? `-R${quotation.revision}` : ""}`;
  const document = frozen ?? {
    version: 1 as const,
    quotation_number: reference,
    issue_date: quotation.issue_date ?? null,
    saved_by: quotation.saved_by ?? null,
    status: quotation.status,
    client_id: quotation.client_id,
    client_name: quotation.client_name,
    client_phone: null,
    package_id: quotation.package_id,
    flight_id: quotation.flight_id,
    package_snapshot: quotation.package_snapshot,
    flight_snapshot: quotation.flight_snapshot,
    hotels_snapshot: quotation.hotels_snapshot,
    pic_name: quotation.pic_name,
    branch: quotation.branch,
    notes: quotation.notes,
    total_amount: quotation.total_amount,
    return_flight: null,
    items: items.map(({_id, _creationTime, quotation_id, created_at, ...item}) => item),
    provenance: "legacy_unknown" as const,
  };
  const unknown_fields = [
    ...(!document.package_snapshot ? ["package"] : []),
    ...(!document.flight_snapshot ? ["flight"] : []),
    ...(!document.hotels_snapshot ? ["hotels_and_meals"] : []),
    ...(document.client_phone === null ? ["client_phone"] : []),
    ...(document.return_flight === null ? ["return_flight"] : []),
    ...(!document.issue_date ? ["revision_issue_date"] : []),
    ...(!document.saved_by ? ["saved_by"] : []),
    ...(["transport", "package_code", "inclusions", "exclusions"] as const).filter(key => document.package_snapshot?.[key] === undefined).map(key => `package.${key}`),
    ...(document.flight_snapshot?.flight === undefined ? ["flight.flight"] : []),
  ];
  return { ...document, provenance: document.provenance ?? quotation.legacy_provenance ?? null,
    unknown_fields, business_time_zone: quotationBusinessTimeZone };
}

export async function revisionContext(ctx: Pick<QueryCtx, "db">, quotation: Doc<"quotations">): Promise<RevisionContext> {
  const family = quotation.family_id ? await ctx.db.get(quotation.family_id) : null;
  if (quotation.family_id && !family) throw new Error("Quotation family not found");
  const first = family ? (await ctx.db.query("quotations").withIndex("by_family_revision", q => q.eq("family_id", family._id)).order("asc").take(1))[0] : quotation;
  const current = family?.current_revision_id ?? quotation._id;
  return { state: !family ? "legacy" : current === quotation._id ? "current" : "historical",
    can_append: !!family && !family.archived && current === quotation._id,
    family_id: family?._id ?? null, source_revision_id: quotation._id,
    current_revision_id: current, expected_current_id: current, is_current: current === quotation._id,
    family_created_at: first?.created_at ?? quotation.created_at,
    revision_issue_date: quotation.issue_date ?? null, business_time_zone: quotationBusinessTimeZone };
}
