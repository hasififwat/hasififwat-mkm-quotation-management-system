import { Loader2 } from "lucide-react";

/**
 * Instant streaming shell shown while force-dynamic server pages
 * await their Convex queries (async-suspense-boundaries).
 */
export default function Loading() {
	return (
		<div className="flex h-[60vh] items-center justify-center text-muted-foreground">
			<Loader2 className="h-5 w-5 animate-spin" aria-hidden />
		</div>
	);
}
