import { useConvexAuth, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { SidebarLayout } from "~/layout/SidebarLayout";

export default function ProtectedLayout() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();
	const profile = useQuery(api.profiles.getMyProfile);

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate("/");
		}
	}, [isAuthenticated, isLoading, navigate]);

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
			<Outlet />
		</SidebarLayout>
	);
}
