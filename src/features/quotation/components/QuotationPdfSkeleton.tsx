import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function QuotationPdfSkeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				"grid w-full place-items-center rounded border bg-muted/30 p-4",
				className,
			)}
		>
			<div className="flex aspect-[210/297] w-full max-w-64 flex-col justify-between gap-4 rounded-sm border bg-background px-[6%] py-[5%] shadow-sm md:max-w-[min(30rem,55vh)]">
				<Skeleton className="h-10 w-2/3" />
				<div className="space-y-2">
					<Skeleton className="h-3 w-1/2" />
					<Skeleton className="h-3 w-1/3" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="ml-auto h-4 w-1/3" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-3 w-3/4" />
					<Skeleton className="h-3 w-2/3" />
				</div>
				<Skeleton className="h-6 w-full" />
			</div>
		</div>
	);
}
