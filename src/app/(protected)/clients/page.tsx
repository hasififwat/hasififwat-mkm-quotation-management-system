"use client";

import { api } from "convex/_generated/api";
import { useConvex, useConvexAuth } from "convex/react";
import { PAGE_SIZE } from "convex/constants";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import ClientsListingPage, {
	type ClientLoadStatus,
	type ClientWithStats,
} from "~/features/clients/ClientsListingPage";

export default function ClientsPage() {
	const http = useConvex();
	const { isAuthenticated } = useConvexAuth();
	const searchParams = useSearchParams();
	const searchTerm = searchParams.get("q") || "";
	const picFilters = searchParams.getAll("pic");
	const queryString = searchParams.toString();
	const cursor = searchParams.get("cursor");
	const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10);
	const offset = Number.isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

	const isFiltered = !!searchTerm || picFilters.length > 0;

	const [clients, setClients] = useState<unknown[]>([]);
	const [isDone, setIsDone] = useState(false);
	const [isFirstPage, setIsFirstPage] = useState(!cursor);
	const [continueCursor, setContinueCursor] = useState<string | null>(null);
	const [allPics, setAllPics] = useState<string[]>([]);
	const [total, setTotal] = useState(0);
	const [loadStatus, setLoadStatus] = useState<ClientLoadStatus>("loading");

	useEffect(() => {
		if (!isAuthenticated) return;
		let cancelled = false;

		const load = async () => {
			setLoadStatus("loading");
			try {
				const [allPicsResult, rawClients] = await Promise.all([
					http.query(api.clients.getAgentNames, {}),
					isFiltered
						? http.query(api.clients.listWithStats, {})
						: http.query(api.clients.listWithStatsPaginated, {
								paginationOpts: { cursor, numItems: PAGE_SIZE },
							}),
				]);

				if (cancelled) return;
				setAllPics(allPicsResult as string[]);

				if (isFiltered) {
					const all = rawClients as ClientWithStats[];
					const filterPics = new URLSearchParams(queryString).getAll("pic");
					const filtered = all.filter((c) => {
						if (searchTerm) {
							const q = searchTerm.toLowerCase();
							if (
								!(c.name ?? "").toLowerCase().includes(q) &&
								!(c.phone_number ?? "").toLowerCase().includes(q)
							) {
								return false;
							}
						}
						if (filterPics.length > 0) {
							if (!c.quotations.some((q) => filterPics.includes(q.pic_name))) {
								return false;
							}
						}
						return true;
					});
					setClients(filtered.slice(offset, offset + PAGE_SIZE));
					setIsDone(offset + PAGE_SIZE >= filtered.length);
					setIsFirstPage(offset === 0);
					setContinueCursor(null);
					setTotal(filtered.length);
				} else {
					const result = rawClients as {
						page: unknown[];
						isDone: boolean;
						continueCursor: string;
						total: number;
					};
					setClients(result.page);
					setIsDone(result.isDone);
					setIsFirstPage(!cursor);
					setContinueCursor(result.isDone ? null : (result.continueCursor ?? null));
					setTotal(result.total);
				}
				setLoadStatus("loaded");
			} catch {
				if (!cancelled) setLoadStatus("failed");
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [http, isAuthenticated, searchTerm, queryString, cursor, offset, isFiltered]);

	return (
		<ClientsListingPage
			clients={clients as ClientWithStats[]}
			isDone={isDone}
			isFirstPage={isFirstPage}
			continueCursor={continueCursor}
			searchTerm={searchTerm}
			picFilters={picFilters}
			allPics={allPics}
			offset={offset}
			total={total}
			loadStatus={loadStatus}
		/>
	);
}
