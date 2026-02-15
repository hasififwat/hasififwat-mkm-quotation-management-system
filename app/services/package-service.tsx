import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupabasePackageDetails } from "~/features/quotation/legacy/types";

export const UmrahPackageService = {
	// Fetch all packages
	async getAllPackages(
		client: SupabaseClient,
	): Promise<SupabasePackageDetails[]> {
		const { data, error } = await client
			.from("v_packages_complete")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching packages:", error);
			throw error;
		}

		return data as SupabasePackageDetails[];
	},
	async getNewPackageTemplate(client: SupabaseClient) {
		const { data, error } = await client.rpc("get_new_package_template");

		if (error) {
			console.error("Error fetching package:", error);
			throw new Error(error.message);
		}

		return data;
	},

	// Fetch single package
	async getPackageById(client: SupabaseClient, id: string) {
		const { data, error } = await client.rpc("get_package_details", {
			p_id: id,
		});

		if (error) {
			console.error("Error fetching package:", error);
			throw new Error(error.message);
		}

		return data;
	},

	// Save package (The complex logic remains the same, just using 'client')
	async savePackage(client: SupabaseClient, formPayload: any) {
		const { data, error } = await client.rpc("create_package", {
			payload: formPayload,
		});

		if (error) {
			console.error("Error saving package:", error);
			throw new Error(error.message);
		}

		return data;
	},

	async updatePackage(client: SupabaseClient, updatePayload: any) {
		// Implementation for updating a package
		const { data, error } = await client.rpc("edit_package", {
			payload: updatePayload,
		});

		if (error) {
			console.error("Error saving package:", error);
			throw new Error(error.message);
		}

		return data;
	},

	async deletePackage(client: SupabaseClient, id: string) {
		const { error } = await client.rpc("delete_package", {
			package_id: id,
		});

		if (error) {
			console.error("Error deleting package:", error);
			return { success: false, error };
		}

		return { success: true };
	},

	async createPackagesWithFlights(client: SupabaseClient, payload: any) {
		const { data, error } = await client.rpc("import_packages_with_flights", {
			payload: payload,
		});

		if (error) {
			console.error("Error creating packages with flights:", error);
			throw new Error(error.message);
		}

		return data;
	},

	async clearAllData(client: SupabaseClient) {
		const { error } = await client.rpc("clear_transactional_data");

		if (error) {
			console.error("Error clearing package data:", error);
			throw new Error(error.message);
		}

		return { success: true };
	},
};
