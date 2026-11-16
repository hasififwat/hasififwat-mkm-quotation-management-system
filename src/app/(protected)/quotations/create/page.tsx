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

export default async function QuotationCreatePage({
	searchParams,
}: {
	searchParams: Promise<{ client_id?: string | string[] }>;
}) {
	const client = await getServerConvexClient();
	const [packagesData, allClients, query, availability] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
		searchParams,
		client.query(api.quotationRevisionUi.availability, {}),
	]);

	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	const typedClients: ClientsListResult = Array.isArray(allClients)
		? allClients
		: [];
	const initialClientId =
		typeof query.client_id === "string" && query.client_id.trim() !== ""
			? typedClients.find((client) => client.id === query.client_id)?.id
			: undefined;
	const hasUnavailableClient =
		query.client_id !== undefined && initialClientId === undefined;

	if (availability.frozen && !availability.enabled) return <div role="status" className="col-span-full mx-auto max-w-3xl p-6">Quotation saves are temporarily unavailable during revision maintenance. No quotation has been created.</div>;

	return (
		<>
			{hasUnavailableClient && (
				<p
					role="status"
					className="col-span-12 mx-2 mt-6 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground sm:mx-4 lg:mx-auto lg:w-185"
				>
					The requested client could not be selected. Please select a client below.
				</p>
			)}
			<QuotationBuilder
				key={JSON.stringify(query.client_id ?? null)}
				initialData={null}
				revisionEnabled={availability.enabled}
				revisionActor={availability.actor}
				initialClientId={initialClientId}
				allPackages={allPackages}
				allClients={typedClients}
			/>
		</>
	);
}
