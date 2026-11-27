"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { TableSkeletonRows } from "~/components/loading/TableSkeletonRows";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { SeasonBadge } from "~/components/ui/season-badge";
import { Skeleton } from "~/components/ui/skeleton";
import { QUOTATION_STATUSES } from "~/domain/quotation-status";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";

type Status = typeof QUOTATION_STATUSES[number];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
	draft:      "secondary",
	active:     "secondary",
	sent:       "outline",
	accepted:   "default",
	closed:     "secondary",
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

	const total = data?.reduce((sum, p) => sum + p.total, 0);
	const usedCount = data?.filter((p) => p.total > 0).length;
	const publishedCount = data?.filter((p) => p.status === "published").length;

	return (
		<div className="workspace-page max-w-7xl space-y-4 md:space-y-6 animate-fadeIn">
			<div>
				<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">Package Usage</h2>
				<p className="text-muted-foreground text-xs md:text-sm">
					How many quotations have been created per package.
				</p>
			</div>

			<p role="status" className="sr-only">
				{data === undefined ? "Loading package usage…" : ""}
			</p>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<SummaryCard label="Total Packages" value={data?.length} />
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
						<TableBody aria-busy={data === undefined}>
								{data === undefined ? <TableSkeletonRows columns={6} /> : null}
								{data?.map((pkg) => (
								<TableRow key={pkg.id}>
									<TableCell className="font-medium max-w-48">
										<Link
											href={`/quotations?package_id=${pkg.id}`}
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
                                        <Link href={`/quotations?package_id=${pkg.id}&visibility=history`} className="block text-xs text-primary hover:underline">{pkg.historical_total} historical revisions</Link>
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
				</CardContent>
			</Card>
		</div>
	);
}

function SummaryCard({ label, value }: { label: string; value: number | undefined }) {
	return (
		<Card className="p-4 space-y-1">
			<p className="text-xs text-muted-foreground">{label}</p>
			{value === undefined ? (
				<Skeleton aria-hidden="true" className="h-8 w-14" />
			) : (
				<p className="text-2xl font-bold tabular-nums">{value}</p>
			)}
		</Card>
	);
}
