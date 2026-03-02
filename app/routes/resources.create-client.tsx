import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Route } from "./+types/resources.create-client";

export async function action({ request }: Route.ActionArgs) {
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const formData = await request.formData();
	const name = String(formData.get("name") || "").trim();
	const phone_number = String(formData.get("phone_number") || "").trim();

	if (!name) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Client name is required",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const newClient = await client.mutation(api.clients.create, {
			name,
			phone_number,
		});

		return new Response(
			JSON.stringify({ success: true, clientId: newClient.id }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create client";

		return new Response(
			JSON.stringify({
				success: false,
				error: message,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
