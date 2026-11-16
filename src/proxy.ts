import {
	convexAuthNextjsMiddleware,
	createRouteMatcher,
	nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedPage = createRouteMatcher([
	"/clients(.*)",
	"/dashboard(.*)",
	"/flights(.*)",
	"/packages(.*)",
	"/quotations(.*)",
]);
const isProtectedApi = createRouteMatcher(["/api/packages(.*)", "/api/quotations(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
	if (!isProtectedPage(request) && !isProtectedApi(request)) return;
	if (await convexAuth.isAuthenticated()) return;

	if (isProtectedApi(request)) {
		return NextResponse.json(
			{ success: false, error: "Not authenticated" },
			{ status: 401 },
		);
	}

	return nextjsMiddlewareRedirect(request, "/");
});

export const config = {
	matcher: ["/((?!_next|.*\\..*).*)"],
};
