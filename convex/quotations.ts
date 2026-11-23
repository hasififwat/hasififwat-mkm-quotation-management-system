import { quotationRefreshToken, snapshotRefreshToken } from "./lib/quotationRefreshToken";
import { SNAPSHOT_REFRESH_CONFLICT, SNAPSHOT_REFRESH_CONFLICT_MESSAGE } from "../src/domain/snapshot-refresh-review";
import { readCurrentQuotations, quotationMatches, currentPage } from "./lib/currentQuotations";
import { canonicalClientId } from "./lib/clientCanonical";
import { readSavedQuotation, revisionContext } from "./lib/savedQuotation";
import { saveCommand, saveRevision } from "./quotationRevisionSaves";
import { assertLegacyWritesAllowed, assertMutableLegacyQuotation, reserveBaseReference } from "./lib/quotationFamilyIdentity";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireDescriptions, requirePrices, requireFlightDates } from "../src/domain/submission-validation";
import { getMappedHijriYear } from "../src/domain/umrah-years";
import { quotationSelectionContext } from "../src/domain/quotation-selection-context";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function requireQuotationActor(ctx: Pick<QueryCtx, "auth">): Promise<string> {
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

function normalizeCurrency(value: number) {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.round(value * 100) / 100;
}

function buildLineTotal(price: number, pax: number) {
	return normalizeCurrency(price * pax);
}

function validateQuotationLines(payload: {
	selected_rooms: Array<{ price: number; pax: number }>;
	adds_ons?: Array<{ name: string; price: number; pax: number }>;
	discounts?: Array<{ name: string; price: number; pax: number }>;
}) {
	requireDescriptions(payload.adds_ons ?? [], "Add-on");
	requireDescriptions(payload.discounts ?? [], "Discount");
	for (const [label, rows] of [["Room", payload.selected_rooms], ["Add-on", payload.adds_ons ?? []], ["Discount", payload.discounts ?? []]] as const) {
		requirePrices(rows, label);
		for (const row of rows) {
			if (!Number.isFinite(row.pax) || !Number.isFinite(row.price * Math.max(1, Math.floor(row.pax)) * 100)) {
				throw new Error(`${label} quantity and amount must be finite.`);
			}
		}
	}
}

function parseCreatedAt(value: string) {
	const parsed = Date.parse(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}

	return 0;
}

async function findQuotationByStringId(ctx: any, quotationId: string) {
	return await ctx.db.get(quotationId as Id<"quotations">);
}

function buildPackageSnapshot(
	pkg: {
		name: string;
		year: string;
		duration: string;
		transport?: string;
		package_code?: string;
		inclusions?: string;
		exclusions?: string;
		updated_at: string;
	},
	rooms: Array<{ room_type: string; price: number; enabled: boolean }>,
) {
	return {
		name: pkg.name,
		year: pkg.year,
		duration: pkg.duration,
		transport: pkg.transport,
		package_code: pkg.package_code,
		inclusions: pkg.inclusions,
		exclusions: pkg.exclusions,
		package_updated_at: pkg.updated_at,
		rooms: rooms.map((r) => ({ room_type: r.room_type, price: r.price, enabled: r.enabled })),
	};
}

function buildFlightSnapshot(flight: {
	_id: Id<"package_flights">;
	month: string;
	flight?: string;
	departure_date: string;
	departure_sector: string;
	return_date: string;
	return_sector: string;
}) {
	return {
		id: String(flight._id),
		month: flight.month,
		flight: flight.flight,
		departure_date: flight.departure_date,
		departure_sector: flight.departure_sector,
		return_date: flight.return_date,
		return_sector: flight.return_sector,
	};
}

function buildHotelsSnapshot(
	hotels: Array<{
		_id: Id<"package_hotels">;
		hotel_type: string;
		name?: string;
		placeholder: string;
		enabled: boolean;
	}>,
	mealsByHotelId: Map<string, string[]>,
) {
	return hotels.map((hotel) => ({
		hotel_type: hotel.hotel_type,
		name: hotel.name,
		placeholder: hotel.placeholder,
		enabled: hotel.enabled,
		meals: mealsByHotelId.get(String(hotel._id)) ?? [],
	}));
}

function groupMealsByHotelId(meals: Array<{ package_hotel_id: string; meal_type: string }>) {
	const grouped = new Map<string, string[]>();
	for (const meal of meals) {
		const bucket = grouped.get(String(meal.package_hotel_id)) ?? [];
		bucket.push(meal.meal_type);
		grouped.set(String(meal.package_hotel_id), bucket);
	}
	return grouped;
}

function groupHotelsByPackageId(hotels: Doc<"package_hotels">[]) {
	const grouped = new Map<string, Doc<"package_hotels">[]>();
	for (const hotel of hotels) {
		const bucket = grouped.get(String(hotel.package_id)) ?? [];
		bucket.push(hotel);
		grouped.set(String(hotel.package_id), bucket);
	}
	return grouped;
}

function sameRows<T>(saved: T[], live: T[], values: (row: T) => unknown[]) {
	const normalize = (rows: T[]) => rows.map((row) => JSON.stringify(values(row))).sort();
	return JSON.stringify(normalize(saved)) === JSON.stringify(normalize(live));
}

function computeStaleFields(
	pkgSnap: Doc<"quotations">["package_snapshot"] | null,
	flightSnap: Doc<"quotations">["flight_snapshot"] | null,
	currentPackage: Doc<"packages"> | undefined,
	liveFlight: Doc<"package_flights"> | undefined,
	liveRooms: Array<{ room_type: string; price: number; enabled: boolean }>,
	liveHotels: ReturnType<typeof buildHotelsSnapshot>,
	hotelSnap: Doc<"quotations">["hotels_snapshot"] | null,
): { stale_fields: string[]; snapshot_version_known: boolean } {
	const stale_fields: string[] = [];
	const snapshot_version_known = pkgSnap?.package_updated_at !== undefined;
	if (!snapshot_version_known || !pkgSnap?.rooms || !flightSnap || !hotelSnap) {
		stale_fields.push("snapshot.incomplete");
	}

	if (pkgSnap && !currentPackage) {
		stale_fields.push("package.removed");
	} else if (pkgSnap && currentPackage) {
		const fields = [
			["name", "package.name"], ["year", "package.year"],
			["duration", "package.duration"], ["transport", "package.transport"],
			["inclusions", "package.inclusions"], ["exclusions", "package.exclusions"],
			["package_code", "package.code"],
		] as const;
		for (const [field, label] of fields) {
			if ((snapshot_version_known || pkgSnap[field] !== undefined) && pkgSnap[field] !== currentPackage[field]) {
				stale_fields.push(label);
			}
		}
	}

	if (pkgSnap?.rooms && !sameRows(pkgSnap.rooms, liveRooms, (room) => [room.room_type, room.price, room.enabled])) {
		stale_fields.push("room_pricing");
	}
	if (hotelSnap && !sameRows(hotelSnap, liveHotels, (hotel) => [
		hotel.hotel_type, hotel.name, hotel.placeholder, hotel.enabled, [...hotel.meals].sort(),
	])) {
		stale_fields.push("hotels");
	}

	if (flightSnap && !liveFlight) {
		stale_fields.push("flight.removed");
	} else if (flightSnap && liveFlight) {
		const fields = ["month", "flight", "departure_date", "return_date", "departure_sector", "return_sector"] as const;
		if (fields.some((field) => flightSnap[field] !== liveFlight[field])) stale_fields.push("flight");
	}

	return { stale_fields, snapshot_version_known };
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireQuotationActor(ctx);
		const [quotations, packages, packageFlights, packageRooms, packageHotels, packageMeals] = await Promise.all([
			readCurrentQuotations(ctx),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_rooms").collect(),
			ctx.db.query("package_hotels").collect(),
			ctx.db.query("package_meals").collect(),
		]);

			const packagesById = new Map<string, (typeof packages)[number]>();
		for (const pkg of packages) {
				packagesById.set(String(pkg._id), pkg);
		}

			const flightsById = new Map<string, (typeof packageFlights)[number]>();
		for (const flight of packageFlights) {
				flightsById.set(String(flight._id), flight);
		}

		const roomsByPackageId = new Map<string, (typeof packageRooms)>();
		for (const room of packageRooms) {
			const id = String(room.package_id);
			const bucket = roomsByPackageId.get(id) ?? [];
			bucket.push(room);
			roomsByPackageId.set(id, bucket);
		}

		const mealsByHotelId = groupMealsByHotelId(packageMeals);
		const hotelsByPackageId = groupHotelsByPackageId(packageHotels);

		return Promise.all(quotations
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map(async (quotation) => {
				const selectedPackage = packagesById.get(quotation.package_id);
				const selectedFlight = flightsById.get(quotation.flight_id);
				const displayPackage = quotation.package_snapshot ?? (quotation.family_id || quotation.frozen_document ? null : selectedPackage);
				const displayFlight = quotation.flight_snapshot ?? (quotation.family_id || quotation.frozen_document ? null : selectedFlight);
				const liveRooms = roomsByPackageId.get(quotation.package_id) ?? [];

				const { stale_fields } = computeStaleFields(
					quotation.package_snapshot,
					quotation.flight_snapshot,
					selectedPackage,
					selectedFlight,
					liveRooms,
					buildHotelsSnapshot(hotelsByPackageId.get(quotation.package_id) ?? [], mealsByHotelId),
					quotation.hotels_snapshot,
				);
				const is_stale = stale_fields.length > 0;

				return {
					id: String(quotation._id),
					quotation_number: buildQuotationNumber(
						quotation.hijri_year,
						quotation.sequence_num,
						quotation.revision,
					),
					client_name: quotation.client_name,
					client_id: await canonicalClientId(ctx, quotation.client_id as Id<"clients">),
                    saved_client_id: quotation.client_id,
                    family_id: quotation.family_id ?? null,
                    package_id: quotation.package_id,
					pic_name: quotation.pic_name,
					branch: quotation.branch,
					status: quotation.status,
					total_amount: quotation.total_amount,
					notes: quotation.notes ?? "",
					hijri_year: quotation.hijri_year,
					created_at: quotation.created_at,
					updated_at: quotation.updated_at,
					is_stale,
					package: {
						id: quotation.package_id,
						name: displayPackage?.name ?? "Unknown Package",
						year: displayPackage?.year ?? null,
						duration: displayPackage?.duration ?? null,
					},
					package_provenance: quotation.package_snapshot ? "saved" as const : quotation.family_id || quotation.frozen_document ? "legacy_unknown" as const : "live_catalog" as const,
					selected_flight: displayFlight
						? {
							id: quotation.flight_id,
							month: displayFlight.month,
							flight: displayFlight.flight ?? "",
							return_date: displayFlight.return_date,
							return_sector: displayFlight.return_sector,
							departure_date: displayFlight.departure_date,
							departure_sector: displayFlight.departure_sector,
						}
						: null,
					flight_snapshot: quotation.flight_snapshot ?? null,
				};
			}));
	},
});

