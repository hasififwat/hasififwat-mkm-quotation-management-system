# Allow a server-only Convex endpoint

Server Components and Route Handlers prefer the server-only `CONVEX_URL` when configured, and use the browser endpoint as the fallback. This lets the server connection be configured independently while preserving a single-endpoint setup for local development.

[Server connection](../../src/lib/convex-server.ts)
