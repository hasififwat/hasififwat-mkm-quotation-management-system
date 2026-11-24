"use client";

import { PAGE_SIZE } from "convex/constants";
import { ChevronLeft, ChevronRight, Eye, FileText, Loader2, Pencil, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { TableToolbar } from "~/components/ui/table-toolbar";
import { cn } from "~/lib/utils";

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

	const [selectedId, setSelectedId] = useState<string | null>(null);
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

	const selectedClient = clients.find((client) => client.id === selectedId) ?? clients[0];
	const hasCurrentQuotations = (selectedClient?.quotations.length ?? 0) > 0;
	if (selectedId !== null && selectedId !== selectedClient?.id) {
		setSelectedId(selectedClient?.id ?? null);
	}

	return (
		<div className="workspace-page flex max-w-7xl flex-col gap-4 animate-fadeIn lg:h-[calc(100dvh-6rem)] lg:gap-5">
			<div className="flex shrink-0 flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">
						Clients
					</h2>
					<p className="text-muted-foreground text-xs md:text-sm">
						Manage clients and current quotations. Open a client to view historical and archived revisions.
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
			<div className="grid min-h-0 gap-4 lg:flex-1 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.6fr)]">
				<Card className="min-h-0 min-w-0 gap-0 overflow-hidden py-0" role="region" aria-labelledby="client-directory-heading">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
						<h3 id="client-directory-heading" className="text-sm font-semibold">Client directory</h3>
						<span className="text-xs text-muted-foreground">{loadStatus === "loaded" ? `${total} ${total === 1 ? "client" : "clients"}` : isLoading ? "Loading…" : "Unavailable"}</span>
					</div>
					<div key={clients.map((client) => client.id).join(",")}
						className="max-h-64 min-h-0 overflow-y-auto overscroll-contain p-1 [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin] [scrollbar-gutter:stable] lg:max-h-none lg:flex-1" aria-busy={isLoading}>
						{clients.length === 0 && loadStatus === "loaded" ? (
							<div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-muted-foreground">
								<Users className="size-8 opacity-30" />
								<p className="text-sm">{isFiltered ? "No clients match the current filters." : "No clients yet."}</p>
							</div>
						) : (
							<ul aria-label="Clients">
								{clients.map((client) => (
									<li key={client.id} className="border-b border-border/60 last:border-0">
										<button
											type="button"
											onClick={() => setSelectedId(client.id)}
											aria-pressed={selectedClient?.id === client.id}
											aria-controls="selected-client-details"
											className={cn("flex w-full items-start gap-3 rounded-md border-l-3 border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:-outline-offset-2", selectedClient?.id === client.id && "border-l-primary bg-muted")}
										>
											<span className="min-w-0 flex-1">
												<span className="block wrap-anywhere text-sm font-medium">{client.name}</span>
												<time dateTime={client.last_quotation_at ?? client.created_at} className="block text-xs text-muted-foreground">
													{formatDate(client.last_quotation_at ?? client.created_at)}
												</time>
											</span>
											<Badge variant="secondary" className="mt-0.5" aria-label={`${client.quotation_count} current quotations`}>{client.quotation_count}</Badge>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
					{(!isFirstPage || !isDone) && (
						<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t p-3">
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

				<Card id="selected-client-details" role="region" aria-labelledby="selected-client-heading" className="min-h-0 min-w-0 scroll-mt-20 gap-0 overflow-hidden py-0">
					{selectedClient ? (
						<>
							<div className="shrink-0 space-y-2 px-4 pt-4">
								<h3 id="selected-client-heading" className="wrap-anywhere text-lg font-bold tracking-tight">{selectedClient.name}</h3>
								<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-3 text-xs">
									<p className="wrap-anywhere text-muted-foreground">Client since {formatDate(selectedClient.created_at)}{selectedClient.phone_number ? ` · ${selectedClient.phone_number}` : ""}</p>
									<Link href={`/clients/${selectedClient.id}`} className="text-primary hover:underline">View client and history ({selectedClient.historical_quotation_count})</Link>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<h4 className="text-sm font-semibold">Current quotations</h4>
									<Badge variant="secondary">{selectedClient.quotation_count}</Badge>
								</div>
								{hasCurrentQuotations && <p className="pb-2 text-[11px] text-muted-foreground">Hold down on a row to copy its details to clipboard.</p>}
							</div>
							<div
								key={selectedClient.id}
								className={cn(
									"@container min-h-0 px-4 pb-3 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-color:var(--muted-foreground)_transparent] lg:[scrollbar-width:thin] lg:[scrollbar-gutter:stable]",
									!hasCurrentQuotations && "grid place-items-center",
								)}
							>
								{!hasCurrentQuotations ? (
									<div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
										<FileText aria-hidden="true" className="size-8 text-muted-foreground opacity-60" />
										<p className="text-sm text-muted-foreground">No current quotations for this client.</p>
										<Button asChild size="sm" variant="outline"><Link href={`/quotations/create?client_id=${selectedClient.id}`}>Create quotation</Link></Button>
									</div>
								) : (
									<ul aria-label={`Current quotations for ${selectedClient.name}`}>
										{selectedClient.quotations.map((q) => <QuotationRow key={q.id} q={q} />)}
									</ul>
								)}
							</div>
						</>
					) : (
						<div className="px-4 py-10 text-sm text-muted-foreground">
							<h3 id="selected-client-heading" className="font-medium">{isLoading ? "Loading client details…" : "Select a client to view quotations."}</h3>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