export const count = query({
	args: {
		searchTerm: v.optional(v.string()),
	},
	handler: async (ctx, { searchTerm }) => {
		await requireQuotationActor(ctx);
		const normalizedSearch = searchTerm?.trim().toLowerCase() ?? "";
		const [allQuotations, allPackages] = await Promise.all([
			readCurrentQuotations(ctx),
			ctx.db.query("packages").collect(),
		]);

		const activeQuotations = allQuotations;

		if (!normalizedSearch) {
			return activeQuotations.length;
		}

		const packageNameById = new Map<string, string>();
		for (const pkg of allPackages) {
			packageNameById.set(String(pkg._id), (pkg.name ?? "").toLowerCase());
		}

		return activeQuotations.filter((quotation) => {
			return quotationMatches(quotation, normalizedSearch, packageNameById.get(quotation.package_id));
		}).length;
	},
});

export const findDuplicates = query({
	args: {},
	handler: async (ctx) => {
		await requireQuotationActor(ctx);
		const allQuotations = await readCurrentQuotations(ctx);

		// Group by (client_name, package_id, flight_id, total_amount)
		const groups = new Map<
			string,
			(typeof allQuotations)[number][]
		>();

		for (const q of allQuotations.filter(q => !q.family_id && !q.frozen_document && q.document_schema_version === undefined)) {
			const key = `${q.client_name}|${q.package_id}|${q.flight_id}|${q.total_amount}`;
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(q);
		}

		// Return only groups with duplicates (2 or more items)
		const duplicateGroups = Array.from(groups.entries())
			.filter(([_, items]) => items.length > 1)
			.map(([key, items]) => {
				const [clientName, packageId, flightId, totalAmount] =
					key.split("|");
				return {
					clientName,
					packageId,
					flightId,
					totalAmount: Number.parseFloat(totalAmount),
					count: items.length,
					quotationIds: items.map((q) => String(q._id)),
					createdDates: items.map((q) => q.created_at).sort(),
				};
			});

		return duplicateGroups;
	},
});

