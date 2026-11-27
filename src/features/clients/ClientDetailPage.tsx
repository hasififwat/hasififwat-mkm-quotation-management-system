"use client";

import { ChevronLeft, Eye, FileText, PencilIcon, Phone, Plus, User } from "lucide-react";
import Link from "next/link";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { StaffPageColumn } from "~/components/ui/list-page-layout";
import InquiryComparison from "./InquiryComparison";

type ClientQuotation = {
	id: string;
	quotation_number: string;
	status: string;
	total_amount: number;
	package_name: string;
	package_year: string | null;
	pic_name: string;
	branch: string;
	created_at: string;
	updated_at: string;
	client_name: string;
	archived: boolean;
	current_revision_id: string | null;
	inquiry_id?: Id<"inquiries">;
};

type ClientDetail = {
	id: string;
	name: string;
	phone_number?: string;
	created_at: string;
	updated_at: string;
	quotations: ClientQuotation[];
	historical_quotations: ClientQuotation[];
	total_quoted_value: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	draft:      "secondary",
	sent:       "outline",
	accepted:   "default",
	revised:    "outline",
	superseded: "secondary",
	rejected:   "destructive",
};

function formatDate(iso: string) {
	const d = new Date(iso);
	return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("ms-MY", {
		style: "currency",
		currency: "MYR",
	}).format(amount);
}

export default function ClientDetailPage({ client }: { client: ClientDetail }) {
	const totalQuotedValue = client.total_quoted_value;
	const standaloneQuotations = client.quotations.filter(quotation => !quotation.inquiry_id);

	return (
		<StaffPageColumn>
			<Button variant="ghost" size="sm" asChild className="-ml-2 gap-1 text-muted-foreground">
				<Link href="/clients">
					<ChevronLeft aria-hidden="true" className="size-4" />
					All Clients
				</Link>
			</Button>

			<section className="space-y-4" aria-label="Client summary">
				<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-12">
							<User aria-hidden="true" className="size-5 text-primary sm:size-6" />
						</div>
						<div className="min-w-0">
							<h2 className="text-xl font-bold tracking-tight wrap-anywhere md:text-2xl">{client.name}</h2>
							{client.phone_number && (
								<div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
									<Phone aria-hidden="true" className="size-3.5 shrink-0" />
									<span className="wrap-anywhere">{client.phone_number}</span>
								</div>
							)}
						</div>
					</div>
					<Button asChild className="w-full md:w-auto">
						<Link href={`/quotations/create?client_id=${client.id}`}>
							<Plus aria-hidden="true" className="size-4" />
							Create Quotation
						</Link>
					</Button>
				</div>
				<Card className="py-3 sm:py-4">
					<dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)] divide-x divide-border sm:grid-cols-3">
						<div className="grid content-between gap-1 px-2.5 sm:px-6">
							<dt className="text-xs text-muted-foreground wrap-anywhere sm:text-sm">Quotations</dt>
							<dd className="text-sm font-semibold tabular-nums sm:text-lg">{client.quotations.length}</dd>
						</div>
						<div className="grid content-between gap-1 px-2.5 sm:px-6">
							<dt className="text-xs text-muted-foreground sm:text-sm">Current Quoted Value</dt>
							<dd className="text-sm font-semibold tabular-nums wrap-anywhere sm:text-lg">{formatCurrency(totalQuotedValue)}</dd>
						</div>
						<div className="grid content-between gap-1 px-2.5 sm:px-6">
							<dt className="text-xs text-muted-foreground sm:text-sm">Client Since</dt>
							<dd className="text-sm font-semibold tabular-nums sm:text-lg">{formatDate(client.created_at)}</dd>
						</div>
					</dl>
				</Card>
			</section>

			<InquiryComparison key={client.id} clientId={client.id as Id<"clients">} />

			{(standaloneQuotations.length > 0 || client.quotations.length === 0) && <Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-border">
					<CardTitle className="text-base">
						Current Quotations
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							({standaloneQuotations.length})
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 md:p-6">
					{standaloneQuotations.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
							<p className="text-sm">No current quotations for this client.</p>
							<Button asChild size="sm" variant="outline">
								<Link href={`/quotations/create?client_id=${client.id}`}>
									Create first quotation
								</Link>
							</Button>
						</div>
					) : (
						<ol className="relative border-l border-border ml-3">
							{standaloneQuotations.map((q) => (
								<li key={q.id} className="mb-8 ml-6 last:mb-0">
									{/* Timeline dot */}
									<span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border ring-4 ring-background">
										<FileText className="h-3 w-3 text-muted-foreground" />
									</span>

									{/* Content row */}
									<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
										<div className="space-y-1">
											<p className="text-sm">
												<span className="text-muted-foreground">Quotation </span>
												<Link
													href={`/quotations/review/${q.id}`}
													className="font-semibold text-primary hover:underline font-mono"
												>
													{q.quotation_number}
												</Link>
												<span className="text-muted-foreground"> created for </span>
												<span className="font-medium">{q.package_name}</span>
												{q.package_year && (
													<span className="text-muted-foreground"> ({q.package_year})</span>
												)}
											</p>
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant={STATUS_VARIANT[q.status] ?? "secondary"} className="text-xs">
													{q.status.charAt(0).toUpperCase() + q.status.slice(1)}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatCurrency(q.total_amount)}
												</span>
												<span className="text-xs text-muted-foreground">·</span>
												<span className="text-xs text-muted-foreground">
													PIC: {q.pic_name}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<time className="text-xs text-muted-foreground whitespace-nowrap">
												{formatDate(q.created_at)}
											</time>
											<Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
												<Link href={`/quotations/review/${q.id}`} title="Preview">
													<Eye className="h-3.5 w-3.5" />
												</Link>
											</Button>
											<Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
												<Link href={`/quotations/edit/${q.id}`} title="Edit">
													<PencilIcon className="h-3.5 w-3.5" />
												</Link>
											</Button>
										</div>
									</div>
								</li>
							))}
						</ol>
					)}
				</CardContent>
			</Card>}
			<Card className="gap-5">
				<CardHeader>
					<CardTitle className="text-base leading-normal sm:text-lg">Historical and Archived Revisions ({client.historical_quotations.length})</CardTitle>
					<CardDescription>These revisions are excluded from current quoted value.</CardDescription>
				</CardHeader>
				<CardContent>
					{client.historical_quotations.length === 0 ? <p className="text-sm text-muted-foreground">No historical revisions.</p> : (
						<ul className="divide-y divide-border">
							{client.historical_quotations.map(q => (
								<li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0">
									<div className="min-w-0 space-y-1">
										<Link href={`/quotations/review/${q.id}`} className="break-words font-mono text-sm text-primary hover:underline">{q.quotation_number}</Link>
										<p className="break-words text-sm">{q.client_name} · {q.package_name}</p>
										<p className="break-words text-sm text-muted-foreground">{formatCurrency(q.total_amount)} · {formatDate(q.created_at)}{q.archived ? " · Family archived" : " · Historical revision"}</p>
									</div>
									<Button variant="outline" size="sm" asChild><Link href={`/quotations/review/${q.id}`}>View saved revision</Link></Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</StaffPageColumn>
	);
}
