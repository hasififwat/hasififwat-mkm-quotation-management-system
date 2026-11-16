export const dynamic = "force-dynamic";

import type { Id } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import { redirect } from "next/navigation";

import { SavedRevisionReview } from "~/features/quotation/components/SavedRevisionReview";
import { ReviewClient } from "./review-client";

type Params = { params: Promise<{ qid: string }>; searchParams: Promise<{saved?: string}> };

export const metadata = {
	title: "Quotation Preview",
};

export default async function QuotationReviewPage({ params, searchParams }: Params) {
	const { qid } = await params;
	const client = await getServerConvexClient();

	const initialData = await client.query(api.quotations.getQuotationFullDetails, {
		target_quotation_id: qid,
	});

	if (!initialData) {
		redirect("/quotations");
	}

	if (initialData.revision_context.family_id) {
		const source = await client.query(api.quotationRevisionUi.source, {revision_id: qid as Id<"quotations">});
		return <SavedRevisionReview details={initialData} source={source} saved={(await searchParams).saved === "1"} />;
	}

	return <ReviewClient initialData={initialData} />;
}