export const listPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
        searchTerm: v.optional(v.string()),
        package_id: v.optional(v.string()),
        client_id: v.optional(v.id("clients")),
        visibility: v.optional(v.union(v.literal("current"), v.literal("archived"), v.literal("history"))),
		sortBy: v.optional(v.union(v.literal("updated_at"), v.literal("created_at"))),
		sortDir: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
	},
	handler: async (ctx, { paginationOpts, sortBy, sortDir, searchTerm, package_id, client_id, visibility }) => {
		await requireQuotationActor(ctx);
		const order = sortDir ?? "desc";
        let rows = await readCurrentQuotations(ctx, visibility === "archived");
        if (visibility === "history") {
          const activeIds = new Set(rows.map(row => row._id));
          rows = (await ctx.db.query("quotations").collect()).filter(row => !activeIds.has(row._id));
        }
        const legacyPackages = await ctx.db.query("packages").collect();
        const names = new Map(legacyPackages.map(pkg => [String(pkg._id), pkg.name]));
        const canonicalFilter = client_id ? await canonicalClientId(ctx, client_id) : null;
        const filtered = [];
        for (const row of rows) {
          if (package_id && row.package_id !== package_id) continue;
          if (canonicalFilter && await canonicalClientId(ctx, row.client_id as Id<"clients">) !== canonicalFilter) continue;
          if (!quotationMatches(row, searchTerm ?? "", names.get(row.package_id))) continue;
          filtered.push(row);
        }
        const result = currentPage(filtered, paginationOpts, sortBy, order);

		const [allPackages, allFlights, allRooms, allHotels, allMeals] = await Promise.all([
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_rooms").collect(),
			ctx.db.query("package_hotels").collect(),
			ctx.db.query("package_meals").collect(),
		]);

		const packagesById = new Map<string, (typeof allPackages)[number]>();
		for (const pkg of allPackages) {
			packagesById.set(String(pkg._id), pkg);
		}

		const flightsById = new Map<string, (typeof allFlights)[number]>();
		for (const flight of allFlights) {
			flightsById.set(String(flight._id), flight);
		}

		const roomsByPackageId = new Map<string, (typeof allRooms)>();
		for (const room of allRooms) {
			const id = String(room.package_id);
			const bucket = roomsByPackageId.get(id) ?? [];
			bucket.push(room);
			roomsByPackageId.set(id, bucket);
		}

		const mealsByHotelId = groupMealsByHotelId(allMeals);
		const hotelsByPackageId = groupHotelsByPackageId(allHotels);

		return {
			...result,
            total: filtered.length,
			page: await Promise.all(result.page.map(async (quotation) => {
				const selectedPackage = packagesById.get(quotation.package_id);
				const selectedFlight = flightsById.get(quotation.flight_id);
				const displayPackage = quotation.package_snapshot ?? (quotation.family_id || quotation.frozen_document ? null : selectedPackage);
				const displayFlight = quotation.flight_snapshot ?? (quotation.family_id || quotation.frozen_document ? null : selectedFlight);
				const liveRooms = roomsByPackageId.get(quotation.package_id) ?? [];

				const { stale_fields: rowStaleFields } = computeStaleFields(
					quotation.package_snapshot,
					quotation.flight_snapshot,
					selectedPackage,
					selectedFlight,
					liveRooms,
					buildHotelsSnapshot(hotelsByPackageId.get(quotation.package_id) ?? [], mealsByHotelId),
					quotation.hotels_snapshot,
				);
				const is_stale = rowStaleFields.length > 0;

				return {
					id: String(quotation._id),
					quotation_number: buildQuotationNumber(
						quotation.hijri_year,
						quotation.sequence_num,
						quotation.revision,
					),
					client_name: quotation.client_name,
					client_id: await canonicalClientId(ctx, quotation.client_id as Id<"clients">),
                    saved_client_id: quotation.client_id,
                    family_id: quotation.family_id ?? null,
                    package_id: quotation.package_id,
					pic_name: quotation.pic_name,
					branch: quotation.branch,
					status: quotation.status,
					total_amount: quotation.total_amount,
					notes: quotation.notes ?? "",
					hijri_year: quotation.hijri_year,
					created_at: quotation.created_at,
					updated_at: quotation.updated_at,
					is_stale,
					package: {
						id: quotation.package_id,
						name: displayPackage?.name ?? "Unknown Package",
						year: displayPackage?.year ?? null,
						duration: displayPackage?.duration ?? null,
					},
					package_provenance: quotation.package_snapshot ? "saved" as const : quotation.family_id || quotation.frozen_document ? "legacy_unknown" as const : "live_catalog" as const,
					selected_flight: displayFlight
						? {
								id: quotation.flight_id,
								month: displayFlight.month,
								flight: displayFlight.flight ?? "",
								return_date: displayFlight.return_date,
								return_sector: displayFlight.return_sector,
								departure_date: displayFlight.departure_date,
								departure_sector: displayFlight.departure_sector,
							}
						: null,
					flight_snapshot: quotation.flight_snapshot ?? null,
				};
			})),
		};
	},
});

