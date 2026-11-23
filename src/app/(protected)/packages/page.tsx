"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import PackageList from "~/features/packages/PackageList";

export default function PackageListPage() {
	const searchParams = useSearchParams();
	const searchTerm = searchParams.get("q") || "";
	const data = useQuery(api.packages.listWithRooms, {
		searchTerm: searchTerm || undefined,
	});
	const isLoading = data === undefined;

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

			<PackageList data={data ?? []} isLoading={isLoading} searchTerm={searchTerm} />
		</div>
	);
}
