import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { test } from "node:test";
import { create, form, load, packages, quotations, reviewedQuote, state } from "./helpers/submission-fixtures.mjs";

const inquiries = load(path.resolve("convex/inquiries.ts"));
const clients = load(path.resolve("convex/clients.ts"));
const families = load(path.resolve("convex/quotationFamilies.ts"));
const revisions = load(path.resolve("convex/quotationRevisionSaves.ts"));
const { actOnInquiry, expireInquiry } = load(path.resolve("convex/lib/inquiryLifecycle.ts"));
const plain = value => JSON.parse(JSON.stringify(value));
const code = expected => error => error.data?.code === expected;
const windowMs = 14 * 24 * 60 * 60 * 1000;

async function fixture() {
  const s = state();
  s.tables.clients[0].created_at = "2026-11-01";
  const packageID = await create(s, form());
  const quote = await reviewedQuote(s, packageID, s.tables.package_flights[0]._id);
  s.tables.quotation_revision_release.push({ key: "revision-v1", enabled: true });
  s.tables.quotation_family_migrations.push({ key: "family-v1", done: true, cursor: null });

  const destination = async (client_id = "client:1") => (await inquiries.destination._handler(s.ctx, { client_id })).destination;
  const command = (inquiry_destination, id = "client:1") => ({
    operation: "create", request_key: randomUUID(), pic_name: "Fixture staff", branch: "Fixture", notes: "",
    client: { mode: "replace", id }, inquiry_destination,
    selection: { mode: "replace", package_id: packageID, flight_id: quote.flight_id, reviewed_context: quote.reviewed_context,
      rooms: [{ room_type: "Quad", price: 100, pax: 1 }] },
    extras: { mode: "replace", addons: [], discounts: [] },
  });
  const save = command => revisions.save._handler(s.ctx, { command });
  const newOption = async (client_id = "client:1") => save(command(await destination(client_id), client_id));
  const compare = async (client_id = "client:1") => (await inquiries.forClient._handler(s.ctx, { client_id })).inquiries;
  const request = (inquiry, command) => ({ inquiry_id: inquiry.id, expected_cycle: inquiry.cycle, request_key: randomUUID(), command });
  const act = (inquiry, command) => inquiries.act._handler(s.ctx, request(inquiry, command));
  const newClient = name => s.ctx.db.insert("clients", { name, created_at: "2026-11-01" });
  return { ...s, destination, command, save, newOption, compare, request, act, newClient };
}

function append(option, cycle, client = { mode: "retain" }) {
  return { operation: "append", request_key: randomUUID(), family_id: option.family_id, source_revision_id: option.id,
    expected_current_id: option.id, expected_inquiry_cycle: cycle, pic_name: "Fixture staff", branch: "Fixture", notes: "Reviewed",
    client, selection: { mode: "retain" }, extras: { mode: "retain" } };
}

function target(type, saved) {
  return { type, family_id: saved.family_id, expected_revision_id: saved.id };
}

test("authenticated create starts or joins the reviewed Inquiry and replays its receipt after closure", async () => {
  const f = await fixture();
  const reviewed = await f.destination();
  assert.equal(reviewed.inquiry_id, null);
  const first = f.command(reviewed);
  const stale = f.command(reviewed);
  const option = await f.save(first);
  const joinedDestination = await f.destination();
  assert.equal(joinedDestination.canonical_client_id, "client:1");
  assert.equal(joinedDestination.cycle, 1);
  const afterFirst = plain(f.tables);
  await assert.rejects(f.save(stale), code("INQUIRY_DESTINATION_CHANGED"));
  assert.deepEqual(plain(f.tables), afterFirst);
  const earlierDeadline = f.tables.inquiries[0].lifecycle.deadline -= windowMs / 2;
  const alternative = await f.save(f.command(joinedDestination));
  const [inquiry] = await f.compare();
  assert.equal(inquiry.id, joinedDestination.inquiry_id);
  assert.ok(inquiry.deadline > earlierDeadline);
  assert.equal(inquiry.deadline, f.tables.inquiry_events.find(row => row.action === "option_added").at + windowMs);
  assert.deepEqual(plain(inquiry.options.map(row => [row.family_id, row.status])), [[alternative.family_id, "active"], [option.family_id, "active"]]);
  assert.equal(inquiry.options[0].package_name, "Fixture Package");
  assert.equal(inquiry.options[0].departure_date, "2027-01-01");
  assert.equal(inquiry.options[0].return_date, "2027-01-12");
  assert.equal(inquiry.options[0].total_amount, 100);
  await f.act(inquiry, { type: "close" });
  const afterClosure = plain(f.tables);
  assert.deepEqual(plain(await f.save(first)), plain(option));
  await assert.rejects(f.save(f.command(joinedDestination)), code("INQUIRY_DESTINATION_CHANGED"));
  assert.deepEqual(plain(f.tables), afterClosure);
  assert.equal((await f.compare())[0].options[0].reason, "manual");
  await assert.rejects(f.save(f.command(undefined)), code("INQUIRY_DESTINATION_CHANGED"));
  assert.deepEqual(plain(f.tables), afterClosure);
});