export const create = mutation({
	args: {
		payload: v.object({
			request_key: v.optional(v.string()),
			pic_name: v.string(),
			branch: v.string(),
			client_id: v.string(),
			package_id: v.string(),
			flight_id: v.string(),
			reviewed_context: v.optional(v.string()),
			notes: v.optional(v.string()),
			status: v.optional(
				v.union(
					v.literal("draft"),
					v.literal("sent"),
					v.literal("accepted"),
					v.literal("rejected"),
					v.literal("revised"),
					v.literal("superseded"),
				),
			),
			created_by: v.optional(v.string()),
			selected_rooms: v.array(
				v.object({
					room_type: v.string(),
					price: v.number(),
					pax: v.number(),
				}),
			),
			adds_ons: v.optional(
				v.array(
					v.object({
						name: v.string(),
						price: v.number(),
						pax: v.number(),
					}),
				),
			),
			discounts: v.optional(
				v.array(
					v.object({
						name: v.string(),
						price: v.number(),
						pax: v.number(),
					}),
				),
			),
		}),
	},
	handler: async (ctx, args) => {
		const actor = await requireQuotationActor(ctx);
		const requestKey = args.payload.request_key;
		if (requestKey !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) {
			throw new ConvexError({ code: "QUOTATION_ATTEMPT_CONFLICT", message: "This save attempt is invalid. Your entries are kept on this page. Check Quotations before starting a new quotation." });
		}
		const requestContent = JSON.stringify(args.payload, (key, value) => {
			if (key === "request_key" || key === "created_by") return undefined;
			return value && typeof value === "object" && !Array.isArray(value)
				? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
				: value;
		});
		if (requestKey !== undefined) {
			const receipt = await ctx.db.query("quotation_create_receipts")
				.withIndex("by_actor_request_key", (q) => q.eq("actor", actor).eq("request_key", requestKey))
				.unique();
			if (receipt) {
				if (receipt.content !== requestContent) {
					throw new ConvexError({ code: "QUOTATION_ATTEMPT_CONFLICT", message: "An earlier version of this draft was already saved. Your current entries are kept on this page. Check Quotations to edit the saved record or start a new quotation." });
				}
				if (!await ctx.db.get(receipt.result.id as Id<"quotations">)) {
					throw new ConvexError({ code: "QUOTATION_ATTEMPT_CONFLICT", message: "This quotation was saved and later deleted. Your entries are kept on this page. Check Quotations before starting a new quotation." });
				}
				return receipt.result;
			}
		}
		await assertLegacyWritesAllowed(ctx);
		validateQuotationLines(args.payload);
		const now = new Date().toISOString();

		const allPackages = await ctx.db.query("packages").collect();
		const selectedPackage = allPackages.find(
			(candidate) => String(candidate._id) === args.payload.package_id,
		);
		if (!selectedPackage) {
			throw new ConvexError({ code: "QUOTATION_SELECTION_CONFLICT", message: "This package is no longer available. Review the latest package before saving." });
		}
		if (selectedPackage.archived) {
			throw new ConvexError({ code: "QUOTATION_SELECTION_CONFLICT", message: "This package has been archived. Choose an available package before saving." });
		}
		const hijriYear = getMappedHijriYear(selectedPackage.year);

		const [allClients, allFlights, allPackageRooms, allPackageHotels, allPackageMeals] =
			await Promise.all([
				ctx.db.query("clients").collect(),
				ctx.db.query("package_flights").collect(),
				ctx.db.query("package_rooms").collect(),
				ctx.db.query("package_hotels").collect(),
				ctx.db.query("package_meals").collect(),
			]);

		if (args.payload.reviewed_context !== quotationSelectionContext(
			selectedPackage, allPackageRooms, allFlights, allPackageHotels, allPackageMeals,
		)) {
			throw new ConvexError({ code: "QUOTATION_SELECTION_CONFLICT", message: "The package, rooms, or itinerary changed. Review the latest package before saving." });
		}

		const client = allClients.find(
			(candidate) => String(candidate._id) === args.payload.client_id,
		);
		if (!client) {
			throw new Error("Client not found");
		}

		const selectedFlight = allFlights.find(
			(candidate) => String(candidate._id) === args.payload.flight_id,
		);
		if (!selectedFlight) {
			throw new Error("Flight not found");
		}

		if (String(selectedFlight.package_id) !== args.payload.package_id) {
			throw new Error("Selected flight does not belong to the selected package");
		}

		requireFlightDates(selectedFlight);
		if (args.payload.selected_rooms.length === 0) {
			throw new Error("At least one room selection is required");
		}

		const roomsByType = new Map<string, (typeof allPackageRooms)[number]>();
		for (const room of allPackageRooms) {
			if (String(room.package_id) !== args.payload.package_id) {
				continue;
			}

			roomsByType.set(room.room_type, room);
		}

		const sanitizedSelectedRooms = args.payload.selected_rooms.map((item) => {
			const sanitizedPrice = normalizeCurrency(item.price);
			const sanitizedPax = Math.max(1, Math.floor(item.pax));
			const packageRoom = roomsByType.get(item.room_type);

			if (!packageRoom) {
				throw new Error(`Room type '${item.room_type}' does not exist in this package`);
			}
			if (!packageRoom.enabled) {
				throw new ConvexError({ code: "QUOTATION_SELECTION_CONFLICT", message: `Room type '${item.room_type}' is no longer available. Review the latest package before saving.` });
			}

			return {
				room_type: item.room_type,
				price: sanitizedPrice,
				pax: sanitizedPax,
				package_room_id: String(packageRoom._id),
			};
		});

		const sanitizedAddOns = (args.payload.adds_ons ?? []).map((item) => ({
			name: item.name,
			price: normalizeCurrency(item.price),
			pax: Math.max(1, Math.floor(item.pax)),
		}));

		const sanitizedDiscounts = (args.payload.discounts ?? []).map((item) => ({
			name: item.name,
			price: normalizeCurrency(item.price),
			pax: Math.max(1, Math.floor(item.pax)),
		}));

		const roomsTotal = sanitizedSelectedRooms.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);
		const addOnsTotal = sanitizedAddOns.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);
		const discountsTotal = sanitizedDiscounts.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);

		if (![roomsTotal, addOnsTotal, discountsTotal, (roomsTotal + addOnsTotal - discountsTotal) * 100].every(Number.isFinite)) {
			throw new Error("Quotation amount must be finite.");
		}
		const totalAmount = normalizeCurrency(roomsTotal + addOnsTotal - discountsTotal);


		const hotelsForPkg = allPackageHotels.filter(
			(h) => String(h.package_id) === args.payload.package_id,
		);
		const mealsByHotelId = new Map<string, string[]>();
		for (const meal of allPackageMeals) {
			const key = String(meal.package_hotel_id);
			const bucket = mealsByHotelId.get(key) ?? [];
			bucket.push(meal.meal_type);
			mealsByHotelId.set(key, bucket);
		}

		const roomsForPkg = allPackageRooms.filter(
			(r) => String(r.package_id) === args.payload.package_id,
		);
		requirePrices(roomsForPkg, "Package room");
		const package_snapshot = buildPackageSnapshot(selectedPackage, roomsForPkg);
		const flight_snapshot = buildFlightSnapshot(selectedFlight);
		const hotels_snapshot = buildHotelsSnapshot(hotelsForPkg, mealsByHotelId);

		const nextSequenceNum = await reserveBaseReference(ctx, hijriYear);
		const quotationId = await ctx.db.insert("quotations", {
			hijri_year: hijriYear,
			sequence_num: nextSequenceNum,
			revision: 0,
			client_name: client.name,
			package_id: args.payload.package_id,
			status: args.payload.status ?? "draft",
			total_amount: totalAmount,
			notes: args.payload.notes ?? "",
			created_at: now,
			updated_at: now,
			created_by: actor,
			pic_name: args.payload.pic_name,
			branch: args.payload.branch,
			flight_id: args.payload.flight_id,
			client_id: args.payload.client_id,
			package_snapshot,
			flight_snapshot,
			hotels_snapshot,
		});

		for (const room of sanitizedSelectedRooms) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotationId),
				item_type: "room",
				description: room.room_type,
				package_room_id: room.package_room_id,
				quantity: room.pax,
				unit_price: room.price,
				original_price: room.price,
				created_at: now,
			});
		}

		for (const addOn of sanitizedAddOns) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotationId),
				item_type: "addon",
				description: addOn.name,
				package_room_id: "",
				quantity: addOn.pax,
				unit_price: addOn.price,
				original_price: addOn.price,
				created_at: now,
			});
		}

		for (const discount of sanitizedDiscounts) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotationId),
				item_type: "discount",
				description: discount.name,
				package_room_id: "",
				quantity: discount.pax,
				unit_price: -discount.price,
				original_price: discount.price,
				created_at: now,
			});
		}

		const quotationNumber = buildQuotationNumber(hijriYear, nextSequenceNum, 0);
		await ctx.db.insert("quotation_logs", {
			quotation_id: String(quotationId),
			action: "created",
			description: `Quotation ${quotationNumber} created`,
			performed_by: actor,
			created_at: now,
			snapshot_data: JSON.stringify({
				status: args.payload.status ?? "draft",
				total_amount: totalAmount,
			}),
		});

		const result: Doc<"quotation_create_receipts">["result"] = {
			id: String(quotationId),
			quotation_number: quotationNumber,
			hijri_year: hijriYear,
			sequence_num: nextSequenceNum,
			revision: 0,
			total_amount: totalAmount,
			status: args.payload.status ?? "draft",
		};
		if (requestKey !== undefined) {
			await ctx.db.insert("quotation_create_receipts", {
				actor, request_key: requestKey, content: requestContent, result,
			});
		}
		return result;
	},
});

