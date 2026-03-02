import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function buildQuotationNumber(hijriYear: string, sequenceNum: number, revision: number) {
	const paddedSequence = String(sequenceNum).padStart(4, "0");
	return revision > 0
		? `${hijriYear}-${paddedSequence}-R${revision}`
		: `${hijriYear}-${paddedSequence}`;
}

function getCurrentHijriYear() {
	const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
		year: "numeric",
	}).formatToParts(new Date());

	const yearPart = parts.find((part) => part.type === "year")?.value;
	if (yearPart && yearPart.trim().length > 0) {
		return yearPart;
	}

	return String(new Date().getFullYear());
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

async function findQuotationByStringId(ctx: any, quotationId: string) {
	const quotations = await ctx.db.query("quotations").collect();
	return quotations.find((item: any) => String(item._id) === quotationId) ?? null;
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
					v.literal("confirmed"),
					v.literal("accepted"),
					v.literal("rejected"),
					v.literal("expired"),
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
		const hijriYear = getCurrentHijriYear();

		const [allQuotations, allClients, allPackages, allFlights, allPackageRooms] =
			await Promise.all([
				ctx.db.query("quotations").collect(),
				ctx.db.query("clients").collect(),
				ctx.db.query("packages").collect(),
				ctx.db.query("package_flights").collect(),
				ctx.db.query("package_rooms").collect(),
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

		const currentHijriYearMaxSeq = allQuotations
			.filter((quotation) => quotation.hijri_year === hijriYear)
			.reduce((max, quotation) => Math.max(max, quotation.sequence_num), 0);

		const nextSequenceNum = currentHijriYearMaxSeq + 1;
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

		const [items, packageRooms] = await Promise.all([
			ctx.db
				.query("quotation_items")
				.withIndex("by_quotation_id", (q) => q.eq("quotation_id", String(quotation._id)))
				.collect(),
			ctx.db.query("package_rooms").collect(),
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
		if (!selectedPackage) {
			throw new Error("Package not found");
		}

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

		const selectedFlight = availableFlights.find(
			(flight) => String(flight._id) === quotation.flight_id,
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
			package: {
				id: String(selectedPackage._id),
				name: selectedPackage.name,
				year: selectedPackage.year,
				duration: selectedPackage.duration,
				transport: selectedPackage.transport ?? "",
				inclusions: selectedPackage.inclusions ?? "",
				exclusions: selectedPackage.exclusions ?? "",
				package_code: selectedPackage.package_code ?? "",
				hotels: availableHotels.map((hotel) => ({
					hotel_type: hotel.hotel_type,
					name: hotel.name ?? hotel.placeholder,
					placeholder: hotel.placeholder,
					enabled: hotel.enabled,
					meals: (mealsByHotelId.get(String(hotel._id)) ?? []).map(
						(meal) => meal.meal_type,
					),
				})),
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
			selected_flight: selectedFlight
				? {
					id: String(selectedFlight._id),
					month: selectedFlight.month,
					flight: selectedFlight.flight ?? "",
					departure_date: selectedFlight.departure_date,
					return_date: selectedFlight.return_date,
					departure_sector: selectedFlight.departure_sector,
					return_sector: selectedFlight.return_sector,
				}
				: null,
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
					v.literal("confirmed"),
					v.literal("accepted"),
					v.literal("rejected"),
					v.literal("expired"),
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

		const [allClients, allPackages, allFlights, allPackageRooms] = await Promise.all([
			ctx.db.query("clients").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
			ctx.db.query("package_rooms").collect(),
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
