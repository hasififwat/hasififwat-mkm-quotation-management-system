import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ConvexHttpClient } from "convex/browser";

const binary = process.env.FAMILY_BACKEND_BINARY;
if (!binary) throw new Error("Set FAMILY_BACKEND_BINARY to a convex-local-backend executable");

const directory = await mkdtemp(path.join(tmpdir(), "mkm-inquiry-backend-"));
const repository = process.cwd();
const port = 14175;
const url = `http://127.0.0.1:${port}`;
const instance = "mkm-inquiry-test";
const secret = randomBytes(32).toString("hex");
const adminKey = execFileSync(binary, ["keygen", "admin-key", "--instance-name", instance, "--instance-secret", secret], { encoding: "utf8" }).trim();
const backend = spawn(binary, [
  "--interface", "127.0.0.1", "--port", String(port), "--site-proxy-port", String(port + 1),
  "--instance-name", instance, "--instance-secret", secret, "--disable-beacon", path.join(directory, "fixture.sqlite3"),
], { cwd: directory, stdio: "ignore" });

const fixture = `
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { expireInquiry, inquiryExpiryArgs } from "./lib/inquiryLifecycle";

export const seed = internalMutation({ args: {}, handler: async ctx => {
  const date = new Date().toISOString();
  await ctx.db.insert("quotation_family_migrations", { key: "family-v1", cursor: null, done: true });
  await ctx.db.insert("quotation_revision_release", { key: "revision-v1", enabled: true });
  for (const year of ["2025/2026", "2026/2027"]) {
    const package_id = await ctx.db.insert("packages", { name: year, year, duration: "12 days", status: "published", created_at: date, updated_at: date });
    await ctx.db.insert("package_rooms", { package_id, room_type: "Quad", price: 1000, enabled: true, created_at: date });
    await ctx.db.insert("package_flights", { package_id, month: "MAR", departure_date: "2027-03-04", departure_sector: "KUL", return_date: "2027-03-15", return_sector: "JED", created_at: date });
  }
} });

export const read = internalQuery({ args: { inquiry_id: v.id("inquiries") }, handler: (ctx, { inquiry_id }) => ctx.db.get(inquiry_id) });
export const clientInquiries = internalQuery({ args: { client_id: v.id("clients") }, handler: (ctx, { client_id }) =>
  ctx.db.query("inquiries").withIndex("by_client_id", q => q.eq("client_id", client_id)).collect() });
export const tick = internalMutation({ args: { ...inquiryExpiryArgs, now: v.number() }, handler: (ctx, { now, ...target }) => expireInquiry(ctx, target, () => now) });
export const setDeadline = internalMutation({ args: { inquiry_id: v.id("inquiries"), delay: v.number(), schedule: v.boolean() }, handler: async (ctx, args) => {
  const inquiry = await ctx.db.get(args.inquiry_id);
  if (!inquiry?.lifecycle || !inquiry.open_client_id) throw new Error("Expected an open Inquiry fixture");
  const deadline = Date.now() + args.delay;
  await ctx.db.patch(args.inquiry_id, { lifecycle: { ...inquiry.lifecycle, deadline } });
  if (args.schedule) await ctx.scheduler.runAt(deadline, internal.inquiries.expire, {
    inquiry_id: args.inquiry_id, expected_deadline: deadline, expected_cycle: inquiry.lifecycle.cycle,
  });
} });
`;

