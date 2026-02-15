import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Import, Save } from "lucide-react";
import React, { Suspense, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Await, Link, useLoaderData, useParams, useSubmit } from "react-router";
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
import { type PackageDetailsForm, packageDetailsSchema } from "@/schema";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import BasicDetails from "./components/Form/BasicDetails";
import FlightDetails from "./components/Form/FlightDetails";
import HotelDetailsSection from "./components/Form/HotelDetails";
import ExclusionInclusionDetails from "./components/Form/InclusionExclusionDetails";
import RoomDetails from "./components/Form/RoomDetails";
import { ImportPreview } from "./components/ImportPreview";
import { ImportSettingModal } from "./components/ImportSettingModal";

type Step =
	| "basic"
	| "hotels"
	| "inclusions"
	| "pricing"
	| "flights"
	| "preview";

const STEPS: { id: Step; label: string }[] = [
	{ id: "basic", label: "Basic Details" },
	{ id: "hotels", label: "Hotels & Meals" },
	{ id: "inclusions", label: "Inclusions & Exclusions" },
	{ id: "pricing", label: "Pricing" },
	{ id: "flights", label: "Flights" },
	{ id: "preview", label: "Preview" },
];

const HOTEL_LIST = ["makkah", "madinah", "taif"] as const;

const PackageBuilder: React.FC = () => {
	const { initialData, allPackages } = useLoaderData();
	const { pid } = useParams();
	const submit = useSubmit();

	const methods = useForm<PackageDetailsForm>({
		resolver: zodResolver(packageDetailsSchema),
		defaultValues: initialData,
		mode: "onChange",
	});

	const { setValue, getValues, handleSubmit } = methods;

	const [currentStep, setCurrentStep] = useState<Step>("basic");

	const handleImport = (
		importedData: PackageDetailsForm,
		setting: keyof PackageDetailsForm,
	) => {
		if (setting === "hotels") {
			//filter out the id, use existing id if it exist in the form
			const existingHotels = getValues("hotels");

			const hotelsWithoutId = {
				makkah: { ...importedData.hotels.makkah, id: existingHotels.makkah.id },
				madinah: {
					...importedData.hotels.madinah,
					id: existingHotels.madinah.id,
				},
				taif: { ...importedData.hotels.taif, id: existingHotels.taif.id },
			};
			setValue("hotels", hotelsWithoutId);
		} else if (setting === "rooms") {
			setValue("rooms", importedData.rooms);
		} else if (setting === "inclusions") {
			setValue("inclusions", importedData.inclusions);
		} else if (setting === "exclusions") {
			setValue("exclusions", importedData.exclusions);
		}
	};

	const goToNextStep = () => {
		const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
		if (currentIndex < STEPS.length - 1) {
			setCurrentStep(STEPS[currentIndex + 1].id);
		}
	};

	const goToPreviousStep = () => {
		const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
		if (currentIndex > 0) {
			setCurrentStep(STEPS[currentIndex - 1].id);
		}
	};

	const _onSubmit = (data: PackageDetailsForm) => {
		console.log("Submitting package data:", data);

		submit(data, {
			method: "POST",
			encType: "application/json",
		});
	};

	const renderSuspenseImportButton = (settingKey: keyof PackageDetailsForm) => {
		return (
			<div className="col-start-2  row-start-1 row-span-full items-center justify-end flex">
				<Suspense
					fallback={
						<Button variant="ghost" disabled>
							<Import className="w-4 h-4 " />
							Import
						</Button>
					}
				>
					<Await
						resolve={allPackages}
						// biome-ignore lint/correctness/noChildrenProp: <Await needs children prop>
						children={(resolvedReviews) => (
							<ImportSettingModal
								title="Import Hotel Settings"
								description="Import hotel settings from an existing package."
								allPackages={resolvedReviews}
								handleImport={(importedData) =>
									handleImport(importedData, settingKey)
								}
								renderPreview={(selectedPackage) => (
									<ImportPreview
										key={selectedPackage ? selectedPackage.id : "none"}
										selectedPackage={selectedPackage}
										settingType={settingKey}
									/>
								)}
							>
								<Button variant="ghost" className="w-full">
									<Import className="w-4 h-4 " />
									Import
								</Button>
							</ImportSettingModal>
						)}
					/>
				</Suspense>
			</div>
		);
	};

	const renderCardHeader = (
		title: string,
		description: string,
		settingKey: keyof PackageDetailsForm,
	) => (
		<CardHeader>
			<CardTitle>
				<div className="flex justify-between items-end">
					<span>{title}</span>
				</div>
			</CardTitle>
			<CardDescription>{description}</CardDescription>

			{renderSuspenseImportButton(settingKey)}
		</CardHeader>
	);

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 xl:w-250 lg:mx-auto space-y-6 animate-slideIn">
			<div className="flex items-center gap-4">
				<Link to="/packages" className="text-sm text-muted-foreground">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => goToPreviousStep()}
					>
						<ChevronLeft className="w-5 h-5" />
					</Button>
				</Link>
				<h2 className="text-2xl font-bold tracking-tight">
					{pid ? "Edit Package" : "Create Package"}
				</h2>
			</div>

			{/* Step Navigation Header */}
			<Card>
				<CardContent>
					<div className="flex items-center justify-between">
						{STEPS.map((step, index) => (
							<React.Fragment key={step.id}>
								<button
									type="button"
									onClick={() => setCurrentStep(step.id)}
									className={`flex items-center gap-2 transition-colors ${
										currentStep === step.id && "text-primary font-semibold"
										// : index < currentStepIndex
										//   ? "text-primary hover:text-primary/80"
										//   : "text-muted-foreground hover:text-foreground"
									}`}
								>
									<div
										className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
											currentStep === step.id &&
											"border-primary bg-primary text-primary-foreground"
											// ? ""
											// : index < currentStepIndex
											//   ? "border-primary bg-primary text-primary-foreground"
											//   : "border-muted-foreground"
										}`}
									>
										<span className="text-sm">{index + 1}</span>
									</div>
									<span className="hidden md:inline text-sm">{step.label}</span>
								</button>
								{index < STEPS.length - 1 && (
									<Separator className="flex-1 mx-2" />
								)}
							</React.Fragment>
						))}
					</div>
				</CardContent>
			</Card>

			<form
				className="space-y-6"
				onSubmit={(e) => {
					e.preventDefault();
					console.log("Submitting form");
				}}
			>
				<FormProvider {...methods}>
					<BasicDetails currentStep={currentStep} goToNextStep={goToNextStep} />

					<HotelDetailsSection
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
						renderCardHeader={() =>
							renderCardHeader(
								"Hotels & Meals",
								"Select hotels for each city and specify included meals.",
								"hotels",
							)
						}
					/>
					<ExclusionInclusionDetails
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
						renderCardHeader={renderCardHeader}
					/>

					<RoomDetails
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
						renderCardHeader={renderCardHeader}
					/>

					<FlightDetails
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
					/>

					{currentStep === "preview" && (
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
									</div>
								</div>

								<Separator />

								<div>
									<h3 className="font-semibold mb-2">Hotels & Meals</h3>
									<div className="space-y-2 text-sm">
										{HOTEL_LIST.map((hotelKey) => {
											const pkg = getValues();

											return (
												pkg.hotels[hotelKey].enabled && (
													<div key={hotelKey}>
														<p className="font-medium">
															{hotelKey.charAt(0).toUpperCase() +
																hotelKey.slice(1)}
														</p>
														<p className="text-muted-foreground">
															{pkg.hotels[hotelKey].name || "—"}
														</p>
														<p className="text-xs text-muted-foreground">
															Meals:{" "}
															{pkg.hotels[hotelKey]?.meals?.length === 0
																? "NOT INCLUDED"
																: pkg.hotels[hotelKey]?.meals?.length === 2
																	? "HALFBOARD"
																	: pkg.hotels[hotelKey]?.meals?.length === 3
																		? "FULLBOARD"
																		: pkg.hotels[hotelKey]?.meals
																				?.map((meal) => meal)
																				.join(", ")}
														</p>
													</div>
												)
											);
										})}
									</div>
								</div>

								<Separator />

								<div>
									<h3 className="font-semibold mb-2">Inclusions</h3>
									{getValues("inclusions").length > 0 ? (
										<ul className="list-disc list-inside text-sm space-y-1 ">
											{getValues("inclusions")
												.split("\n")
												.map((line) => (
													<li key={line}>{line}</li>
												))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">
											No inclusions added
										</p>
									)}
								</div>

								<Separator />

								<div>
									<h3 className="font-semibold mb-2">Exclusions</h3>
									{getValues("exclusions").length > 0 ? (
										<ul className="list-disc list-inside text-sm space-y-1 ">
											{getValues("exclusions")
												.split("\n")
												.map((line, _i) => (
													<li key={line}>{line}</li>
												))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">
											No exclusions added
										</p>
									)}
								</div>

								<Separator />

								<div>
									<h3 className="font-semibold mb-2">Pricing (RM)</h3>
									{getValues("rooms").filter((room) => room.enabled).length >
									0 ? (
										<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
											{getValues("rooms")
												.filter((room) => room.enabled)
												.map((room) => (
													<div key={room.room_type} className="space-y-1">
														<p className="text-muted-foreground">
															{room.room_type}
														</p>
														<p className="text-lg font-semibold">
															RM {room.price.toLocaleString("en-US")}
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
											{(getValues("flights") ?? []).length > 0 ? (
												<div className="space-y-2 text-sm">
													{(getValues("flights") ?? []).map((flight, index) => (
														<div
															key={flight.id || index}
															className="p-3 bg-muted/30 rounded-lg"
														>
															<div className="grid grid-cols-2 md:grid-cols-5 gap-2">
																<div>
																	<p className="text-muted-foreground text-xs">
																		Month
																	</p>
																	<p className="font-medium">
																		{flight.month || "—"}
																	</p>
																</div>
																<div>
																	<p className="text-muted-foreground text-xs">
																		Departure
																	</p>
																	<p className="font-medium">
																		{flight.departure_date || "—"}
																	</p>
																</div>
																<div>
																	<p className="text-muted-foreground text-xs">
																		Depart Sector
																	</p>
																	<p className="font-medium">
																		{flight.departure_sector || "—"}
																	</p>
																</div>
																<div>
																	<p className="text-muted-foreground text-xs">
																		Return
																	</p>
																	<p className="font-medium">
																		{flight.return_date || "—"}
																	</p>
																</div>
																<div>
																	<p className="text-muted-foreground text-xs">
																		Return Sector
																	</p>
																	<p className="font-medium">
																		{flight.return_sector || "—"}
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
								<Button variant="outline" onClick={goToPreviousStep}>
									<ChevronLeft className="w-4 h-4 mr-2" /> Previous
								</Button>
								<Button className="gap-2 " type="submit">
									<Save className="w-4 h-4" /> Save Package
								</Button>
							</CardFooter>
						</Card>
					)}
				</FormProvider>
			</form>
		</div>
	);
};

export default PackageBuilder;
