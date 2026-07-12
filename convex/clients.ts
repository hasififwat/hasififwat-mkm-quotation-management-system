import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function buildQuotationNumber(hijriYear: string, sequenceNum: number, revision: number) {
	const paddedSequence = String(sequenceNum).padStart(4, "0");
	return revision > 0
		? `${hijriYear}-${paddedSequence}-R${revision}`
		: `${hijriYear}-${paddedSequence}`;
}

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

export const listWithStats = query({
	args: {},
	handler: async (ctx) => {
		const [clients, quotations, packages] = await Promise.all([
			ctx.db.query("clients").collect(),
			ctx.db.query("quotations").collect(),
			ctx.db.query("packages").collect(),
		]);

		const packagesById = new Map(packages.map((p) => [String(p._id), p]));

		const quotationsByClient = new Map<string, typeof quotations>();
		for (const q of quotations) {
			const bucket = quotationsByClient.get(q.client_id) ?? [];
			bucket.push(q);
			quotationsByClient.set(q.client_id, bucket);
		}

		return clients
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((client) => {
				const qs = quotationsByClient.get(String(client._id)) ?? [];
				const total_spend = qs.reduce((sum, q) => sum + q.total_amount, 0);
				const sorted = [...qs].sort((a, b) => b.created_at.localeCompare(a.created_at));
				return {
					id: String(client._id),
					name: client.name,
					phone_number: client.phone_number,
					created_at: client.created_at,
					quotation_count: qs.length,
					total_spend,
					last_quotation_at: sorted[0]?.created_at ?? null,
					quotations: sorted.map((q) => {
						const pkg = packagesById.get(q.package_id);
						return {
							id: String(q._id),
							quotation_number: buildQuotationNumber(q.hijri_year, q.sequence_num, q.revision),
							status: q.status,
							total_amount: q.total_amount,
							package_name: pkg?.name ?? "Unknown Package",
							package_year: pkg?.year ?? null,
							pic_name: q.pic_name,
							created_at: q.created_at,
						};
					}),
				};
			});
	},
});

export const getAgentNames = query({
	args: {},
	handler: async (ctx) => {
		const quotations = await ctx.db.query("quotations").collect();
		return [...new Set(quotations.map((q) => q.pic_name))].sort();
	},
});

export const listWithStatsPaginated = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		const page = await ctx.db.query("clients").order("desc").paginate(args.paginationOpts);

		const [allQuotations, packages] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("packages").collect(),
		]);

		const clientIds = new Set(page.page.map((c) => String(c._id)));
		const packagesById = new Map(packages.map((p) => [String(p._id), p]));

		const quotationsByClient = new Map<string, typeof allQuotations>();
		for (const q of allQuotations) {
			if (!clientIds.has(q.client_id)) continue;
			const bucket = quotationsByClient.get(q.client_id) ?? [];
			bucket.push(q);
			quotationsByClient.set(q.client_id, bucket);
		}

		return {
			...page,
			page: page.page.map((client) => {
				const qs = quotationsByClient.get(String(client._id)) ?? [];
				const sorted = [...qs].sort((a, b) => b.created_at.localeCompare(a.created_at));
				return {
					id: String(client._id),
					name: client.name,
					phone_number: client.phone_number,
					created_at: client.created_at,
					quotation_count: qs.length,
					last_quotation_at: sorted[0]?.created_at ?? null,
					quotations: sorted.map((q) => {
						const pkg = packagesById.get(q.package_id);
						return {
							id: String(q._id),
							quotation_number: buildQuotationNumber(q.hijri_year, q.sequence_num, q.revision),
							status: q.status,
							total_amount: q.total_amount,
							package_name: pkg?.name ?? "Unknown Package",
							package_year: pkg?.year ?? null,
							pic_name: q.pic_name,
							created_at: q.created_at,
						};
					}),
				};
			}),
		};
	},
});

export const getWithQuotations = query({
	args: { client_id: v.string() },
	handler: async (ctx, args) => {
		const clients = await ctx.db.query("clients").collect();
		const client = clients.find((c) => String(c._id) === args.client_id);
		if (!client) return null;

		const [quotations, packages] = await Promise.all([
			ctx.db
				.query("quotations")
				.withIndex("by_client_id", (q) => q.eq("client_id", args.client_id))
				.collect(),
			ctx.db.query("packages").collect(),
		]);

		const packagesById = new Map(packages.map((p) => [String(p._id), p]));

		return {
			id: String(client._id),
			name: client.name,
			phone_number: client.phone_number,
			created_at: client.created_at,
			updated_at: client.updated_at,
			quotations: quotations
				.sort((a, b) => b.created_at.localeCompare(a.created_at))
				.map((q) => {
					const pkg = packagesById.get(q.package_id);
					return {
						id: String(q._id),
						quotation_number: buildQuotationNumber(q.hijri_year, q.sequence_num, q.revision),
						status: q.status,
						total_amount: q.total_amount,
						package_name: pkg?.name ?? "Unknown Package",
						package_year: pkg?.year ?? null,
						pic_name: q.pic_name,
						branch: q.branch,
						created_at: q.created_at,
						updated_at: q.updated_at,
					};
				}),
		};
	},
});

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
