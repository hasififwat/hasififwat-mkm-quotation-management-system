import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import React, { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Link, useLoaderData, useParams, useSubmit } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BasicDetails from "./components/Form/BasicDetails";
import FlightDetails from "./components/Form/FlightDetails";
import HotelDetailsSection from "./components/Form/HotelDetails";
import ExclusionInclusionDetails from "./components/Form/InclusionExclusionDetails";
import RoomDetails from "./components/Form/RoomDetails";
import { ImportPreview } from "./components/ImportPreview";
import { ImportSettingModal } from "./components/ImportSettingModal";
import { PackagePreviewCard } from "./components/PackagePreviewCard/PackagePreviewCard";
import {
	type IPackageDetails,
	type IPackageDetailsForm,
	packageSchema,
} from "./schema";

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

const PackageBuilderHeader = ({
	pid,
	onBack,
}: {
	pid?: string;
	onBack: () => void;
}) => (
	<div className="flex items-center gap-4">
		<Link to="/packages" className="text-sm text-muted-foreground">
			<Button variant="ghost" size="icon" onClick={onBack}>
				<ChevronLeft className="w-5 h-5" />
			</Button>
		</Link>
		<h2 className="text-2xl font-bold tracking-tight">
			{pid ? "Edit Package" : "Create Package"}
		</h2>
	</div>
);

