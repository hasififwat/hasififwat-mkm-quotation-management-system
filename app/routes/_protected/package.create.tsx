import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";

import PackageBuilder from "~/features/packages/PackageBuilder";
import type {
	IHotelDetailsApi,
	IPackageDetails,
	IRoomDetailsApi,
} from "~/features/packages/schema";
import {
	normalizePackageMutationPayload,
	transformConvexPackage,
} from "~/features/packages/utils";
import type { Route } from "./+types/package.create";

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

export async function loader({ request }: Route.LoaderArgs) {
	void request;
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const [allPackagesData, templateData] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.packages.getPackageTemplate, {}),
	]);

	// Transform all packages
	const allPackages = (
		Array.isArray(allPackagesData) ? allPackagesData : []
	).map(transformConvexPackage);
	const initialData = createEmptyTemplate(normalizeTemplateData(templateData));

	return {
		allPackages,
		initialData,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const data: IPackageDetails = await request.json();
	const payload = normalizePackageMutationPayload(data);

	await client.mutation(api.packages.createPackage, {
		payload,
	});

	return redirect("/packages");
}

export function HydrateFallback() {
	return (
		<div className="col-span-12 flex items-center justify-center min-h-screen bg-background">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
				<p className="text-muted-foreground">Loading package builder...</p>
			</div>
		</div>
	);
}

export default function PackageBuilderPage() {
	return <PackageBuilder />;
}