export const getQuotationForEdit = query({
	args: {
		target_quotation_id: v.string(),
	},
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		const quotation = await findQuotationByStringId(ctx, args.target_quotation_id);
		if (!quotation) {
			return null;
		}

		const [items, packageRooms, allPackages, allFlights, allPackageHotels, allPackageMeals] = await Promise.all([
			ctx.db
				.query("quotation_items")
				.withIndex("by_quotation_id", (q) => q.eq("quotation_id", String(quotation._id)))
				.collect(),
			ctx.db.query("package_rooms").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_hotels").collect(),
			ctx.db.query("package_meals").collect(),
		]);

		const selected_rooms = items
			.filter((item) => item.item_type === "room")
			.map((item) => {
				return {
					source_item_id: item._id,
					room_type: item.description,
					price: item.original_price ?? item.unit_price,
					pax: item.quantity,
				};
			});

		const adds_ons = items
			.filter((item) => item.item_type === "addon")
			.map((item) => ({
				id: String(item._id),
				name: item.description,
				price: item.original_price ?? item.unit_price,
				pax: item.quantity,
			}));

		const discounts = items
			.filter((item) => item.item_type === "discount")
			.map((item) => ({
				id: String(item._id),
				name: item.description,
				price: Math.abs(item.original_price ?? item.unit_price),
				pax: item.quantity,
			}));

		const currentPackage = allPackages.find(
			(p) => String(p._id) === quotation.package_id,
		);
		const liveFlight = allFlights.find(
			(f) => String(f._id) === quotation.flight_id,
		);
		const liveRoomsForEdit = packageRooms.filter(
			(r) => String(r.package_id) === quotation.package_id,
		);
		const liveHotelsForEdit = allPackageHotels.filter(
			(h) => String(h.package_id) === quotation.package_id,
		);
		const { stale_fields, snapshot_version_known } = computeStaleFields(
			quotation.package_snapshot,
			quotation.flight_snapshot,
			currentPackage,
			liveFlight,
			liveRoomsForEdit,
			buildHotelsSnapshot(liveHotelsForEdit, groupMealsByHotelId(allPackageMeals)),
			quotation.hotels_snapshot,
		);

		const saved_document = readSavedQuotation(quotation, items);
		const revision_context = await revisionContext(ctx, quotation);

		return {
			saved_document,
			revision_context,
			id: String(quotation._id),
			snapshot_refresh_token: revision_context.state === "legacy" ? await quotationRefreshToken(quotation, items) : undefined,
			reference_number: buildQuotationNumber(
				quotation.hijri_year,
				quotation.sequence_num,
				quotation.revision,
			),
			pic_name: saved_document.pic_name,
			branch: saved_document.branch,
			client_id: saved_document.client_id,
			notes: saved_document.notes ?? "",
			package_id: saved_document.package_id,
			flight_id: saved_document.flight_id,
			selected_rooms,
			adds_ons,
			discounts,
			status: saved_document.status,
			stale_fields,
			snapshot_version_known,
		};
	},
});

export const getQuotationFullDetails = query({
	args: {
		target_quotation_id: v.string(),
	},
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		const quotation = await findQuotationByStringId(ctx, args.target_quotation_id);
		if (!quotation) {
			return null;
		}

		const [packages, packageFlights, packageHotels, packageMeals, packageRooms, items] =
			await Promise.all([
				ctx.db.query("packages").collect(),
				ctx.db.query("package_flights").collect(),
				ctx.db.query("package_hotels").collect(),
				ctx.db.query("package_meals").collect(),
				ctx.db.query("package_rooms").collect(),
				ctx.db
					.query("quotation_items")
					.withIndex("by_quotation_id", (q) =>
						q.eq("quotation_id", String(quotation._id)),
					)
					.collect(),
			]);

		const saved_document = readSavedQuotation(quotation, items);
		const revision_context = await revisionContext(ctx, quotation);

		const selectedPackage = packages.find(
			(item) => String(item._id) === quotation.package_id,
		);

		const availableFlights = packageFlights.filter(
			(flight) => String(flight.package_id) === quotation.package_id,
		);
		const availableHotels = packageHotels.filter(
			(hotel) => String(hotel.package_id) === quotation.package_id,
		);
		const availableRooms = packageRooms.filter(
			(room) => String(room.package_id) === quotation.package_id,
		);

		const selectedRooms = items
			.filter((item) => item.item_type === "room")
			.map((item) => {
				const price = item.original_price ?? item.unit_price;
				return {
					id: String(item._id),
					package_room_id: item.package_room_id,
					room_type: item.description,
					price,
					pax: item.quantity,
					subtotal: buildLineTotal(price, item.quantity),
				};
			});

		const addsOns = items
			.filter((item) => item.item_type === "addon")
			.map((item) => {
				const price = item.original_price ?? item.unit_price;
				return {
					id: String(item._id),
					name: item.description,
					price,
					pax: item.quantity,
					subtotal: buildLineTotal(price, item.quantity),
				};
			});

		const discounts = items
			.filter((item) => item.item_type === "discount")
			.map((item) => {
				const price = Math.abs(item.original_price ?? item.unit_price);
				return {
					id: String(item._id),
					name: item.description,
					price,
					pax: item.quantity,
					subtotal: buildLineTotal(price, item.quantity),
				};
			});

		const pkgSnap = saved_document.package_snapshot;
		const flightSnap = saved_document.flight_snapshot;
		const hotelSnap = saved_document.hotels_snapshot;

		const liveFlight = availableFlights.find(
			(flight) => String(flight._id) === quotation.flight_id,
		);

		const selected_flight = flightSnap
			? {
				id: flightSnap.id,
				month: flightSnap.month,
				flight: flightSnap.flight ?? "",
				departure_date: flightSnap.departure_date,
				return_date: flightSnap.return_date,
				departure_sector: flightSnap.departure_sector,
				return_sector: flightSnap.return_sector,
			}
			: null;

		const hotels = hotelSnap
			? hotelSnap.map((h) => ({
				hotel_type: h.hotel_type,
				name: h.name ?? h.placeholder,
				placeholder: h.placeholder,
				enabled: h.enabled,
				meals: h.meals,
			}))
			: [];

		const { stale_fields, snapshot_version_known } = computeStaleFields(
			pkgSnap,
			flightSnap,
			selectedPackage,
			liveFlight,
			availableRooms,
			buildHotelsSnapshot(availableHotels, groupMealsByHotelId(packageMeals)),
			quotation.hotels_snapshot,
		);

		return {
			saved_document,
			revision_context,
			id: String(quotation._id),
			reference_number: saved_document.quotation_number,
			status: saved_document.status,
			client_name: saved_document.client_name,
			pic_name: saved_document.pic_name,
			branch: saved_document.branch,
			notes: saved_document.notes ?? "",
			total_amount: saved_document.total_amount,
			created_at: quotation.created_at,
			updated_at: quotation.updated_at,
			hijri_year: quotation.hijri_year,
			stale_fields,
			snapshot_version_known,
			package: {
				id: quotation.package_id,
				name: pkgSnap?.name ?? "",
				year: pkgSnap?.year ?? "",
				duration: pkgSnap?.duration ?? "",
				transport: pkgSnap?.transport ?? "",
				inclusions: pkgSnap?.inclusions ?? "",
				exclusions: pkgSnap?.exclusions ?? "",
				package_code: pkgSnap?.package_code ?? "",
				hotels,
				available_rooms: [],
				available_flights: [],
			},
			replacement_catalog: {
				available_rooms: availableRooms.map((room) => ({
					id: String(room._id),
					room_type: room.room_type,
					price: room.price,
					enabled: room.enabled,
				})),
				available_flights: availableFlights.map((flight) => ({
					id: String(flight._id),
					month: flight.month,
					flight: flight.flight ?? "",
					departure_date: flight.departure_date,
					return_date: flight.return_date,
					departure_sector: flight.departure_sector,
					return_sector: flight.return_sector,
				})),
			},
			selected_flight,
			items: {
				selected_rooms: selectedRooms,
				adds_ons: addsOns,
				discounts,
			},
		};
	},
});

