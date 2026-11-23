import { canonicalClientId } from "./lib/clientCanonical";
import { currentOptionState, mergeOpenInquiries } from "./lib/inquiryLifecycle";
import { readCurrentQuotations } from "./lib/currentQuotations";
import type { Doc, Id } from "./_generated/dataModel";
import { assertLegacyWritesAllowed, assertMutableLegacyQuotation } from "./lib/quotationFamilyIdentity";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function requireClientActor(ctx: Pick<QueryCtx, "auth">): Promise<string> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error("Not authenticated");
	return userId;
}

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

async function readCanonicalClients(ctx: Pick<QueryCtx, "db">) {
	const clients = await ctx.db.query("clients").collect();
	const canonicalIds = new Map(await Promise.all(clients.map(async client => [
		String(client._id), String(await canonicalClientId(ctx, client._id)),
	] as const)));
	const canonicalId = (id: string) => canonicalIds.get(id) ?? id;
	return { clients: clients.filter(client => canonicalId(String(client._id)) === String(client._id)), canonicalId };
}

async function readClientAssociations(ctx: Pick<QueryCtx, "db">) {
	const [{ clients, canonicalId }, current, revisions, packages, families] = await Promise.all([
		readCanonicalClients(ctx),
		readCurrentQuotations(ctx),
		ctx.db.query("quotations").collect(),
		ctx.db.query("packages").collect(),
		ctx.db.query("quotation_families").collect(),
	]);
	const packagesById = new Map(packages.map(pkg => [String(pkg._id), pkg]));
	const familiesById = new Map(families.map(family => [String(family._id), family]));
	const currentIds = new Set(current.map(q => String(q._id)));
	const summary = async (q: Doc<"quotations">) => {
		const pkg = q.package_snapshot ?? (q.family_id || q.frozen_document ? null : packagesById.get(q.package_id));
		const family = q.family_id ? familiesById.get(String(q.family_id)) : undefined;
		const option = family?.inquiry_id ? await currentOptionState(ctx, q, family) : null;
		return {
			id: String(q._id),
			family_id: q.family_id ?? null,
			current_revision_id: family?.current_revision_id ?? null,
			is_current: family ? family.current_revision_id === q._id : !q.family_id,
			archived: family?.archived ?? q.archived ?? false,
			client_id: canonicalId(q.client_id),
			saved_client_id: q.client_id,
			client_name: q.client_name,
			quotation_number: buildQuotationNumber(q.hijri_year, q.sequence_num, q.revision),
			status: option?.status ?? q.status,
			...(option ? { inquiry_id: option.inquiry_id } : {}),
			total_amount: q.total_amount,
			package_provenance: q.package_snapshot ? "saved" as const : q.family_id || q.frozen_document ? "legacy_unknown" as const : "live_catalog" as const,
			package_name: pkg?.name ?? "Unknown Package",
			package_year: pkg?.year ?? null,
			pic_name: q.pic_name,
			branch: q.branch,
			created_at: q.created_at,
			updated_at: q.updated_at,
		};
	};
	const newestFirst = (a: Doc<"quotations">, b: Doc<"quotations">) => b.created_at.localeCompare(a.created_at) || String(b._id).localeCompare(String(a._id));
	const currentByClient = new Map<string, Doc<"quotations">[]>();
	const historyByClient = new Map<string, Doc<"quotations">[]>();
	for (const q of current) {
		const id = canonicalId(q.client_id);
		const bucket = currentByClient.get(id) ?? [];
		bucket.push(q);
		currentByClient.set(id, bucket);
	}
	for (const q of revisions) {
		if (currentIds.has(String(q._id))) continue;
		const id = canonicalId(q.client_id);
		const bucket = historyByClient.get(id) ?? [];
		bucket.push(q);
		historyByClient.set(id, bucket);
	}
	const rows = await Promise.all(clients.sort((a, b) => b.created_at.localeCompare(a.created_at) || String(b._id).localeCompare(String(a._id)))
		.map(async client => {
			const qs = (currentByClient.get(String(client._id)) ?? []).sort(newestFirst);
			const historical = (historyByClient.get(String(client._id)) ?? []).sort(newestFirst);
			return {
				id: String(client._id),
				name: client.name,
				phone_number: client.phone_number,
				created_at: client.created_at,
				updated_at: client.updated_at,
				quotation_count: qs.length,
				total_quoted_value: qs.reduce((sum, q) => sum + Math.round(q.total_amount * 100), 0) / 100,
				last_quotation_at: qs[0]?.created_at ?? null,
				quotations: await Promise.all(qs.map(summary)),
				historical_quotation_count: historical.length,
				historical_quotations: await Promise.all(historical.map(summary)),
			};
		}));
	return { rows, canonicalId };
}

export const listWithStats = query({
	args: {},
	handler: async (ctx) => {
		await requireClientActor(ctx);
		return (await readClientAssociations(ctx)).rows;
	},
});

export const getAgentNames = query({
	args: {},
	handler: async (ctx) => {
		await requireClientActor(ctx);
		const quotations = await readCurrentQuotations(ctx);
		return [...new Set(quotations.map(q => q.pic_name))].sort();
	},
});

