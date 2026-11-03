"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function useDebouncedSearch(
	initialValue: string = "",
	delay: number = 500,
) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(initialValue);

	// 1. Sync local state if the URL changes (e.g. Back button pressed)
	useEffect(() => {
		setQuery(initialValue || "");
	}, [initialValue]);

	// 2. Handle Debounce & URL update
	useEffect(() => {
		// Don't submit if nothing changed or on initial mount
		if (query === (initialValue || "")) return;

		const timer = setTimeout(() => {
			const isFirstSearch = !initialValue; // If URL was empty, PUSH history. Otherwise REPLACE.

			// Preserve existing params (sort, dir, etc.) but drop page when searching
			const existing = new URLSearchParams(searchParams.toString());
			existing.delete("page");
			existing.delete("cursor");
			if (query) {
				existing.set("q", query);
			} else {
				existing.delete("q");
			}

			// Update the URL — pages re-run their data effects on param change
			if (isFirstSearch) {
				router.push(`?${existing.toString()}`);
			} else {
				router.replace(`?${existing.toString()}`);
			}
		}, delay);

		return () => clearTimeout(timer);
	}, [query, initialValue, delay, router, searchParams]);

	// 3. Return props ready for the Input component
	return {
		value: query,
		onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
			setQuery(e.target.value),
	};
}

