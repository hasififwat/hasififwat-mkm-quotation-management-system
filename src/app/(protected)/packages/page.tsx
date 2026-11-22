"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import PackageList from "~/features/packages/PackageList";
import { useDebouncedSearch } from "~/hooks/useDebounce";

export default function PackageListPage() {
	const searchParams = useSearchParams();
	const searchTerm = searchParams.get("q") || "";
	const data = useQuery(api.packages.listWithRooms, {
		searchTerm: searchTerm || undefined,
	});
	const isLoading = data === undefined;

	const searchProps = useDebouncedSearch(searchTerm);

	return (
		<div className="workspace-page max-w-7xl space-y-4 md:space-y-6 animate-fadeIn">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h2 className="wrap-anywhere text-xl font-bold tracking-tight md:text-2xl">
						Travel Packages
					</h2>
					<p className="text-muted-foreground text-xs md:text-sm">
						Manage your Umrah offerings and custom travel bundles.
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="w-full md:w-auto gap-2">
							<Plus className="w-4 h-4" /> Create Package
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<Link href={`/packages/create`}>
							<DropdownMenuItem>Create New Package</DropdownMenuItem>
						</Link>
						<Link href={`/packages/create-from-schedule`}>
							<DropdownMenuItem>Import from flight schedule</DropdownMenuItem>
						</Link>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<Card className="overflow-hidden">
				<CardHeader className="p-4 md:p-6 pb-3 border-b border-border">
					<form onSubmit={(e) => e.preventDefault()} className="relative" role="search">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

						<Input
							name="q"
							placeholder="Search by package name..."
							className="pl-9 h-9"
							{...searchProps}
						/>
					</form>
				</CardHeader>
				<CardContent className="p-0">
					<PackageList data={data ?? []} isLoading={isLoading} />
				</CardContent>
			</Card>
		</div>
	);
}
