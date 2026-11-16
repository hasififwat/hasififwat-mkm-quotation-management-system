type SaveResult =
	| { ok: true; id: string }
	| { ok: false; message: string; selectionConflict?: true };

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
			if (!qid && response.status === 409) {
				const body: unknown = await response.json().catch(() => null);
				if (body && typeof body === "object" && "code" in body &&
					body.code === "QUOTATION_SELECTION_CONFLICT" && "error" in body &&
					typeof body.error === "string") {
					return { ok: false, message: body.error, selectionConflict: true };
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
