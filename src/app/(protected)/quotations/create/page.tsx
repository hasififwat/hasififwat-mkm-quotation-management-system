export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import type {
	ClientsListResult,
	QuotationPackagesResult,
} from "~/features/quotation/loader-utils";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";

export const metadata = {
	title: "Create Quotation",
};

export default async function QuotationCreatePage() {
	const client = getServerConvexClient();
	const [packagesData, allClients] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
	]);

	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	const typedClients: ClientsListResult = Array.isArray(allClients)
		? allClients
		: [];

	return (
		<QuotationBuilder
			initialData={null}
			allPackages={allPackages}
			allClients={typedClients}
		/>
	);
}
