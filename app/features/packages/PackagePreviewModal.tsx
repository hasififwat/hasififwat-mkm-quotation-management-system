import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { FieldLabel } from "~/components/ui/field";
import { useIsMobile } from "~/hooks/use-mobile";

type PackageWithRooms = FunctionReturnType<
	typeof api.packages.listWithRooms
>[number];
type Flight = PackageWithRooms["flights"][number];
type Room = PackageWithRooms["rooms"][number];

interface Props {
	pkg: PackageWithRooms;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const PackagePreviewModal: React.FC<Props> = ({ pkg, open, onOpenChange }) => {
	const [_selectedFlightIds, _setSelectedFlightIds] = useState<string[]>([]);

	const [_openCombobox, _setOpenComboboxx] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (copied) {
			const timer = setTimeout(() => setCopied(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [copied]);

	const selectedFlights = pkg.flights.filter((f: Flight) =>
		_selectedFlightIds.includes(f._id),
	);

	// Group flights by month
	const flightsByMonth = pkg.flights.reduce(
		(acc: Record<string, Flight[]>, flight: Flight) => {
			const month = flight.month || "Other";
			if (!acc[month]) {
				acc[month] = [];
			}
			acc[month].push(flight);
			return acc;
		},
		{} as Record<string, Flight[]>,
	);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date
			.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			})
			.toUpperCase();
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("en-MY", {
			style: "currency",
			currency: "MYR",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(price);
	};

	const getFlightRoute = (departure: string, returnSector: string) => {
		// Extract airport codes (e.g., KULMED -> KUL MED)
		const depCodes = departure.match(/.{3}/g)?.join(" ") || departure;
		const retCodes = returnSector.match(/.{3}/g)?.join(" ") || returnSector;
		return `${depCodes} - ${retCodes}`;
	};

	const _formatDateRange = (departure: string, returnDate: string) => {
		const depDate = new Date(departure);
		const retDate = new Date(returnDate);

		const depDay = depDate.getDate().toString().padStart(2, "0");
		const retDay = retDate.getDate().toString().padStart(2, "0");
		const month = depDate
			.toLocaleDateString("en-GB", { month: "short" })
			.toUpperCase();

		return `${depDay} - ${retDay} ${month}`;
	};

	const generatePreviewText = () => {
		if (selectedFlights.length === 0) return "";

		const lines: string[] = [];

		// Package name (bold in WhatsApp with *)
		lines.push(`*${pkg.name}*`);

		// Iterate over each selected flight
		selectedFlights.forEach((flight: Flight) => {
			lines.push(""); // Add spacing between flights
			// Dates
			lines.push(
				`${formatDate(flight.departure_date)} - ${formatDate(
					flight.return_date,
				)}`,
			);

			// Duration
			lines.push(pkg.duration);

			// Flight route
			lines.push(
				`✈ ${getFlightRoute(flight.departure_sector, flight.return_sector)}`,
			);

			// Room prices
			const sortedRooms = pkg.rooms
				.filter((room: Room) => room.enabled)
				.sort((a: Room, b: Room) => {
					const order: Record<string, number> = {
						Quad: 1,
						Triple: 2,
						Double: 3,
					};
					return (order[a.room_type] || 99) - (order[b.room_type] || 99);
				});

			sortedRooms.forEach((room: Room) => {
				const roomNum =
					room.room_type === "Quad"
						? "4"
						: room.room_type === "Triple"
							? "3"
							: "2";
				lines.push(`Bilik ${roomNum} : ${formatPrice(room.price)}`);
			});
		});

		// Empty line
		lines.push("");

		// Hotels
		const makkahHotel = pkg.hotels?.find((h) => h.hotel_type === "makkah");
		if (makkahHotel?.enabled) {
			lines.push(`Makkah : ${makkahHotel.name || makkahHotel.placeholder}`);
		}

		const madinahHotel = pkg.hotels?.find((h) => h.hotel_type === "madinah");
		if (madinahHotel?.enabled) {
			lines.push(`Madinah : ${madinahHotel.name || madinahHotel.placeholder}`);
		}

		const taifHotel = pkg.hotels?.find((h) => h.hotel_type === "taif");
		if (taifHotel?.enabled) {
			lines.push(`Taif : ${taifHotel.name || taifHotel.placeholder}`);
		}

		// Footer note
		lines.push("");
		lines.push(
			"(setaraf bermaksud memiliki kualiti yang setanding dengan hotel yang diberi)",
		);

		return lines.join("\n");
	};

	const isMobile = useIsMobile();

	const anchor = useComboboxAnchor();

	//connvert flightsByMonth to array of {month, flights}
	const _flightsByMonthArray = Object.entries(flightsByMonth).map(
		([month, flights]) => ({
			month,
			flights,
		}),
	);

	// ] as const

	const _handleValueChange = (val: string[]) => {
		_setSelectedFlightIds(val);
	};

	// Shared content between Dialog and Drawer
	const renderContent = () => (
		<div className="space-y-4 px-4 md:px-0">
			{/* Flight Selection */}
			<FieldLabel className="text-sm font-medium mb-1">
				Select Flight Dates
			</FieldLabel>

			<Combobox
				multiple
				items={_flightsByMonthArray}
				// value={selectedFlights}
				modal={true}
				onValueChange={_handleValueChange}
			>
				{/* <ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{selectedFlights.map((flight) => (
							<ComboboxChip key={flight.id}>{flight.label}</ComboboxChip>
						))}
					</ComboboxValue>
					<ComboboxChipsInput placeholder="Select flight date" />
				</ComboboxChips> */}
				<ComboboxChips ref={anchor}>
					<ComboboxValue>
						{(values) => (
							<React.Fragment>
								{pkg.flights
									.filter((f: Flight) => values.includes(f._id))
									.map((flight: Flight) => (
										<ComboboxChip key={flight._id}>
											{_formatDateRange(
												flight.departure_date,
												flight.return_date,
											)}
										</ComboboxChip>
									))}
							</React.Fragment>
						)}
					</ComboboxValue>
					<ComboboxChipsInput className="text-base sm:text-sm" />
				</ComboboxChips>
				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>No items found.</ComboboxEmpty>
					<ComboboxList>
						{(group, index) => (
							<ComboboxGroup key={group.month} items={group.flights}>
								<ComboboxLabel>{group.month}</ComboboxLabel>
								<ComboboxCollection>
									{(item) => (
										<ComboboxItem key={`${item._id}`} value={item._id}>
											{formatDate(item.departure_date)} -{" "}
											{formatDate(item.return_date)}
										</ComboboxItem>
									)}
								</ComboboxCollection>

								{index < _flightsByMonthArray.length - 1 && (
									<ComboboxSeparator />
								)}
							</ComboboxGroup>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>

			{/* Preview */}
			<div className="h-75 overflow-y-auto border rounded-md bg-muted/10 relative">
				{!selectedFlights.length ? (
					<div className="absolute inset-0 flex items-center justify-center text-muted-foreground p-4 text-center">
						Select one or more flight dates to see the package preview.
					</div>
				) : (
					<Card className="bg-muted/30 border-0 shadow-none min-h-full">
						<CardContent className="pt-6">
							<div className="space-y-6 font-mono text-sm whitespace-pre-line">
								<div className="font-bold text-lg">{pkg.name}</div>
								{selectedFlights.map((flight: Flight) => (
									<div key={flight._id} className="space-y-3 border-b pb-4">
										<div>
											{formatDate(flight.departure_date)} -{" "}
											{formatDate(flight.return_date)}
										</div>
										<div>{pkg.duration}</div>
										<div>
											✈{" "}
											{getFlightRoute(
												flight.departure_sector,
												flight.return_sector,
											)}
										</div>

										<div className="pt-2 space-y-1">
											{pkg.rooms
												.filter((room: Room) => room.enabled)
												.sort((a: Room, b: Room) => {
													const order: Record<string, number> = {
														Quad: 1,
														Triple: 2,
														Double: 3,
													};
													return (
														(order[a.room_type] || 99) -
														(order[b.room_type] || 99)
													);
												})
												.map((room: Room) => (
													<div key={room._id}>
														Bilik{" "}
														{room.room_type === "Quad"
															? "4"
															: room.room_type === "Triple"
																? "3"
																: "2"}{" "}
														: {formatPrice(room.price)}
													</div>
												))}
										</div>
									</div>
								))}

								{pkg.hotels?.find((h) => h.hotel_type === "makkah")
									?.enabled && (
									<div>
										Makkah :{" "}
										{pkg.hotels.find((h) => h.hotel_type === "makkah")?.name ||
											pkg.hotels.find((h) => h.hotel_type === "makkah")
												?.placeholder}
									</div>
								)}

								{pkg.hotels?.find((h) => h.hotel_type === "madinah")
									?.enabled && (
									<div>
										Madinah :{" "}
										{pkg.hotels.find((h) => h.hotel_type === "madinah")?.name ||
											pkg.hotels.find((h) => h.hotel_type === "madinah")
												?.placeholder}
									</div>
								)}

								{pkg.hotels?.find((h) => h.hotel_type === "taif")?.enabled && (
									<div>
										Taif :{" "}
										{pkg.hotels.find((h) => h.hotel_type === "taif")?.name ||
											pkg.hotels.find((h) => h.hotel_type === "taif")
												?.placeholder}
									</div>
								)}

								<div className="text-xs text-muted-foreground pt-2">
									(setaraf bermaksud memiliki kualiti yang setanding dengan
									hotel yang diberi)
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);

	// Action buttons shared between Dialog and Drawer
	const actionButtons = (
		<div className="flex justify-end gap-2">
			<Button
				variant="outline"
				onClick={() => {
					onOpenChange(false);
					_setSelectedFlightIds([]);
				}}
			>
				Close
			</Button>
			<Button
				disabled={selectedFlights.length === 0}
				onClick={() => {
					const previewText = generatePreviewText();
					if (previewText) {
						navigator.clipboard.writeText(previewText);
						setCopied(true);
					}
				}}
				className={copied ? "bg-green-600 hover:bg-green-700" : ""}
			>
				{copied ? "Copied" : "Copy Preview"}
			</Button>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange} modal={false}>
				<DrawerContent>
					<DrawerHeader className="text-left">
						<DrawerTitle>Package Preview</DrawerTitle>
						<DrawerDescription>
							Select one or more flight dates to generate package preview
						</DrawerDescription>
					</DrawerHeader>
					<div className="overflow-y-auto max-h-[60vh] pb-4">
						{renderContent()}
					</div>
					<DrawerFooter>{actionButtons}</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Package Preview</DialogTitle>
					<DialogDescription>
						Select one or more flight dates to generate package preview
					</DialogDescription>
				</DialogHeader>
				{renderContent()}
				{actionButtons}
			</DialogContent>
		</Dialog>
	);
};

export default PackagePreviewModal;
