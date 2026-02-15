// get_profile_by_email

import type { SupabaseClient } from "@supabase/supabase-js";

export const AuthService = {
	async getUserProfileByEmail(client: SupabaseClient, email?: string) {
		const { data, error } = await client.rpc("get_profile_by_email", {
			target_email: email,
		});

		console.log("AuthService.getUserProfileByEmail called with email:", data);

		if (error) {
			console.error("Error fetching user profile:", error);
			throw new Error(error.message);
		}

		return data;
	},

	async getFullProfile(client: SupabaseClient, email?: string) {
		const { data, error } = await client.rpc("get_my_full_profile", {
			target_email: email,
		});

		console.log("AuthService.getFullProfile called with email:", data);

		if (error) {
			console.error("Error fetching user profile:", error);
			throw new Error(error.message);
		}

		return data;
	},
};
