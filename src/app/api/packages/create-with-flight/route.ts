import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();

	try {
		const data = await request.json();

		await client.mutation(api.packages.createPackageWithFlight, {
			payload: data,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in packages.create-with-flight API route:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
