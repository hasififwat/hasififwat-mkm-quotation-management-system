"use client";

import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { api } from "convex/_generated/api";
import { useQuery, useConvexAuth } from "convex/react";
import { PAGE_SIZE } from "convex/constants";
import { Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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


export default function QuotationsPage() {

	const { isAuthenticated } = useConvexAuth();
	const router = useRouter();
	const searchParams = useSearchParams();

	const searchTerm = (searchParams.get("q")?.toLowerCase() || "") as string;
	const sort = (searchParams.get("sort") ?? "updated_at") as
		| "updated_at"
		| "created_at";
	const dir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";
	const packageId = searchParams.get("package_id");
	const cursor = searchParams.get("cursor");


    const safeSort = sort === "created_at" ? "created_at" : "updated_at";
    const safeDir = dir === "asc" ? "asc" : "desc";
    const visibility = searchParams.get("visibility") === "history" ? "history" : searchParams.get("visibility") === "archived" ? "archived" : "current";
    const result = useQuery(api.quotations.listPaginated, isAuthenticated ? {
        paginationOpts: {cursor, numItems: PAGE_SIZE}, sortBy: safeSort, sortDir: safeDir,
        searchTerm, package_id: packageId ?? undefined, visibility,
    } : "skip");
    const quotations = result?.page;
    const continueCursor = result?.continueCursor ?? null;
    const isDone = result?.isDone ?? true;
    const isLoading = result === undefined;
    const isSearching = !!searchTerm || !!packageId;
    const isFirstPage = !cursor;

	const navigate = useCallback(
		(url: string) => {
			router.push(url);
		},
		[router],
	);

	const searchProps = useDebouncedSearch(searchTerm);

	const isSearchLoading = isLoading && isSearching;
	const isTableLoading = isLoading;

	const sorting: SortingState = [{ id: safeSort, desc: safeDir === "desc" }];
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [fieldFilterOpen, setFieldFilterOpen] = useState(false);
	const [fieldSearchQuery, setFieldSearchQuery] = useState("");
	const allColumnIds = Object.keys(COLUMN_LABELS);


	const displayQuotations = useMemo(() => {
		return quotations ?? [];
	}, [quotations]);

	const buildUrl = (
		targetCursor: string | null,
		newSort?: string,
		newDir?: string,
	) => {
		const params = new URLSearchParams();
		if (searchTerm) params.set("q", searchTerm);
		if (packageId) params.set("package_id", packageId);
        if (visibility !== "current") params.set("visibility", visibility);
		if (targetCursor) params.set("cursor", targetCursor);
		const s = newSort ?? safeSort;
		const d = newDir ?? safeDir;
		if (s !== "updated_at" || d !== "desc") {
			params.set("sort", s);
			params.set("dir", d);
		}
		const qs = params.toString();
		return `/quotations${qs ? `?${qs}` : ""}`;
	};

    const handlePreviousPage = () => router.back();
    const handleNextPage = () => {
        if (!isDone && continueCursor) navigate(buildUrl(continueCursor));
    };

	const handleSortChange = (newSorting: SortingState) => {
		if (newSorting.length === 0) return;
		const { id, desc } = newSorting[0];
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
						Current quotation families and saved history.
					</p>
				</div>
				<Button asChild className="w-full md:w-auto gap-2">
					<Link href="/quotations/create">
						<Plus className="w-4 h-4" /> Create Quotation
					</Link>
				</Button>
			</div>

			<div className="flex gap-4 text-sm">
                <Link href="/quotations" aria-current={visibility === "current" ? "page" : undefined}>Current families</Link>
                <Link href="/quotations?visibility=archived" aria-current={visibility === "archived" ? "page" : undefined}>Archived families</Link>
            </div>
            <Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100 space-y-2">
					{/* Fields visibility button row */}
					<div className="flex justify-start">
						<Popover open={fieldFilterOpen} onOpenChange={setFieldFilterOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
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
															isVisible ? "bg-primary" : "bg-muted-foreground/30"
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
												Object.fromEntries(allColumnIds.map((id) => [id, false])),
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
					<form onSubmit={(e) => e.preventDefault()} className="relative">
						{isSearchLoading ? (
							<Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
						) : (
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
						)}
						<Input
							name="q"
							placeholder="Search by reference, client or package..."
							className="pl-9 h-9"
							{...searchProps}
						/>
					</form>
				</CardHeader>
				<CardContent className="p-0">
					<QuotationListing
						data={displayQuotations}
                        archived={visibility !== "current"}
						isLoading={isTableLoading}
						isDone={isDone}
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
