import type { api } from "convex/_generated/api";
import { SlidersHorizontal } from "lucide-react";
import type { FunctionReturnType } from "node_modules/convex/dist/esm-types/server/api";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { columns } from "./components/PackageListTable/columns";
import { DataTable } from "./components/PackageListTable/data-table";
import PackagePreviewModal from "./PackagePreviewModal";

interface Props {
	data: FunctionReturnType<typeof api.packages.listWithRooms>; // Receives data from parent
	isLoading?: boolean;
}

type PackageWithRooms = FunctionReturnType<
	typeof api.packages.listWithRooms
>[number];

const STATUS_OPTIONS = [
	{ value: "published", label: "Published" },
	{ value: "unpublished", label: "Unpublished" },
];

const PackageList: React.FC<Props> = ({ data, isLoading = false }) => {
	const [previewPackage, setPreviewPackage] = useState<PackageWithRooms | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [seasonFilterOpen, setSeasonFilterOpen] = useState(false);
	const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
	const [statusFilterOpen, setStatusFilterOpen] = useState(false);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

	const seasons = useMemo(() => {
		const unique = new Set(data.map((pkg) => pkg.season ?? "").filter(Boolean));
		return Array.from(unique).sort();
	}, [data]);

	const filteredData = useMemo(() => {
		return data.filter((pkg) => {
			if (selectedSeasons.length > 0 && !selectedSeasons.includes(pkg.season ?? "")) return false;
			if (selectedStatuses.length > 0 && !selectedStatuses.includes(pkg.status)) return false;
			return true;
		});
	}, [data, selectedSeasons, selectedStatuses]);

	const handleToggleSeason = useCallback((season: string) => {
		setSelectedSeasons((prev) =>
			prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season],
		);
	}, []);

	const handleClearSeasons = useCallback(() => setSelectedSeasons([]), []);

	const handleToggleStatus = useCallback((status: string) => {
		setSelectedStatuses((prev) =>
			prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
		);
	}, []);

	const handleClearStatuses = useCallback(() => setSelectedStatuses([]), []);

	const handlePreviewPckg = useCallback((pkg: PackageWithRooms) => {
		console.log("Previewing package:", pkg); // Debug log to verify package data
		setPreviewPackage(pkg);
		setIsPreviewOpen(true);
	}, []);

	return (
		<div>
			<div className="p-4 border-b border-slate-100 flex items-center gap-2">
				{seasons.length > 0 && (
					<Popover open={seasonFilterOpen} onOpenChange={setSeasonFilterOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className={cn(
									"gap-2 h-8 text-xs",
									selectedSeasons.length > 0 && "border-primary text-primary",
								)}
							>
								<SlidersHorizontal className="h-3.5 w-3.5" />
								Season
								{selectedSeasons.length > 0 && (
									<Badge variant="secondary" className="h-4 px-1 text-[10px]">
										{selectedSeasons.length}
									</Badge>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-52 p-0" align="start">
							<div className="max-h-64 overflow-y-auto py-1">
								{seasons.map((season) => {
									const isActive = selectedSeasons.includes(season);
									return (
										<label
											key={season}
											className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 select-none"
										>
											<span>{season}</span>
											<button
												type="button"
												role="switch"
												aria-checked={isActive}
												onClick={() => handleToggleSeason(season)}
												className={cn(
													"relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
													isActive ? "bg-primary" : "bg-muted-foreground/30",
												)}
											>
												<span
													className={cn(
														"inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
														isActive ? "translate-x-4" : "translate-x-0.5",
													)}
												/>
											</button>
										</label>
									);
								})}
							</div>
							{selectedSeasons.length > 0 && (
								<div className="border-t">
									<button
										type="button"
										onClick={handleClearSeasons}
										className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
									>
										Clear filter
									</button>
								</div>
							)}
						</PopoverContent>
					</Popover>
				)}

				<Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"gap-2 h-8 text-xs",
								selectedStatuses.length > 0 && "border-primary text-primary",
							)}
						>
							<SlidersHorizontal className="h-3.5 w-3.5" />
							Status
							{selectedStatuses.length > 0 && (
								<Badge variant="secondary" className="h-4 px-1 text-[10px]">
									{selectedStatuses.length}
								</Badge>
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-48 p-0" align="start">
						<div className="py-1">
							{STATUS_OPTIONS.map(({ value, label }) => {
								const isActive = selectedStatuses.includes(value);
								return (
									<label
										key={value}
										className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 select-none"
									>
										<span>{label}</span>
										<button
											type="button"
											role="switch"
											aria-checked={isActive}
											onClick={() => handleToggleStatus(value)}
											className={cn(
												"relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
												isActive ? "bg-primary" : "bg-muted-foreground/30",
											)}
										>
											<span
												className={cn(
													"inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
													isActive ? "translate-x-4" : "translate-x-0.5",
												)}
											/>
										</button>
									</label>
								);
							})}
						</div>
						{selectedStatuses.length > 0 && (
							<div className="border-t">
								<button
									type="button"
									onClick={handleClearStatuses}
									className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
								>
									Clear filter
								</button>
							</div>
						)}
					</PopoverContent>
				</Popover>
			</div>

			<DataTable
				columns={columns}
				data={filteredData}
				handlePreview={handlePreviewPckg}
				isLoading={isLoading}
			/>

			{previewPackage && (
				<PackagePreviewModal
					pkg={previewPackage}
					open={isPreviewOpen}
					onOpenChange={setIsPreviewOpen}
				/>
			)}
		</div>
	);
};

export default PackageList;
