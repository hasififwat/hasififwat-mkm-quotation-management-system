import { saveRevisionResponse } from "~/features/quotation/revision-api";
import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ConvexError } from "convex/values";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();

	try {
		let payload;
		try { payload = await request.json(); }
		catch { return NextResponse.json({success: false, error: "Invalid JSON save payload"}, {status: 400}); }
		const revision = await saveRevisionResponse(payload, "create");
		if (revision) return revision;

		const quotation = await client.mutation(api.quotations.create, { payload });

		return NextResponse.json({ success: true, id: quotation.id });
	} catch (error) {
		if (error instanceof Error && error.message.includes("Quotation writes are frozen for family migration")) {
			return NextResponse.json({ error: "Quotation saves are unavailable during revision maintenance." }, { status: 409 });
		}
		if (error instanceof ConvexError && error.data && typeof error.data === "object" &&
			(error.data.code === "QUOTATION_SELECTION_CONFLICT" || error.data.code === "QUOTATION_ATTEMPT_CONFLICT")) {
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