test("Inquiry options keep family creation order while showing the exact latest saved revision", async () => {
  const f = await fixture();
  const oldest = await f.newOption();
  const middle = await f.newOption();
  const newest = await f.newOption();
  const [inquiry] = await f.compare();
  const revisedOldest = await f.save(append(oldest, inquiry.cycle));
  const [updated] = await f.compare();

  assert.notEqual(revisedOldest.id, oldest.id);
  assert.deepEqual(plain(updated.options.map(row => [row.family_id, row.revision_id, row.reference])), [
    [newest.family_id, newest.id, newest.quotation_number],
    [middle.family_id, middle.id, middle.quotation_number],
    [oldest.family_id, revisedOldest.id, revisedOldest.quotation_number],
  ]);
});

test("accept and undo use exact saved revisions, retain individual closures, and preserve frozen terms", async () => {
  const f = await fixture();
  const original = await f.newOption();
  const other = await f.newOption();
  const eliminated = await f.newOption();
  const [open] = await f.compare();
  await f.act(open, target("close_option", eliminated));
  const editCommand = append(original, open.cycle);
  const earlierDeadline = f.tables.inquiries[0].lifecycle.deadline -= windowMs / 2;
  const revised = await f.save(editCommand);
  const [edited] = await f.compare();
  assert.ok(edited.deadline > earlierDeadline);
  assert.equal(edited.deadline, f.tables.inquiry_events.find(row => row.action === "option_revised").at + windowMs);
  await assert.rejects(f.act(open, target("accept", original)), code("INQUIRY_REVISION_CHANGED"));
  await assert.rejects(f.act(open, target("close_option", original)), code("INQUIRY_REVISION_CHANGED"));
  const frozen = plain([f.tables.quotations, f.tables.quotation_items, f.tables.quotation_pdf_artifacts]);
  const request = f.request(open, target("accept", revised));
  const acceptance = await inquiries.act._handler(f.ctx, request);
  assert.deepEqual(plain(await inquiries.act._handler(f.ctx, request)), plain(acceptance));
  const [accepted] = await f.compare();
  assert.equal(accepted.outcome.event_id, acceptance.event_id);
  assert.equal(accepted.outcome.revision_id, revised.id);
  assert.deepEqual(plain(accepted.options.map(row => [row.status, row.reason])), [
    ["closed", "individual"], ["closed", "another_accepted"], ["accepted", null],
  ]);
  assert.deepEqual(plain([f.tables.quotations, f.tables.quotation_items, f.tables.quotation_pdf_artifacts]), frozen);
  assert.deepEqual(plain(await f.save(editCommand)), plain(revised));

  const page = await quotations.listPaginated._handler(f.ctx, { paginationOpts: { cursor: null, numItems: 10 } });
  const detail = await clients.getWithQuotations._handler(f.ctx, { client_id: "client:1" });
  for (const rows of [page.page, detail.quotations]) {
    assert.equal(rows.find(row => row.id === revised.id).status, "accepted");
    assert.equal(rows.find(row => row.id === other.id).status, "closed");
  }
  const [usage] = await packages.listWithQuotationCounts._handler(f.ctx, {});
  assert.equal(usage.by_status.accepted, 1);
  assert.equal(usage.by_status.closed, 2);
  assert.equal(usage.by_status.draft, 0);
  assert.equal((await quotations.getQuotationForEdit._handler(f.ctx, { target_quotation_id: revised.id })).revision_context.can_append, false);
  assert.equal((await families.history._handler(f.ctx, { family_id: other.family_id })).inquiry.reason, "another_accepted");

  await assert.rejects(f.act(accepted, { type: "undo_acceptance", expected_acceptance_id: "inquiry_events:wrong" }), code("INQUIRY_ACCEPTANCE_CHANGED"));
  const undo = f.request(accepted, { type: "undo_acceptance", expected_acceptance_id: acceptance.event_id });
  const undoResult = await inquiries.act._handler(f.ctx, undo);
  assert.deepEqual(plain(await inquiries.act._handler(f.ctx, undo)), plain(undoResult));
  const [reopened] = await f.compare();
  assert.equal(reopened.cycle, open.cycle + 1);
  assert.equal(reopened.outcome, null);
  assert.equal(reopened.deadline, f.tables.inquiry_events.find(row => row._id === undoResult.event_id).at + windowMs);
  assert.deepEqual(plain(reopened.options.map(row => row.status)), ["closed", "active", "active"]);
  assert.equal(f.tables.inquiry_events.find(row => row._id === undoResult.event_id).actor.user_id, "fixture-staff");
  await assert.rejects(f.act(open, target("accept", revised)), code("INQUIRY_CYCLE_CHANGED"));
  await assert.rejects(f.save(append(revised, open.cycle)), code("INQUIRY_CYCLE_CHANGED"));
});

