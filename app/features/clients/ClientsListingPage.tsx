import { PAGE_SIZE } from "convex/constants";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useNavigation } from "react-router";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

type ClientQuotation = {
	id: string;
	quotation_number: string;
	status: string;
	total_amount: number;
	package_name: string;
	package_year: string | null;
	pic_name: string;
	created_at: string;
};

type ClientWithStats = {
	id: string;
	name: string;
	phone_number?: string;
	created_at: string;
	quotation_count: number;
	last_quotation_at: string | null;
	quotations: ClientQuotation[];
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
		maximumFractionDigits: 0,
	}).format(amount);
}

const LONG_PRESS_MS = 1500;

function QuotationRow({ q, clientName }: { q: ClientQuotation; clientName: string }) {
	const [progress, setProgress] = useState(0);
	const [active, setActive] = useState(false);
	const rafRef = useRef<number | null>(null);
	const startRef = useRef<number | null>(null);

	const cancel = useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
		startRef.current = null;
		setActive(false);
		setProgress(0);
	}, []);

	const begin = useCallback(
		(e: React.PointerEvent) => {
			if ((e.target as Element).closest("a, button")) return;
			e.preventDefault();
			setActive(true);
			startRef.current = performance.now();

			function tick(now: number) {
				const elapsed = now - (startRef.current ?? now);
				const pct = Math.min((elapsed / LONG_PRESS_MS) * 100, 100);
				setProgress(pct);

				if (pct < 100) {
					rafRef.current = requestAnimationFrame(tick);
				} else {
					const text = [
						`Quotation: ${q.quotation_number}`,
						`Client: ${clientName}`,
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
		[q, clientName, cancel],
	);

	return (
		<tr
			className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors select-none"
			style={{ position: "relative" }}
			onPointerDown={begin}
			onPointerUp={active ? cancel : undefined}
			onPointerLeave={active ? cancel : undefined}
			onPointerCancel={cancel}
			onContextMenu={(e) => e.preventDefault()}
		>
			{active && (
				<td
					colSpan={7}
					style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
				>
					<div className="absolute inset-0 bg-background/75 backdrop-blur-[1px] flex items-center justify-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<span className="text-sm font-medium text-primary">Copying…</span>
					</div>
					<div
						className="absolute bottom-0 left-0 h-0.5 bg-primary"
						style={{ width: `${progress}%`, transition: "width 16ms linear" }}
					/>
				</td>
			)}

			<td className="py-2 pr-4">
				<Link
					to={`/quotations/review/${q.id}`}
					className="font-mono font-semibold text-primary hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{q.quotation_number}
				</Link>
			</td>
			<td className="py-2 pr-4">
				<span className="font-medium">{q.package_name}</span>
				{q.package_year && (
					<span className="text-muted-foreground ml-1">({q.package_year})</span>
				)}
			</td>
			<td className="py-2 pr-4 text-muted-foreground">{q.pic_name}</td>
			<td className="py-2 pr-4">
				<Badge variant={STATUS_VARIANT[q.status] ?? "secondary"} className="text-xs">
					{q.status.charAt(0).toUpperCase() + q.status.slice(1)}
				</Badge>
			</td>
			<td className="py-2 pr-4 text-right font-mono">
				{formatCurrency(q.total_amount)}
			</td>
			<td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
				{formatDate(q.created_at)}
			</td>
			<td className="py-2">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						asChild
						className="h-7 px-2 text-xs"
						onClick={(e) => e.stopPropagation()}
					>
						<Link to={`/quotations/review/${q.id}`}>Preview</Link>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						asChild
						className="h-7 px-2 text-xs"
						onClick={(e) => e.stopPropagation()}
					>
						<Link to={`/quotations/edit/${q.id}`}>Edit</Link>
					</Button>
				</div>
			</td>
		</tr>
	);
}

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
}: Props) {
	const navigate = useNavigate();
	const navigation = useNavigation();
	const location = useLocation();
	const isLoading = navigation.state !== "idle";

	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [agentFilterOpen, setAgentFilterOpen] = useState(false);
	const [agentSearch, setAgentSearch] = useState("");

	// Local search state — kept independent of loaderData during navigation
	// to prevent letters disappearing while the clientLoader is in-flight.
	const [localSearch, setLocalSearch] = useState(searchTerm);

	// Sync from URL only when idle (back/forward navigation, not during active typing)
	useEffect(() => {
		if (navigation.state === "idle") {
			setLocalSearch(searchTerm);
		}
	}, [searchTerm, navigation.state]);

	// Debounce-navigate when the user types
	useEffect(() => {
		if (localSearch === searchTerm) return;
		const timer = setTimeout(() => {
			const params = new URLSearchParams(location.search);
			params.delete("cursor");
			params.delete("offset");
			if (localSearch.trim()) params.set("q", localSearch.trim());
			else params.delete("q");
			const qs = params.toString();
			navigate(`/clients${qs ? `?${qs}` : ""}`);
		}, 400);
		return () => clearTimeout(timer);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localSearch]);

	const isFiltered = !!searchTerm || picFilters.length > 0;

	function buildUrl(params: URLSearchParams) {
		const qs = params.toString();
		return `/clients${qs ? `?${qs}` : ""}`;
	}

	function handleTogglePic(pic: string) {
		const params = new URLSearchParams(location.search);
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
		const params = new URLSearchParams(location.search);
		params.delete("pic");
		params.delete("cursor");
		params.delete("offset");
		navigate(buildUrl(params));
	}

	function handleNextPage() {
		const params = new URLSearchParams(location.search);
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
			const params = new URLSearchParams(location.search);
			params.delete("cursor");
			const prev = Math.max(0, offset - PAGE_SIZE);
			if (prev > 0) params.set("offset", String(prev));
			else params.delete("offset");
			navigate(buildUrl(params));
		} else {
			navigate(-1);
		}
	}

	function toggle(id: string) {
		setExpandedId((prev) => (prev === id ? null : id));
	}

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">
						Clients
					</h2>
					<p className="text-slate-500 text-xs md:text-sm">
						Manage and view all registered clients. Expand a row to see their full quotation history.
					</p>
				</div>
				<Button asChild className="w-full md:w-auto gap-2">
					<Link to="/clients/create">
						<UserPlus className="w-4 h-4" />
						New Client
					</Link>
				</Button>
			</div>

			<Card className="overflow-hidden">
				<div className="p-4 border-b border-slate-100 space-y-2">
					{/* Agent filter */}
					<div className="flex items-center gap-2">
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
										className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
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
					</div>

					{/* Search */}
					<div className="relative">
						{isLoading ? (
							<Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
						) : (
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						)}
						<input
							type="text"
							placeholder="Search by name or phone number..."
							value={localSearch}
							onChange={(e) => setLocalSearch(e.target.value)}
							className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
				</div>

				<CardContent className="p-0">
					{clients.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
							<Users className="h-8 w-8 opacity-30" />
							<p className="text-sm">
								{isFiltered
									? "No clients match the current filters."
									: "No clients yet."}
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table className="min-w-full">
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead className="text-right">Quotations</TableHead>
										<TableHead>Last Quotation</TableHead>
										<TableHead>Client Since</TableHead>
										<TableHead className="w-10" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{clients.map((client) => {
										const isOpen = expandedId === client.id;
										return (
											<Fragment key={client.id}>
												<TableRow
													className={cn(
														"hover:bg-muted/40 cursor-pointer",
														isOpen && "bg-muted/30",
													)}
													onClick={() => toggle(client.id)}
												>
													<TableCell className="font-medium">
														{client.name}
													</TableCell>
													<TableCell className="text-muted-foreground text-sm">
														{client.phone_number || "—"}
													</TableCell>
													<TableCell className="text-right">
														<Badge variant="secondary">{client.quotation_count}</Badge>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{client.last_quotation_at
															? formatDate(client.last_quotation_at)
															: "—"}
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{formatDate(client.created_at)}
													</TableCell>
													<TableCell onClick={(e) => e.stopPropagation()}>
														<button
															type="button"
															onClick={() => toggle(client.id)}
															className="flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors"
															aria-label={isOpen ? "Collapse" : "Expand"}
														>
															<ChevronDown
																className={cn(
																	"h-4 w-4 text-muted-foreground transition-transform duration-200",
																	isOpen && "rotate-180",
																)}
															/>
														</button>
													</TableCell>
												</TableRow>

												{isOpen && (
													<TableRow className="hover:bg-transparent">
														<TableCell colSpan={6} className="p-0 border-b-0">
															<div className="border-l-4 border-primary/40 bg-muted/20 px-6 py-4">
																{client.quotations.length === 0 ? (
																	<div className="flex items-center justify-between py-2">
																		<p className="text-sm text-muted-foreground">
																			No quotations yet.
																		</p>
																		<Button asChild size="sm" variant="outline">
																			<Link to={`/quotations/create?client_id=${client.id}`}>
																				Create quotation
																			</Link>
																		</Button>
																	</div>
																) : (
																	<>
																		<p className="text-xs text-muted-foreground mb-3">
																			Hold down on a row to copy its details to clipboard.
																		</p>
																		<table className="w-full text-sm">
																			<thead>
																				<tr className="text-xs text-muted-foreground border-b border-border/50">
																					<th className="text-left font-medium pb-2 pr-4">Quotation</th>
																					<th className="text-left font-medium pb-2 pr-4">Package</th>
																					<th className="text-left font-medium pb-2 pr-4">PIC</th>
																					<th className="text-left font-medium pb-2 pr-4">Status</th>
																					<th className="text-right font-medium pb-2 pr-4">Amount</th>
																					<th className="text-left font-medium pb-2 pr-4">Date</th>
																					<th className="w-24 pb-2" />
																				</tr>
																			</thead>
																			<tbody>
																				{client.quotations.map((q) => (
																					<QuotationRow
																						key={q.id}
																						q={q}
																						clientName={client.name}
																					/>
																				))}
																			</tbody>
																		</table>
																	</>
																)}
															</div>
														</TableCell>
													</TableRow>
												)}
											</Fragment>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}

					{/* Pagination */}
					{(!isFirstPage || !isDone) && (
						<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100">
							{isFiltered && total > 0 && (
								<span className="text-xs text-muted-foreground mr-auto">
									Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
								</span>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={handlePreviousPage}
								disabled={isFirstPage || isLoading}
								className="gap-1"
							>
								<ChevronLeft className="h-4 w-4" />
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleNextPage}
								disabled={isDone || isLoading}
								className="gap-1"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
