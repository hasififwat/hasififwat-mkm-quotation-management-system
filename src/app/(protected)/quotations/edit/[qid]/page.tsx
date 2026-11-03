export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import type { QuotationPackagesResult } from "~/features/quotation/loader-utils";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import { redirect } from "next/navigation";

type Params = { params: Promise<{ qid: string }> };

export default async function QuotationEditPage({ params }: Params) {
	const { qid } = await params;
	const client = await getServerConvexClient();

	const [initialData, packagesData, allClients] = await Promise.all([
		client.query(api.quotations.getQuotationForEdit, {
			target_quotation_id: qid,
		}),
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
	]);
	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	if (!initialData) {
		redirect("/quotations");
	}

	const { stale_fields, snapshot_version_known, ...formData } = initialData;

	return (
		<QuotationBuilder
			initialData={formData}
			allPackages={allPackages}
			allClients={allClients}
			qid={qid}
			stale_fields={stale_fields ?? []}
			snapshot_version_known={snapshot_version_known ?? false}
		/>
	);
}
