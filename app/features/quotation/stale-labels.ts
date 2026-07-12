export const STALE_FIELD_LABELS: Record<string, string> = {
	"package.name":       "package name",
	"package.year":       "package year",
	"package.duration":   "duration",
	"package.transport":  "transport",
	"package.inclusions": "inclusions",
	"package.exclusions": "exclusions",
	"package.code":       "package code",
	"room_pricing":       "room pricing",
	"hotels":             "hotel details",
	"flight":             "flight schedule",
	"flight.removed":     "flight no longer exists",
};

export function formatStaleFields(staleFields: string[]): string {
	return staleFields.map((f) => STALE_FIELD_LABELS[f] ?? f).join(", ");
}