try {
  for (const entry of ["convex", "src", "convex.json", "package.json"]) {
    await cp(path.join(repository, entry), path.join(directory, entry), { recursive: true });
  }
  await symlink(path.join(repository, "node_modules"), path.join(directory, "node_modules"));
  await writeFile(path.join(directory, "convex", "inquiryTestFixture.ts"), fixture);

  let ready = false;
  for (let attempt = 0; attempt < 100 && backend.exitCode === null; attempt++) {
    try {
      ready = (await fetch(`${url}/version`)).ok;
      if (ready) break;
    } catch {}
    await delay(100);
  }
  assert.ok(ready && backend.exitCode === null, "Disposable backend failed to start");

  try {
    execFileSync(path.join(repository, "node_modules/.bin/convex"), ["dev", "--once", "--codegen", "disable"], {
      cwd: directory, encoding: "utf8", stdio: "pipe",
      env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("CONVEX_"))),
        CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey },
    });
  } catch (error) {
    throw new Error(`Disposable deployment failed: ${String(error.stderr || error.message).replaceAll(adminKey, "[redacted]")}`);
  }

  const admin = new ConvexHttpClient(url);
  admin.setAdminAuth(adminKey);
  const staff = ["march", "april"].map(name => {
    const client = new ConvexHttpClient(url);
    client.setAdminAuth(adminKey, { subject: `${name}|session`, issuer: "inquiry-fixture", tokenIdentifier: `fixture|${name}` });
    return client;
  });
  await admin.mutation("inquiryTestFixture:seed", {});
  const catalog = await staff[0].query("packages:listWithRooms", {});
  const [march, april] = ["2025/2026", "2026/2027"].map(year => catalog.find(pkg => pkg.year === year));
  const createClient = async name => (await staff[0].mutation("clients:create", { name })).id;
  const destination = async (client, client_id) => (await client.query("inquiries:destination", { client_id })).destination;
  const prepare = async (client, client_id, pkg) => ({
    operation: "create", request_key: randomUUID(), pic_name: "Test Staff", branch: "Test Branch", notes: "",
    client: { mode: "replace", id: client_id },
    selection: { mode: "replace", package_id: pkg._id, flight_id: pkg.flights[0]._id, reviewed_context: pkg.creation_context,
      rooms: [{ room_type: "Quad", price: 1000, pax: 2 }] },
    extras: { mode: "replace", addons: [], discounts: [] },
    inquiry_destination: await destination(client, client_id),
  });
  const save = (client, command) => client.mutation("quotationRevisionSaves:save", { command }, { skipQueue: true });
  const inspect = client_id => admin.query("inquiryTestFixture:clientInquiries", { client_id });
  const read = inquiry_id => admin.query("inquiryTestFixture:read", { inquiry_id });
  const expire = (row, now) => admin.mutation("inquiryTestFixture:tick", {
    inquiry_id: row._id, expected_cycle: row.lifecycle.cycle, expected_deadline: row.lifecycle.deadline, now,
  });
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const racing = await createClient("Concurrent quotation staff");
  const commands = await Promise.all([prepare(staff[0], racing, march), prepare(staff[1], racing, april)]);
  const results = await Promise.allSettled(commands.map((command, index) => save(staff[index], command)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const retry = results.findIndex(result => result.status === "rejected");
  assert.match(String(results[retry].reason), /INQUIRY_DESTINATION_CHANGED/);
  assert.equal((await inspect(racing)).length, 1);
  const retryCommand = { ...commands[retry], request_key: randomUUID(), inquiry_destination: await destination(staff[retry], racing) };
  const saved = await save(staff[retry], retryCommand);
  assert.deepEqual(await save(staff[retry], retryCommand), saved);
  const [comparison] = (await staff[0].query("inquiries:forClient", { client_id: racing })).inquiries;
  assert.equal(comparison.options.length, 2);

  const expiredClient = await createClient("Idle quotation client");
  await save(staff[0], await prepare(staff[0], expiredClient, march));
  const [idle] = await inspect(expiredClient);
  assert.equal(idle.lifecycle.deadline - Date.parse(idle.created_at), twoWeeks);
  assert.equal(await expire(idle, idle.lifecycle.deadline - 1), false);
  assert.equal((await read(idle._id)).status, "open");
  assert.equal(await expire(idle, idle.lifecycle.deadline), true);
  assert.equal(await expire(idle, idle.lifecycle.deadline + 1), false);
  const [expired] = (await staff[0].query("inquiries:forClient", { client_id: expiredClient })).inquiries;
  assert.equal(expired.outcome.type, "inactivity");
  assert.ok(expired.options.every(option => option.status === "closed" && option.reason === "inactivity"));

  const followedUpClient = await createClient("Followed-up quotation client");
  await save(staff[0], await prepare(staff[0], followedUpClient, march));
  const [followUpInquiry] = await inspect(followedUpClient);
  await admin.mutation("inquiryTestFixture:setDeadline", { inquiry_id: followUpInquiry._id, delay: twoWeeks / 14, schedule: false });
  const before = await read(followUpInquiry._id);
  const action = { inquiry_id: before._id, expected_cycle: before.lifecycle.cycle, request_key: randomUUID(), command: { type: "follow_up" } };
  const receipt = await staff[0].mutation("inquiries:act", action);
  assert.deepEqual(await staff[0].mutation("inquiries:act", action), receipt);
  const after = await read(before._id);
  assert.equal(after.lifecycle.deadline - Date.parse(after.updated_at), twoWeeks);
  assert.ok(after.lifecycle.deadline > before.lifecycle.deadline);
  assert.equal(await expire(before, before.lifecycle.deadline), false);
  assert.equal((await read(before._id)).status, "open");
  assert.equal(await expire(after, after.lifecycle.deadline), true);

  const scheduledClient = await createClient("Scheduled closure client");
  await save(staff[0], await prepare(staff[0], scheduledClient, april));
  const [scheduled] = await inspect(scheduledClient);
  await admin.mutation("inquiryTestFixture:setDeadline", { inquiry_id: scheduled._id, delay: 600, schedule: true });
  for (let attempt = 0; attempt < 35 && !(await read(scheduled._id)).lifecycle.outcome; attempt++) await delay(250);
  assert.equal((await read(scheduled._id)).lifecycle.outcome.type, "inactivity");

  const checks = {
    simultaneousFirstSaves: { independentReferences: true, openInquiries: 1, staleDraftRetriedIntoExistingInquiry: true },
    inactivity: { milliseconds: twoWeeks, beforeDeadlineOpen: true, atDeadlineClosed: true, repeatedExpiryNoEffect: true },
    followUp: { beforeOldDeadline: true, oldDeadlineIgnored: true, expiredAtNewDeadline: true, repeatedFollowUpNoEffect: true },
    scheduler: { productionExpiryInvoked: true },
  };
  if (process.env.INQUIRY_EVIDENCE) await writeFile(process.env.INQUIRY_EVIDENCE, `${JSON.stringify(checks, null, 2)}\n`);
  console.log(JSON.stringify(checks, null, 2));
} finally {
  if (backend.exitCode === null && backend.signalCode === null) {
    backend.kill("SIGTERM");
    await new Promise(resolve => backend.once("exit", resolve));
  }
  await rm(directory, { recursive: true, force: true });
}
