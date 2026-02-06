import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const _supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabasePublishableKey =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export function getServerClient(request: Request, responseHeaders: Headers) {
	return createServerClient(supabaseUrl, supabasePublishableKey, {
		cookies: {
			getAll() {
				const parsed = parseCookieHeader(request.headers.get("Cookie") ?? "");

				// MAP THE RESULT to ensure 'value' is never undefined
				return parsed.map((cookie) => ({
					name: cookie.name,
					value: cookie.value ?? "", // fallback to empty string if undefined
				}));
			},

			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					responseHeaders.append(
						"Set-Cookie",
						serializeCookieHeader(name, value, options),
					);
				});
			},
		},
	});
}
