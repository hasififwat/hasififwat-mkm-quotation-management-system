import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";
import { packageSchema } from "~/features/packages/schema";
import { normalizePackageMutationPayload } from "~/features/packages/utils";

export async function POST(request: NextRequest) {
	const client = await getServerConvexClient();
	const result = packageSchema.safeParse(await request.json());
	if (!result.success) {
		return NextResponse.json({ success: false, error: "Correct the invalid package fields.", issues: result.error.issues }, { status: 400 });
	}
	const data = result.data;
	const payload = normalizePackageMutationPayload(data);

	try {
		await client.mutation(api.packages.createPackage, { payload });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in packages.create API route:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
