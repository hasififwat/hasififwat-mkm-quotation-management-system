import { SNAPSHOT_REFRESH_CONFLICT, SNAPSHOT_REFRESH_CONFLICT_MESSAGE, type SnapshotRefreshReview } from "../../domain/snapshot-refresh-review";
export type RefreshSnapshotResult =
	| { status: "conflict"; message: string }
	| { status: "unavailable"; message: string }
	| { status: "success" }
	| { status: "failure"; message: string }
	| { status: "uncertain"; httpStatus?: number };

export type RefreshSnapshotState =
	| { status: "idle" }
	| { status: "reviewing" }
	| { status: "review"; review: SnapshotRefreshReview }
	| { status: "pending" }
	| RefreshSnapshotResult;

export async function refreshQuotationSnapshot(
	quotationId: string,
	review: Pick<SnapshotRefreshReview, "expected_quotation_token" | "source_context">,
	request: typeof fetch = fetch,
): Promise<RefreshSnapshotResult> {
	try {
		const response = await request("/api/quotations/update", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				_intent: "refresh_snapshot",
				quotation_id: quotationId,
				expected_quotation_token: review.expected_quotation_token,
				source_context: review.source_context,
			}),
		});
		if (!response.ok) {
			if (response.status === 409) {
				const body = await response.json();
				if (body?.code === SNAPSHOT_REFRESH_CONFLICT) return { status: "conflict", message: SNAPSHOT_REFRESH_CONFLICT_MESSAGE };
				if (body?.code === "SNAPSHOT_REFRESH_UNAVAILABLE") return { status: "unavailable", message: "The saved package or flight is no longer available. Your entries are kept on this page. View the saved quotation to check its selection." };
			}
			if (response.status >= 500 || response.status === 408) {
				return { status: "uncertain", httpStatus: response.status };
			}
			const nextStep = response.status === 401 || response.status === 403
				? "Check your sign-in and access before trying again."
				: "Check the saved quotation and open the snapshot review again.";
			return {
				status: "failure",
				message: `The refresh was rejected. Nothing was refreshed. Your entries are kept on this page. ${nextStep} (HTTP ${response.status})`,
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
	} catch {
		return { status: "uncertain" };
	}
	return { status: "uncertain" };
}
