import { getServerClient } from "~/lib/supabase/server";
import { ClientsService } from "~/services/clients-serice";
import type { Route } from "./+types/resources.create-client";

export async function action({ request }: Route.ActionArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	const formData = await request.formData();
	const name = formData.get("name") as string;
	const phone_number = formData.get("phone_number") as string;

	try {
		const newClient = await ClientsService.createClient(supabase, {
			name,
			phone_number,
		});

		const createdId = Array.isArray(newClient)
			? newClient[0]?.id
			: newClient?.id;

		return new Response(
			JSON.stringify({ success: true, clientId: createdId }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: error.message || "Failed to create client",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
