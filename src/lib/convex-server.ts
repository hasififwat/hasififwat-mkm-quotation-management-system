import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex client for Server Components and Route Handlers.
 * Prefers the server-only CONVEX_URL, falls back to the public var.
 */
export async function getServerConvexClient(): Promise<ConvexHttpClient> {
	const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL / NEXT_PUBLIC_CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const token = await convexAuthNextjsToken();
	if (token) client.setAuth(token);
	return client;
}
