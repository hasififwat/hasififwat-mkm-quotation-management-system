export const STALE_FIELD_LABELS: Record<string, string> = {
	"snapshot.incomplete": "saved snapshot incomplete (verification required)",
	"package.removed": "package no longer exists",
	"package.name":       "package name",
	"package.year":       "package year",
	"package.duration":   "duration",
	"package.transport":  "transport",
	"package.inclusions": "inclusions",
	"package.exclusions": "exclusions",
	"package.code":       "package code",
	"room_pricing":       "room prices or availability",
	"hotels":             "hotel details",
	"flight":             "flight details",
	"flight.removed":     "flight no longer exists",
};

export function formatStaleFields(staleFields: string[]): string {
	return staleFields.map((f) => STALE_FIELD_LABELS[f] ?? f).join(", ");
}
