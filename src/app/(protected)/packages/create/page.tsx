export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import PackageBuilder from "~/features/packages/PackageBuilder";
import type {
	IHotelDetailsApi,
	IPackageDetails,
	IRoomDetailsApi,
} from "~/features/packages/schema";
import { transformConvexPackage } from "~/features/packages/utils";

export const metadata = {
	title: "Create Package",
};

// Create empty template for new package from Convex templates
const createEmptyTemplate = (templateData: {
	hotelTemplates: Array<IHotelDetailsApi>;
	roomTemplates: Array<IRoomDetailsApi>;
}): IPackageDetails => {
	return {
		name: "",
		duration: "",
		year: new Date().getFullYear().toString(),
		transport: "",
		status: "unpublished",
		inclusions: "",
		exclusions: "",
		hotels: templateData.hotelTemplates.map((hotel) => ({
			...hotel,
			_id: "",
			meals: [],
		})),
		rooms: templateData.roomTemplates.map((room) => ({
			...room,
			_id: "",
			value: 0,
			enabled: false,
		})),
		flights: [],
	};
};

function normalizeTemplateData(templateData: unknown): {
	hotelTemplates: Array<IHotelDetailsApi>;
	roomTemplates: Array<IRoomDetailsApi>;
} {
	if (!templateData || typeof templateData !== "object") {
		return { hotelTemplates: [], roomTemplates: [] };
	}

	const data = templateData as {
		hotelTemplates?: unknown;
		roomTemplates?: unknown;
	};

	return {
		hotelTemplates: Array.isArray(data.hotelTemplates)
			? (data.hotelTemplates as Array<IHotelDetailsApi>)
			: [],
		roomTemplates: Array.isArray(data.roomTemplates)
			? (data.roomTemplates as Array<IRoomDetailsApi>)
			: [],
	};
}

export default async function PackageCreatePage() {
	const client = getServerConvexClient();

	const [allPackagesData, templateData] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.packages.getPackageTemplate, {}),
	]);

	// Transform all packages
	const allPackages = (
		Array.isArray(allPackagesData) ? allPackagesData : []
	).map(transformConvexPackage);
	const initialData = createEmptyTemplate(normalizeTemplateData(templateData));

	return (
		<PackageBuilder initialData={initialData} allPackages={allPackages} />
	);
}
