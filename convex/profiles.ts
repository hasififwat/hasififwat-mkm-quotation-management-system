import { assertLegacyWritesAllowed, assertMutableLegacyQuotation } from "./lib/quotationFamilyIdentity";
import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { type Infer, v } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";

export const getMyProfile = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		const account = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) =>
				q.eq("userId", userId).eq("provider", "password"),
			)
			.first();

		const email = account?.providerAccountId ?? null;

		const profile = email === null ? null : await ctx.db
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

function requireEmail(email: string): string {
	if (!email.trim()) throw new Error("Email is required");
	if (email !== email.trim()) throw new Error("Email must not contain surrounding whitespace");
	return email;
}

function profileFields(args: { email: string; fullName: string; branch: string; unit?: string }) {
	const email = requireEmail(args.email);
	const fullName = args.fullName.trim();
	const branch = args.branch.trim();
	if (!fullName) throw new Error("Full name is required");
	if (!branch) throw new Error("Branch is required");
	return { email, full_name: fullName, branch, unit: args.unit?.trim() || undefined };
}

async function requireAccountAdmin(ctx: MutationCtx): Promise<void> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error("Not authenticated");
	const normalizedUserId = ctx.db.normalizeId("users", userId);
	const adminUserIds = new Set(
		(process.env.MKM_ACCOUNT_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
	);
	if (!normalizedUserId || !adminUserIds.has(normalizedUserId) || !(await ctx.db.get("users", normalizedUserId))) {
		throw new Error("Administrator access required");
	}
}

const passwordAccountArgs = v.object({
	email: v.string(),
	password: v.string(),
	fullName: v.string(),
	branch: v.string(),
	unit: v.optional(v.string()),
});

async function writePasswordAccount(
	ctx: MutationCtx,
	args: Infer<typeof passwordAccountArgs>,
): Promise<Id<"users">> {
	const fields = profileFields(args);
	if (args.password.length < 8) {
		throw new Error("Password must be at least 8 characters long");
	}
	const accountContext: Pick<ActionCtx, "runMutation"> = ctx;
	const { user } = await createAccount<DataModel>(accountContext as ActionCtx, {
		provider: "password",
		account: { id: fields.email, secret: args.password },
		profile: { email: fields.email, name: fields.full_name },
	});
	if (!user) throw new Error("This password account has no user record. Use a new email.");
	const existing = await ctx.db
		.query("profiles")
		.withIndex("by_email", (q) => q.eq("email", fields.email))
		.unique();
	if (!existing) {
		await ctx.db.insert("profiles", { ...fields, updated_at: new Date().toISOString() });
	}
	return user._id;
}

export const createUserAccount = mutation({
	args: passwordAccountArgs,
	handler: async (ctx, args) => {
		await requireAccountAdmin(ctx);
		return await writePasswordAccount(ctx, args);
	},
});

export const provisionPasswordAccount = internalMutation({
	args: passwordAccountArgs,
	returns: v.id("users"),
	handler: writePasswordAccount,
});

export const createProfileForEmail = internalMutation({
	args: {
		email: v.string(),
		fullName: v.string(),
		branch: v.string(),
		unit: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const fields = profileFields(args);
		const existing = await ctx.db
			.query("profiles")
			.withIndex("by_email", (q) => q.eq("email", fields.email))
			.unique();
		if (existing) return { id: existing._id };
		const id = await ctx.db.insert("profiles", {
			...fields,
			updated_at: new Date().toISOString(),
		});
		return { id };
	},
});

export const setProfileEmail = internalMutation({
	args: {
		profileId: v.id("profiles"),
		email: v.string(),
	},
	handler: async (ctx, args) => {
		const email = requireEmail(args.email);
		const profile = await ctx.db.get("profiles", args.profileId);
		if (!profile) throw new Error("Profile not found");
		const existing = await ctx.db.query("profiles")
			.withIndex("by_email", (q) => q.eq("email", email)).unique();
		if (existing && existing._id !== profile._id) throw new Error("Profile email is already assigned");
		if (profile.email === email) return { success: true };
		await ctx.db.patch(args.profileId, { email, updated_at: new Date().toISOString() });
		return { success: true };
	},
});

export const migrateQuotationCreators = internalMutation({
	args: {},
	handler: async (ctx) => {
		await assertLegacyWritesAllowed(ctx);
		const profiles = await ctx.db.query("profiles").collect();
		const nameToId: Record<string, Id<"profiles">> = {};
		for (const p of profiles) {
			nameToId[p.full_name] = p._id;
		}
		const norsuhaira = profiles.find((p) => p.email === "norsuhaira0248@gmail.com");
		if (norsuhaira) nameToId["Sera"] = norsuhaira._id;

		const quotations = await ctx.db.query("quotations").collect();
		quotations.forEach(assertMutableLegacyQuotation);
		let linked = 0;
		let skipped = 0;

		for (const q of quotations) {
			const profileId = nameToId[q.created_by];
			if (profileId) {
				await ctx.db.patch(q._id, { creator_id: profileId });
				linked++;
			} else {
				skipped++;
			}
		}

		return { linked, skipped, total: quotations.length };
	},
});

export const removeLegacySupabaseIds = internalMutation({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("profiles").collect();
		let cleaned = 0;

		for (const profile of profiles) {
			if (!("supabase_id" in profile) || !profile.supabase_id) {
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
