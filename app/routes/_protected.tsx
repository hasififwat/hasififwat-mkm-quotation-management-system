import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData } from "react-router";
import { SidebarLayout } from "~/layout/SidebarLayout";
import { getServerClient } from "~/lib/supabase/server";
import { AuthService } from "~/services/auth-service";

// 1. THE SERVER LOADER (The Gatekeeper)
export async function loader({ request }: LoaderFunctionArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	// Fetch the user profile
	const profile = await AuthService.getFullProfile(supabase); // Assuming this returns the profile based on the logged-in user's email

	// If not, redirect to login
	if (!profile) {
		throw redirect("/", { headers });
	}

	console.log("Loader fetched profile:", profile);
	// Return the user data to the component
	return { profile };
}

// 2. THE COMPONENT (The Layout)
export default function ProtectedLayout() {
	// Access the data returned by the loader
	const { profile } = useLoaderData<typeof loader>();

	console.log("ProtectedLayout loaded with profile:", profile);

	return (
		// Pass the user to your sidebar if needed
		<SidebarLayout profile={profile}>
			<Outlet />
		</SidebarLayout>
	);
}