test("closed options reject editing and refresh, and all managed options reject archive and reassignment", async () => {
  const f = await fixture();
  const option = await f.newOption();
  const [inquiry] = await f.compare();
  const before = plain(f.tables);
  await assert.rejects(families.archive._handler(f.ctx, { family_id: option.family_id }), code("INQUIRY_OPTION_READ_ONLY"));
  await assert.rejects(f.save(append(option, inquiry.cycle, { mode: "replace", id: "client:1" })), code("INQUIRY_CLIENT_LOCKED"));
  assert.deepEqual(plain(f.tables), before);
  await f.act(inquiry, target("close_option", option));
  const after = plain(f.tables);
  await assert.rejects(f.save(append(option, inquiry.cycle)), code("INQUIRY_OPTION_READ_ONLY"));
  await assert.rejects(quotations.refreshSnapshot._handler(f.ctx, {
    quotation_id: option.id, command: { ...append(option, inquiry.cycle), selection: f.command(undefined).selection },
  }), code("INQUIRY_OPTION_READ_ONLY"));
  await assert.rejects(families.archive._handler(f.ctx, { family_id: option.family_id }), code("INQUIRY_OPTION_READ_ONLY"));
  assert.deepEqual(plain(f.tables), after);
});

test("follow-up extends the server deadline once, stale jobs are harmless, and expiry has a system audit", async () => {
  const f = await fixture();
  const option = await f.newOption();
  const [inquiry] = await f.compare();
  const openEvent = f.tables.inquiry_events[0];
  assert.equal(inquiry.deadline, openEvent.at + windowMs);
  const original = { inquiry_id: inquiry.id, expected_cycle: inquiry.cycle, expected_deadline: inquiry.deadline };
  assert.deepEqual(plain(f.operations.find(entry => entry[0] === "scheduleAt")[3]), original);
  const followUpTime = inquiry.deadline - 1000;
  const followUp = f.request(inquiry, { type: "follow_up" });
  const followed = await actOnInquiry(f.ctx, "fixture-staff", followUp, followUpTime);
  const current = { ...original, expected_deadline: followUpTime + windowMs };
  const afterFollowUp = plain(f.tables);
  assert.deepEqual(plain(await actOnInquiry(f.ctx, "fixture-staff", followUp, inquiry.deadline)), plain(followed));
  assert.equal(await expireInquiry(f.ctx, original, () => inquiry.deadline), false);
  assert.equal(await expireInquiry(f.ctx, { ...current, expected_cycle: current.expected_cycle + 1 }, () => current.expected_deadline), false);
  assert.equal(await expireInquiry(f.ctx, current, () => current.expected_deadline - 1), false);
  await assert.rejects(actOnInquiry(f.ctx, "fixture-staff", f.request(inquiry, target("accept", option)), current.expected_deadline), code("INQUIRY_NOT_OPEN"));
  assert.deepEqual(plain(f.tables), afterFollowUp);
  assert.equal(await expireInquiry(f.ctx, current, () => current.expected_deadline), true);
  assert.equal(await expireInquiry(f.ctx, current, () => current.expected_deadline), false);
  const [closed] = await f.compare();
  assert.equal(closed.outcome.type, "inactivity");
  assert.equal(closed.options[0].reason, "inactivity");
  assert.equal(f.tables.inquiries[0].open_client_id, undefined);
  const audit = f.tables.inquiry_events.filter(row => row.action === "expire");
  assert.deepEqual(plain(audit.map(row => [row.actor.type, row.at])), [["system", current.expected_deadline]]);
});

