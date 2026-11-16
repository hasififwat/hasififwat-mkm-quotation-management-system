import type { SaveCommand } from "../../../convex/quotationRevisionSaves";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { api } from "convex/_generated/api";
import type { QuotationFormValues } from "./schema";
import type { QuotationPackage } from "./loader-utils";

export type RevisionSource = NonNullable<FunctionReturnType<typeof api.quotations.getQuotationForEdit>>;
export type RevisionAttempt = Readonly<{ body: string; operation: "create" | "append" }>;
export type RevisionSaveSession =
  | { kind: "editing" }
  | { kind: "pending"; attempt: RevisionAttempt }
  | { kind: "uncertain"; attempt: RevisionAttempt; message: string }
  | { kind: "rejected"; message: string; conflict?: "stale" | "selection" }
  | { kind: "saved"; id: string; reference: string };

export function beginRevisionAttempt(
  values: QuotationFormValues,
  source: RevisionSource | undefined,
  selection: { mode: "retain" } | { mode: "replace"; catalog: QuotationPackage | null },
  requestKey: string,
  actor: string,
): RevisionAttempt {
  if (!actor) throw new Error("Your sign-in identity is unavailable. Your draft is retained.");
  const rooms = values.selected_rooms.map(({room_type, price, pax}) => ({room_type, price, pax}));
  const selected: SaveCommand["selection"] = selection.mode === "retain"
    ? { mode: "retain", rooms: rooms.map((room, index) => {
      const saved = source?.selected_rooms[index];
      if (!saved || saved.room_type !== room.room_type) throw new Error("Saved room identity is unavailable. Your draft is retained.");
      return { source_item_id: saved.source_item_id, price: room.price, pax: room.pax };
    }) }
    : (() => {
      if (!selection.catalog?.creation_context || String(selection.catalog._id) !== values.package_id) throw new Error("Review a package before saving. Your draft is retained.");
      return { mode: "replace" as const, package_id: values.package_id as Id<"packages">,
        flight_id: values.flight_id as Id<"package_flights">, reviewed_context: selection.catalog.creation_context, rooms };
    })();
  if (selection.mode === "retain" && (!source || rooms.length !== source.selected_rooms.length)) throw new Error("Saved room identity is unavailable. Your draft is retained.");
  const fields = { request_key: requestKey, pic_name: values.pic_name ?? "", branch: values.branch ?? "", notes: values.notes ?? "",
    client: source && values.client_id === source.client_id ? {mode: "retain" as const} : {mode: "replace" as const, id: values.client_id as Id<"clients">},
    selection: selected, extras: {mode: "replace" as const,
      addons: (values.adds_ons ?? []).map(({name, price, pax}) => ({name,price,pax})),
      discounts: (values.discounts ?? []).map(({name, price, pax}) => ({name,price,pax}))} };
  let command: SaveCommand;
  if (source) {
    const context = source.revision_context;
    if (!context.can_append || !context.family_id) throw new Error("Only the current quotation can be edited.");
    command = { operation: "append", family_id: context.family_id, source_revision_id: context.source_revision_id,
      expected_current_id: context.expected_current_id, ...fields };
  } else command = {operation: "create", ...fields};
  return Object.freeze({body: JSON.stringify({command, expected_actor: actor}), operation: command.operation});
}

export function finishRevisionAttempt(
  attempt: RevisionAttempt,
  result: import("./save-quotation").RevisionSaveResult,
  recovering = false,
): RevisionSaveSession {
  if (result.kind === "uncertain") return {...result, attempt};
  if (recovering && result.kind === "rejected" && result.reauthenticate) {
    return {kind: "uncertain", attempt, message: "Sign in as the original editor in another tab, then retry this same save. Your entries and original request are kept. Its previous result is still unconfirmed."};
  }
  return result;
}
