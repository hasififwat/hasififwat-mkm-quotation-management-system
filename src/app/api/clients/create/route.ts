import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();

	const formData = await request.formData();
	const name = String(formData.get("name") || "").trim();
	const phone_number = String(formData.get("phone_number") || "").trim();
	const force = formData.get("force") === "true";

	if (!name) {
		return NextResponse.json(
			{ success: false, error: "Client name is required" },
			{ status: 400 },
		);
	}

	try {
		const result = await client.mutation(api.clients.create, {
			name,
			phone_number,
			force,
		});

		if (result.alreadyExists) {
			return NextResponse.json({
				success: false,
				alreadyExists: true,
				existing: result.existing,
			});
		}

		return NextResponse.json({ success: true, clientId: result.id });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create client";

		return NextResponse.json({ success: false, error: message }, { status: 500 });
	}
}
