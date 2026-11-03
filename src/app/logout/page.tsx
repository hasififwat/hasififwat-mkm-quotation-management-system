"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mirrors the old `/logout` route (loader redirect to "/").
 * Convex auth state is cleared by the sidebar "Sign Out" button
 * via `signOut()` before navigating here.
 */
export default function LogoutPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/");
	}, [router]);

	return null;
}
