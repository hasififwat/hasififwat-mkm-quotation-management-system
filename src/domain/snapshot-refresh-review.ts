export const SNAPSHOT_REFRESH_CONFLICT = "SNAPSHOT_REFRESH_CONFLICT";
export const SNAPSHOT_REFRESH_CONFLICT_MESSAGE = "The saved quotation or package changed after you loaded or reviewed it. Nothing was refreshed. Your entries are kept on this page. Review the latest saved quotation before confirming again.";

export type SnapshotRefreshReview = {
	quotation_id: string;
	expected_quotation_token: string;
	source_context: string;
	saved_package: string;
	saved_flight: string;
	current_package: string;
	current_flight: string;
	changes: Array<{ label: string; saved: string; current: string }>;
};
