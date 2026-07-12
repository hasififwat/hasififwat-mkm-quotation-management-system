import { ConvexProvider, ConvexReactClient } from "convex/react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	type ShouldRevalidateFunctionArgs,
	useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

import { useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./features/theme/provider/ThemeProvider";
import { getServerClient } from "./lib/supabase/server";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

async function loggingMiddleware({ request, context }, next) {
	console.log(`${new Date().toISOString()} ${request.method} ${request.url}`);
	const start = performance.now();
	const response = await next();
	const duration = performance.now() - start;
	console.log(
		`${new Date().toISOString()} Response ${response.status} (${duration}ms)`,
	);
	return response;
}

export const middleware: Route.MiddlewareFunction[] = [loggingMiddleware];

export async function loader({ request }: Route.LoaderArgs) {
	// We don't need to block the root, just pass env vars or session status
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	await supabase.auth.getSession();

	const CONVEX_URL = process.env.CONVEX_URL!;
	return { ENV: { CONVEX_URL } };
}

export function shouldRevalidate({ formMethod }: ShouldRevalidateFunctionArgs) {
	// Avoid parent loader revalidation on normal link navigation.
	if (formMethod && formMethod !== "GET") {
		return true;
	}

	return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
	const { ENV } = useLoaderData<typeof loader>();
	const [_convex] = useState(() => new ConvexReactClient(ENV.CONVEX_URL));
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				<ConvexProvider client={_convex}>{children}</ConvexProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<ThemeProvider>
			<Outlet />
			<Toaster />
		</ThemeProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
