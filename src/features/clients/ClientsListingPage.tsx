"use client";

import { PAGE_SIZE } from "convex/constants";
import type { Id } from "convex/_generated/dataModel";
import { ChevronLeft, ChevronRight, Eye, FileText, Loader2, Pencil, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { TableToolbar } from "~/components/ui/table-toolbar";
import { cn } from "~/lib/utils";
import { ClientInquiryPreview } from "./InquiryComparison";

type ClientQuotation = {
	client_name: string;
	inquiry_id?: string;
	id: string;
	quotation_number: string;
	status: string;
	total_amount: number;
	package_name: string;
	package_year: string | null;
	pic_name: string;
	created_at: string;
};

export type ClientWithStats = {
	id: string;
	name: string;
	phone_number?: string;
	created_at: string;
	quotation_count: number;
	historical_quotation_count: number;
	last_quotation_at: string | null;
	quotations: ClientQuotation[];
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active:     "secondary",
	closed:     "outline",
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
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}

const LONG_PRESS_MS = 1500;

function QuotationRow({ q }: { q: ClientQuotation }) {
	const [progress, setProgress] = useState(0);
	const [active, setActive] = useState(false);
	const rafRef = useRef<number | null>(null);
	const startRef = useRef<number | null>(null);
	const pointerRef = useRef<{ x: number; y: number } | null>(null);

	const cancel = useCallback(() => {
		if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
		startRef.current = null;
		pointerRef.current = null;
		setActive(false);
		setProgress(0);
	}, []);

	useEffect(() => () => {
		if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		startRef.current = null;
		pointerRef.current = null;
	}, []);

	const begin = useCallback(
		(e: React.PointerEvent) => {
			if (e.button > 0 || (e.target as Element).closest("a, button")) return;
			if (e.pointerType !== "touch") e.preventDefault();
			cancel();
			pointerRef.current = { x: e.clientX, y: e.clientY };
			setActive(true);
			startRef.current = performance.now();

			function tick(now: number) {
				if (startRef.current === null) return;
				const elapsed = now - startRef.current;
				const pct = Math.min((elapsed / LONG_PRESS_MS) * 100, 100);
				setProgress(pct);

				if (pct < 100) {
					rafRef.current = requestAnimationFrame(tick);
				} else {
					startRef.current = null;
					const text = [
						`Quotation: ${q.quotation_number}`,
						`Client: ${q.client_name}`,
						`Package: ${q.package_name}${q.package_year ? ` (${q.package_year})` : ""}`,
						`Status: ${q.status.charAt(0).toUpperCase() + q.status.slice(1)}`,
						`Amount: ${formatCurrency(q.total_amount)}`,
						`PIC: ${q.pic_name}`,
						`Date: ${formatDate(q.created_at)}`,
					].join("\n");

					navigator.clipboard.writeText(text)
						.then(() => toast.success("Quotation details copied to clipboard"))
						.catch(() => toast.error("Failed to copy to clipboard"))
						.finally(() => cancel());
				}
			}

			rafRef.current = requestAnimationFrame(tick);
		},
		[q, cancel],
	);

	return (
		<li
			className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border/60 py-2 last:border-0 hover:bg-muted/40 select-none @min-[32rem]:grid-cols-[minmax(0,1fr)_5rem_minmax(6.5rem,max-content)_4.25rem] @min-[32rem]:py-1.5"
			onPointerDown={begin}
			onPointerMove={(event) => {
				const origin = pointerRef.current;
				if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) cancel();
			}}
			onPointerUp={cancel}
			onPointerLeave={cancel}
			onPointerCancel={cancel}
			onContextMenu={(event) => event.preventDefault()}
		>
			{active && (
				<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/90" aria-hidden="true">
					<Loader2 className="size-4 animate-spin text-primary" />
					<span className="text-sm font-medium text-primary">Copying…</span>
					<div className="absolute bottom-0 left-0 h-0.5 bg-primary" style={{ width: `${progress}%` }} />
				</div>
			)}
			<div className="min-w-0">
				<p className="wrap-anywhere text-sm font-medium leading-snug">{q.package_name}</p>
				<div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs leading-snug">
					<Link href={`/quotations/review/${q.id}`} className="min-w-0 wrap-anywhere font-mono font-semibold text-primary hover:underline">
						{q.quotation_number}
					</Link>
					<span className="min-w-0 wrap-anywhere text-[11px] text-muted-foreground">
						{q.package_year ? `${q.package_year} · ` : ""}PIC {q.pic_name} · {formatDate(q.created_at)}
					</span>
				</div>
			</div>
			<span className="justify-self-end @min-[32rem]:col-start-3 @min-[32rem]:row-start-1 font-mono text-sm font-semibold tabular-nums whitespace-nowrap">
				{formatCurrency(q.total_amount)}
			</span>
			<Badge variant={STATUS_VARIANT[q.status] ?? "secondary"} className="text-[11px] @min-[32rem]:col-start-2 @min-[32rem]:row-start-1">
				{q.status.charAt(0).toUpperCase() + q.status.slice(1)}
			</Badge>
			<div className="flex justify-end gap-1 @min-[32rem]:col-start-4 @min-[32rem]:row-start-1 @min-[32rem]:justify-start">
				<Button variant="ghost" size="icon" asChild className="size-8">
					<Link href={`/quotations/review/${q.id}`} aria-label={`Preview quotation ${q.quotation_number}`} title="Preview quotation">
						<Eye className="size-4" />
					</Link>
				</Button>
				{(!q.inquiry_id || q.status === "active") && (
					<Button variant="ghost" size="icon" asChild className="size-8">
						<Link href={`/quotations/edit/${q.id}`} aria-label={`Edit quotation ${q.quotation_number}`} title="Edit quotation">
							<Pencil className="size-4" />
						</Link>
					</Button>
				)}
			</div>
		</li>
	);
}

