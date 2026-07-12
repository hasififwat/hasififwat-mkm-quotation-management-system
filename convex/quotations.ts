import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function buildQuotationNumber(hijriYear: string, sequenceNum: number, revision: number) {
	const paddedSequence = String(sequenceNum).padStart(4, "0");
	return revision > 0
		? `${hijriYear}-${paddedSequence}-R${revision}`
		: `${hijriYear}-${paddedSequence}`;
}

function getMappedHijriYear(year: string) {
	const hijriYearMap: Record<string, string> = {
		"2025/2026": "1447H",
		"2026/2027": "1448H",
		"2027/2028": "1449H",
		"2028/2029": "1450H",
		"2029/2030": "1451H",
		"2030/2031": "1452H",
		"2031/2032": "1453H",
	};
	const mapped = hijriYearMap[year];
	if (!mapped) throw new Error(`No hijri year mapping for Gregorian range: ${year}`);
	return mapped;
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

function computeStaleFields(
	pkgSnap: {
		package_updated_at?: string;
		name?: string;
		year?: string;
		duration?: string;
		transport?: string;
		package_code?: string;
		inclusions?: string;
		exclusions?: string;
		rooms?: Array<{ room_type: string; price: number; enabled: boolean }>;
	} | undefined | null,
	flightSnap: {
		departure_date: string;
		return_date: string;
		departure_sector: string;
		return_sector: string;
	} | undefined | null,
	currentPackage: {
		updated_at: string;
		name: string;
		year: string;
		duration: string;
		transport?: string;
		package_code?: string;
		inclusions?: string;
		exclusions?: string;
	} | undefined,
	liveFlight: {
		departure_date: string;
		return_date: string;
		departure_sector: string;
		return_sector: string;
	} | undefined,
	liveRooms: Array<{ room_type: string; price: number; enabled: boolean }>,
	liveHotels: Array<{ hotel_type: string; name?: string; enabled: boolean }>,
	hotelSnap: Array<{ hotel_type: string; name?: string; enabled: boolean }> | undefined | null,
): { stale_fields: string[]; snapshot_version_known: boolean } {
	const stale_fields: string[] = [];
	const snapshot_version_known = pkgSnap?.package_updated_at !== undefined;

	if (pkgSnap && currentPackage) {
		if (pkgSnap.name         !== undefined && pkgSnap.name         !== currentPackage.name)         stale_fields.push("package.name");
		if (pkgSnap.year         !== undefined && pkgSnap.year         !== currentPackage.year)         stale_fields.push("package.year");
		if (pkgSnap.duration     !== undefined && pkgSnap.duration     !== currentPackage.duration)     stale_fields.push("package.duration");
		if (pkgSnap.transport    !== undefined && pkgSnap.transport    !== currentPackage.transport)    stale_fields.push("package.transport");
		if (pkgSnap.inclusions   !== undefined && pkgSnap.inclusions   !== currentPackage.inclusions)   stale_fields.push("package.inclusions");
		if (pkgSnap.exclusions   !== undefined && pkgSnap.exclusions   !== currentPackage.exclusions)   stale_fields.push("package.exclusions");
		if (pkgSnap.package_code !== undefined && pkgSnap.package_code !== currentPackage.package_code) stale_fields.push("package.code");

		if (pkgSnap.rooms && pkgSnap.rooms.length > 0 && liveRooms.length > 0) {
			const snapPrices = new Map(pkgSnap.rooms.map((r) => [r.room_type, r.price]));
			const roomPriceChanged = liveRooms.some(
				(r) => snapPrices.has(r.room_type) && snapPrices.get(r.room_type) !== r.price,
			);
			const roomAdded = liveRooms.some((r) => !snapPrices.has(r.room_type));
			if (roomPriceChanged || roomAdded) stale_fields.push("room_pricing");
		}
	}

	if (hotelSnap && hotelSnap.length > 0 && liveHotels.length > 0) {
		const snapMap = new Map(hotelSnap.map((h) => [h.hotel_type, h]));
		const hotelChanged = liveHotels.some((live) => {
			const snap = snapMap.get(live.hotel_type);
			if (!snap) return true;
			if (snap.name !== live.name) return true;
			if (snap.enabled !== live.enabled) return true;
			return false;
		});
		if (hotelChanged) stale_fields.push("hotels");
	}

	if (flightSnap && !liveFlight) {
		stale_fields.push("flight.removed");
	} else if (flightSnap && liveFlight) {
		if (
			liveFlight.departure_date    !== flightSnap.departure_date    ||
			liveFlight.return_date       !== flightSnap.return_date       ||
			liveFlight.departure_sector  !== flightSnap.departure_sector  ||
			liveFlight.return_sector     !== flightSnap.return_sector
		) {
			stale_fields.push("flight");
		}
	}

	return { stale_fields, snapshot_version_known };
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const [quotations, packages, packageFlights] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
		]);

			const packagesById = new Map<string, (typeof packages)[number]>();
		for (const pkg of packages) {
				packagesById.set(String(pkg._id), pkg);
		}

			const flightsById = new Map<string, (typeof packageFlights)[number]>();
		for (const flight of packageFlights) {
				flightsById.set(String(flight._id), flight);
		}

		return quotations
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((quotation) => {
				const selectedPackage = packagesById.get(quotation.package_id);
				const selectedFlight = flightsById.get(quotation.flight_id);

				const { stale_fields } = computeStaleFields(
					quotation.package_snapshot,
					quotation.flight_snapshot,
					selectedPackage,
					selectedFlight,
					[], // room/hotel staleness requires detail view — skipped in list for performance
					[],
					null,
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
						id: selectedPackage ? String(selectedPackage._id) : null,
						name: selectedPackage?.name ?? "Unknown Package",
						year: selectedPackage?.year ?? null,
						duration: selectedPackage?.duration ?? null,
					},
					selected_flight: selectedFlight
						? {
							id: String(selectedFlight._id),
							month: selectedFlight.month,
							flight: selectedFlight.flight ?? "",
							return_date: selectedFlight.return_date,
							return_sector: selectedFlight.return_sector,
							departure_date: selectedFlight.departure_date,
							departure_sector: selectedFlight.departure_sector,
						}
						: null,
				};
			});
	},
});

