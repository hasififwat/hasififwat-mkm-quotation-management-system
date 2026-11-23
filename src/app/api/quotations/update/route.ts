import { ConvexError } from "convex/values";
import { saveRevisionResponse } from "~/features/quotation/revision-api";
import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	let payload;
		try { payload = await request.json(); }
		catch { return NextResponse.json({success: false, error: "Invalid JSON save payload"}, {status: 400}); }
	const revision = await saveRevisionResponse(payload, "append");
	if (revision) return revision;

	try {
		const client = await getServerConvexClient();
		if (payload?._intent === "refresh_snapshot") {
			if (typeof payload.quotation_id !== "string" || !payload.quotation_id || typeof payload.expected_quotation_token !== "string" || !payload.expected_quotation_token || typeof payload.source_context !== "string" || !payload.source_context) {
				return NextResponse.json({ success: false, error: "A reviewed snapshot and saved quotation token are required" }, { status: 400 });
			}
			const result = await client.mutation(api.quotations.refreshSnapshot, {
				quotation_id: payload.quotation_id,
				expected_quotation_token: payload.expected_quotation_token,
				source_context: payload.source_context,
			});
			return NextResponse.json({
				success: true, refreshed: true,
				snapshot_refresh_token: "snapshot_refresh_token" in result ? result.snapshot_refresh_token : undefined,
			});
		}

		await client.mutation(api.quotations.update, { payload });
		return NextResponse.json({ success: true });
	} catch (error) {
		if (payload?._intent === "refresh_snapshot") {
			if (error instanceof ConvexError && error.data && typeof error.data === "object" && (error.data.code === "SNAPSHOT_REFRESH_CONFLICT" || error.data.code === "SNAPSHOT_REFRESH_UNAVAILABLE")) {
				return NextResponse.json({ success: false, code: error.data.code }, { status: 409 });
			}
			if ((error instanceof ConvexError && typeof error.data === "object" && error.data?.code === "Unauthenticated") || (error instanceof Error && /Not authenticated|"code"\s*:\s*"Unauthenticated"/i.test(error.message))) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
		}
		if (error instanceof ConvexError && error.data && typeof error.data === "object" &&
			(error.data.code === "QUOTATION_STALE_EDITOR" || error.data.code === "QUOTATION_SELECTION_CONFLICT")) {
			return NextResponse.json({ success: false, code: error.data.code, error: error.data.message }, { status: 409 });
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
