# Keep search drafts responsive during URL navigation

Keep a local search draft so typing continues while the URL and results update. Restore the input from URL-backed state when navigation changes the search term. The shared search hook pushes the first search to keep the original list reachable with Back, then replaces subsequent search entries so each debounced keystroke stays out of the history. It keeps other query parameters and resets the page when the search changes.

[Client listing](../../src/features/clients/ClientsListingPage.tsx) · [Shared search hook](../../src/hooks/useDebounce.tsx)
