import { api } from "convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerConvexClient } from "~/lib/convex-server";
import type { IPackageDetails } from "~/features/packages/schema";
import { normalizePackageMutationPayload } from "~/features/packages/utils";

export async function POST(request: NextRequest) {
	const client = getServerConvexClient();
	const data = (await request.json()) as IPackageDetails;
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
