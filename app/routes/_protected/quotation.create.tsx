import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { redirect } from "react-router";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import type { Route } from "./+types/quotation.create";

type PackagesListResult = FunctionReturnType<typeof api.packages.listWithRooms>;
type ConvexPackage = PackagesListResult[number];
type ConvexHotel = ConvexPackage["hotels"][number];
type ClientsListResult = FunctionReturnType<typeof api.clients.list>;
type LegacyPackage = ReturnType<typeof toLegacyPackage>;

function normalizeSeason(value: unknown) {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : "No Season";
	}

	if (value == null) {
		return "No Season";
	}

	const stringified = String(value).trim();
	return stringified.length > 0 ? stringified : "No Season";
}

function toLegacyPackage(pkg: ConvexPackage) {
	const hotels = Array.isArray(pkg.hotels) ? pkg.hotels : [];

	const findHotel = (hotelType: string) => {
		const matched = hotels.find(
			(hotel: ConvexHotel) => hotel.hotel_type?.toLowerCase() === hotelType,
		);

		return {
			id: matched ? String(matched._id ?? "") : "",
			name: matched?.name ?? "",
			enabled: matched?.enabled ?? false,
			meals: matched?.meals ?? [],
			placeholder: matched?.placeholder ?? "",
		};
	};

	return {
		id: String(pkg._id),
		name: pkg.name,
		duration: pkg.duration,
		year: pkg.year,
		season: normalizeSeason(pkg.season),
		status: pkg.status,
		hotels: {
			makkah: findHotel("makkah"),
			madinah: findHotel("madinah"),
			taif: findHotel("taif"),
		},
		inclusions: pkg.inclusions ?? "",
		exclusions: pkg.exclusions ?? "",
		rooms: (pkg.rooms ?? []).map((room) => ({
			id: String(room._id),
			room_type: room.room_type,
			price: room.price,
			enabled: room.enabled,
		})),
		flights: (pkg.flights ?? []).map((flight) => ({
			id: String(flight._id),
			month: flight.month,
			departure_date: flight.departure_date,
			departure_sector: flight.departure_sector,
			return_date: flight.return_date,
			return_sector: flight.return_sector,
		})),
	};
}

export async function loader({ request }: Route.LoaderArgs) {
	void request;
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const [packagesData, allClients] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
	]);

	const allPackages = (Array.isArray(packagesData) ? packagesData : []).map(
		(pkg) => toLegacyPackage(pkg),
	);
	const allPackagesBySeason = allPackages.reduce(
		(acc, pkg) => {
			const seasonKey = normalizeSeason(pkg.season);
			if (!acc[seasonKey]) {
				acc[seasonKey] = [];
			}
			acc[seasonKey].push(pkg);
			return acc;
		},
		{} as Record<string, LegacyPackage[]>,
	);

	const typedClients: ClientsListResult = Array.isArray(allClients)
		? allClients
		: [];

	// const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
	// if (!pkg) {
	//   return redirect("/clients");
	// }

	return {
		initialData: null,
		allPackages,
		allClients: typedClients,
		allPackagesBySeason,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	try {
		await client.mutation(api.quotations.create, {
			payload: await request.json(),
		});
		return redirect("/quotations");
	} catch (error) {
		console.error("Error in quotation.create action:", error);
		throw error;
	}
}

export default function QuotationCreatePage() {
	return <QuotationBuilder />;
}