export const update = mutation({
	args: {
		payload: v.object({
			id: v.string(),
			expected_quotation_token: v.optional(v.string()),
			reviewed_context: v.optional(v.string()),
			pic_name: v.string(),
			branch: v.string(),
			client_id: v.string(),
			package_id: v.string(),
			flight_id: v.string(),
			notes: v.optional(v.string()),
			status: v.optional(
				v.union(
					v.literal("draft"),
					v.literal("sent"),
					v.literal("accepted"),
					v.literal("rejected"),
					v.literal("revised"),
					v.literal("superseded"),
				),
			),
			created_by: v.optional(v.string()),
			selected_rooms: v.array(
				v.object({
					room_type: v.string(),
					price: v.number(),
					pax: v.number(),
				}),
			),
			adds_ons: v.optional(
				v.array(
					v.object({
						name: v.string(),
						price: v.number(),
						pax: v.number(),
					}),
				),
			),
			discounts: v.optional(
				v.array(
					v.object({
						name: v.string(),
						price: v.number(),
						pax: v.number(),
					}),
				),
			),
		}),
	},
	handler: async (ctx, args) => {
		const actor = await requireQuotationActor(ctx);
		await assertLegacyWritesAllowed(ctx);
		validateQuotationLines(args.payload);
		const quotation = await findQuotationByStringId(ctx, args.payload.id);
		if (!quotation) {
			throw new Error("Quotation not found");
		}
		assertMutableLegacyQuotation(quotation);
		const existingItems = await ctx.db
			.query("quotation_items")
			.withIndex("by_quotation_id", (q) => q.eq("quotation_id", String(quotation._id)))
			.collect();
		if (!args.payload.expected_quotation_token ||
			args.payload.expected_quotation_token !== await quotationRefreshToken(quotation, existingItems)) {
			throw new ConvexError({ code: "QUOTATION_STALE_EDITOR", message: "This quotation changed after you opened it. Review the saved quotation before trying again." });
		}

		const packageChanged = args.payload.package_id !== quotation.package_id;
		const replacePackageSnapshot = packageChanged || !quotation.package_snapshot;
		const replaceFlightSnapshot = args.payload.flight_id !== quotation.flight_id || !quotation.flight_snapshot;
		const replaceHotelsSnapshot = packageChanged || !quotation.hotels_snapshot;

		const now = new Date().toISOString();

		const [allClients, allPackages, allFlights, allPackageRooms, allPackageHotels, allPackageMeals] = await Promise.all([
			ctx.db.query("clients").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_rooms").collect(),
			ctx.db.query("package_hotels").collect(),
			ctx.db.query("package_meals").collect(),
		]);

		const client = allClients.find(
			(candidate) => String(candidate._id) === args.payload.client_id,
		);
		if (!client) {
			throw new Error("Client not found");
		}

		const selectedPackage = allPackages.find(
			(candidate) => String(candidate._id) === args.payload.package_id,
		);
		if (!selectedPackage) {
			throw new Error("Package not found");
		}
		if ((replacePackageSnapshot || replaceFlightSnapshot || replaceHotelsSnapshot) &&
			args.payload.reviewed_context !== quotationSelectionContext(
				selectedPackage, allPackageRooms, allFlights, allPackageHotels, allPackageMeals,
			)) {
			throw new ConvexError({ code: "QUOTATION_SELECTION_CONFLICT", message: "The package, rooms, or itinerary changed. Review the latest package before saving." });
		}

		const selectedFlight = allFlights.find(
			(candidate) => String(candidate._id) === args.payload.flight_id,
		);
		if (!selectedFlight) {
			throw new Error("Flight not found");
		}

		if (String(selectedFlight.package_id) !== args.payload.package_id) {
			throw new Error("Selected flight does not belong to the selected package");
		}

		requireFlightDates(selectedFlight);
		if (args.payload.selected_rooms.length === 0) {
			throw new Error("At least one room selection is required");
		}

		const roomsByType = new Map<string, (typeof allPackageRooms)[number]>();
		for (const room of allPackageRooms) {
			if (String(room.package_id) !== args.payload.package_id) {
				continue;
			}

			roomsByType.set(room.room_type, room);
		}

		const sanitizedSelectedRooms = args.payload.selected_rooms.map((item) => {
			const sanitizedPrice = normalizeCurrency(item.price);
			const sanitizedPax = Math.max(1, Math.floor(item.pax));
			const packageRoom = roomsByType.get(item.room_type);

			if (!packageRoom) {
				throw new Error(`Room type '${item.room_type}' does not exist in this package`);
			}

			return {
				room_type: item.room_type,
				price: sanitizedPrice,
				pax: sanitizedPax,
				package_room_id: String(packageRoom._id),
			};
		});

		const sanitizedAddOns = (args.payload.adds_ons ?? []).map((item) => ({
			name: item.name,
			price: normalizeCurrency(item.price),
			pax: Math.max(1, Math.floor(item.pax)),
		}));

		const sanitizedDiscounts = (args.payload.discounts ?? []).map((item) => ({
			name: item.name,
			price: normalizeCurrency(item.price),
			pax: Math.max(1, Math.floor(item.pax)),
		}));

		const roomsTotal = sanitizedSelectedRooms.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);
		const addOnsTotal = sanitizedAddOns.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);
		const discountsTotal = sanitizedDiscounts.reduce(
			(sum, item) => sum + buildLineTotal(item.price, item.pax),
			0,
		);

		if (![roomsTotal, addOnsTotal, discountsTotal, (roomsTotal + addOnsTotal - discountsTotal) * 100].every(Number.isFinite)) {
			throw new Error("Quotation amount must be finite.");
		}
		const totalAmount = normalizeCurrency(roomsTotal + addOnsTotal - discountsTotal);

		const hotelsForPkg = allPackageHotels.filter(
			(h) => String(h.package_id) === args.payload.package_id,
		);
		const mealsByHotelId = new Map<string, string[]>();
		for (const meal of allPackageMeals) {
			const key = String(meal.package_hotel_id);
			const bucket = mealsByHotelId.get(key) ?? [];
			bucket.push(meal.meal_type);
			mealsByHotelId.set(key, bucket);
		}

		const roomsForPkg = allPackageRooms.filter(
			(r) => String(r.package_id) === args.payload.package_id,
		);
		requirePrices(roomsForPkg, "Package room");
		const package_snapshot = replacePackageSnapshot
			? buildPackageSnapshot(selectedPackage, roomsForPkg)
			: quotation.package_snapshot;

		const flight_snapshot = replaceFlightSnapshot
			? buildFlightSnapshot(selectedFlight)
			: quotation.flight_snapshot;

		const hotels_snapshot = replaceHotelsSnapshot
			? buildHotelsSnapshot(hotelsForPkg, mealsByHotelId)
			: quotation.hotels_snapshot;

		await ctx.db.patch(quotation._id, {
			client_name: client.name,
			package_id: args.payload.package_id,
			status: args.payload.status ?? quotation.status,
			total_amount: totalAmount,
			notes: args.payload.notes ?? "",
			updated_at: now,
			pic_name: args.payload.pic_name,
			branch: args.payload.branch,
			flight_id: args.payload.flight_id,
			client_id: args.payload.client_id,
			package_snapshot,
			flight_snapshot,
			hotels_snapshot,
		});

		for (const item of existingItems) {
			await ctx.db.delete(item._id);
		}

		for (const room of sanitizedSelectedRooms) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotation._id),
				item_type: "room",
				description: room.room_type,
				package_room_id: room.package_room_id,
				quantity: room.pax,
				unit_price: room.price,
				original_price: room.price,
				created_at: now,
			});
		}

		for (const addOn of sanitizedAddOns) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotation._id),
				item_type: "addon",
				description: addOn.name,
				package_room_id: "",
				quantity: addOn.pax,
				unit_price: addOn.price,
				original_price: addOn.price,
				created_at: now,
			});
		}

		for (const discount of sanitizedDiscounts) {
			await ctx.db.insert("quotation_items", {
				quotation_id: String(quotation._id),
				item_type: "discount",
				description: discount.name,
				package_room_id: "",
				quantity: discount.pax,
				unit_price: -discount.price,
				original_price: discount.price,
				created_at: now,
			});
		}

		const quotationNumber = buildQuotationNumber(
			quotation.hijri_year,
			quotation.sequence_num,
			quotation.revision,
		);

		await ctx.db.insert("quotation_logs", {
			quotation_id: String(quotation._id),
			action: "updated",
			description: `Quotation ${quotationNumber} updated`,
			performed_by: actor,
			created_at: now,
			snapshot_data: JSON.stringify({
				status: args.payload.status ?? quotation.status,
				total_amount: totalAmount,
			}),
		});

		return {
			id: String(quotation._id),
			quotation_number: quotationNumber,
			total_amount: totalAmount,
			status: args.payload.status ?? quotation.status,
		};
	},
});

