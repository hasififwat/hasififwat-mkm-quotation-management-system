export type RefreshSnapshotResult =
	| { status: "success" }
	| { status: "failure"; message: string }
	| { status: "uncertain"; message: string };

export type RefreshSnapshotState =
	| { status: "idle" }
	| { status: "pending" }
	| RefreshSnapshotResult;

const uncertainRefresh =
	"We could not confirm whether the snapshot was refreshed. Your entries are kept on this page. Check the saved quotation before refreshing again.";

export async function refreshQuotationSnapshot(
	quotationId: string,
	request: typeof fetch = fetch,
): Promise<RefreshSnapshotResult> {
	try {
		const response = await request("/api/quotations/update", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				_intent: "refresh_snapshot",
				quotation_id: quotationId,
			}),
		});
		if (!response.ok) {
			return response.status >= 500
				? {
					status: "uncertain",
					message: `The server reported a problem (HTTP ${response.status}). ${uncertainRefresh}`,
				}
				: {
					status: "failure",
					message: `Refresh was rejected (HTTP ${response.status}). Your entries are kept on this page. Check your sign-in before trying again.`,
				};
		}
		const body: unknown = await response.json();
		if (
			body !== null && typeof body === "object" &&
			"success" in body && body.success === true &&
			"refreshed" in body && body.refreshed === true
		) {
			return { status: "success" };
		}
		return { status: "uncertain", message: uncertainRefresh };
	} catch {
		return { status: "uncertain", message: uncertainRefresh };
	}
}
