import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ConvexError } from "convex/values";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();

	try {
		const payload = await request.json();

		await client.mutation(api.quotations.create, { payload });

		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof ConvexError && error.data && typeof error.data === "object" && error.data.code === "QUOTATION_SELECTION_CONFLICT") {
			return NextResponse.json(
				{ success: false, code: error.data.code, error: error.data.message },
				{ status: 409 },
			);
		}
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