function refreshConflict(): never {
	throw new ConvexError({ code: SNAPSHOT_REFRESH_CONFLICT, message: SNAPSHOT_REFRESH_CONFLICT_MESSAGE });
}

async function readRefreshQuotation(ctx: QueryCtx, quotationId: string, expected?: string) {
	const id = ctx.db.normalizeId("quotations", quotationId);
	const quotation = id ? await ctx.db.get(id) : null;
	if (!quotation) refreshConflict();
	assertMutableLegacyQuotation(quotation);
	if (!expected) refreshConflict();
	const items = await ctx.db.query("quotation_items")
		.withIndex("by_quotation_id", q => q.eq("quotation_id", String(quotation._id)))
		.collect();
	const token = await quotationRefreshToken(quotation, items);
	if (expected !== token) refreshConflict();
	return { quotation, token, items };
}

async function readRefreshSource(ctx: QueryCtx, quotation: Doc<"quotations">) {
	const packageId = ctx.db.normalizeId("packages", quotation.package_id);
	const flightId = ctx.db.normalizeId("package_flights", quotation.flight_id);
	const [selectedPackage, selectedFlight, hotelsForPkg, roomsForPkg] = await Promise.all([
		packageId ? ctx.db.get(packageId) : null,
		flightId ? ctx.db.get(flightId) : null,
		ctx.db.query("package_hotels").withIndex("by_package_id", q => q.eq("package_id", quotation.package_id)).collect(),
		ctx.db.query("package_rooms").withIndex("by_package_id", q => q.eq("package_id", quotation.package_id)).collect(),
	]);
	if (!selectedPackage || !selectedFlight || String(selectedFlight.package_id) !== quotation.package_id) {
		throw new ConvexError({ code: "SNAPSHOT_REFRESH_UNAVAILABLE", message: "The saved package or flight is no longer available. Review the saved quotation before refreshing." });
	}
	const meals = await Promise.all(hotelsForPkg.map(hotel =>
		ctx.db.query("package_meals")
			.withIndex("by_package_hotel_id", q => q.eq("package_hotel_id", String(hotel._id)))
			.collect(),
	));
	const byCreationOrder = (a: { _creationTime: number; _id: string }, b: { _creationTime: number; _id: string }) =>
		a._creationTime - b._creationTime || a._id.localeCompare(b._id);
	const snapshots = {
		package_snapshot: buildPackageSnapshot(selectedPackage, roomsForPkg.sort(byCreationOrder)),
		flight_snapshot: buildFlightSnapshot(selectedFlight),
		hotels_snapshot: buildHotelsSnapshot(
			hotelsForPkg.sort(byCreationOrder),
			groupMealsByHotelId(meals.flat().sort(byCreationOrder)),
		),
	};
	return { ...snapshots, source_context: await snapshotRefreshToken(snapshots) };
}

export const getSnapshotRefreshReview = query({
	args: { quotation_id: v.string(), expected_quotation_token: v.string() },
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		const { quotation, token } = await readRefreshQuotation(ctx, args.quotation_id, args.expected_quotation_token);
		const current = await readRefreshSource(ctx, quotation);
		const changes: Array<{ label: string; saved: string; current: string }> = [];
		const text = (value: unknown): string => value === undefined || value === null ? "Not recorded" : String(value) || "None";
		const add = (label: string, saved: unknown, live: unknown) => {
			if (JSON.stringify(saved) !== JSON.stringify(live)) changes.push({ label, saved: text(saved), current: text(live) });
		};
		for (const [key, label] of Object.entries({ name: "Package name", year: "Season", duration: "Duration", transport: "Transport", package_code: "Package code", inclusions: "Inclusions", exclusions: "Exclusions" })) {
			add(label, quotation.package_snapshot?.[key as keyof NonNullable<typeof quotation.package_snapshot>], current.package_snapshot[key as keyof typeof current.package_snapshot]);
		}
		for (const [key, label] of Object.entries({ month: "Flight month", flight: "Flight", departure_date: "Departure date", departure_sector: "Departure sector", return_date: "Return date", return_sector: "Return sector" })) {
			add(label, quotation.flight_snapshot?.[key as keyof NonNullable<typeof quotation.flight_snapshot>], current.flight_snapshot[key as keyof typeof current.flight_snapshot]);
		}
		const rooms = (rows: Array<{ room_type: string; price: number; enabled: boolean }> | undefined) => rows?.map(r => `${r.room_type}: RM ${r.price.toFixed(2)} (${r.enabled ? "available" : "unavailable"})`).sort().join("; ");
		const hotels = (rows: typeof quotation.hotels_snapshot) => rows?.map(h => `${h.hotel_type}: ${h.name || "Unnamed hotel"}${h.placeholder ? `; note: ${h.placeholder}` : ""} (${h.enabled ? "included" : "not included"}); meals: ${[...h.meals].sort().join(", ") || "None"}`).sort().join("\n");
		add("Package room prices and availability", rooms(quotation.package_snapshot?.rooms), rooms(current.package_snapshot.rooms));
		add("Hotels and meals", hotels(quotation.hotels_snapshot), hotels(current.hotels_snapshot));
		const itinerary = (flight: typeof quotation.flight_snapshot) => flight ? `${flight.flight || "Flight"}: ${flight.departure_date} ${flight.departure_sector} to ${flight.return_date} ${flight.return_sector}` : "Not recorded";
		return {
			quotation_id: args.quotation_id, expected_quotation_token: token, source_context: current.source_context,
			saved_package: quotation.package_snapshot?.name ?? "Not recorded",
			saved_flight: itinerary(quotation.flight_snapshot),
			current_package: current.package_snapshot.name,
			current_flight: itinerary(current.flight_snapshot), changes,
		};
	},
});

