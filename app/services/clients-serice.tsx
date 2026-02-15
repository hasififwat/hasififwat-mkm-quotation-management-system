import type { SupabaseClient } from "@supabase/supabase-js";

export const ClientsService = {
	async createClient(
		client: SupabaseClient,
		formPayload: {
			name: string;
			phone_number: string;
		},
	) {
		const { data, error } = await client.rpc("create_client", formPayload);
		if (error) {
			console.error("Error creating client:", error);
			throw new Error(error.message);
		}
		return data;
	},
	async getClients(client: SupabaseClient) {
		const { data, error } = await client.rpc("get_clients");
		if (error) {
			console.error("Error fetching clients:", error);
			throw new Error(error.message);
		}
		return data;
	},
};
