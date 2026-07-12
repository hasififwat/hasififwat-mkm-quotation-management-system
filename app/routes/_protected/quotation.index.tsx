import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { PAGE_SIZE } from "convex/constants";
import { Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useNavigation } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { COLUMN_LABELS } from "~/features/quotation/components/QuotationTable/columns";
import QuotationListing from "~/features/quotation/QuotationListing";
import { useDebouncedSearch } from "~/hooks/useDebounce";
import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/quotation.index";

export function meta() {
	return [
		{ title: "Quotations" },
		{ name: "description", content: "Manage Umrah Quotations" },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw redirect("/", { headers });
	return { convexUrl: process.env.CONVEX_URL! };
}

export async function clientLoader({
	request,
	serverLoader,
}: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();
	const convexUrl = (serverData as { convexUrl: string }).convexUrl;
	const client = new ConvexHttpClient(convexUrl);

	const url = new URL(request.url);
	const searchTerm = url.searchParams.get("q")?.toLowerCase() || "";
	const sort = (url.searchParams.get("sort") ?? "updated_at") as
		| "updated_at"
		| "created_at";
	const dir = (url.searchParams.get("dir") ?? "desc") as "asc" | "desc";
	// Cursor is stored directly in the URL — absence means first page (null).
	const cursor: string | null = url.searchParams.get("cursor");
	// Offset used only for search result pagination.
	const offsetParam = Number.parseInt(
		url.searchParams.get("offset") ?? "0",
		10,
	);
	const offset = Number.isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

	// When searching, fetch all, filter, sort, then slice by PAGE_SIZE.
	if (searchTerm) {
		const all = await client.query(api.quotations.list, {});
		const filtered = all.filter((q) => {
			const packageName = q.package?.name?.toLowerCase() ?? "";
			const clientName = q.client_name?.toLowerCase() ?? "";
			return (
				packageName.includes(searchTerm) || clientName.includes(searchTerm)
			);
		});
		const isDesc = (url.searchParams.get("dir") ?? "desc") === "desc";
		const sortCol = url.searchParams.get("sort") ?? "updated_at";
		const sorted = [...filtered].sort((a, b) => {
			const aVal = String((a as Record<string, unknown>)[sortCol] ?? "");
			const bVal = String((b as Record<string, unknown>)[sortCol] ?? "");
			const cmp = aVal.localeCompare(bVal);
			return isDesc ? -cmp : cmp;
		});
		const quotations = sorted.slice(offset, offset + PAGE_SIZE);
		return {
			quotations,
			continueCursor: null as string | null,
			isDone: offset + PAGE_SIZE >= sorted.length,
			cursor: null as string | null,
			searchTerm,
			sort,
			dir,
			searchOffset: offset,
			searchTotal: sorted.length,
		};
	}

	const result = await client.query(api.quotations.listPaginated, {
		paginationOpts: { cursor, numItems: PAGE_SIZE },
		sortBy: sort,
		sortDir: dir,
	});

	return {
		quotations: result.page,
		continueCursor: result.isDone ? null : (result.continueCursor ?? null),
		isDone: result.isDone,
		cursor,
		searchTerm,
		sort,
		dir,
		searchOffset: 0,
		searchTotal: 0,
	};
}
clientLoader.hydrate = true as const;

export default function QuotationListingPage({
	loaderData,
}: Route.ComponentProps) {
	const {
		quotations,
		continueCursor,
		isDone,
		cursor,
		searchTerm,
		sort,
		dir,
		searchOffset,
		searchTotal,
	} = loaderData as {
		quotations: unknown[] | undefined;
		continueCursor: string | null;
		isDone: boolean;
		cursor: string | null;
		searchTerm: string;
		sort: string | undefined;
		dir: string | undefined;
		searchOffset: number;
		searchTotal: number;
	};
	const safeSort = (sort ?? "updated_at") as "updated_at" | "created_at";
	const safeDir = (dir ?? "desc") as "asc" | "desc";
	const isSearching = !!searchTerm;
	const isFirstPage = isSearching ? (searchOffset ?? 0) === 0 : !cursor;
	const navigate = useNavigate();
	const navigation = useNavigation();
	const searchProps = useDebouncedSearch(searchTerm);

	const isNavigating = navigation.state !== "idle";
	const pendingQ = navigation.location
		? (new URLSearchParams(navigation.location.search).get("q") ?? "")
		: null;
	const isSearchLoading = isNavigating && pendingQ !== searchTerm;
	const pendingPathname = navigation.location?.pathname ?? "";
	const isTableLoading =
		isNavigating &&
		pendingPathname.startsWith("/quotations") &&
		pendingPathname === "/quotations";

	const sorting: SortingState = [{ id: safeSort, desc: safeDir === "desc" }];
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [fieldFilterOpen, setFieldFilterOpen] = useState(false);
	const [fieldSearchQuery, setFieldSearchQuery] = useState("");
	const allColumnIds = Object.keys(COLUMN_LABELS);

	// In search mode the loader already sorted+sliced — just use as-is.
	const displayQuotations = useMemo(() => {
		return quotations ?? [];
	}, [quotations]);

	const buildUrl = (
		targetCursor: string | null,
		newSort?: string,
		newDir?: string,
		newOffset?: number,
	) => {
		const params = new URLSearchParams();
		if (searchTerm) params.set("q", searchTerm);
		if (targetCursor) params.set("cursor", targetCursor);
		if (newOffset) params.set("offset", String(newOffset));
		const s = newSort ?? safeSort;
		const d = newDir ?? safeDir;
		if (s !== "updated_at" || d !== "desc") {
			params.set("sort", s);
			params.set("dir", d);
		}
		const qs = params.toString();
		return `/quotations${qs ? `?${qs}` : ""}`;
	};

	const handlePreviousPage = () => {
		if (isSearching) {
			const prevOffset = Math.max(0, (searchOffset ?? 0) - PAGE_SIZE);
			navigate(buildUrl(null, undefined, undefined, prevOffset || undefined));
		} else {
			navigate(-1);
		}
	};

	const handleNextPage = () => {
		if (isSearching) {
			const nextOffset = (searchOffset ?? 0) + PAGE_SIZE;
			if (nextOffset < (searchTotal ?? 0)) {
				navigate(buildUrl(null, undefined, undefined, nextOffset));
			}
		} else {
			if (isDone || !continueCursor) return;
			navigate(buildUrl(continueCursor));
		}
	};

	const handleSortChange = (newSorting: SortingState) => {
		if (newSorting.length === 0) return;
		const { id, desc } = newSorting[0];
		// Sort change resets to first page (clears cursor and offset).
		navigate(buildUrl(null, id, desc ? "desc" : "asc"));
	};

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">
						Travel Quotations
					</h2>
					<p className="text-slate-500 text-xs md:text-sm">
						Manage your Umrah quotations and custom travel bundles.
					</p>
				</div>
				<Button asChild className="w-full md:w-auto gap-2">
					<Link to="/quotations/create">
						<Plus className="w-4 h-4" /> Create Quotation
					</Link>
				</Button>
			</div>

			<Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100 space-y-2">
					{/* Fields visibility button row */}
					<div className="flex justify-start">
						<Popover open={fieldFilterOpen} onOpenChange={setFieldFilterOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="gap-2 h-8 text-xs"
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									Fields
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-56 p-0" align="end">
								<div className="flex items-center gap-2 px-3 py-2 border-b">
									<Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<input
										type="text"
										placeholder="Search fields..."
										value={fieldSearchQuery}
										onChange={(e) => setFieldSearchQuery(e.target.value)}
										className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
									/>
								</div>
								<div className="max-h-64 overflow-y-auto py-1">
									{allColumnIds
										.filter((id) =>
											COLUMN_LABELS[id]
												.toLowerCase()
												.includes(fieldSearchQuery.toLowerCase()),
										)
										.map((id) => {
											const isVisible = columnVisibility[id] !== false;
											return (
												<label
													key={id}
													className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 select-none"
												>
													<span>{COLUMN_LABELS[id]}</span>
													<button
														type="button"
														role="switch"
														aria-checked={isVisible}
														onClick={() =>
															setColumnVisibility((prev) => ({
																...prev,
																[id]: !isVisible,
															}))
														}
														className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
															isVisible
																? "bg-primary"
																: "bg-muted-foreground/30"
														}`}
													>
														<span
															className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
																isVisible ? "translate-x-4" : "translate-x-0.5"
															}`}
														/>
													</button>
												</label>
											);
										})}
								</div>
								<div className="flex border-t">
									<button
										type="button"
										onClick={() =>
											setColumnVisibility(
												Object.fromEntries(
													allColumnIds.map((id) => [id, false]),
												),
											)
										}
										className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
									>
										Hide All
									</button>
									<div className="w-px bg-border" />
									<button
										type="button"
										onClick={() => setColumnVisibility({})}
										className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
									>
										Show All
									</button>
								</div>
							</PopoverContent>
						</Popover>
					</div>
					{/* Search bar */}
					<form method="get" className="relative">
						{/* Preserve sort/dir on native form submit (Enter key) */}
						{safeSort !== "updated_at" && (
							<input type="hidden" name="sort" value={safeSort} />
						)}
						{safeDir !== "desc" && (
							<input type="hidden" name="dir" value={safeDir} />
						)}
						{isSearchLoading ? (
							<Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
						) : (
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
						)}
						<Input
							name="q"
							placeholder="Search by client or package name..."
							className="pl-9 h-9"
							{...searchProps}
						/>
					</form>
				</CardHeader>
				<CardContent className="p-0">
					<QuotationListing
						data={displayQuotations}
						isLoading={isTableLoading}
						isDone={isSearching ? isDone : isDone}
						isFirstPage={isFirstPage}
						onPreviousPage={handlePreviousPage}
						onNextPage={handleNextPage}
						sorting={sorting}
						onSortChange={handleSortChange}
						columnVisibility={columnVisibility}
						onColumnVisibilityChange={setColumnVisibility}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
