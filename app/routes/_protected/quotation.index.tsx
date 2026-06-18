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

// Module-level page→cursor map so the page picker can list visited pages.
// Key = page number (1-based), value = the Convex cursor for that page.
// Only grows — never needs bootstrapping loops.
const pageToCursor = new Map<number, string | null>([[1, null]]);
// Tracks the sort context the cursor cache was built for.
// If sort changes, we reset the cache (cursors are sort-order-specific).
let currentSortKey = "updated_at:desc";

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
	const pageParam = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
	const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	// Cursor comes from the module-level cache (keyed by page number).
	// Falls back to null (page 1) if the user lands directly on a deep page after a refresh.
	const cursor: string | null = pageToCursor.get(page) ?? null;

	// When searching, fetch all and filter client-side.
	// Return the full filtered list — the component handles client-side pagination.
	if (searchTerm) {
		const [all, totalCount] = await Promise.all([
			client.query(api.quotations.list, {}),
			client.query(api.quotations.count, { searchTerm }),
		]);
		const filtered = all.filter((q) => {
			const packageName = q.package?.name?.toLowerCase() ?? "";
			const clientName = q.client_name?.toLowerCase() ?? "";
			return (
				packageName.includes(searchTerm) || clientName.includes(searchTerm)
			);
		});
		return {
			quotations: filtered,
			allSearchResults: filtered,
			isDone: true,
			page,
			searchTerm,
			totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
			sort,
			dir,
		};
	}

	// Reset cursor cache when sort changes (cursors are tied to a specific sort order)
	const sortKey = `${sort}:${dir}`;
	if (sortKey !== currentSortKey) {
		pageToCursor.clear();
		pageToCursor.set(1, null);
		currentSortKey = sortKey;
	}

	// Single query — cursor comes directly from the URL, no looping needed
	const [result, totalCount] = await Promise.all([
		client.query(api.quotations.listPaginated, {
			paginationOpts: { cursor, numItems: PAGE_SIZE },
			sortBy: sort,
			sortDir: dir,
		}),
		client.query(api.quotations.count, { searchTerm }),
	]);

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

	// Cache this page's cursor for the page picker
	pageToCursor.set(page, cursor);
	// Pre-cache the next page's cursor so clicking Next is instant.
	// Only when NOT done — Convex returns a continueCursor even on the last page,
	// which would add a phantom entry to the map and inflate the page picker.
	if (!result.isDone && result.continueCursor) {
		pageToCursor.set(page + 1, result.continueCursor);
	}

	return {
		quotations: result.page,
		allSearchResults: null,
		isDone: result.isDone,
		page,
		searchTerm,
		totalPages,
		sort,
		dir,
	};
}
clientLoader.hydrate = true as const;

