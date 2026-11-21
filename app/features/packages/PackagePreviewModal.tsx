import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
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
const tokenPattern = /\{\{(name|duration|flights|hotels)\}\}/g;
const defaultTemplate =
	"*PAKEJ {{name}} {{duration}}*\n\n{{flights}}\n\n{{hotels}}\n\n(setaraf bermaksud memiliki kualiti yang setanding dengan hotel yang diberi)";

interface Props {
	pkg: PackageWithRooms;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const PackagePreviewModal: React.FC<Props> = ({ pkg, open, onOpenChange }) => {
	const [selectedIds, setSelectedIds] = useState<Flight["_id"][]>([]);
	const [template, setTemplate] = useState<{
		name: string;
		text: string;
	} | null>(null);
	const [templateError, setTemplateError] = useState("");
	const [reading, setReading] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (copied) {
			const timer = setTimeout(() => setCopied(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [copied]);

	const selectedFlights = pkg.flights.filter((f: Flight) =>
		selectedIds.includes(f._id),
	);
	const enabledHotels = (pkg.hotels ?? []).filter((hotel) => hotel.enabled);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date
			.toLocaleDateString("en-GB", {
				timeZone: "UTC",
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
		const airports = (sector: string) =>
			sector.replace(/^([A-Z]{3})-?([A-Z]{3})$/i, "$1 $2");
		return `${airports(departure)} - ${airports(returnSector)}`;
	};

	const dateRange = (flight: Flight) =>
		`${formatDate(flight.departure_date)} - ${formatDate(flight.return_date)}`;

	const formatHotelTypeLabel = (hotelType: string) => {
		if (!hotelType) {
			return "Hotel";
		}

		return hotelType.charAt(0).toUpperCase() + hotelType.slice(1).toLowerCase();
	};

	const toTitleCase = (value: string) =>
		value
			.toLowerCase()
			.split(" ")
			.filter(Boolean)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

	const formatHotelMeals = (meals?: string[]) => {
		const normalizedMeals = (meals ?? [])
			.map((meal) => meal?.trim())
			.filter((meal): meal is string => Boolean(meal));

		if (normalizedMeals.length === 0) {
			return "";
		}

		if (normalizedMeals.length === 3) {
			return " (Fullboard)";
		}

		if (normalizedMeals.length === 2) {
			return " (Halfboard)";
		}

		return ` (${toTitleCase(normalizedMeals[0])})`;
	};

	const roomOrder: Record<string, number> = { Quad: 1, Triple: 2, Double: 3 };
	const prices = pkg.rooms
		.filter((room) => room.enabled)
		.sort(
			(a, b) => (roomOrder[a.room_type] ?? 99) - (roomOrder[b.room_type] ?? 99),
		)
		.map(
			(room) =>
				`Bilik ${room.room_type === "Quad" ? "4" : room.room_type === "Triple" ? "3" : "2"} : ${formatPrice(room.price)}`,
		);
	const flights = selectedFlights
		.map((flight) =>
			[
				dateRange(flight),
				pkg.duration,
				`✈️ ${getFlightRoute(flight.departure_sector, flight.return_sector)}`,
				...prices,
			].join("\n"),
		)
		.join("\n\n");
	const hotels = enabledHotels
		.map(
			(hotel) =>
				`${formatHotelTypeLabel(hotel.hotel_type)} : ${hotel.name || hotel.placeholder}${formatHotelMeals(hotel.meals)}`,
		)
		.join("\n");
	const values: Record<string, string> = {
		name: pkg.name,
		duration: pkg.duration,
		flights,
		hotels,
	};
	const previewText = (template?.text ?? defaultTemplate).replace(
		tokenPattern,
		(_, key: string) => values[key],
	);

	async function readTemplate(file: File) {
		setReading(true);
		try {
			if (!/\.txt$/i.test(file.name) || file.size > 65536)
				throw new Error("Choose a .txt file of 64 KB or less.");
			const content = new TextDecoder("utf-8", { fatal: true })
				.decode(await file.arrayBuffer())
				.replace(/\r\n?/g, "\n")
				.trim();
			if (!content.includes("{{flights}}"))
				throw new Error("Include {{flights}} in the template.");
			if (
				/[{}]{2}/.test(content.replace(tokenPattern, "")) ||
				/[\u0000-\u0008\u000b-\u001f]/.test(content)
			)
				throw new Error("Use plain text and only the listed tokens.");
			setTemplate({ name: file.name, text: content });
			setTemplateError("");
		} catch (error) {
			setTemplateError(
				error instanceof TypeError
					? "Choose a UTF-8 text file."
					: error instanceof Error
						? error.message
						: "Could not read the template.",
			);
		} finally {
			setReading(false);
		}
	}

	const isMobile = useIsMobile();

	const anchor = useComboboxAnchor();

	const byId = new Map(pkg.flights.map((flight) => [flight._id, flight]));
	const flightLabel = (id: Flight["_id"]) => {
		const flight = byId.get(id);
		return flight ? dateRange(flight) : "";
	};

	const renderContent = () => (
		<div className="min-w-0 space-y-4 px-4 md:px-0">
			<div>
				<FieldLabel htmlFor="preview-dates">Select Flight Dates</FieldLabel>
				<Combobox
					multiple
					items={Array.from(byId.keys())}
					value={selectedIds}
					onValueChange={setSelectedIds}
					itemToStringLabel={flightLabel}
				>
					<ComboboxChips ref={anchor}>
						{selectedIds.map((id) => (
							<ComboboxChip key={id}>{flightLabel(id)}</ComboboxChip>
						))}
						<ComboboxChipsInput
							id="preview-dates"
							placeholder="Search flight dates"
							className="text-base sm:text-sm"
						/>
					</ComboboxChips>
					<ComboboxContent anchor={anchor}>
						<ComboboxEmpty>No matching flight dates.</ComboboxEmpty>
						<ComboboxList>
							{(id: Flight["_id"]) => (
								<ComboboxItem key={id} value={id}>
									{flightLabel(id)}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
			<div className="space-y-1">
				<FieldLabel htmlFor="preview-template">
					Text template (optional)
				</FieldLabel>
				<Input
					id="preview-template"
					type="file"
					accept=".txt,text/plain"
					disabled={reading}
					aria-describedby="template-help"
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) void readTemplate(file);
					}}
				/>
				<p id="template-help" className="text-xs text-muted-foreground">
					For this preview, choose a UTF-8 .txt file up to 64 KB. Include{" "}
					{"{{flights}}"} for dates, routes and prices. Optional tokens:{" "}
					{"{{name}}, {{duration}}, {{hotels}}"}.
				</p>
				{template && (
					<div className="flex flex-wrap items-center gap-2 text-xs">
						Using {template.name}
						<Button
							variant="outline"
							size="sm"
							disabled={reading}
							onClick={() => {
								setTemplate(null);
								setTemplateError("");
							}}
						>
							Use default
						</Button>
					</div>
				)}
				{templateError && (
					<p role="alert" className="text-sm text-destructive">
						{templateError}
					</p>
				)}
			</div>
			<div className="max-h-64 min-h-20 overflow-auto whitespace-pre-wrap wrap-anywhere rounded-md border bg-muted/20 p-3 text-sm">
				{selectedFlights.length
					? previewText
					: "Select one or more flight dates to see the package preview."}
			</div>
		</div>
	);

	const actionButtons = (
		<div className="flex justify-end gap-2">
			<Button variant="outline" onClick={() => onOpenChange(false)}>
				Close
			</Button>
			<Button
				disabled={selectedFlights.length === 0 || reading}
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(previewText);
						setCopied(true);
					} catch {
						toast.error(
							"Could not copy. Select and copy the preview text manually.",
						);
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
			<DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
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
