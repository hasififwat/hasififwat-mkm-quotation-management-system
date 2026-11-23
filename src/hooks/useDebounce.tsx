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

	useEffect(() => {
		setQuery(initialValue || "");
	}, [initialValue]);

	useEffect(() => {
		if (query === (initialValue || "")) return;

		const timer = setTimeout(() => {
			const isFirstSearch = !initialValue;

			const existing = new URLSearchParams(searchParams.toString());
			existing.delete("page");
			existing.delete("cursor");
			if (query) {
				existing.set("q", query);
			} else {
				existing.delete("q");
			}

			if (isFirstSearch) {
				router.push(`?${existing.toString()}`);
			} else {
				router.replace(`?${existing.toString()}`);
			}
		}, delay);

		return () => clearTimeout(timer);
	}, [query, initialValue, delay, router, searchParams]);

	return {
		value: query,
		onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
			setQuery(e.target.value),
	};
}

