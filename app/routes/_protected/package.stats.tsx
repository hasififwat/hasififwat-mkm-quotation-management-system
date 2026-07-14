import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { SeasonBadge } from "~/components/ui/season-badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";

export function meta() {
	return [{ title: "Package Stats - MKM Quotation" }];
}

const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "revised", "superseded"] as const;
type Status = typeof QUOTATION_STATUSES[number];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
	draft:      "secondary",
	sent:       "outline",
	accepted:   "default",
	rejected:   "destructive",
	revised:    "outline",
	superseded: "secondary",
};

function StatusPill({ count, status }: { count: number; status: Status }) {
	if (count === 0) return null;
	const label = status.charAt(0).toUpperCase() + status.slice(1);
	return (
		<Badge variant={STATUS_VARIANT[status]}>
			{count} {label}
		</Badge>
	);
}

function PublishedBadge({ status }: { status: string }) {
	const isPublished = status === "published";
	return (
		<Badge variant="outline" className="gap-1">
			<span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isPublished ? "bg-emerald-500" : "bg-red-500"}`} />
			{isPublished ? "Published" : "Unpublished"}
		</Badge>
	);
}

export default function PackageStatsPage() {
	const data = useQuery(api.packages.listWithQuotationCounts);

	const total = data?.reduce((sum, p) => sum + p.total, 0) ?? 0;
	const usedCount = data?.filter((p) => p.total > 0).length ?? 0;
	const publishedCount = data?.filter((p) => p.status === "published").length ?? 0;

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div>
				<h2 className="text-xl md:text-2xl font-bold tracking-tight">Package Usage</h2>
				<p className="text-muted-foreground text-xs md:text-sm">
					How many quotations have been created per package.
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<SummaryCard label="Total Packages" value={data?.length ?? "—"} />
				<SummaryCard label="Published" value={publishedCount} />
				<SummaryCard label="Total Quotations" value={total} />
				<SummaryCard label="With Quotations" value={usedCount} />
			</div>

			<Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b">
					<p className="text-sm font-medium">
						All packages — sorted by quotation count
					</p>
				</CardHeader>
				<CardContent className="p-0">
					{data === undefined ? (
						<div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Package</TableHead>
									<TableHead>Year</TableHead>
									<TableHead>Season</TableHead>
									<TableHead>Published</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead>By Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.map((pkg) => (
									<TableRow key={pkg.id}>
										<TableCell className="font-medium max-w-48">
											<Link
												to={`/quotations?package_id=${pkg.id}`}
												className="hover:underline hover:text-primary line-clamp-2"
											>
												{pkg.name}
											</Link>
										</TableCell>
										<TableCell className="text-muted-foreground text-xs whitespace-nowrap">
											{pkg.year}
										</TableCell>
										<TableCell>
											<SeasonBadge season={pkg.season ?? undefined} />
										</TableCell>
										<TableCell>
											<PublishedBadge status={pkg.status} />
										</TableCell>
										<TableCell className="text-right">
											<span className={`font-semibold tabular-nums ${pkg.total === 0 ? "text-muted-foreground" : ""}`}>
												{pkg.total}
											</span>
										</TableCell>
										<TableCell>
											{pkg.total === 0 ? (
												<span className="text-xs text-muted-foreground">No quotations yet</span>
											) : (
												<div className="flex flex-wrap gap-1">
													{QUOTATION_STATUSES.map((s) => (
														<StatusPill key={s} count={pkg.by_status[s]} status={s} />
													))}
												</div>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
	return (
		<Card className="p-4 space-y-1">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
		</Card>
	);
}
