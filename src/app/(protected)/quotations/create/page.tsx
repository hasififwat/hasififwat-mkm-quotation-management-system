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

	if (availability.frozen && !availability.enabled) return <div role="status" className="workspace-page max-w-4xl">Quotation saves are temporarily unavailable during revision maintenance. No quotation has been created.</div>;

	return (
		<>
			{hasUnavailableClient && (
				<div className="workspace-page max-w-4xl pb-0 lg:pb-0">
					<p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
						The requested client could not be selected. Please select a client below.
					</p>
				</div>
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
