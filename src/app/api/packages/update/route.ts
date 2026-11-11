import { isPackageEditConflict, PACKAGE_EDIT_CONFLICT_MESSAGE } from "~/domain/package-edit-conflict";
import { ConvexError } from "convex/values";
import { isPackageReferenceConflict } from "~/domain/package-reference-conflict";
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

	if (!data.editToken) {
		return NextResponse.json({ success: false, code: "PACKAGE_EDIT_CONFLICT", message: PACKAGE_EDIT_CONFLICT_MESSAGE }, { status: 409 });
	}

	const payload = normalizePackageMutationPayload(data);

	try {
		const result = await client.mutation(api.packages.updatePackage, {
			id: data._id as Id<"packages">,
			expectedEditToken: data.editToken,
			payload,
		});
		return NextResponse.json({ success: true, packageId: result.packageId });
	} catch (error) {
		if (error instanceof ConvexError && isPackageEditConflict(error.data)) {
			return NextResponse.json({ success: false, ...error.data }, { status: 409 });
		}

		if (error instanceof ConvexError && isPackageReferenceConflict(error.data)) {
			return NextResponse.json({ success: false, ...error.data }, { status: 400 });
		}

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
