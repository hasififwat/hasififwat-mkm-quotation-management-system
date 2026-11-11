import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
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

	if (!data._id) {
		return NextResponse.json(
			{ success: false, error: "Package id is required for update" },
			{ status: 400 },
		);
	}

	const payload = normalizePackageMutationPayload(data);

	try {
		const result = await client.mutation(api.packages.updatePackage, {
			id: data._id as Id<"packages">,
			payload,
		});
		return NextResponse.json({ success: true, packageId: result.packageId });
	} catch (error) {
		console.error("Error in packages.update API route:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
