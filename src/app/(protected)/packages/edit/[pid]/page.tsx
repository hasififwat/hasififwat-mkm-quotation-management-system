export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getServerConvexClient } from "~/lib/convex-server";
import { redirect } from "next/navigation";
import PackageBuilder from "~/features/packages/PackageBuilder";
import { transformConvexPackage } from "~/features/packages/utils";

type Params = { params: Promise<{ pid: string }> };

export default async function PackageEditPage({ params }: Params) {
	const { pid } = await params;
	const packageId = pid as Id<"packages">;
	const client = await getServerConvexClient();

	const [packageData, allPackagesData] = await Promise.all([
		client.query(api.packages.getById, { id: packageId }),
		client.query(api.packages.listWithRooms, {}),
	]);

	if (!packageData) {
		redirect("/packages");
	}

	// Transform both current package and all packages
	const initialData = transformConvexPackage(packageData);
	const allPackages = (
		Array.isArray(allPackagesData) ? allPackagesData : []
	).map(transformConvexPackage);

	return <PackageBuilder initialData={initialData} allPackages={allPackages} />;
}
