import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canonicalClientId } from "./clientCanonical";
import { quotationReference } from "./currentQuotations";
import { revisionReleaseMode } from "./quotationFamilyIdentity";

export const inquiryWindowMs = 14 * 24 * 60 * 60 * 1000;
type Reader = Pick<QueryCtx, "db">;
type ManagedInquiry = Doc<"inquiries"> & { lifecycle: NonNullable<Doc<"inquiries">["lifecycle"]> };
type Outcome = NonNullable<ManagedInquiry["lifecycle"]["outcome"]>;
type Event = Omit<Doc<"inquiry_events">, "_id" | "_creationTime">;

export const inquiryDestination = v.union(
  v.object({ canonical_client_id: v.id("clients"), inquiry_id: v.null(), cycle: v.null() }),
  v.object({ canonical_client_id: v.id("clients"), inquiry_id: v.id("inquiries"), cycle: v.number() }),
);
export type InquiryDestination = Infer<typeof inquiryDestination>;

const optionTarget = { family_id: v.id("quotation_families"), expected_revision_id: v.id("quotations") };
export const inquiryCommand = v.union(
  v.object({ type: v.literal("follow_up") }),
  v.object({ type: v.literal("close") }),
  v.object({ type: v.literal("close_option"), ...optionTarget }),
  v.object({ type: v.literal("accept"), ...optionTarget }),
  v.object({ type: v.literal("undo_acceptance"), expected_acceptance_id: v.id("inquiry_events") }),
);
type Command = Infer<typeof inquiryCommand>;