export const count = query({
	args: {
		searchTerm: v.optional(v.string()),
	},
	handler: async (ctx, { searchTerm }) => {
		const normalizedSearch = searchTerm?.trim().toLowerCase() ?? "";
		const [allQuotations, allPackages] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("packages").collect(),
		]);

		if (!normalizedSearch) {
			return allQuotations.length;
		}

		const packageNameById = new Map<string, string>();
		for (const pkg of allPackages) {
			packageNameById.set(String(pkg._id), (pkg.name ?? "").toLowerCase());
		}

		return allQuotations.filter((quotation) => {
			const clientName = quotation.client_name?.toLowerCase() ?? "";
			const packageName = packageNameById.get(quotation.package_id) ?? "";
			return (
				clientName.includes(normalizedSearch) ||
				packageName.includes(normalizedSearch)
			);
		}).length;
	},
});

export const findDuplicates = query({
	args: {},
	handler: async (ctx) => {
		const allQuotations = await ctx.db.query("quotations").collect();

		// Group by (client_name, package_id, flight_id, total_amount)
		const groups = new Map<
			string,
			(typeof allQuotations)[number][]
		>();

		for (const q of allQuotations) {
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
		sortBy: v.optional(v.union(v.literal("updated_at"), v.literal("created_at"))),
		sortDir: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
	},
	handler: async (ctx, { paginationOpts, sortBy, sortDir }) => {
		const order = sortDir ?? "desc";
		const result =
			(sortBy ?? "updated_at") === "created_at"
				? await ctx.db.query("quotations").order(order).paginate(paginationOpts)
				: await ctx.db
						.query("quotations")
						.withIndex("by_updated_at")
						.order(order)
						.paginate(paginationOpts);

		const [allPackages, allFlights] = await Promise.all([
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
		]);

		const packagesById = new Map<string, (typeof allPackages)[number]>();
		for (const pkg of allPackages) {
			packagesById.set(String(pkg._id), pkg);
		}

		const flightsById = new Map<string, (typeof allFlights)[number]>();
		for (const flight of allFlights) {
			flightsById.set(String(flight._id), flight);
		}

		return {
			...result,
			page: result.page.map((quotation) => {
				const selectedPackage = packagesById.get(quotation.package_id);
				const selectedFlight = flightsById.get(quotation.flight_id);

				const { stale_fields: rowStaleFields } = computeStaleFields(
					quotation.package_snapshot,
					quotation.flight_snapshot,
					selectedPackage,
					selectedFlight,
					[], // room/hotel staleness requires detail view — skipped in list for performance
					[],
					null,
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
						id: selectedPackage ? String(selectedPackage._id) : null,
						name: selectedPackage?.name ?? "Unknown Package",
						year: selectedPackage?.year ?? null,
						duration: selectedPackage?.duration ?? null,
					},
					selected_flight: selectedFlight
						? {
								id: String(selectedFlight._id),
								month: selectedFlight.month,
								flight: selectedFlight.flight ?? "",
								return_date: selectedFlight.return_date,
								return_sector: selectedFlight.return_sector,
								departure_date: selectedFlight.departure_date,
								departure_sector: selectedFlight.departure_sector,
							}
						: null,
				};
			}),
		};
	},
});

