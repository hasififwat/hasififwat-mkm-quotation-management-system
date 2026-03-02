import type { IPackageDetailsForm } from "../schema";

type ConvexPackageData = {
	_id: string;
	name: string;
	duration: string;
	year: string;
	status: string;
	transport?: string;
	inclusions?: string;
	exclusions?: string;
	hotels: Array<{
		_id: string;
		_creationTime?: number;
		hotel_type: string;
		name?: string;
		enabled: boolean;
		placeholder: string;
		meals?: string[];
	}>;
	rooms: Array<{
		_id: string;
		room_type: string;
		price: number;
		enabled: boolean;
		sort_order?: number;
	}>;
	flights: Array<{
		_id: string;
		year_key?: string;
		pakej?: string;
		code?: string;
		month: string;
		departure_date: string;
		departure_sector: string;
		return_date: string;
		return_sector: string;
		package_name?: string;
	}>;
};

export function transformConvexPackage(
	packageData: ConvexPackageData,
): IPackageDetailsForm {
	return {
		_id: packageData._id,
		name: packageData.name,
		duration: packageData.duration,
		year: packageData.year,
		transport: packageData.transport ?? "",
		status:
			(packageData.status as "published" | "unpublished") || "unpublished",
		inclusions: packageData.inclusions || "",
		exclusions: packageData.exclusions || "",
		hotels: packageData.hotels.map((hotel) => ({
			_id: hotel._id,
			_creationTime: hotel._creationTime ?? 0,
			name: hotel.name || "",
			enabled: hotel.enabled,
			placeholder: hotel.placeholder,
			hotel_type: hotel.hotel_type,
			meals: hotel.meals ?? [],
		})),
		rooms: packageData.rooms.map((room) => ({
			_id: room._id,
			name: room.room_type,
			price: room.price,
			enabled: room.enabled,
			sort_order: room.sort_order ?? 0,
		})),
		flights: packageData.flights.map((flight) => ({
			_id: flight._id,
			year_key: flight.year_key ?? "",
			pakej: flight.pakej ?? "",
			code: flight.code ?? "",
			month: flight.month,
			departure: flight.departure_date,
			return: flight.return_date,
			package_name: flight.package_name ?? packageData.name,
			sector_departure: flight.departure_sector,
			sector_return: flight.return_sector,
		})),
	};
}
