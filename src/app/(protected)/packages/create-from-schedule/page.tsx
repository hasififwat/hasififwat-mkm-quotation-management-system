export const dynamic = "force-dynamic";

import { api } from "convex/_generated/api";
import { getServerConvexClient } from "~/lib/convex-server";
import { CreateFromScheduleClient } from "./create-from-schedule-client";
import type { IRoomDetailsApi } from "~/features/packages/schema";

function normalizeRoomTemplates(templateData: unknown): IRoomDetailsApi[] {
	if (!templateData || typeof templateData !== "object") {
		return [];
	}

	const data = templateData as { roomTemplates?: unknown };
	return Array.isArray(data.roomTemplates)
		? (data.roomTemplates as IRoomDetailsApi[])
		: [];
}

export const metadata = {
	title: "Import Package from Flight Schedule",
};

export default async function PackageCreateFromSchedulePage() {
	const client = getServerConvexClient();
	const templateData = await client.query(api.packages.getPackageTemplate, {});

	return (
		<CreateFromScheduleClient
			roomTemplates={normalizeRoomTemplates(templateData)}
		/>
	);
}