export default function QuotationListingPage({
	loaderData,
}: Route.ComponentProps) {
	const {
		quotations,
		allSearchResults,
		isDone,
		page,
		searchTerm,
		totalPages,
		sort,
		dir,
	} = loaderData as {
		quotations: unknown[];
		allSearchResults: unknown[] | null;
		isDone: boolean;
		page: number;
		searchTerm: string;
		totalPages: number | undefined;
		sort: string | undefined;
		dir: string | undefined;
	};
	const safeSort = (sort ?? "updated_at") as "updated_at" | "created_at";
	const safeDir = (dir ?? "desc") as "asc" | "desc";
	const safeTotalPages = totalPages ?? 1;
	const navigate = useNavigate();
	const navigation = useNavigation();
	const searchProps = useDebouncedSearch(searchTerm);

	const isNavigating = navigation.state !== "idle";
	// Only show the search-input spinner when the *search term* is actually changing,
	// not when the user just flips pages.
	const pendingQ = navigation.location
		? (new URLSearchParams(navigation.location.search).get("q") ?? "")
		: null;
	const isSearchLoading = isNavigating && pendingQ !== searchTerm;
	// Only show the table overlay when navigating within the quotations listing itself,
	// not when leaving to another page (e.g. /quotations/create).
	const pendingPathname = navigation.location?.pathname ?? "";
	const isTableLoading =
		isNavigating &&
		pendingPathname.startsWith("/quotations") &&
		pendingPathname === "/quotations";

	// Current sort state for TanStack Table (controlled)
	const sorting: SortingState = [{ id: safeSort, desc: safeDir === "desc" }];

	// Column visibility state
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [fieldFilterOpen, setFieldFilterOpen] = useState(false);
	const [fieldSearchQuery, setFieldSearchQuery] = useState("");
	const allColumnIds = Object.keys(COLUMN_LABELS);

	// Client-side pagination state for search results is driven by the URL `page` param,
	// so ?q=puan&page=3 correctly restores page 3 of search results.

	// When in search mode, slice the full results client-side
	const isSearching = !!searchTerm;
	const allResults = allSearchResults ?? [];
	const searchTotalPages = Math.max(
		1,
		Math.ceil(allResults.length / PAGE_SIZE),
	);
	// Sort search results client-side to match the selected sort column
	const sortedSearchResults = useMemo(() => {
		if (!isSearching || allResults.length === 0) return allResults;
		const isDesc = safeDir === "desc";
		return [...allResults].sort((a: unknown, b: unknown) => {
			const aVal = String((a as Record<string, unknown>)[safeSort] ?? "");
			const bVal = String((b as Record<string, unknown>)[safeSort] ?? "");
			const cmp = aVal.localeCompare(bVal);
			return isDesc ? -cmp : cmp;
		});
	}, [isSearching, allResults, safeSort, safeDir]);

	// Use URL page param for search pagination (clamp to valid range)
	const searchPage = Math.min(Math.max(1, page), searchTotalPages);

	const searchSlice = sortedSearchResults.slice(
		(searchPage - 1) * PAGE_SIZE,
		searchPage * PAGE_SIZE,
	);

	const displayQuotations = isSearching ? searchSlice : (quotations ?? []);

	// Server-side pagination (non-search)
	const buildUrl = (targetPage: number, newSort?: string, newDir?: string) => {
		const params = new URLSearchParams();
		if (searchTerm) params.set("q", searchTerm);
		if (targetPage > 1) params.set("page", String(targetPage));
		const s = newSort ?? safeSort;
		const d = newDir ?? safeDir;
		// Only include sort params when they differ from the default
		if (s !== "updated_at" || d !== "desc") {
			params.set("sort", s);
			params.set("dir", d);
		}
		return `/quotations?${params.toString()}`;
	};

	const handlePreviousPage = () => {
		if (isSearching) {
			navigate(buildUrl(Math.max(1, searchPage - 1)));
		} else {
			if (page <= 1) return;
			navigate(buildUrl(page - 1));
		}
	};

	const handleNextPage = () => {
		if (isSearching) {
			navigate(buildUrl(Math.min(searchTotalPages, searchPage + 1)));
		} else {
			if (isDone) return;
			navigate(buildUrl(page + 1));
		}
	};

	const handleGoToPage = (targetPage: number) => {
		navigate(buildUrl(targetPage));
	};

	const handleSortChange = (newSorting: SortingState) => {
		if (newSorting.length === 0) return;
		const { id, desc } = newSorting[0];
		// Sort change always resets to page 1 (new cursor context)
		navigate(buildUrl(1, id, desc ? "desc" : "asc"));
	};

	const currentPage = isSearching ? searchPage : page;
	const currentIsDone = isSearching ? searchPage >= searchTotalPages : isDone;
	const totalKnownPages = isSearching ? searchTotalPages : safeTotalPages;

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
						pageIndex={currentPage - 1}
						pageSize={PAGE_SIZE}
						isDone={currentIsDone}
						totalKnownPages={totalKnownPages}
						onPreviousPage={handlePreviousPage}
						onNextPage={handleNextPage}
						onGoToPage={handleGoToPage}
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
