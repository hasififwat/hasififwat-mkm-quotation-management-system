import { Plus, Search } from "lucide-react";
import { Form, Link, redirect } from "react-router"; // Removed unused useSubmit
import { getServerClient } from "@/lib/supabase/server";
import { UmrahPackageService } from "@/services/package-service";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import PackageList from "~/features/packages/PackageList";
import { useDebouncedSearch } from "~/hooks/useDebounce";
import type { Route } from "./+types/package.index";

export function meta() {
	return [
		{ title: "Packages - MKM Quotation" },
		{ name: "description", content: "Manage Umrah packages" },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw redirect("/login", { headers });
	}

	const url = new URL(request.url);
	const searchTerm = url.searchParams.get("q")?.toLowerCase() || "";

	const allPackages = await UmrahPackageService.getAllPackages(supabase);

	const packages = searchTerm
		? allPackages.filter((p) => p.name.toLowerCase().includes(searchTerm))
		: allPackages;

	return { packages, searchTerm };
}

export default function PackageListPage({ loaderData }: Route.ComponentProps) {
	const { packages, searchTerm } = loaderData;

	const searchProps = useDebouncedSearch(searchTerm);

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-auto lg:mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-10">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="text-xl md:text-2xl font-bold tracking-tight">
						Travel Packages
					</h2>
					<p className="text-slate-500 text-xs md:text-sm">
						Manage your Umrah offerings and custom travel bundles.
					</p>
				</div>

				<Button asChild className="w-full md:w-auto gap-2">
					<Link to="/packages/create">
						<Plus className="w-4 h-4" /> Add New Package
					</Link>
				</Button>
			</div>

			<Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100">
					<Form method="get" className="relative" role="search">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

						{/* ✅ 2. Apply the hook props here */}
						{/* This replaces defaultValue, onChange, and the manual submit logic */}
						<Input
							name="q"
							placeholder="Search by package name..."
							className="pl-9 h-9"
							{...searchProps}
						/>
					</Form>
				</CardHeader>
				<CardContent className="p-0">
					<PackageList data={packages} />
				</CardContent>
			</Card>
		</div>
	);
}
