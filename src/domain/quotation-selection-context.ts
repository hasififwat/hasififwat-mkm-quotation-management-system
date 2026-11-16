import type { Doc } from "../../convex/_generated/dataModel";

export function quotationSelectionContext(
	pkg: Doc<"packages">,
	rooms: Doc<"package_rooms">[],
	flights: Doc<"package_flights">[],
	hotels: Doc<"package_hotels">[],
	meals: Doc<"package_meals">[],
): string {
	const packageId = String(pkg._id);
	const sorted = (rows: unknown[]) => rows.map((row) => JSON.stringify(row)).sort();
	return JSON.stringify({
		version: 1,
		package: [packageId, pkg.name, pkg.duration, pkg.year, pkg.season ?? "",
			pkg.transport ?? "", pkg.status, pkg.package_code ?? "", pkg.inclusions ?? "",
			pkg.exclusions ?? "", pkg.archived ?? false],
		rooms: sorted(rooms.filter((room) => String(room.package_id) === packageId)
			.map((room) => [room.room_type, room.price, room.enabled])),
		flights: sorted(flights.filter((flight) => String(flight.package_id) === packageId)
			.map((flight) => [String(flight._id), flight.month, flight.flight ?? "",
				flight.return_flight ?? "", flight.departure_date, flight.departure_sector,
				flight.return_date, flight.return_sector])),
		hotels: sorted(hotels.filter((hotel) => String(hotel.package_id) === packageId)
			.map((hotel) => [hotel.hotel_type, hotel.name ?? "", hotel.enabled, hotel.placeholder,
				meals.filter((meal) => String(meal.package_hotel_id) === String(hotel._id))
					.map((meal) => meal.meal_type).sort()])),
	});
}
