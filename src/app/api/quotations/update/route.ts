import { saveRevisionResponse } from "~/features/quotation/revision-api";
import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();
	let payload;
		try { payload = await request.json(); }
		catch { return NextResponse.json({success: false, error: "Invalid JSON save payload"}, {status: 400}); }
	const revision = await saveRevisionResponse(payload, "append");
	if (revision) return revision;

	try {
		if (payload._intent === "refresh_snapshot") {
			await client.mutation(api.quotations.refreshSnapshot, {
				quotation_id: payload.quotation_id,
			});
			return NextResponse.json({ success: true, refreshed: true });
		}

		await client.mutation(api.quotations.update, { payload });
		return NextResponse.json({ success: true });
	} catch (error) {
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
