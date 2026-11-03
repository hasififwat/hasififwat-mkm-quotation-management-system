import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = getServerConvexClient();

	try {
		const payload = await request.json();

		await client.mutation(api.quotations.create, { payload });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in quotations.create API route:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
