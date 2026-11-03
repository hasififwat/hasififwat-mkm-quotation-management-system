export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import { redirect } from "next/navigation";

import { ReviewClient } from "./review-client";

type Params = { params: Promise<{ qid: string }> };

export const metadata = {
	title: "Quotation Preview",
};

export default async function QuotationReviewPage({ params }: Params) {
	const { qid } = await params;
	const client = getServerConvexClient();

	const initialData = await client.query(api.quotations.getQuotationFullDetails, {
		target_quotation_id: qid,
	});

	if (!initialData) {
		redirect("/quotations");
	}

	return <ReviewClient initialData={initialData} />;
}
