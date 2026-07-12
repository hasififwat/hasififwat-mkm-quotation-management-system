import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normaliseName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalisePhone(phone: string): string {
	// Strip all non-digit characters
	let digits = phone.replace(/\D/g, "");
	// Convert country code 60 prefix → leading 0
	if (digits.startsWith("60") && digits.length > 10) {
		digits = "0" + digits.slice(2);
	}
	return digits;
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const clients = await ctx.db.query("clients").collect();

		return clients
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((client) => ({
				id: String(client._id),
				name: client.name,
				phone_number: client.phone_number,
				created_at: client.created_at,
				updated_at: client.updated_at,
			}));
	},
});

export const findDuplicateClients = query({
	args: {},
	handler: async (ctx) => {
		const [clients, quotations] = await Promise.all([
			ctx.db.query("clients").collect(),
			ctx.db.query("quotations").collect(),
		]);

		// Count quotations per client_id
		const quotationCountById = new Map<string, number>();
		for (const q of quotations) {
			const key = q.client_id;
			quotationCountById.set(key, (quotationCountById.get(key) ?? 0) + 1);
		}

		// Group clients by normalised name
		const groups = new Map<string, typeof clients>();
		for (const client of clients) {
			const key = normaliseName(client.name);
			const group = groups.get(key);
			if (group) {
				group.push(client);
			} else {
				groups.set(key, [client]);
			}
		}

		// Keep only groups with more than one record
		const duplicateGroups = Array.from(groups.entries())
			.filter(([, members]) => members.length > 1)
			.map(([normalisedName, members]) => {
				const membersWithCounts = members
					.map((client) => ({
						id: String(client._id),
						name: client.name,
						phone_number: client.phone_number,
						normalised_phone: normalisePhone(client.phone_number ?? ""),
						quotation_count: quotationCountById.get(String(client._id)) ?? 0,
						created_at: client.created_at,
					}))
					// Sort: most quotations first so the canonical candidate is obvious
					.sort((a, b) => b.quotation_count - a.quotation_count);

				const totalQuotations = membersWithCounts.reduce(
					(sum, m) => sum + m.quotation_count,
					0,
				);

				const phoneValues = new Set(
					membersWithCounts
						.map((m) => m.normalised_phone)
						.filter((p) => p.length > 0),
				);

				return {
					normalised_name: normalisedName,
					member_count: members.length,
					total_quotations: totalQuotations,
					// true if all non-blank phones across the group are the same
					phones_consistent: phoneValues.size <= 1,
					members: membersWithCounts,
				};
			})
			// Sort: groups with the most quotations at the top
			.sort((a, b) => b.total_quotations - a.total_quotations);

		return {
			total_clients: clients.length,
			duplicate_group_count: duplicateGroups.length,
			affected_client_count: duplicateGroups.reduce(
				(sum, g) => sum + g.member_count,
				0,
			),
			groups: duplicateGroups,
		};
	},
});

export const mergeClients = mutation({
	args: {
		canonicalId: v.string(),
		duplicateIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const canonical = await ctx.db
			.query("clients")
			.collect()
			.then((all) => all.find((c) => String(c._id) === args.canonicalId));

		if (!canonical) {
			throw new Error(`Canonical client not found: ${args.canonicalId}`);
		}

		const quotations = await ctx.db.query("quotations").collect();
		const now = new Date().toISOString();

		let relinkedQuotations = 0;
		const removedClients: string[] = [];

		for (const duplicateId of args.duplicateIds) {
			const duplicate = await ctx.db
				.query("clients")
				.collect()
				.then((all) => all.find((c) => String(c._id) === duplicateId));

			if (!duplicate) {
				throw new Error(`Duplicate client not found: ${duplicateId}`);
			}

			// Relink all quotations that reference this duplicate → canonical
			const affected = quotations.filter((q) => q.client_id === duplicateId);
			for (const q of affected) {
				await ctx.db.patch(q._id, { client_id: args.canonicalId });
				relinkedQuotations += 1;
			}

			await ctx.db.delete(duplicate._id);
			removedClients.push(duplicateId);
		}

		// Touch updated_at on canonical so the merge is traceable
		await ctx.db.patch(canonical._id, { updated_at: now });

		return {
			canonicalId: args.canonicalId,
			canonicalName: canonical.name,
			relinkedQuotations,
			removedClients,
		};
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		phone_number: v.optional(v.string()),
		force: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const name = args.name.trim();
		const rawPhone = args.phone_number?.trim() || "";
		const normalisedPhone = normalisePhone(rawPhone);
		const now = new Date().toISOString();

		// Soft-warn: if phone is provided and not forced, check for an existing
		// client with the same normalised phone number
		if (normalisedPhone && !args.force) {
			const allClients = await ctx.db.query("clients").collect();
			const match = allClients.find(
				(c) => normalisePhone(c.phone_number ?? "") === normalisedPhone,
			);

			if (match) {
				return {
					alreadyExists: true as const,
					existing: {
						id: String(match._id),
						name: match.name,
						phone_number: match.phone_number,
					},
				};
			}
		}

		const clientId = await ctx.db.insert("clients", {
			name,
			phone_number: rawPhone,
			created_at: now,
			updated_at: now,
		});

		return {
			alreadyExists: false as const,
			id: String(clientId),
			name,
			phone_number: rawPhone,
		};
	},
});