function conflict(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function managed(inquiry: Doc<"inquiries"> | null): inquiry is ManagedInquiry {
  return Boolean(inquiry?.lifecycle);
}

function effectiveOutcome(inquiry: ManagedInquiry, now: number): Outcome | undefined {
  const { outcome, deadline } = inquiry.lifecycle;
  return outcome ?? (now >= deadline ? { type: "inactivity", at: deadline } : undefined);
}

export function optionState(family: Doc<"quotation_families">, inquiry: ManagedInquiry, now: number) {
  if (family.inquiry_closure) return { status: "closed", reason: "individual" } as const;
  const outcome = effectiveOutcome(inquiry, now);
  if (!outcome) return { status: "active" } as const;
  if (outcome.type === "accepted" && outcome.family_id === family._id) return { status: "accepted" } as const;
  return { status: "closed", reason: outcome.type === "accepted" ? "another_accepted" : outcome.type } as const;
}

type OptionState = ReturnType<typeof optionState>;

export async function familyInquiry(ctx: Reader, family: Doc<"quotation_families">) {
  if (!family.inquiry_id) return null;
  const inquiry = await ctx.db.get(family.inquiry_id);
  if (!managed(inquiry)) throw new Error("Quotation option has no managed Inquiry");
  return inquiry;
}

export async function familyInquiryContext(ctx: Reader, family: Doc<"quotation_families">, now = Date.now()) {
  const inquiry = await familyInquiry(ctx, family);
  if (!inquiry) return null;
  return { ...optionState(family, inquiry, now), inquiry_id: inquiry._id, cycle: inquiry.lifecycle.cycle,
    client_id: await canonicalClientId(ctx, inquiry.client_id as Id<"clients">) };
}

export async function currentOptionState(ctx: Reader, revision: Doc<"quotations">, family?: Doc<"quotation_families">) {
  const current = family ?? (revision.family_id ? await ctx.db.get(revision.family_id) : null);
  if (!current?.inquiry_id || revision._id !== current.current_revision_id) return null;
  const inquiry = await familyInquiry(ctx, current);
  return inquiry ? { ...optionState(current, inquiry, Date.now()), inquiry_id: inquiry._id } : null;
}

async function openSlot(ctx: Reader, clientId: Id<"clients">) {
  const inquiry = await ctx.db.query("inquiries")
    .withIndex("by_open_client", q => q.eq("open_client_id", clientId)).unique();
  if (inquiry && !managed(inquiry)) throw new Error("Inquiry open slot is invalid");
  return inquiry;
}

function destinationFor(canonical_client_id: Id<"clients">, inquiry: ManagedInquiry | null, now: number): InquiryDestination {
  return inquiry && !effectiveOutcome(inquiry, now)
    ? { canonical_client_id, inquiry_id: inquiry._id, cycle: inquiry.lifecycle.cycle }
    : { canonical_client_id, inquiry_id: null, cycle: null };
}

export async function readInquiryDestination(ctx: Reader, client_id: Id<"clients">, now: number) {
  const canonical = await canonicalClientId(ctx, client_id);
  const client = await ctx.db.get(canonical);
  if (!client) throw new Error("Client not found");
  const inquiry = await openSlot(ctx, canonical);
  return { destination: destinationFor(canonical, inquiry, now), client_name: client.name,
    deadline: inquiry && !effectiveOutcome(inquiry, now) ? inquiry.lifecycle.deadline : null };
}

const staff = (user_id: string) => ({ type: "staff", user_id } as const);

export const inquiryExpiryArgs = { inquiry_id: v.id("inquiries"), expected_cycle: v.number(), expected_deadline: v.number() };
type ExpiryTarget = { inquiry_id: Id<"inquiries">; expected_cycle: number; expected_deadline: number };

function expectedExpiry(inquiry: ManagedInquiry): ExpiryTarget {
  return { inquiry_id: inquiry._id, expected_cycle: inquiry.lifecycle.cycle, expected_deadline: inquiry.lifecycle.deadline };
}

async function scheduleExpiry(ctx: MutationCtx, target: ExpiryTarget) {
  await ctx.scheduler.runAt(target.expected_deadline, internal.inquiries.expire, target);
}

async function finishInquiry(ctx: MutationCtx, inquiry: ManagedInquiry, outcome: Outcome) {
  await ctx.db.patch(inquiry._id, {
    open_client_id: undefined,
    status: outcome.type === "accepted" ? "won" : "lost",
    lifecycle: { ...inquiry.lifecycle, outcome },
    updated_at: new Date(outcome.at).toISOString(),
  });
}

export async function expireInquiry(ctx: MutationCtx, target: ExpiryTarget, clock: () => number) {
  const inquiry = await ctx.db.get(target.inquiry_id);
  const now = clock();
  if (!managed(inquiry) || !inquiry.open_client_id || inquiry.lifecycle.outcome ||
      inquiry.lifecycle.cycle !== target.expected_cycle || inquiry.lifecycle.deadline !== target.expected_deadline ||
      now < inquiry.lifecycle.deadline) return false;
  await finishInquiry(ctx, inquiry, { type: "inactivity", at: now });
  await ctx.db.insert("inquiry_events", {
    inquiry_id: inquiry._id, cycle: inquiry.lifecycle.cycle, action: "expire", actor: { type: "system" }, at: now,
  });
  return true;
}

async function touch(ctx: MutationCtx, inquiry: ManagedInquiry, now: number) {
  const deadline = now + inquiryWindowMs;
  if (deadline === inquiry.lifecycle.deadline) return;
  await ctx.db.patch(inquiry._id, { lifecycle: { ...inquiry.lifecycle, deadline }, updated_at: new Date(now).toISOString() });
  await scheduleExpiry(ctx, { inquiry_id: inquiry._id, expected_cycle: inquiry.lifecycle.cycle, expected_deadline: deadline });
}

export async function placeNewOption(
  ctx: MutationCtx, selectedClient: Id<"clients">, reviewed: InquiryDestination, now: number,
) {
  const canonical = await canonicalClientId(ctx, selectedClient);
  const current = await openSlot(ctx, canonical);
  const actual = destinationFor(canonical, current, now);
  if (actual.canonical_client_id !== reviewed.canonical_client_id ||
      actual.inquiry_id !== reviewed.inquiry_id || actual.cycle !== reviewed.cycle) {
    conflict("INQUIRY_DESTINATION_CHANGED", "The Inquiry destination changed. Review it before saving your draft.");
  }
  if (actual.inquiry_id && current) {
    await touch(ctx, current, now);
    return { inquiry_id: current._id, cycle: current.lifecycle.cycle, action: "option_added" as const, client_id: canonical };
  }
  if (current) await expireInquiry(ctx, expectedExpiry(current), () => now);
  const date = new Date(now).toISOString();
  const deadline = now + inquiryWindowMs;
  const inquiry_id = await ctx.db.insert("inquiries", {
    client_id: canonical, open_client_id: canonical, status: "open", title: "Inquiry", created_at: date, updated_at: date,
    lifecycle: { cycle: 1, deadline },
  });
  await scheduleExpiry(ctx, { inquiry_id, expected_cycle: 1, expected_deadline: deadline });
  return { inquiry_id, cycle: 1, action: "opened" as const, client_id: canonical };
}

function requireOpen(inquiry: ManagedInquiry, now: number) {
  if (!inquiry.open_client_id || effectiveOutcome(inquiry, now)) {
    conflict("INQUIRY_NOT_OPEN", "This Inquiry is closed.");
  }
}

function requireActiveOption(family: Doc<"quotation_families">, inquiry: ManagedInquiry, now: number) {
  if (family.archived || optionState(family, inquiry, now).status !== "active") {
    conflict("INQUIRY_OPTION_READ_ONLY", "This Inquiry option is read-only.");
  }
}

export async function editInquiryOption(
  ctx: MutationCtx, family: Doc<"quotation_families">, clientMode: "retain" | "replace", expectedCycle: number | undefined, now: number,
) {
  const inquiry = await familyInquiry(ctx, family);
  if (!inquiry) return null;
  requireActiveOption(family, inquiry, now);
  requireOpen(inquiry, now);
  if (inquiry.lifecycle.cycle !== expectedCycle) conflict("INQUIRY_CYCLE_CHANGED", "The Inquiry reopened. Review the current option before editing.");
  if (clientMode !== "retain") conflict("INQUIRY_CLIENT_LOCKED", "Close this option and create a quotation for the correct client.");
  await touch(ctx, inquiry, now);
  return { inquiry_id: inquiry._id, cycle: inquiry.lifecycle.cycle, action: "option_revised" as const };
}

export async function auditOptionSave(
  ctx: MutationCtx, saved: Pick<Event, "inquiry_id" | "cycle" | "action">,
  actor: string, family_id: Id<"quotation_families">, revision_id: Id<"quotations">, at: number,
) {
  const { inquiry_id, cycle, action } = saved;
  await ctx.db.insert("inquiry_events", { inquiry_id, cycle, action, actor: staff(actor), family_id, revision_id, at });
}

export function assertFamilyArchivable(family: Doc<"quotation_families">) {
  if (family.inquiry_id) conflict("INQUIRY_OPTION_READ_ONLY", "Inquiry options stay in the Inquiry history. Use the Inquiry to close an active option.");
}

export async function actOnInquiry(
  ctx: MutationCtx, actor: string, args: { inquiry_id: Id<"inquiries">; expected_cycle: number; request_key: string; command: Command }, now: number,
) {
  const { inquiry_id, expected_cycle, request_key, command } = args;
  if (request_key.length < 1 || request_key.length > 128) throw new Error("Invalid Inquiry request key");
  const command_content = JSON.stringify([expected_cycle, Object.entries(command).sort(([a], [b]) => a.localeCompare(b))]);
  const previous = await ctx.db.query("inquiry_events").withIndex("by_inquiry_actor_request", q =>
    q.eq("inquiry_id", inquiry_id).eq("actor.user_id", actor).eq("request_key", request_key)).unique();
  if (previous) {
    if (previous.command_content !== command_content) conflict("INQUIRY_REQUEST_CONFLICT", "This request key already recorded a different Inquiry action.");
    return { inquiry_id, cycle: previous.cycle, event_id: previous._id };
  }
  if (await revisionReleaseMode(ctx) !== "active") throw new Error("Quotation revision release is inactive");
  const inquiry = await ctx.db.get(inquiry_id);
  if (!managed(inquiry)) throw new Error("Inquiry not found");
  if (inquiry.lifecycle.cycle !== expected_cycle) conflict("INQUIRY_CYCLE_CHANGED", "The Inquiry changed. Review it and try again.");
  const event: Event = { inquiry_id, cycle: expected_cycle, action: command.type, actor: staff(actor), at: now, request_key, command_content };

  if (command.type === "undo_acceptance") {
    const outcome = inquiry.lifecycle.outcome;
    if (outcome?.type !== "accepted" || outcome.event_id !== command.expected_acceptance_id) {
      conflict("INQUIRY_ACCEPTANCE_CHANGED", "This acceptance is no longer current.");
    }
    const canonical = await canonicalClientId(ctx, inquiry.client_id as Id<"clients">);
    const other = await openSlot(ctx, canonical);
    if (other && !effectiveOutcome(other, now)) conflict("INQUIRY_ALREADY_OPEN", "Close the client's open Inquiry before undoing this acceptance.");
    if (other) await expireInquiry(ctx, expectedExpiry(other), () => now);
    const cycle = expected_cycle + 1;
    const deadline = now + inquiryWindowMs;
    await ctx.db.patch(inquiry_id, { client_id: canonical, open_client_id: canonical, status: "open",
      lifecycle: { cycle, deadline }, updated_at: new Date(now).toISOString() });
    await scheduleExpiry(ctx, { inquiry_id, expected_cycle: cycle, expected_deadline: deadline });
    const event_id = await ctx.db.insert("inquiry_events", { ...event, cycle, acceptance_id: outcome.event_id,
      family_id: outcome.family_id, revision_id: outcome.revision_id });
    return { inquiry_id, cycle, event_id };
  }

  requireOpen(inquiry, now);
  if (command.type === "follow_up" || command.type === "close") {
    if (command.type === "follow_up") await touch(ctx, inquiry, now);
    else await finishInquiry(ctx, inquiry, { type: "manual", at: now });
    const event_id = await ctx.db.insert("inquiry_events", event);
    return { inquiry_id, cycle: expected_cycle, event_id };
  }

  const family = await ctx.db.get(command.family_id);
  if (!family || family.inquiry_id !== inquiry_id) throw new Error("Option does not belong to this Inquiry");
  if (family.current_revision_id !== command.expected_revision_id) {
    conflict("INQUIRY_REVISION_CHANGED", "A newer quotation revision is available. Review its saved terms first.");
  }
  requireActiveOption(family, inquiry, now);
  const revision = await ctx.db.get(family.current_revision_id);
  if (revision?.family_id !== family._id) throw new Error("Current option revision not found");
  const event_id = await ctx.db.insert("inquiry_events", { ...event, family_id: family._id, revision_id: revision._id });
  if (command.type === "close_option") {
    await ctx.db.patch(family._id, { inquiry_closure: { revision_id: revision._id, event_id } });
  } else {
    await finishInquiry(ctx, inquiry, { type: "accepted", family_id: family._id, revision_id: revision._id, event_id, at: now });
  }
  return { inquiry_id, cycle: expected_cycle, event_id };
}

export async function mergeOpenInquiries(
  ctx: MutationCtx, actor: string, target: Id<"clients">, sources: Id<"clients">[], now: number,
) {
  const slots = await Promise.all([target, ...sources].map(client => openSlot(ctx, client)));
  const active: ManagedInquiry[] = [];
  for (const slot of slots) {
    if (!slot) continue;
    if (effectiveOutcome(slot, now)) await expireInquiry(ctx, expectedExpiry(slot), () => now);
    else active.push(slot);
  }
  if (active.length > 1) conflict("INQUIRY_MERGE_CONFLICT", "Close one of the open Inquiries before merging these clients.");
  const [inquiry] = active;
  if (inquiry && inquiry.open_client_id !== target) {
    await ctx.db.patch(inquiry._id, { client_id: target, open_client_id: target, updated_at: new Date(now).toISOString() });
    await ctx.db.insert("inquiry_events", { inquiry_id: inquiry._id, cycle: inquiry.lifecycle.cycle,
      action: "client_transferred", actor: staff(actor), at: now, canonical_client_id: target });
  }
}

export async function clientInquiries(ctx: Reader, selectedClient: Id<"clients">, now: number) {
  const clientId = await canonicalClientId(ctx, selectedClient);
  const clientIds = [clientId];
  for (const id of clientIds) {
    const aliases = await ctx.db.query("client_aliases")
      .withIndex("by_canonical_client_id", q => q.eq("canonical_client_id", id)).collect();
    clientIds.push(...aliases.map(alias => alias.alias_client_id));
  }
  const all = (await Promise.all(clientIds.map(id => ctx.db.query("inquiries")
    .withIndex("by_client_id", q => q.eq("client_id", id)).collect()))).flat().filter(managed);
  const open = all.find(inquiry => !effectiveOutcome(inquiry, now));
  return Promise.all(all.sort((a, b) => Number(b === open) - Number(a === open) || b._creationTime - a._creationTime)
    .map(async inquiry => {
      const outcome = effectiveOutcome(inquiry, now) ?? null;
      const families = await ctx.db.query("quotation_families").withIndex("by_inquiry", q => q.eq("inquiry_id", inquiry._id)).collect();
      const options = await Promise.all(families.sort((a, b) => b._creationTime - a._creationTime).map(async family => {
        const revision = await ctx.db.get(family.current_revision_id);
        if (revision?.family_id !== family._id) throw new Error("Current option revision not found");
        const state: OptionState = optionState(family, inquiry, now);
        return { ...state, family_id: family._id, revision_id: revision._id, reference: quotationReference(revision),
          package_name: revision.package_snapshot?.name ?? null, departure_date: revision.flight_snapshot?.departure_date ?? null,
          return_date: revision.flight_snapshot?.return_date ?? null, total_amount: revision.total_amount };
      }));
      return { id: inquiry._id, cycle: inquiry.lifecycle.cycle, deadline: inquiry.lifecycle.deadline,
        opened_at: inquiry.created_at, outcome, can_undo: !open && outcome?.type === "accepted", options };
    }));
}
