import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getMyProfile = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		// Get email from the password account (providerAccountId is the email for Password provider)
		const account = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) =>
				q.eq("userId", userId).eq("provider", "password"),
			)
			.first();

		const email = account?.providerAccountId ?? null;

		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_email", (q) => q.eq("email", email))
			.unique();

		return {
			full_name: profile?.full_name ?? null,
			branch: profile?.branch ?? null,
			unit: profile?.unit ?? null,
			email,
		};
	},
});

export const createUserAccount = mutation({
	args: {
		email: v.string(),
		password: v.string(),
		fullName: v.string(),
		branch: v.string(),
		unit: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		const now = new Date().toISOString();

		await createAccount(ctx as any, {
			provider: "password",
			account: {
				id: args.email,
				secret: args.password,
			},
			profile: {
				email: args.email,
				name: args.fullName,
			},
		});

		const existing = await ctx.db
			.query("profiles")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.unique();

		if (!existing) {
			await ctx.db.insert("profiles", {
				email: args.email,
				full_name: args.fullName,
				branch: args.branch,
				unit: args.unit,
				updated_at: now,
			});
		}
	},
});

export const createProfileForEmail = mutation({
	args: {
		email: v.string(),
		fullName: v.string(),
		branch: v.string(),
		unit: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("profiles")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.unique();
		if (existing) return { id: existing._id };
		const id = await ctx.db.insert("profiles", {
			email: args.email,
			full_name: args.fullName,
			branch: args.branch,
			unit: args.unit,
			updated_at: new Date().toISOString(),
		});
		return { id };
	},
});

export const setProfileEmail = mutation({
	args: {
		profileId: v.id("profiles"),
		email: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.profileId, { email: args.email });
		return { success: true };
	},
});

export const migrateQuotationCreators = mutation({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("profiles").collect();
		const nameToId: Record<string, string> = {};
		for (const p of profiles) {
			nameToId[p.full_name] = p._id;
		}
		// Sera is Norsuhaira
		const norsuhaira = profiles.find((p) => p.email === "norsuhaira0248@gmail.com");
		if (norsuhaira) nameToId["Sera"] = norsuhaira._id;

		const quotations = await ctx.db.query("quotations").collect();
		let linked = 0;
		let skipped = 0;

		for (const q of quotations) {
			const profileId = nameToId[q.created_by];
			if (profileId) {
				await ctx.db.patch(q._id, { creator_id: profileId as any });
				linked++;
			} else {
				skipped++;
			}
		}

		return { linked, skipped, total: quotations.length };
	},
});

export const removeLegacySupabaseIds = mutation({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("profiles").collect();
		let cleaned = 0;

		for (const profile of profiles) {
			if (!(profile as any).supabase_id) {
				continue;
			}

			await ctx.db.replace(profile._id, {
				email: profile.email,
				full_name: profile.full_name,
				branch: profile.branch,
				updated_at: profile.updated_at,
				unit: profile.unit,
			});
			cleaned += 1;
		}

		return {
			total_profiles: profiles.length,
			cleaned,
		};
	},
});
