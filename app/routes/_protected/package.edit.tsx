import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import PackageBuilder from "~/features/packages/PackageBuilder";
import type { IPackageDetailsForm } from "~/features/packages/schema";
import {
	normalizePackageMutationPayload,
	transformConvexPackage,
} from "~/features/packages/utils";
import type { Route } from "./+types/package.edit";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const packageId = params.pid as Id<"packages">;
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const [packageData, allPackagesData] = await Promise.all([
		client.query(api.packages.getById, { id: packageId }),
		client.query(api.packages.listWithRooms, {}),
	]);

	if (!packageData) {
		throw redirect("/packages");
	}

	// Transform both current package and all packages
	const initialData = transformConvexPackage(packageData);
	const allPackages = allPackagesData.map(transformConvexPackage);

	return {
		initialData,
		allPackages,
	};
}

clientLoader.hydrate = false;

export async function clientAction({ request }: Route.ClientActionArgs) {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const data = (await request.json()) as IPackageDetailsForm;

	if (!data._id) {
		throw new Error("Package id is required for update");
	}

	const payload = normalizePackageMutationPayload(data);

	await client.mutation(api.packages.updatePackage, {
		id: data._id as Id<"packages">,
		payload,
	});

	return redirect("/packages");
}

export function HydrateFallback() {
	return (
		<div className="col-span-12 flex items-center justify-center min-h-screen bg-background">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
				<p className="text-muted-foreground">Loading package...</p>
			</div>
		</div>
	);
}

export function meta() {
	return [
		{ title: "Package Builder - MKM Quotation" },
		{ name: "description", content: "Create or edit an Umrah package" },
	];
}

export default function PackageBuilderPage() {
	return <PackageBuilder />;
}
