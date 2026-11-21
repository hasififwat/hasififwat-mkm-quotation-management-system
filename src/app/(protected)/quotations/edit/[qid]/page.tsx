export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import type { QuotationPackagesResult } from "~/features/quotation/loader-utils";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import Link from "next/link";
import { redirect } from "next/navigation";

type Params = { params: Promise<{ qid: string }> };

export default async function QuotationEditPage({ params }: Params) {
	const { qid } = await params;
	const client = await getServerConvexClient();

	const [initialData, packagesData, allClients, availability] = await Promise.all([
		client.query(api.quotations.getQuotationForEdit, {
			target_quotation_id: qid,
		}),
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
		client.query(api.quotationRevisionUi.availability, {}),
	]);
	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	if (!initialData) {
		redirect("/quotations");
	}

	const context = initialData.revision_context;
	if ((availability.enabled && !context.family_id) || context.state === "historical" || (context.family_id && (!context.can_append || !availability.enabled)) || (availability.frozen && !availability.enabled)) {
		return <section className="col-span-full mx-auto max-w-3xl space-y-4 p-6">
			<h1 className="text-2xl font-semibold">{initialData.reference_number}</h1>
			<p role="status">{context.state === "historical" ? "A newer revision exists. This saved revision is read-only. Editing an older revision cannot create a branch." : "Quotation editing is unavailable while this family is archived or revision maintenance is in progress."}</p>
			<div className="flex flex-wrap gap-4"><Link className="underline" href={`/quotations/review/${qid}`}>View this saved revision</Link>
			{context.state === "historical" && <Link className="underline" href={`/quotations/edit/${context.current_revision_id}`}>Edit current revision</Link>}</div>
		</section>;
	}

	const { stale_fields, snapshot_version_known, snapshot_refresh_token, ...formData } = initialData;

	return (
		<QuotationBuilder
			initialData={formData}
			snapshot_refresh_token={snapshot_refresh_token}
			revisionEnabled={availability.enabled}
				revisionActor={availability.actor}
			revisionSource={context.family_id ? initialData : undefined}
			allPackages={allPackages}
			allClients={allClients}
			qid={qid}
			stale_fields={stale_fields ?? []}
			snapshot_version_known={snapshot_version_known ?? false}
		/>
	);
}
