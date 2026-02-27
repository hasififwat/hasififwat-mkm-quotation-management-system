import { ChevronLeft, Save } from "lucide-react";
import type { UseFormGetValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import type { IPackageDetailsForm } from "../../schema";

export const PackagePreviewCard = ({
	getValues,
	onPrevious,
}: {
	getValues: UseFormGetValues<IPackageDetailsForm>;
	onPrevious: () => void;
}) => {
	const pkg = getValues();
	const inclusionsText = pkg.inclusions ?? "";
	const exclusionsText = pkg.exclusions ?? "";
	const enabledRooms = (pkg.rooms ?? []).filter((room) => room.enabled);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Package Preview</CardTitle>
				<CardDescription>
					Review your package details before saving.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
				<div>
					<h3 className="font-semibold mb-2">Basic Information</h3>
					<div className="space-y-1 text-sm">
						<p>
							<span className="text-muted-foreground">Name:</span>{" "}
							{getValues("name") || "—"}
						</p>
						<p>
							<span className="text-muted-foreground">Duration:</span>{" "}
							{getValues("duration") || "—"}
						</p>
						<p>
							<span className="text-muted-foreground">Year:</span>{" "}
							{getValues("year") || "—"}
						</p>
						<p>
							<span className="text-muted-foreground">Transportation:</span>{" "}
							{getValues("transport") || "—"}
						</p>
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="font-semibold mb-2">Hotels & Meals</h3>
					<div className="space-y-2 text-sm">
						{(pkg.hotels ?? [])
							.filter((hotel) => hotel.enabled)
							.map((hotel) => {
								const hotelLabel = hotel.hotel_type
									? `${hotel.hotel_type.charAt(0).toUpperCase()}${hotel.hotel_type.slice(1)}`
									: "Hotel";

								return (
									<div key={hotel._id ?? hotel.hotel_type}>
										<p className="font-medium">{hotelLabel}</p>
										<p className="text-muted-foreground">{hotel.name || "—"}</p>
										<p className="text-xs text-muted-foreground">
											Meals:{" "}
											{(hotel.meals ?? []).length === 0
												? "NOT INCLUDED"
												: (hotel.meals ?? []).length === 2
													? "HALFBOARD"
													: (hotel.meals ?? []).length === 3
														? "FULLBOARD"
														: (hotel.meals ?? []).join(", ")}
										</p>
									</div>
								);
							})}
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="font-semibold mb-2">Inclusions</h3>
					{inclusionsText.length > 0 ? (
						<ul className="list-disc list-inside text-sm space-y-1 ">
							{inclusionsText.split("\n").map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">No inclusions added</p>
					)}
				</div>

				<Separator />

				<div>
					<h3 className="font-semibold mb-2">Exclusions</h3>
					{exclusionsText.length > 0 ? (
						<ul className="list-disc list-inside text-sm space-y-1 ">
							{exclusionsText.split("\n").map((line, _i) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">No exclusions added</p>
					)}
				</div>

				<Separator />

				<div>
					<h3 className="font-semibold mb-2">Pricing (RM)</h3>
					{enabledRooms.length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
							{enabledRooms.map((room) => (
								<div key={room._id ?? room.name} className="space-y-1">
									<p className="text-muted-foreground">{room.name}</p>
									<p className="text-lg font-semibold">
										RM {(room.price as number).toLocaleString("en-US")}
									</p>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No room types enabled
						</p>
					)}
				</div>

				<Separator />

				<Accordion type="single" collapsible>
					<AccordionItem value="flight-schedule">
						<AccordionTrigger className="hover:no-underline">
							Flight Schedule
						</AccordionTrigger>
						<AccordionContent>
							{(pkg.flights ?? []).length > 0 ? (
								<div className="space-y-2 text-sm">
									{(pkg.flights ?? []).map((flight, index) => (
										<div
											key={flight._id || `${flight.code}-${index}`}
											className="p-3 bg-muted/30 rounded-lg"
										>
											<div className="grid grid-cols-2 md:grid-cols-5 gap-2">
												<div>
													<p className="text-muted-foreground text-xs">Month</p>
													<p className="font-medium">{flight.month || "—"}</p>
												</div>
												<div>
													<p className="text-muted-foreground text-xs">
														Departure
													</p>
													<p className="font-medium">
														{flight.departure || "—"}
													</p>
												</div>
												<div>
													<p className="text-muted-foreground text-xs">
														Depart Sector
													</p>
													<p className="font-medium">
														{flight.sector_departure || "—"}
													</p>
												</div>
												<div>
													<p className="text-muted-foreground text-xs">
														Return
													</p>
													<p className="font-medium">{flight.return || "—"}</p>
												</div>
												<div>
													<p className="text-muted-foreground text-xs">
														Return Sector
													</p>
													<p className="font-medium">
														{flight.sector_return || "—"}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No flight schedules added
								</p>
							)}
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={onPrevious}>
					<ChevronLeft className="w-4 h-4 mr-2" /> Previous
				</Button>
				<Button className="gap-2 " type="submit">
					<Save className="w-4 h-4" /> Save Package
				</Button>
			</CardFooter>
		</Card>
	);
};
