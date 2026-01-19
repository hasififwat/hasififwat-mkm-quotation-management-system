import type { Route } from "./+types/logout";

import { redirect } from "react-router";
import { getServerClient } from "@/lib/supabase/server";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = getServerClient(request, headers);

  // Sign out on the server
  await supabase.auth.signOut();

  // Redirect to home/login and clear cookies
  return redirect("/", { headers });
}

// Redirect if someone tries to visit /logout directly via GET
export async function loader() {
  return redirect("/");
}
