export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import { redirect } from "next/navigation";
import ClientDetailPage from "~/features/clients/ClientDetailPage";

type Params = { params: Promise<{ cid: string }> };

export const metadata = {
	title: "Client",
};

export default async function ClientDetailPageRoute({ params }: Params) {
	const { cid } = await params;
	const client = getServerConvexClient();
	const data = await client.query(api.clients.getWithQuotations, {
		client_id: cid,
	});

	if (!data) redirect("/clients");

	return <ClientDetailPage client={data} />;
}