export type ClientLoadStatus = "loading" | "loaded" | "failed";

interface Props {
	clients: ClientWithStats[];
	isDone: boolean;
	isFirstPage: boolean;
	continueCursor: string | null;
	searchTerm: string;
	picFilters: string[];
	allPics: string[];
	offset: number;
	total: number;
	loadStatus: ClientLoadStatus;
}

export default function ClientsListingPage({
	clients,
	isDone,
	isFirstPage,
	continueCursor,
	searchTerm,
	picFilters,
	allPics,
	offset,
	total,
	loadStatus,
}: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const navigate = (url: string) => router.push(url, { scroll: false });
	const queryString = searchParams.toString();
	const isLoading = loadStatus === "loading";

	const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
	const [expandedQuery, setExpandedQuery] = useState(queryString);
	if (expandedQuery !== queryString) {
		setExpandedQuery(queryString);
		setExpandedClientId(null);
	}
	const [agentFilterOpen, setAgentFilterOpen] = useState(false);
	const [agentSearch, setAgentSearch] = useState("");

	const [searchDraft, setSearchDraft] = useState({ searchTerm, value: searchTerm });
	const localSearch = searchDraft.searchTerm === searchTerm ? searchDraft.value : searchTerm;
	if (searchDraft.searchTerm !== searchTerm) {
		setSearchDraft({ searchTerm, value: searchTerm });
	}

	useEffect(() => {
		if (localSearch === searchTerm) return;
		const timer = setTimeout(() => {
			const params = new URLSearchParams(queryString);
			params.delete("cursor");
			params.delete("offset");
			if (localSearch.trim()) params.set("q", localSearch.trim());
			else params.delete("q");
			const qs = params.toString();
			router.push(`/clients${qs ? `?${qs}` : ""}`, { scroll: false });
		}, 400);
		return () => clearTimeout(timer);
	}, [localSearch, searchTerm, queryString, router]);

	const isFiltered = !!searchTerm || picFilters.length > 0;

	function buildUrl(params: URLSearchParams) {
		const qs = params.toString();
		return `/clients${qs ? `?${qs}` : ""}`;
	}

	function handleTogglePic(pic: string) {
		const params = new URLSearchParams(searchParams.toString());
		const current = params.getAll("pic");
		params.delete("pic");
		params.delete("cursor");
		params.delete("offset");
		const next = current.includes(pic)
			? current.filter((p) => p !== pic)
			: [...current, pic];
		next.forEach((p) => params.append("pic", p));
		navigate(buildUrl(params));
	}

	function handleClearPics() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("pic");
		params.delete("cursor");
		params.delete("offset");
		navigate(buildUrl(params));
	}

	function handleNextPage() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("cursor");
		params.delete("offset");
		if (isFiltered) {
			const next = offset + PAGE_SIZE;
			if (next < total) params.set("offset", String(next));
		} else {
			if (isDone || !continueCursor) return;
			params.set("cursor", continueCursor);
		}
		navigate(buildUrl(params));
	}

	function handlePreviousPage() {
		if (isFiltered) {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("cursor");
			const prev = Math.max(0, offset - PAGE_SIZE);
			if (prev > 0) params.set("offset", String(prev));
			else params.delete("offset");
			navigate(buildUrl(params));
		} else {
			router.back();
		}
	}

	return (
		<div className="workspace-page flex w-full min-w-0 flex-col gap-4 animate-fadeIn lg:gap-5">
			<div className="flex shrink-0 flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">
						Clients
					</h2>
					<p className="text-muted-foreground text-xs md:text-sm">
						Browse clients and their Inquiries. Open a client to view historical and archived revisions.
					</p>
				</div>
				<Button asChild className="w-full md:w-auto gap-2">
					<Link href="/clients/create">
						<UserPlus className="w-4 h-4" />
						New Client
					</Link>
				</Button>
			</div>

			<Card className="shrink-0 gap-0 overflow-hidden py-0 [&>div]:border-b-0">
				<TableToolbar
					search={{
						label: "Search clients",
						placeholder: "Name or phone number",
						value: localSearch,
						onChange: (event) => setSearchDraft({ searchTerm, value: event.target.value }),
						isLoading,
					}}
				>
					<Popover open={agentFilterOpen} onOpenChange={setAgentFilterOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className={cn(
									"gap-2 h-8 text-xs",
									picFilters.length > 0 && "border-primary text-primary",
								)}
							>
								<SlidersHorizontal className="h-3.5 w-3.5" />
								Agent
								{picFilters.length > 0 && (
									<Badge variant="secondary" className="h-4 px-1 text-[10px]">
										{picFilters.length}
									</Badge>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-56 p-0" align="start">
							<div className="flex items-center gap-2 px-3 py-2 border-b">
								<Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<input
									type="text"
									placeholder="Search agents..."
									value={agentSearch}
									onChange={(e) => setAgentSearch(e.target.value)}
									aria-label="Search agents"
									className="min-w-0 flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
								/>
							</div>
							<div className="max-h-64 overflow-y-auto py-1">
								{allPics
									.filter((pic) =>
										pic.toLowerCase().includes(agentSearch.toLowerCase()),
									)
									.map((pic) => {
										const isActive = picFilters.includes(pic);
										return (
											<label
												key={pic}
												className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 select-none"
											>
												<span>{pic}</span>
												<button
													type="button"
													role="switch"
													aria-checked={isActive}
													aria-label={`Filter by ${pic}`}
													onClick={() => handleTogglePic(pic)}
													className={cn(
														"relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
														isActive ? "bg-primary" : "bg-muted-foreground/30",
													)}
												>
													<span
														className={cn(
															"inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
															isActive ? "translate-x-4" : "translate-x-0.5",
														)}
													/>
												</button>
											</label>
										);
									})}
							</div>
							{picFilters.length > 0 && (
								<div className="border-t">
									<button
										type="button"
										onClick={handleClearPics}
										className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
									>
										Clear filter
									</button>
								</div>
							)}
						</PopoverContent>
					</Popover>
				</TableToolbar>
			</Card>

			<p role="status" className="sr-only">{isLoading ? "Loading clients…" : ""}</p>
			{loadStatus === "failed" && (
				<p role="alert" className="text-sm text-muted-foreground">Unable to load clients.</p>
			)}
			<Card className="min-w-0 gap-0 overflow-hidden py-0" role="region" aria-labelledby="client-directory-heading">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
					<h3 id="client-directory-heading" className="text-sm font-semibold">Client directory</h3>
					<span className="text-xs text-muted-foreground">{loadStatus === "loaded" ? `${total} ${total === 1 ? "client" : "clients"}` : isLoading ? "Loading…" : "Unavailable"}</span>
				</div>
				<Table aria-label="Clients" aria-busy={isLoading} className="table-fixed">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead scope="col" className="pl-11 sm:w-[52%] lg:w-[30%]">Name</TableHead>
							<TableHead scope="col" className="hidden w-[30%] sm:table-cell lg:w-[22%]">Phone</TableHead>
							<TableHead scope="col" className="w-[5.25rem] text-center whitespace-normal wrap-anywhere sm:w-[18%] lg:w-[14%]">Quotations</TableHead>
							<TableHead scope="col" className="hidden w-[17%] lg:table-cell">Last Quotation</TableHead>
							<TableHead scope="col" className="hidden w-[17%] pr-4 lg:table-cell">Client Since</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{clients.length === 0 && loadStatus === "loaded" && <TableRow className="hover:bg-transparent">
							<TableCell colSpan={5} className="whitespace-normal">
								<div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-muted-foreground">
									<Users aria-hidden="true" className="size-8 opacity-30" />
									<p>{isFiltered ? "No clients match the current filters." : "No clients yet."}</p>
								</div>
							</TableCell>
						</TableRow>}
						{clients.map((client) => {
							const isExpanded = expandedClientId === client.id;
							const detailId = `client-${client.id}-details`;
							const standaloneQuotations = isExpanded ? client.quotations.filter((quotation) => !quotation.inquiry_id) : [];
							const lastQuotation = client.last_quotation_at
								? <time dateTime={client.last_quotation_at}>{formatDate(client.last_quotation_at)}</time>
								: "—";
							return <Fragment key={client.id}>
								<TableRow className={cn(isExpanded && "bg-primary/10 hover:bg-primary/10")}>
									<TableHead scope="row" className="h-auto p-0 font-normal whitespace-normal text-foreground">
										<button type="button" aria-label={`Quotations for ${client.name}`} aria-expanded={isExpanded}
											aria-controls={detailId}
											onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
											className="flex w-full min-w-0 items-start gap-3 rounded-sm pt-4 pr-2 pb-2 pl-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:pb-4">
											<ChevronRight aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", isExpanded && "rotate-90")} />
											<span className="min-w-0 font-semibold wrap-anywhere">{client.name}</span>
										</button>
										<div className="space-y-1 pr-2 pb-4 pl-11 text-xs text-muted-foreground wrap-anywhere lg:hidden">
											<p className="sm:hidden">{client.phone_number || "No phone number"}</p>
											<p>Last quotation {lastQuotation}</p>
											<p>Client since <time dateTime={client.created_at}>{formatDate(client.created_at)}</time></p>
										</div>
									</TableHead>
									<TableCell className="hidden py-4 whitespace-normal wrap-anywhere sm:table-cell">{client.phone_number || "—"}</TableCell>
									<TableCell className="py-4 text-center tabular-nums" aria-label={`${client.quotation_count} current quotations`}>{client.quotation_count}</TableCell>
									<TableCell className="hidden py-4 lg:table-cell">{lastQuotation}</TableCell>
									<TableCell className="hidden py-4 pr-4 lg:table-cell"><time dateTime={client.created_at}>{formatDate(client.created_at)}</time></TableCell>
								</TableRow>
								{isExpanded && <TableRow id={detailId} className="bg-muted/30 hover:bg-muted/30">
									<TableCell colSpan={5} className="p-3 whitespace-normal sm:p-5">
										<ClientInquiryPreview clientId={client.id as Id<"clients">}>
											{standaloneQuotations.length > 0 ? <div>
												<p className="pb-2 text-xs text-muted-foreground">Hold down on a row to copy its details to clipboard.</p>
												<ul aria-label={`Current quotations for ${client.name}`} className="@container rounded-lg border bg-card px-3">
													{standaloneQuotations.map((q) => <QuotationRow key={q.id} q={q} />)}
												</ul>
											</div> : <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
												<FileText aria-hidden="true" className="size-8 text-muted-foreground opacity-60" />
												<p className="text-sm text-muted-foreground">No current quotations for this client.</p>
												<Button asChild size="sm" variant="outline"><Link href={`/quotations/create?client_id=${client.id}`}>Create quotation</Link></Button>
											</div>}
										</ClientInquiryPreview>
									</TableCell>
								</TableRow>}
							</Fragment>;
						})}
					</TableBody>
				</Table>
				{(!isFirstPage || !isDone) && (
					<div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
						{loadStatus === "loaded" && isFiltered && total > 0 && <span className="w-full text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>}
						<Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={isFirstPage || isLoading} className="gap-1 px-2">
							<ChevronLeft className="size-4" />Previous
						</Button>
						<Button variant="outline" size="sm" onClick={handleNextPage} disabled={isDone || loadStatus !== "loaded"} className="gap-1 px-2">
							Next<ChevronRight className="size-4" />
						</Button>
					</div>
				)}
			</Card>
		</div>
	);
}
