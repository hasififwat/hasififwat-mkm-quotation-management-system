import { Badge } from "@/components/ui/badge";

const SEASON_BADGE_CLASSES = [
	"bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300",
	"bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300",
	"bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-400/40 dark:text-fuchsia-300",
	"bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300",
	"bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300",
];

export function getSeasonBadgeClass(season?: string) {
	if (!season) {
		return SEASON_BADGE_CLASSES[0];
	}

	const normalized = season.trim().toUpperCase();
	let hash = 0;
	for (const char of normalized) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	return SEASON_BADGE_CLASSES[hash % SEASON_BADGE_CLASSES.length];
}

export function SeasonBadge({ season }: { season?: string }) {
	if (!season?.trim()) {
		return <span className="text-muted-foreground text-xs">N/A</span>;
	}

	return (
		<Badge
			variant="outline"
			className={`h-4 px-1.5 text-[10px] leading-none ${getSeasonBadgeClass(season)}`}
		>
			{season}
		</Badge>
	);
}
