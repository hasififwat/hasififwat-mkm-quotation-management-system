# MKM Quotation Management System — Next.js

Next.js App Router migration of the React Router 7 (Vite/SSR) MKM Quotation Management System. The original React Router project lives in `../hasififwat-mkm-quotation-management-system` and is untouched.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Convex** backend (shared `convex/` folder, copied from the original project)
- **Tailwind CSS 4** + shadcn-style UI components
- `@convex-dev/auth` for authentication

## Route mapping (old → new)

| React Router route | Next.js route |
| --- | --- |
| `root.tsx` | `src/app/layout.tsx` + `src/app/providers.tsx` |
| `_protected.tsx` (auth guard) | `src/app/(protected)/layout.tsx` (client, `useConvexAuth` + redirect) |
| `login.tsx` | `src/app/page.tsx` |
| `sign-up.tsx` | `src/app/sign-up/page.tsx` |
| `logout.tsx` | `src/app/logout/page.tsx` |
| `_protected/dashboard` | `src/app/(protected)/dashboard/page.tsx` |
| `_protected/flight.index` / `flight.audit` | `src/app/(protected)/flights[/audit]/page.tsx` |
| `_protected/package.index` | `src/app/(protected)/packages/page.tsx` |
| `_protected/package.create` / `package.edit` | `src/app/(protected)/packages/create/page.tsx`, `packages/edit/[pid]/page.tsx` (async Server Components) |
| `_protected/package.create-from-schedule` | `src/app/(protected)/packages/create-from-schedule/page.tsx` (server loader → client component) |
| `_protected/package.stats` / `package.sync` | `src/app/(protected)/packages/stats/page.tsx`, `packages/sync/page.tsx` |
| `_protected/client.index` / `client.create` / `client.$cid` | `src/app/(protected)/clients[/create]/page.tsx`, `clients/[cid]/page.tsx` |
| `_protected/quotation.index` / `create` / `edit` / `review` / `duplicates` | `src/app/(protected)/quotations/…` |
| `resources.create-client` (resource action) | `src/app/api/clients/create/route.ts` |

Former `action()` handlers are now Route Handlers:

- `POST /api/packages/create`, `/api/packages/update`, `/api/packages/create-with-flight`
- `POST /api/quotations/create`, `/api/quotations/update` (supports `_intent: "refresh_snapshot"`)
- `POST /api/clients/create` (FormData, mirrors the old `resources.create-client`)

## Setup

```bash
pnpm install

# First clone only: create the environment file without overwriting an existing one
cp -n .env.example .env.local
```

If Convex is not configured yet, run `pnpm convex:dev` once, complete its setup
prompts, and stop it with `Ctrl+C`. This sets the deployment and
`NEXT_PUBLIC_CONVEX_URL` in `.env.local`.

For everyday development, start everything with one command:

```bash
pnpm dev
```

This opens an [mprocs](https://github.com/pvolok/dekit/blob/v0.9.6/README.md)
terminal dashboard and starts both services:

- **next** — Next.js at [http://localhost:3000](http://localhost:3000).
- **convex** — Convex development watcher and backend logs.

With the service list focused:

| Key | Action |
| --- | --- |
| `↑` / `↓` or `1` / `2` | Select a service and view its logs |
| `Tab` | Switch between the service list and interactive output |
| `PageUp` / `PageDown` | Scroll through logs |
| `r` | Restart the selected service |
| `x` / `s` | Stop / start the selected service |
| `q` or `Ctrl+C` | Stop both services and exit |

`Ctrl+Q` stops both services from either pane. When the output pane is focused,
keystrokes go to that service, so you can answer Convex prompts there.

To run a service on its own, use `pnpm dev:web` or `pnpm convex:dev`.
Edit `mprocs.yaml` to add more services later.

Use `pnpm dev:web` for web-only development. `pnpm dev` also starts the Convex
watcher, which publishes local backend changes to the selected deployment.

### Package access

Package functions require a signed-in Convex identity. The Next.js auth adapter
stores the session in cookies and forwards its token to server-side loaders.
Existing browser-only sessions need one fresh sign-in after this change.

Maintenance scripts that call package functions through `convex run` also need
an explicit authorized identity through the CLI's `--identity` option. An admin
deployment credential alone does not supply a user identity to these handlers.

### Environment variables

- `NEXT_PUBLIC_CONVEX_URL` — required, used by the browser (`ConvexReactClient`) and as a fallback on the server.
- `CONVEX_URL` — optional, server-only override for Server Components / Route Handlers (`src/lib/convex-server.ts`).
- `.env.example` selects `glad-wombat-72` for work on this migration branch.

## Notes / deviations from the original

- Loaders became async Server Components querying Convex via `ConvexHttpClient`, or client-side `ConvexHttpClient` queries keyed on `useSearchParams` where the URL drives pagination/search.
- `useSubmit`/`useFetcher`/`Form` submissions were replaced with `fetch()` calls to the API route handlers above; `useRevalidator` → `router.refresh()`; `useNavigate` → `useRouter`.
- The Buffer polyfill (previously a Vite `define`) is configured in `next.config.ts` (`turbopack.resolveAlias` + webpack fallback) for `@react-pdf/renderer`.
- Deleted dead code: `ProtectedRoute.tsx` (referenced a non-existent provider) and the legacy Supabase `src/services/` files.
- Pre-existing type errors in the original codebase (base-ui `asChild` on `TooltipTrigger`, `delayDuration`, XLSX parsing casts, etc.) were fixed to make `next build` (which typechecks) pass.
