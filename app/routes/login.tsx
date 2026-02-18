import { redirect } from "react-router";
import { LoginForm } from "~/features/authentication /components/LoginForm";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";
import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/login";

export function meta() {
	return [
		{ title: "Login" },
		{ name: "description", content: "Login to your account" },
	];
}

// 1. LOADER: Redirects if already logged in
export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	// Check if session exists
	const {
		data: { session },
	} = await supabase.auth.getSession();

	// If valid session found, kick them to dashboard
	if (session) {
		throw redirect("/packages", { headers });
	}

	return null;
}

export async function action({ request }: Route.ActionArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	const formData = await request.formData();
	const email = String(formData.get("email"));
	const password = String(formData.get("password"));

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		// Return the error so the form can display it
		return { error: error.message };
	}

	// Success! Redirect and pass the cookies (headers)
	return redirect("/packages", { headers });
}
export default function Login() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	);
}