export const listWithStatsPaginated = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, { paginationOpts }) => {
		await requireClientActor(ctx);
		const { rows } = await readClientAssociations(ctx);
		let remaining = rows;
		if (paginationOpts.cursor) {
			const cursor: unknown = JSON.parse(paginationOpts.cursor);
			if (!Array.isArray(cursor) || cursor.length !== 2 || cursor.some(value => typeof value !== "string")) throw new Error("Invalid client cursor");
			remaining = rows.filter(row => (row.created_at.localeCompare(cursor[0]) || row.id.localeCompare(cursor[1])) < 0);
		}
		const page = remaining.slice(0, paginationOpts.numItems);
		const last = page.at(-1);
		const isDone = remaining.length <= page.length;
		return { page, isDone, continueCursor: !isDone && last ? JSON.stringify([last.created_at, last.id]) : "" };
	},
});

export const getWithQuotations = query({
	args: { client_id: v.string() },
	handler: async (ctx, args) => {
		await requireClientActor(ctx);
		const { rows, canonicalId } = await readClientAssociations(ctx);
		const client = rows.find(row => row.id === canonicalId(args.client_id));
		return client ? { ...client, requested_client_id: args.client_id } : null;
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireClientActor(ctx);
		const { clients } = await readCanonicalClients(ctx);
		return clients.sort((a, b) => b.created_at.localeCompare(a.created_at) || String(b._id).localeCompare(String(a._id)))
			.map(client => ({ id: String(client._id), name: client.name, phone_number: client.phone_number, created_at: client.created_at, updated_at: client.updated_at }));
	},
});

export const findDuplicateClients = query({
	args: {},
	handler: async (ctx) => {
		await requireClientActor(ctx);
		const [allClients, quotations] = await Promise.all([
			ctx.db.query("clients").collect(),
			readCurrentQuotations(ctx),
		]);
		const canonicalIds = new Map(await Promise.all(allClients.map(async client => [String(client._id), String(await canonicalClientId(ctx, client._id))] as const)));
		const clients = allClients.filter(client => canonicalIds.get(String(client._id)) === String(client._id));

		// Count quotations per client_id
		const quotationCountById = new Map<string, number>();
		for (const q of quotations) {
			const key = canonicalIds.get(q.client_id) ?? q.client_id;
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

async function associateClients(ctx: MutationCtx, actor: string, canonicalId: Id<"clients">, duplicateIds: Id<"clients">[]) {
  if (duplicateIds.includes(canonicalId) || new Set(duplicateIds).size !== duplicateIds.length) throw new Error("Invalid duplicate client selection");
  const canonical = await ctx.db.get(canonicalId);
  if (!canonical) throw new Error("Canonical client not found");
  const target = await canonicalClientId(ctx, canonicalId);
  const targetClient = await ctx.db.get(target);
  if (!targetClient) throw new Error("Canonical client not found");
  const roots = await Promise.all(duplicateIds.map(async id => {
    if (!await ctx.db.get(id)) throw new Error("Duplicate client not found");
    if (id === target) throw new Error("Client merge would create an alias cycle");
    const root = await canonicalClientId(ctx, id);
    if (id !== root && root !== target) {
      throw new ConvexError({ code: "CLIENT_MERGE_ALIAS_CHANGED", message: "A selected client has already been merged. Review the current client record before merging again." });
    }
    return root;
  }));
  const duplicates = [...new Set(roots.filter(id => id !== target))];
  const now = Date.now();
  if (duplicates.length) await mergeOpenInquiries(ctx, actor, target, duplicates, now);
  for (const id of duplicates) {
    await ctx.db.insert("client_aliases", {
      alias_client_id: id, canonical_client_id: target, updated_by: actor, updated_at: new Date(now).toISOString(),
    });
  }
  return {canonicalId: target, canonicalName: targetClient.name, relinkedQuotations: 0, removedClients: [] as string[], associatedClients: duplicateIds};
}

export const mergeClients = mutation({
	args: {
		canonicalId: v.string(),
		duplicateIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const actor = await requireClientActor(ctx);
		const migration = await ctx.db.query("quotation_family_migrations").withIndex("by_key", q => q.eq("key", "family-v1")).unique();
		const savedQuotations = await ctx.db.query("quotations").collect();
		if (migration && !migration.done) await assertLegacyWritesAllowed(ctx);
		if (migration || savedQuotations.some(q => q.family_id || q.frozen_document)) {
		  const canonical = ctx.db.normalizeId("clients", args.canonicalId);
		  const duplicates = args.duplicateIds.map(id => ctx.db.normalizeId("clients", id));
		  if (!canonical || duplicates.some(id => !id)) throw new Error("Invalid client identity");
		  return associateClients(ctx, actor, canonical, duplicates as Id<"clients">[]);
		}
		await assertLegacyWritesAllowed(ctx);
		const canonical = await ctx.db
			.query("clients")
			.collect()
			.then((all) => all.find((c) => String(c._id) === args.canonicalId));

		if (!canonical) {
			throw new Error(`Canonical client not found: ${args.canonicalId}`);
		}

		const quotations = await ctx.db.query("quotations").collect();
		quotations.forEach(assertMutableLegacyQuotation);
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
		await requireClientActor(ctx);
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
