import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex client for Server Components and Route Handlers.
 * Prefers the server-only CONVEX_URL, falls back to the public var.
 */
export function getServerConvexClient(): ConvexHttpClient {
	const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL / NEXT_PUBLIC_CONVEX_URL is not set");
	}

	return new ConvexHttpClient(convexUrl);
}
