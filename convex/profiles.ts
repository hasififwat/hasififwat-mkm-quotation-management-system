import { mutation } from "./_generated/server";

export const removeLegacySupabaseIds = mutation({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("profiles").collect();
		let cleaned = 0;

		for (const profile of profiles) {
			if (!profile.supabase_id) {
				continue;
			}

			await ctx.db.replace(profile._id, {
				full_name: profile.full_name,
				branch: profile.branch,
				updated_at: profile.updated_at,
				unit: profile.unit,
			});
			cleaned += 1;
		}

		return {
			total_profiles: profiles.length,
			cleaned,
		};
	},
});
