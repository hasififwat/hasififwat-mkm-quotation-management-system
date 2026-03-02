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

export async function clientLoader() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const [allPackagesData, templateData] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.packages.getPackageTemplate, {}),
	]);

	// Transform all packages
	const allPackages = allPackagesData.map(transformConvexPackage);
	const initialData = createEmptyTemplate(
		templateData as {
			hotelTemplates: Array<IHotelDetailsApi>;
			roomTemplates: Array<IRoomDetailsApi>;
		},
	);

	return {
		allPackages,
		initialData,
	};
}

clientLoader.hydrate = false;

export async function clientAction({ request }: Route.ClientActionArgs) {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not set");
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
