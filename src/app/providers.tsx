"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { useMemo } from "react";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/features/theme/provider/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
	const client = useMemo(
		() => new ConvexReactClient(convexUrl ?? "http://localhost:3210"),
		[convexUrl],
	);

	return (
		<ConvexAuthNextjsProvider client={client}>
			<ThemeProvider>
				{children}
				<Toaster />
			</ThemeProvider>
		</ConvexAuthNextjsProvider>
	);
}
