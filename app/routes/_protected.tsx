import { Outlet, redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getServerClient } from "~/lib/supabase/server";
import { SidebarLayout } from "~/layout/SidebarLayout";

// 1. THE SERVER LOADER (The Gatekeeper)
export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = getServerClient(request, headers);

  // Check if the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not, redirect to login
  if (!user) {
    throw redirect("/login", { headers });
  }

  // Return the user data to the component
  return { user };
}

// 2. THE COMPONENT (The Layout)
export default function ProtectedLayout() {
  // Access the data returned by the loader
  const { user } = useLoaderData<typeof loader>();

  return (
    // Pass the user to your sidebar if needed
    <SidebarLayout user={user}>
      {/* <Outlet /> renders the child route (e.g., Dashboard, Profile) */}
      <Outlet />
    </SidebarLayout>
  );
}
