import type { IPackageDetailsForm } from "../schema";

export function normalizePackageMutationPayload(data: IPackageDetailsForm) {
	return {
		name: data.name,
		duration: data.duration,
		transport: data.transport ?? "",
		year:
			data.year ??
			`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
		status: data.status ?? "unpublished",
		inclusions: data.inclusions ?? "",
		exclusions: data.exclusions ?? "",
		hotels: (data.hotels ?? []).map((hotel) => ({
			_id: hotel._id,
			name: hotel.name ?? "",
			enabled: hotel.enabled ?? false,
			placeholder: hotel.placeholder ?? "",
			hotel_type: hotel.hotel_type ?? "",
			meals: hotel.meals ?? [],
		})),
		rooms: (data.rooms ?? []).map((room) => ({
			_id: room._id,
			room_type: room.name,
			price: Number(room.price ?? 0),
			enabled: room.enabled ?? false,
		})),
		flights: (data.flights ?? []).map((flight) => ({
			_id: undefined,
			month: flight.month ?? "",
			departure_date: flight.departure ?? "",
			departure_sector: flight.sector_departure ?? "",
			return_date: flight.return ?? "",
			return_sector: flight.sector_return ?? "",
		})),
	};
}