const PackageStepNavigation = ({
	currentStep,
	onStepChange,
}: {
	currentStep: Step;
	onStepChange: (step: Step) => void;
}) => (
	<Card>
		<CardContent>
			<div className="flex items-center justify-between">
				{STEPS.map((step, index) => (
					<React.Fragment key={step.id}>
						<button
							type="button"
							onClick={() => onStepChange(step.id)}
							className={`flex items-center gap-2 transition-colors ${
								currentStep === step.id && "text-primary font-semibold"
							}`}
						>
							<div
								className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
									currentStep === step.id &&
									"border-primary bg-primary text-primary-foreground"
								}`}
							>
								<span className="text-sm">{index + 1}</span>
							</div>
							<span className="hidden md:inline text-sm">{step.label}</span>
						</button>
						{index < STEPS.length - 1 && <Separator className="flex-1 mx-2" />}
					</React.Fragment>
				))}
			</div>
		</CardContent>
	</Card>
);
const PackageBuilder: React.FC = () => {
	const { initialData, allPackages } = useLoaderData<{
		initialData: IPackageDetails;
		allPackages: IPackageDetails[];
	}>();
	const { pid } = useParams();
	const _submit = useSubmit();

	const methods = useForm<IPackageDetailsForm>({
		resolver: zodResolver(packageSchema),
		defaultValues: initialData,
		mode: "onChange",
	});

	const { setValue, getValues, trigger, setFocus } = methods;

	const [currentStep, setCurrentStep] = useState<Step>("basic");

	const validateCurrentStep = async () => {
		if (currentStep === "basic") {
			const isBasicValid = await trigger(["name", "duration", "year"]);
			if (!isBasicValid) {
				const nameValue = getValues("name");
				if (!nameValue || nameValue.trim().length === 0) {
					setFocus("name");
					return false;
				}

				const durationValue = getValues("duration");
				if (!durationValue || durationValue.trim().length === 0) {
					setFocus("duration");
					return false;
				}

				const yearValue = getValues("year");
				if (!yearValue || yearValue.trim().length === 0) {
					setFocus("year");
					return false;
				}
			}
		}

		return true;
	};

	const handleImport = (
		importedData: IPackageDetailsForm,
		setting: keyof IPackageDetailsForm,
	) => {
		if (setting === "hotels") {
			const existingHotels = getValues("hotels");
			const existingHotelIdByType = new Map(
				existingHotels.map((hotel) => [hotel.hotel_type ?? "", hotel._id]),
			);

			const hotelsWithExistingIds = importedData.hotels.map((hotel) => ({
				...hotel,
				_id: existingHotelIdByType.get(hotel.hotel_type ?? "") ?? "",
			}));
			setValue("hotels", hotelsWithExistingIds);
		} else if (setting === "rooms") {
			setValue(
				"rooms",
				(importedData.rooms ?? []).map((room) => ({
					...room,
					_id: "",
				})),
			);
		} else if (setting === "inclusions") {
			setValue("inclusions", importedData.inclusions);
		} else if (setting === "exclusions") {
			setValue("exclusions", importedData.exclusions);
		}
	};

	const goToNextStep = async () => {
		const isCurrentStepValid = await validateCurrentStep();
		if (!isCurrentStepValid) {
			return;
		}

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

	const handleStepChange = async (nextStep: Step) => {
		const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
		const nextIndex = STEPS.findIndex((step) => step.id === nextStep);

		if (nextIndex > currentIndex) {
			const isCurrentStepValid = await validateCurrentStep();
			if (!isCurrentStepValid) {
				return;
			}
		}

		setCurrentStep(nextStep);
	};

	const _onSubmit = (data: IPackageDetailsForm) => {
		console.log("Submitting package data:", data);

		_submit(JSON.stringify(data), {
			method: "POST",
			encType: "application/json",
		});
	};

	const renderSuspenseImportButton = (
		settingKey: keyof IPackageDetailsForm,
	) => {
		const importMeta: Record<
			"hotels" | "rooms" | "inclusions" | "exclusions",
			{ title: string; description: string; triggerLabel: string }
		> = {
			hotels: {
				title: "Import Hotel Settings",
				description: "Import hotel settings from an existing package.",
				triggerLabel: "Import",
			},
			rooms: {
				title: "Import Room Settings",
				description: "Import room pricing from an existing package.",
				triggerLabel: "Import",
			},
			inclusions: {
				title: "Import Inclusions",
				description: "Import inclusions from an existing package.",
				triggerLabel: "Import Inclusions",
			},
			exclusions: {
				title: "Import Exclusions",
				description: "Import exclusions from an existing package.",
				triggerLabel: "Import Exclusions",
			},
		};

		const key = settingKey as "hotels" | "rooms" | "inclusions" | "exclusions";

		return (
			<div className="col-start-2 row-start-1 row-span-full items-center justify-end flex">
				<ImportSettingModal
					title={importMeta[key].title}
					description={importMeta[key].description}
					triggerLabel={importMeta[key].triggerLabel}
					allPackages={allPackages}
					handleImport={(importedData) =>
						handleImport(importedData, settingKey)
					}
					renderPreview={(selectedPackage) => (
						<ImportPreview
							key={selectedPackage ? selectedPackage._id : "none"}
							selectedPackage={selectedPackage}
							settingType={settingKey}
						/>
					)}
				/>
			</div>
		);
	};

	const renderCardHeader = (
		title: string,
		description: string,
		settingKey: keyof IPackageDetailsForm,
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
			<PackageBuilderHeader pid={pid} onBack={goToPreviousStep} />

			{/* Step Navigation Header */}
			<PackageStepNavigation
				currentStep={currentStep}
				onStepChange={handleStepChange}
			/>

			<form
				className="space-y-6"
				onSubmit={(e) => {
					e.preventDefault();

					_onSubmit(getValues());
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
						renderCardHeader={(title, description, settingKey) =>
							renderCardHeader(title, description, settingKey)
						}
					/>

					<RoomDetails
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
						renderCardHeader={() =>
							renderCardHeader(
								"Rooms",
								"Specify the room details for the package.",
								"rooms",
							)
						}
					/>

					<FlightDetails
						currentStep={currentStep}
						goToNextStep={goToNextStep}
						goToPreviousStep={goToPreviousStep}
					/>

					{currentStep === "preview" && (
						<PackagePreviewCard
							getValues={getValues}
							onPrevious={goToPreviousStep}
						/>
					)}
				</FormProvider>
			</form>
		</div>
	);
};

export default PackageBuilder;