test("canonical merge rejects two open Inquiries, transfers the sole open, and retains alias history", async () => {
  const f = await fixture();
  const canonicalId = await f.newClient("Canonical client");
  const original = await f.newOption();
  const [originalInquiry] = await f.compare();
  const accepted = await f.act(originalInquiry, target("accept", original));
  await f.newOption();
  await f.newOption(canonicalId);
  const [later] = await f.compare();
  const [canonicalOpen] = await f.compare(canonicalId);
  await assert.rejects(f.act(originalInquiry, { type: "undo_acceptance", expected_acceptance_id: accepted.event_id }), code("INQUIRY_ALREADY_OPEN"));
  const merge = () => clients.mergeClients._handler(f.ctx, { canonicalId, duplicateIds: ["client:1"] });
  const before = plain(f.tables);
  await assert.rejects(merge(), code("INQUIRY_MERGE_CONFLICT"));
  assert.deepEqual(plain(f.tables), before);
  await f.act(canonicalOpen, { type: "close" });
  const oldDestination = await f.destination();
  await merge();
  const currentDestination = await f.destination();
  assert.equal(currentDestination.inquiry_id, later.id);
  assert.equal(currentDestination.canonical_client_id, canonicalId);
  await assert.rejects(f.save(f.command(oldDestination)), code("INQUIRY_DESTINATION_CHANGED"));
  assert.deepEqual(plain(await f.compare()), plain(await f.compare(canonicalId)));
  assert.equal((await f.compare()).find(row => row.id === originalInquiry.id).outcome.revision_id, original.id);
  const thirdClient = await f.newClient("Unrelated client");
  const beforeAliasMerge = plain(f.tables);
  await assert.rejects(clients.mergeClients._handler(f.ctx, { canonicalId: thirdClient, duplicateIds: ["client:1"] }), code("CLIENT_MERGE_ALIAS_CHANGED"));
  assert.deepEqual(plain(f.tables), beforeAliasMerge);
  await merge();
  assert.deepEqual(plain(f.tables), beforeAliasMerge);
});

test("inquiry commands and reads require authentication, and a due Inquiry cannot be touched by staff", async () => {
  const f = await fixture();
  const option = await f.newOption();
  const [inquiry] = await f.compare();
  const anonymous = { ...f.ctx, auth: { getUserIdentity: async () => null } };
  await assert.rejects(inquiries.destination._handler(anonymous, { client_id: "client:1" }), /Not authenticated/);
  await assert.rejects(inquiries.forClient._handler(anonymous, { client_id: "client:1" }), /Not authenticated/);
  await assert.rejects(inquiries.act._handler(anonymous, f.request(inquiry, { type: "close" })), /Not authenticated/);
  const oldDestination = await f.destination();
  f.tables.inquiries[0].lifecycle.deadline = Date.now() - 1000;
  await assert.rejects(f.act(inquiry, { type: "follow_up" }), code("INQUIRY_NOT_OPEN"));
  await assert.rejects(f.act(inquiry, { type: "close" }), code("INQUIRY_NOT_OPEN"));
  await assert.rejects(f.save(append(option, inquiry.cycle)), code("INQUIRY_OPTION_READ_ONLY"));
  await assert.rejects(f.save(f.command(oldDestination)), code("INQUIRY_DESTINATION_CHANGED"));
  await f.newOption();
  const [replacement, expired] = await f.compare();
  assert.notEqual(replacement.id, inquiry.id);
  assert.equal(replacement.outcome, null);
  assert.equal(expired.id, inquiry.id);
  assert.equal(expired.outcome.type, "inactivity");
});
