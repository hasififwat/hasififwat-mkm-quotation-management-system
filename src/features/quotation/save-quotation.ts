export type QuotationCreateAttempt = { requestKey: string };

type SaveResult =
	| { ok: true; id: string }
	| { ok: false; message: string; selectionConflict?: true; staleEditor?: true };

const uncertainSave =
	"We could not confirm whether your quotation was saved. Your entries are kept on this page. Check Quotations for the saved record before saving again to avoid a duplicate.";

export async function saveQuotation(
	payload: object,
	qid?: string,
	request: typeof fetch = fetch,
): Promise<SaveResult> {
	try {
		const response = await request(
			qid ? "/api/quotations/update" : "/api/quotations/create",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);
		if (!response.ok) {
			if (response.status === 409) {
				const body: unknown = await response.json().catch(() => null);
				if (body && typeof body === "object" && "code" in body && "error" in body && typeof body.error === "string") {
					if (body.code === "QUOTATION_SELECTION_CONFLICT") return { ok: false, message: body.error, selectionConflict: true };
					if (qid && body.code === "QUOTATION_STALE_EDITOR") return { ok: false, message: body.error, staleEditor: true };
					if (!qid && body.code === "QUOTATION_ATTEMPT_CONFLICT") return { ok: false, message: body.error };
				}
			}
			return {
				ok: false,
				message: response.status >= 500
					? `The server reported a problem (HTTP ${response.status}). ${uncertainSave}`
					: `Save was rejected (HTTP ${response.status}). Your entries are kept on this page. Check your sign-in and selected client, package, and flight before trying again.`,
			};
		}
		if (qid) return { ok: true, id: qid };
		const body: unknown = await response.json();
		if (
			body !== null && typeof body === "object" &&
			"id" in body && typeof body.id === "string" && body.id.trim()
		) {
			return { ok: true, id: body.id };
		}
		return { ok: false, message: uncertainSave };
	} catch {
		return { ok: false, message: uncertainSave };
	}
}

export type RevisionSaveResult =
	| { kind: "saved"; id: string; reference: string }
	| { kind: "rejected"; message: string; conflict?: "stale" | "selection" | "inquiry"; reauthenticate?: true }
	| { kind: "uncertain"; message: string };

export async function saveRevisionAttempt(
	attempt: import("./revision-command").RevisionAttempt,
	request: typeof fetch = fetch,
): Promise<RevisionSaveResult> {
	const uncertain = "We could not confirm this save. Your entries are kept on this page. Retry this save to recover its original revision without creating a duplicate.";
	try {
		const response = await request(attempt.operation === "append" ? "/api/quotations/update" : "/api/quotations/create", {
			method: "POST", headers: {"Content-Type": "application/json"}, body: attempt.body,
		});
		if (response.status >= 500) return {kind: "uncertain", message: uncertain};
		const body: unknown = await response.json().catch(() => null);
		if (!response.ok) {
			const code = body && typeof body === "object" && "code" in body ? body.code : null;
			return {kind: "rejected", message: response.status === 401
				? "Your session expired. Your entries are kept on this page. Sign in in another tab, then save again."
				: code === "QUOTATION_STALE_EDITOR" ? "A newer revision exists. Your entries are kept on this page and were not saved. View the current revision before reconciling your draft."
				: code === "QUOTATION_SELECTION_CONFLICT" ? "The catalog selection changed. Your entries are kept on this page and were not saved. Review the latest package before replacing the selection."
				: code === "INQUIRY_DESTINATION_CHANGED" ? "The Inquiry destination changed. Your draft is kept. Review the destination before saving."
				: code === "INQUIRY_CYCLE_CHANGED" ? "The Inquiry reopened. Your draft is kept. Review the current saved revision before editing again."
				: code === "INQUIRY_OPTION_READ_ONLY" || code === "INQUIRY_NOT_OPEN" ? "This Inquiry option is now read-only. Your draft is kept."
				: code === "INQUIRY_CLIENT_LOCKED" ? "Close this option and create a quotation for the correct client. Your draft is kept."
				: code === "QUOTATION_ACTOR_CONFLICT" ? "Your sign-in account changed. Your entries are kept on this page. Sign in as the original editor before retrying."
				: "Save was rejected. Your entries are kept on this page. Review the entered details before saving again.",
				...(response.status === 401 || code === "QUOTATION_ACTOR_CONFLICT" ? {reauthenticate: true as const} : {}),
				...(code === "QUOTATION_STALE_EDITOR" || code === "INQUIRY_CYCLE_CHANGED" ? {conflict: "stale" as const}
					: code === "QUOTATION_SELECTION_CONFLICT" ? {conflict: "selection" as const}
					: code === "INQUIRY_DESTINATION_CHANGED" ? {conflict: "inquiry" as const} : {})};
		}
		if (body && typeof body === "object" && "id" in body && typeof body.id === "string" && body.id.trim() &&
			"quotation_number" in body && typeof body.quotation_number === "string" && body.quotation_number.trim()) {
			return {kind: "saved", id: body.id, reference: body.quotation_number};
		}
		return {kind: "uncertain", message: uncertain};
	} catch { return {kind: "uncertain", message: uncertain}; }
}