export const create = mutation({
	args: {
		payload: v.object({
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
		const now = new Date().toISOString();

		const allPackages = await ctx.db.query("packages").collect();
		const selectedPackage = allPackages.find(
			(candidate) => String(candidate._id) === args.payload.package_id,
		);
		if (!selectedPackage) {
			throw new Error("Package not found");
		}
		const hijriYear = getMappedHijriYear(selectedPackage.year);

		const [hijriYearQuotations, allClients, allFlights, allPackageRooms, allPackageHotels, allPackageMeals] =
			await Promise.all([
				ctx.db
					.query("quotations")
					.withIndex("by_hijri_year", (q) => q.eq("hijri_year", hijriYear))
					.collect(),
				ctx.db.query("clients").collect(),
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

		const selectedFlight = allFlights.find(
			(candidate) => String(candidate._id) === args.payload.flight_id,
		);
		if (!selectedFlight) {
			throw new Error("Flight not found");
		}

		if (String(selectedFlight.package_id) !== args.payload.package_id) {
			throw new Error("Selected flight does not belong to the selected package");
		}

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

		const totalAmount = normalizeCurrency(roomsTotal + addOnsTotal - discountsTotal);

		const currentHijriYearMaxSeq = hijriYearQuotations
			.reduce((max, quotation) => Math.max(max, quotation.sequence_num), 0);

		const nextSequenceNum = currentHijriYearMaxSeq + 1;

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
		const package_snapshot = buildPackageSnapshot(selectedPackage, roomsForPkg);
		const flight_snapshot = buildFlightSnapshot(selectedFlight);
		const hotels_snapshot = buildHotelsSnapshot(hotelsForPkg, mealsByHotelId);

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
			created_by: args.payload.created_by ?? args.payload.pic_name,
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
			performed_by: args.payload.created_by ?? args.payload.pic_name,
			created_at: now,
			snapshot_data: JSON.stringify({
				status: args.payload.status ?? "draft",
				total_amount: totalAmount,
			}),
		});

		return {
			id: String(quotationId),
			quotation_number: quotationNumber,
			hijri_year: hijriYear,
			sequence_num: nextSequenceNum,
			revision: 0,
			total_amount: totalAmount,
			status: args.payload.status ?? "draft",
		};
	},
});

export const getQuotationForEdit = query({
	args: {
		target_quotation_id: v.string(),
	},
	handler: async (ctx, args) => {
		const quotation = await findQuotationByStringId(ctx, args.target_quotation_id);
		if (!quotation) {
			return null;
		}

		const [items, packageRooms, allPackages, allFlights, allPackageHotels] = await Promise.all([
			ctx.db
				.query("quotation_items")
				.withIndex("by_quotation_id", (q) => q.eq("quotation_id", String(quotation._id)))
				.collect(),
			ctx.db.query("package_rooms").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_hotels").collect(),
		]);

		const packageRoomById = new Map<string, (typeof packageRooms)[number]>();
		for (const room of packageRooms) {
			packageRoomById.set(String(room._id), room);
		}

		const selected_rooms = items
			.filter((item) => item.item_type === "room")
			.map((item) => {
				const packageRoom = packageRoomById.get(item.package_room_id);
				return {
					room_type: packageRoom?.room_type ?? item.description,
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
			liveHotelsForEdit,
			quotation.hotels_snapshot,
		);

		return {
			id: String(quotation._id),
			reference_number: buildQuotationNumber(
				quotation.hijri_year,
				quotation.sequence_num,
				quotation.revision,
			),
			pic_name: quotation.pic_name,
			branch: quotation.branch,
			client_id: quotation.client_id,
			notes: quotation.notes ?? "",
			package_id: quotation.package_id,
			flight_id: quotation.flight_id,
			selected_rooms,
			adds_ons,
			discounts,
			status: quotation.status,
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

		const mealsByHotelId = new Map<string, (typeof packageMeals)[number][]>();
		for (const meal of packageMeals) {
			const key = String(meal.package_hotel_id);
			const existing = mealsByHotelId.get(key);
			if (existing) {
				existing.push(meal);
			} else {
				mealsByHotelId.set(key, [meal]);
			}
		}

		const roomById = new Map<string, (typeof availableRooms)[number]>();
		for (const room of availableRooms) {
			roomById.set(String(room._id), room);
		}

		const selectedRooms = items
			.filter((item) => item.item_type === "room")
			.map((item) => {
				const linkedRoom = roomById.get(item.package_room_id);
				const price = item.original_price ?? item.unit_price;
				return {
					id: String(item._id),
					package_room_id: item.package_room_id,
					room_type: linkedRoom?.room_type ?? item.description,
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

		// Prefer snapshots (written at save time) over live package/flight data.
		// Falls back to live queries for quotations created before snapshots were introduced.
		const pkgSnap = quotation.package_snapshot;
		const flightSnap = quotation.flight_snapshot;
		const hotelSnap = quotation.hotels_snapshot;

		if (!pkgSnap && !selectedPackage) {
			throw new Error("Package not found and no snapshot available");
		}

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
			: liveFlight
				? {
					id: String(liveFlight._id),
					month: liveFlight.month,
					flight: liveFlight.flight ?? "",
					departure_date: liveFlight.departure_date,
					return_date: liveFlight.return_date,
					departure_sector: liveFlight.departure_sector,
					return_sector: liveFlight.return_sector,
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
			: availableHotels.map((hotel) => ({
				hotel_type: hotel.hotel_type,
				name: hotel.name ?? hotel.placeholder,
				placeholder: hotel.placeholder,
				enabled: hotel.enabled,
				meals: (mealsByHotelId.get(String(hotel._id)) ?? []).map((meal) => meal.meal_type),
			}));

		const { stale_fields, snapshot_version_known } = computeStaleFields(
			pkgSnap,
			flightSnap,
			selectedPackage,
			liveFlight,
			availableRooms,
			availableHotels,
			quotation.hotels_snapshot,
		);

		return {
			id: String(quotation._id),
			reference_number: buildQuotationNumber(
				quotation.hijri_year,
				quotation.sequence_num,
				quotation.revision,
			),
			status: quotation.status,
			client_name: quotation.client_name,
			pic_name: quotation.pic_name,
			branch: quotation.branch,
			notes: quotation.notes ?? "",
			total_amount: quotation.total_amount,
			created_at: quotation.created_at,
			updated_at: quotation.updated_at,
			hijri_year: quotation.hijri_year,
			stale_fields,
			snapshot_version_known,
			package: {
				id: quotation.package_id,
				name: pkgSnap?.name ?? selectedPackage?.name ?? "",
				year: pkgSnap?.year ?? selectedPackage?.year ?? "",
				duration: pkgSnap?.duration ?? selectedPackage?.duration ?? "",
				transport: pkgSnap?.transport ?? selectedPackage?.transport ?? "",
				inclusions: pkgSnap?.inclusions ?? selectedPackage?.inclusions ?? "",
				exclusions: pkgSnap?.exclusions ?? selectedPackage?.exclusions ?? "",
				package_code: pkgSnap?.package_code ?? selectedPackage?.package_code ?? "",
				hotels,
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
		const quotation = await findQuotationByStringId(ctx, args.payload.id);
		if (!quotation) {
			throw new Error("Quotation not found");
		}

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

		const selectedFlight = allFlights.find(
			(candidate) => String(candidate._id) === args.payload.flight_id,
		);
		if (!selectedFlight) {
			throw new Error("Flight not found");
		}

		if (String(selectedFlight.package_id) !== args.payload.package_id) {
			throw new Error("Selected flight does not belong to the selected package");
		}

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

		const totalAmount = normalizeCurrency(roomsTotal + addOnsTotal - discountsTotal);

		const packageChanged = args.payload.package_id !== quotation.package_id;
		const flightChanged  = args.payload.flight_id  !== quotation.flight_id;

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
		const package_snapshot = packageChanged
			? buildPackageSnapshot(selectedPackage, roomsForPkg)
			: (quotation.package_snapshot ?? buildPackageSnapshot(selectedPackage, roomsForPkg));

		const flight_snapshot = flightChanged
			? buildFlightSnapshot(selectedFlight)
			: (quotation.flight_snapshot ?? buildFlightSnapshot(selectedFlight));

		const hotels_snapshot = packageChanged
			? buildHotelsSnapshot(hotelsForPkg, mealsByHotelId)
			: (quotation.hotels_snapshot ?? buildHotelsSnapshot(hotelsForPkg, mealsByHotelId));

		await ctx.db.patch(quotation._id, {
			client_name: client.name,
			package_id: args.payload.package_id,
			status: args.payload.status ?? quotation.status,
			total_amount: totalAmount,
			notes: args.payload.notes ?? "",
			updated_at: now,
			created_by: args.payload.created_by ?? args.payload.pic_name,
			pic_name: args.payload.pic_name,
			branch: args.payload.branch,
			flight_id: args.payload.flight_id,
			client_id: args.payload.client_id,
			package_snapshot,
			flight_snapshot,
			hotels_snapshot,
		});

		const existingItems = await ctx.db
			.query("quotation_items")
			.withIndex("by_quotation_id", (q) => q.eq("quotation_id", String(quotation._id)))
			.collect();

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
			performed_by: args.payload.created_by ?? args.payload.pic_name,
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

export const refreshSnapshot = mutation({
	args: { quotation_id: v.string() },
	handler: async (ctx, args) => {
		const quotation = await findQuotationByStringId(ctx, args.quotation_id);
		if (!quotation) throw new Error("Quotation not found");

		const now = new Date().toISOString();

		const [allPackages, allFlights, allPackageHotels, allPackageMeals, allPackageRooms] =
			await Promise.all([
				ctx.db.query("packages").collect(),
				ctx.db.query("package_flights").collect(),
				ctx.db.query("package_hotels").collect(),
				ctx.db.query("package_meals").collect(),
				ctx.db.query("package_rooms").collect(),
			]);

		const selectedPackage = allPackages.find(
			(p) => String(p._id) === quotation.package_id,
		);
		if (!selectedPackage) throw new Error("Package no longer exists");

		const selectedFlight = allFlights.find(
			(f) => String(f._id) === quotation.flight_id,
		);

		const hotelsForPkg = allPackageHotels.filter(
			(h) => String(h.package_id) === quotation.package_id,
		);
		const mealsByHotelId = new Map<string, string[]>();
		for (const meal of allPackageMeals) {
			const key = String(meal.package_hotel_id);
			const bucket = mealsByHotelId.get(key) ?? [];
			bucket.push(meal.meal_type);
			mealsByHotelId.set(key, bucket);
		}

		const roomsForPkg = allPackageRooms.filter(
			(r) => String(r.package_id) === quotation.package_id,
		);
		const package_snapshot = buildPackageSnapshot(selectedPackage, roomsForPkg);
		const flight_snapshot = selectedFlight
			? buildFlightSnapshot(selectedFlight)
			: quotation.flight_snapshot;
		const hotels_snapshot = buildHotelsSnapshot(hotelsForPkg, mealsByHotelId);

		await ctx.db.patch(quotation._id, {
			package_snapshot,
			flight_snapshot,
			hotels_snapshot,
			updated_at: now,
		});

		const quotationNumber = buildQuotationNumber(
			quotation.hijri_year,
			quotation.sequence_num,
			quotation.revision,
		);

		await ctx.db.insert("quotation_logs", {
			quotation_id: String(quotation._id),
			action: "snapshot_refreshed",
			description: `Snapshot for ${quotationNumber} refreshed to package version ${selectedPackage.updated_at}`,
			performed_by: "system",
			created_at: now,
			snapshot_data: JSON.stringify({ package_updated_at: selectedPackage.updated_at }),
		});

		return { success: true };
	},
});

export const resequenceByCreatedAt = mutation({
	args: {
		dryRun: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const dryRun = args.dryRun ?? false;
		const quotations = await ctx.db.query("quotations").collect();

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
		// Find the quotation
		const quotation = await findQuotationByStringId(ctx, quotationId);
		if (!quotation) {
			throw new Error(`Quotation ${quotationId} not found`);
		}

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
		const dryRun = args.dryRun ?? false;

		const [quotations, flights] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("package_flights").collect(),
		]);

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
