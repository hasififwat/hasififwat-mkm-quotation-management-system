import type { Doc } from "../_generated/dataModel";

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value).filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
			.map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
	}
	return JSON.stringify(value);
}

export async function quotationRefreshToken(
	quotation: Doc<"quotations">,
	items: Doc<"quotation_items">[],
): Promise<string> {
	return snapshotRefreshToken({ quotation, items: [...items].sort((a, b) => a._id < b._id ? -1 : a._id > b._id ? 1 : 0) });
}

export async function snapshotRefreshToken(value: unknown): Promise<string> {
	const content = canonical(value);
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
	return `quotation-refresh-v1:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
