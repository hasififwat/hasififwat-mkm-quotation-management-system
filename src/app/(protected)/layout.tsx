"use client";

import { api } from "convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceSkeleton } from "~/components/loading/WorkspaceSkeleton";
import { Skeleton } from "~/components/ui/skeleton";
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
			<div className="flex min-h-svh w-full">
				<div aria-hidden="true" className="hidden h-svh w-60 shrink-0 p-2 pr-0 md:block lg:p-4 lg:pr-0">
					<div className="flex h-full flex-col rounded-lg border bg-sidebar shadow-sm">
						<div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
							<Skeleton className="size-8 rounded-lg" />
							<Skeleton className="h-4 w-28" />
						</div>
						<div className="flex-1 space-y-4 px-6 py-5">
							{Array.from({ length: 5 }, (_, item) => (
								<div key={item} className="flex items-center gap-3">
									<Skeleton className="size-4" />
									<Skeleton className="h-4 w-24" />
								</div>
							))}
						</div>
						<div className="border-t p-3">
							<Skeleton className="h-12 w-full" />
						</div>
					</div>
				</div>
				<main className="min-w-0 flex-1 md:m-2 md:rounded-lg md:bg-card md:shadow-sm md:ring-1 md:ring-border lg:m-4">
					<div aria-hidden="true" className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6 md:h-16 md:rounded-t-lg">
						<Skeleton className="size-8 md:size-9" />
						<Skeleton className="size-8 md:size-9" />
					</div>
					<WorkspaceSkeleton />
				</main>
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
