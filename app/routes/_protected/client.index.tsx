import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { PAGE_SIZE } from "convex/constants";
import { redirect } from "react-router";
import ClientsListingPage from "~/features/clients/ClientsListingPage";
import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/client.index";

export function meta() {
	return [{ title: "Clients" }];
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
	const http = new ConvexHttpClient(convexUrl);

	const url = new URL(request.url);
	const searchTerm = url.searchParams.get("q") || "";
	const picFilters = url.searchParams.getAll("pic");
	const cursor: string | null = url.searchParams.get("cursor");
	const offsetParam = parseInt(url.searchParams.get("offset") ?? "0", 10);
	const offset = Number.isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

	const isFiltered = !!searchTerm || picFilters.length > 0;

	const [allPics, rawClients] = await Promise.all([
		http.query(api.clients.getAgentNames, {}),
		isFiltered
			? http.query(api.clients.listWithStats, {})
			: http.query(api.clients.listWithStatsPaginated, {
					paginationOpts: { cursor, numItems: PAGE_SIZE },
				}),
	]);

	if (isFiltered) {
		const all = rawClients as Awaited<ReturnType<typeof http.query<typeof api.clients.listWithStats>>>;
		const filtered = all.filter((c) => {
			if (searchTerm) {
				const q = searchTerm.toLowerCase();
				if (
					!c.name.toLowerCase().includes(q) &&
					!(c.phone_number ?? "").toLowerCase().includes(q)
				)
					return false;
			}
			if (picFilters.length > 0) {
				if (!c.quotations.some((q) => picFilters.includes(q.pic_name)))
					return false;
			}
			return true;
		});
		return {
			clients: filtered.slice(offset, offset + PAGE_SIZE),
			isDone: offset + PAGE_SIZE >= filtered.length,
			isFirstPage: offset === 0,
			continueCursor: null as string | null,
			searchTerm,
			picFilters,
			allPics,
			offset,
			total: filtered.length,
		};
	}

	const result = rawClients as {
		page: unknown[];
		isDone: boolean;
		continueCursor: string;
	};
	return {
		clients: result.page,
		isDone: result.isDone,
		isFirstPage: !cursor,
		continueCursor: result.isDone ? null : (result.continueCursor ?? null),
		searchTerm: "",
		picFilters: [] as string[],
		allPics,
		offset: 0,
		total: 0,
	};
}
clientLoader.hydrate = true as const;

export default function ClientIndexPage({ loaderData }: Route.ComponentProps) {
	const data = loaderData as {
		clients: unknown[];
		isDone: boolean;
		isFirstPage: boolean;
		continueCursor: string | null;
		searchTerm: string;
		picFilters: string[];
		allPics: string[];
		offset: number;
		total: number;
	};
	return <ClientsListingPage {...data} />;
}
