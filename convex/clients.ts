import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const clients = await ctx.db.query("clients").collect();

		return clients
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((client) => ({
				id: String(client._id),
				name: client.name,
				phone_number: client.phone_number ?? "",
				created_at: client.created_at,
				updated_at: client.updated_at,
			}));
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		phone_number: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();
		const clientId = await ctx.db.insert("clients", {
			name: args.name.trim(),
			phone_number: args.phone_number?.trim() || "",
			created_at: now,
			updated_at: now,
		});

		return {
			id: String(clientId),
			name: args.name.trim(),
			phone_number: args.phone_number?.trim() || "",
		};
	},
});
