import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import ClientDetailPage from "~/features/clients/ClientDetailPage";
import type { Route } from "./+types/client.$cid";

export function meta() {
	return [{ title: "Client" }];
}

export async function loader({ params }: Route.LoaderArgs) {
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) throw new Error("CONVEX_URL is not set");

	const client = new ConvexHttpClient(convexUrl);
	const data = await client.query(api.clients.getWithQuotations, {
		client_id: params.cid,
	});

	if (!data) throw redirect("/clients");

	return { client: data };
}

export default function ClientDetailRoute({ loaderData }: Route.ComponentProps) {
	return <ClientDetailPage client={loaderData.client} />;
}
