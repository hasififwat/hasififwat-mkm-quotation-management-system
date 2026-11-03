"use client";

import { api } from "convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SidebarLayout } from "~/layout/SidebarLayout";

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const router = useRouter();
	const profile = useQuery(api.profiles.getMyProfile);

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.replace("/");
		}
	}, [isAuthenticated, isLoading, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!isAuthenticated) return null;

	return (
		<SidebarLayout profile={profile ?? undefined}>
			{children}
		</SidebarLayout>
	);
}
