import { ConvexError } from "convex/values";
import { SNAPSHOT_REFRESH_CONFLICT, SNAPSHOT_REFRESH_CONFLICT_MESSAGE } from "~/domain/snapshot-refresh-review";
import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();
	const payload = await request.json();

	try {
		if (payload._intent === "refresh_snapshot") {
			await client.mutation(api.quotations.refreshSnapshot, {
				quotation_id: payload.quotation_id,
				expected_quotation_token: payload.expected_quotation_token,
				source_context: payload.source_context,
			});
			return NextResponse.json({ success: true, refreshed: true });
		}

		await client.mutation(api.quotations.update, { payload });
		return NextResponse.json({ success: true });
	} catch (error) {
		if (payload._intent === "refresh_snapshot" && error instanceof ConvexError && error.data && typeof error.data === "object" && "code" in error.data) {
			if (error.data.code === SNAPSHOT_REFRESH_CONFLICT) return NextResponse.json({ success: false, error: SNAPSHOT_REFRESH_CONFLICT_MESSAGE }, { status: 409 });
			if (error.data.code === "SNAPSHOT_REFRESH_UNAVAILABLE") return NextResponse.json({ success: false, error: "The saved package or flight is no longer available for refresh." }, { status: 409 });
		}
		console.error("Error in quotation.update API route:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
