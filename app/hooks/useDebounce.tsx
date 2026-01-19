import { useEffect, useState } from "react";
import { useSubmit } from "react-router";

export function useDebouncedSearch(
  initialValue: string = "",
  delay: number = 500,
) {
  const submit = useSubmit();
  const [query, setQuery] = useState(initialValue);

  // 1. Sync local state if the URL changes (e.g. Back button pressed)
  useEffect(() => {
    setQuery(initialValue || "");
  }, [initialValue]);

  // 2. Handle Debounce & Submission
  useEffect(() => {
    // Don't submit if nothing changed or on initial mount
    if (query === (initialValue || "")) return;

    const timer = setTimeout(() => {
      const isFirstSearch = !initialValue; // If URL was empty, PUSH history. Otherwise REPLACE.

      // Submit GET request to current route
      submit({ q: query }, { method: "get", replace: !isFirstSearch });
    }, delay);

    return () => clearTimeout(timer);
  }, [query, initialValue, delay, submit]);

  // 3. Return props ready for the Input component
  return {
    value: query,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setQuery(e.target.value),
  };
}
