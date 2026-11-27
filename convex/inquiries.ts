import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  actOnInquiry, clientInquiries, expireInquiry, inquiryCommand, inquiryExpiryArgs, readInquiryDestination,
} from "./lib/inquiryLifecycle";
import { revisionReleaseMode } from "./lib/quotationFamilyIdentity";

export const destination = query({
  args: { client_id: v.id("clients") },
  handler: async (ctx, { client_id }) => {
    if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
    if (await revisionReleaseMode(ctx) !== "active") return null;
    return readInquiryDestination(ctx, client_id, Date.now());
  },
});

export const forClient = query({
  args: { client_id: v.id("clients") },
  handler: async (ctx, { client_id }) => {
    if (!await getAuthUserId(ctx)) throw new Error("Not authenticated");
    const now = Date.now();
    const [inquiries, mode] = await Promise.all([clientInquiries(ctx, client_id, now), revisionReleaseMode(ctx)]);
    return { inquiries, server_now: now, actions_enabled: mode === "active" };
  },
});

export const act = mutation({
  args: { inquiry_id: v.id("inquiries"), expected_cycle: v.number(), request_key: v.string(), command: inquiryCommand },
  handler: async (ctx, args) => {
    const actor = await getAuthUserId(ctx);
    if (!actor) throw new Error("Not authenticated");
    return actOnInquiry(ctx, actor, args, Date.now());
  },
});

export const expire = internalMutation({
  args: inquiryExpiryArgs,
  handler: (ctx, target) => expireInquiry(ctx, target, Date.now),
});