export const refreshSnapshot = mutation({
	args: { quotation_id: v.string(), command: v.optional(saveCommand), expected_quotation_token: v.optional(v.string()), source_context: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const actor = await requireQuotationActor(ctx);
		if (args.command) {
		  if (args.command.operation !== "append" || args.command.selection.mode !== "replace" || args.command.source_revision_id !== args.quotation_id) {
			throw new Error("Refresh requires an append command with a reviewed replacement selection");
		  }
		  return saveRevision(ctx, actor, args.command);
		}
		await assertLegacyWritesAllowed(ctx);
		const { quotation, items } = await readRefreshQuotation(ctx, args.quotation_id, args.expected_quotation_token);
		if (!args.source_context) refreshConflict();
		const current = await readRefreshSource(ctx, quotation);
		if (args.source_context !== current.source_context) refreshConflict();
		const now = new Date().toISOString();
		const patch = {
			package_snapshot: current.package_snapshot,
			flight_snapshot: current.flight_snapshot,
			hotels_snapshot: current.hotels_snapshot,
			updated_at: now,
		};
		await ctx.db.patch(quotation._id, patch);
		const quotationNumber = buildQuotationNumber(quotation.hijri_year, quotation.sequence_num, quotation.revision);
		await ctx.db.insert("quotation_logs", {
			quotation_id: String(quotation._id), action: "snapshot_refreshed",
			description: `Snapshot for ${quotationNumber} refreshed to package version ${current.package_snapshot.package_updated_at}`,
			performed_by: actor, created_at: now,
			snapshot_data: JSON.stringify({ package_updated_at: current.package_snapshot.package_updated_at }),
		});
		return { success: true, snapshot_refresh_token: await quotationRefreshToken({ ...quotation, ...patch }, items) };
	},
});

export const resequenceByCreatedAt = mutation({
	args: {
		dryRun: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		await assertLegacyWritesAllowed(ctx);
		const dryRun = args.dryRun ?? false;
		const quotations = await ctx.db.query("quotations").collect();
		quotations.forEach(assertMutableLegacyQuotation);

		const groupedByHijriYear = new Map<string, (typeof quotations)[number][]>();
		for (const quotation of quotations) {
			const group = groupedByHijriYear.get(quotation.hijri_year);
			if (group) {
				group.push(quotation);
			} else {
				groupedByHijriYear.set(quotation.hijri_year, [quotation]);
			}
		}

		const years = Array.from(groupedByHijriYear.keys()).sort((a, b) =>
			a.localeCompare(b),
		);

		let updatedCount = 0;
		const summaryByYear: {
			hijri_year: string;
			total: number;
			updated: number;
		}[] = [];

		for (const hijriYear of years) {
			const records = groupedByHijriYear.get(hijriYear) ?? [];

			records.sort((a, b) => {
				const createdAtComparison =
					parseCreatedAt(a.created_at) - parseCreatedAt(b.created_at);
				if (createdAtComparison !== 0) {
					return createdAtComparison;
				}

				const creationTimeComparison = a._creationTime - b._creationTime;
				if (creationTimeComparison !== 0) {
					return creationTimeComparison;
				}

				return String(a._id).localeCompare(String(b._id));
			});

			let yearUpdatedCount = 0;

			for (const [index, quotation] of records.entries()) {
				const nextSequenceNum = index + 1;
				if (quotation.sequence_num === nextSequenceNum) {
					continue;
				}

				yearUpdatedCount += 1;
				updatedCount += 1;

				if (!dryRun) {
					await ctx.db.patch(quotation._id, {
						sequence_num: nextSequenceNum,
					});
				}
			}

			summaryByYear.push({
				hijri_year: hijriYear,
				total: records.length,
				updated: yearUpdatedCount,
			});
		}

		return {
			dryRun,
			totalQuotations: quotations.length,
			updatedCount,
			summaryByYear,
		};
	},
});

export const deleteById = mutation({
	args: {
		quotationId: v.string(),
	},
	handler: async (ctx, { quotationId }) => {
		await requireQuotationActor(ctx);
		await assertLegacyWritesAllowed(ctx);
		// Find the quotation
		const quotation = await findQuotationByStringId(ctx, quotationId);
		if (!quotation) {
			throw new Error(`Quotation ${quotationId} not found`);
		}
		assertMutableLegacyQuotation(quotation);

		// Delete all quotation items for this quotation
		const items = await ctx.db
			.query("quotation_items")
			.withIndex("by_quotation_id", (q) =>
				q.eq("quotation_id", quotationId),
			)
			.collect();

		for (const item of items) {
			await ctx.db.delete(item._id);
		}

		// Delete all quotation logs for this quotation
		const logs = await ctx.db
			.query("quotation_logs")
			.withIndex("by_quotation_id", (q) =>
				q.eq("quotation_id", quotationId),
			)
			.collect();

		for (const log of logs) {
			await ctx.db.delete(log._id);
		}

		// Delete the quotation itself
		await ctx.db.delete(quotation._id);

		return {
			success: true,
			deletedQuotationId: quotationId,
			deletedItemsCount: items.length,
			deletedLogsCount: logs.length,
		};
	},
});

/**
 * Repair mutation: finds quotations whose flight_id no longer exists in
 * package_flights (e.g. because a package was updated and flights were
 * recreated) and remaps each one to the first available flight for that
 * package.
 *
 * Always run with dryRun: true first to preview what would change.
 */
export const repairStaleFlightIds = mutation({
	args: {
		dryRun: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		await assertLegacyWritesAllowed(ctx);
		const dryRun = args.dryRun ?? false;

		const [quotations, flights] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("package_flights").collect(),
		]);

		quotations.forEach(assertMutableLegacyQuotation);

		const validFlightIds = new Set(flights.map((f) => String(f._id)));

		// Group current flights by package_id for lookup
		const flightsByPackageId = new Map<string, (typeof flights)[number][]>();
		for (const flight of flights) {
			const key = String(flight.package_id);
			const bucket = flightsByPackageId.get(key);
			if (bucket) {
				bucket.push(flight);
			} else {
				flightsByPackageId.set(key, [flight]);
			}
		}

		const staleQuotations = quotations.filter(
			(q) => !validFlightIds.has(q.flight_id),
		);

		const results: {
			quotationId: string;
			quotationNumber: string;
			packageId: string;
			oldFlightId: string;
			newFlightId: string | null;
			patched: boolean;
		}[] = [];

		for (const quotation of staleQuotations) {
			const packageFlights = flightsByPackageId.get(quotation.package_id) ?? [];
			const replacement = packageFlights.length > 0 ? packageFlights[0] : null;
			const newFlightId = replacement ? String(replacement._id) : null;

			const result = {
				quotationId: String(quotation._id),
				quotationNumber: buildQuotationNumber(
					quotation.hijri_year,
					quotation.sequence_num,
					quotation.revision,
				),
				packageId: quotation.package_id,
				oldFlightId: quotation.flight_id,
				newFlightId,
				patched: false,
			};

			if (!dryRun && newFlightId !== null) {
				await ctx.db.patch(quotation._id, { flight_id: newFlightId });
				result.patched = true;
			}

			results.push(result);
		}

		return {
			dryRun,
			staleCount: staleQuotations.length,
			repairedCount: results.filter((r) => r.patched).length,
			unresolvableCount: results.filter((r) => r.newFlightId === null).length,
			results,
		};
	},
});


export const archiveQuotation = mutation({
	args: { id: v.id("quotations") },
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		await assertLegacyWritesAllowed(ctx);
		const quotation = await ctx.db.get(args.id);
		if (!quotation) throw new Error("Quotation not found");
		assertMutableLegacyQuotation(quotation);
		await ctx.db.patch(args.id, { archived: true, updated_at: new Date().toISOString() });
		return { id: args.id };
	},
});

export const getItemsByQuotationId = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		await requireQuotationActor(ctx);
		return await ctx.db
			.query("quotation_items")
			.withIndex("by_quotation_id", (q) => q.eq("quotation_id", args.id))
			.collect();
	},
});
