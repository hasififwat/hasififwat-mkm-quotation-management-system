import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldLabel,
	FieldSeparator,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { usePackageUploadContext } from "../Context/PackageUploadContext";
import type { ISeasonalRoomPrice } from "../schema";

export default function SetSeasonalPriceButton() {
	const { packageData, roomTemplates, seasonalPrices, setSeasonalPrices } =
		usePackageUploadContext();
	const [open, setOpen] = useState(false);
	const [selectedSeason, setSelectedSeason] = useState("");
	const [draftSeasonRooms, setDraftSeasonRooms] = useState<
		Record<string, ISeasonalRoomPrice[]>
	>({});

	const seasonOptions = useMemo(() => {
		return Array.from(
			new Set(
				(packageData ?? [])
					.map((pkg) => pkg.season)
					.filter((season): season is string => Boolean(season?.trim())),
			),
		);
	}, [packageData]);

	const missingSeasonCount = useMemo(() => {
		if (seasonOptions.length === 0) {
			return 0;
		}

		const configuredSeasons = new Set(
			seasonalPrices.map((item) => item.season.trim()).filter(Boolean),
		);

		return seasonOptions.filter((season) => !configuredSeasons.has(season))
			.length;
	}, [seasonOptions, seasonalPrices]);

	const createDefaultRooms = (): ISeasonalRoomPrice[] => {
		return roomTemplates.map((room) => ({
			room_type: room.name,
			price: room.price,
			enabled: room.enabled,
		}));
	};

	const getInitialRoomsForSeason = (season: string): ISeasonalRoomPrice[] => {
		const saved = seasonalPrices.find((item) => item.season === season);
		return saved?.rooms ?? createDefaultRooms();
	};

	const handleSeasonChange = (season: string) => {
		setSelectedSeason(season);
		setDraftSeasonRooms((prev) => {
			if (prev[season]) {
				return prev;
			}

			return {
				...prev,
				[season]: getInitialRoomsForSeason(season),
			};
		});
	};

	const handleSaveSeasonalPrice = () => {
		if (!selectedSeason) {
			return;
		}

		const roomsForSeason =
			draftSeasonRooms[selectedSeason] ??
			getInitialRoomsForSeason(selectedSeason);

		const updated = [
			...seasonalPrices.filter((item) => item.season !== selectedSeason),
			{
				season: selectedSeason,
				rooms: roomsForSeason,
			},
		];

		setSeasonalPrices(updated);
		setOpen(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					setDraftSeasonRooms({});
					if (seasonOptions[0]) {
						handleSeasonChange(seasonOptions[0]);
					}
				} else {
					setDraftSeasonRooms({});
				}
			}}
		>
			<DialogTrigger
				render={
					<Button variant="outline" className="relative">
						Set Seasonal Price
						{missingSeasonCount > 0 && (
							<span className="absolute -top-2 -right-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
								{missingSeasonCount}
							</span>
						)}
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md md:max-w-xl">
				<DialogHeader>
					<DialogTitle>Set Seasonal Price</DialogTitle>
					<DialogDescription>
						Choose a season from CSV and set room pricing for imported packages
						in that season.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
					<Field>
						<FieldLabel htmlFor="season-price-select">Season</FieldLabel>

						<Select value={selectedSeason} onValueChange={handleSeasonChange}>
							<SelectTrigger id="season-price-select">
								<SelectValue placeholder="Select season" />
							</SelectTrigger>
							<SelectContent>
								{seasonOptions.map((season) => (
									<SelectItem key={season} value={season}>
										{season}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Choose a season to configure room prices for packages in that
							season.
						</FieldDescription>
					</Field>

					<FieldSeparator />

					<Field>
						<FieldLabel>Rooms</FieldLabel>
						<FieldDescription>
							Enable rooms and set prices for the selected season.
						</FieldDescription>
						{selectedSeason &&
							(draftSeasonRooms[selectedSeason] ?? []).map((room, index) => (
								<div key={`${room.room_type}-${selectedSeason}`}>
									<div
										className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
											room.enabled ? "bg-background" : "bg-muted/30 opacity-60"
										}`}
									>
										<button
											type="button"
											onClick={() => {
												setDraftSeasonRooms((prev) => ({
													...prev,
													[selectedSeason]: (prev[selectedSeason] ?? []).map(
														(item, itemIndex) => {
															if (itemIndex !== index) {
																return item;
															}

															return {
																...item,
																enabled: !item.enabled,
															};
														},
													),
												}));
											}}
											className="flex items-center gap-3 cursor-pointer flex-1 text-left"
										>
											<span
												className={`w-2 h-2 rounded-full transition-colors ${
													room.enabled
														? "bg-green-500 animate-pulse"
														: "bg-muted-foreground/30"
												}`}
											/>
											<span className="font-medium capitalize">
												{room.room_type}
											</span>
										</button>

										{room.enabled && (
											<div className="w-full max-w-35">
												<Input
													type="number"
													value={room.price}
													onChange={(event) => {
														const value = Number(event.target.value || 0);
														setDraftSeasonRooms((prev) => ({
															...prev,
															[selectedSeason]: (
																prev[selectedSeason] ?? []
															).map((item, itemIndex) => {
																if (itemIndex !== index) {
																	return item;
																}

																return {
																	...item,
																	price: Number.isNaN(value) ? 0 : value,
																};
															}),
														}));
													}}
													placeholder="0.00"
													className="h-9 text-right"
												/>
											</div>
										)}
									</div>
								</div>
							))}
					</Field>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSaveSeasonalPrice}
						disabled={!selectedSeason}
					>
						Save Seasonal Price
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
