"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import Link from "next/link";
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

type SaveState =
	| { kind: "idle" | "saving" | "saved"; packageId?: string }
	| { kind: "rejected" | "unknown"; message: string };

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
	isFirstStep,
}: {
	pid?: string;
	onBack: () => void;
	isFirstStep: boolean;
}) => (
	<div className="flex items-center gap-4">
		{isFirstStep ? (
			<Link href="/packages" className="text-sm text-muted-foreground">
				<Button variant="ghost" size="icon">
					<ChevronLeft className="w-5 h-5" />
				</Button>
			</Link>
		) : (
			<Button variant="ghost" size="icon" onClick={onBack}>
				<ChevronLeft className="w-5 h-5" />
			</Button>
		)}
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
type PackageBuilderProps = {
	initialData: IPackageDetailsForm;
	allPackages: IPackageDetailsForm[];
};

const PackageBuilder: React.FC<PackageBuilderProps> = ({
	initialData,
	allPackages,
}) => {
	const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
	const saveStateRef = useRef<SaveState>({ kind: "idle" });
	const attemptedDraft = useRef<IPackageDetailsForm | null>(null);
	const transitionSave = (state: SaveState) => {
		saveStateRef.current = state;
		setSaveState(state);
	};
	const packageId = initialData?._id || null;

	const methods = useForm<IPackageDetailsForm, unknown, IPackageDetails>({
		resolver: zodResolver(packageSchema),
		defaultValues: initialData,
		mode: "onChange",
		shouldFocusError: false,
	});

	const { setValue, getValues, trigger, setFocus } = methods;

	const [currentStep, setCurrentStep] = useState<Step>("basic");

	const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);
	const [focusRequest, setFocusRequest] = useState<{ path: FieldPath<IPackageDetailsForm> } | null>(null);

	useEffect(() => {
		if (focusRequest) {
			setFocus(focusRequest.path);
		}
	}, [focusRequest, setFocus]);

	const onInvalid = (errors: FieldErrors<IPackageDetailsForm>) => {
		const messages: Array<{ path: string; message: string }> = [];
		const collect = (value: unknown, path: string) => {
			if (!value || typeof value !== "object") return;
			if ("message" in value && typeof value.message === "string") {
				messages.push({ path, message: value.message });
				return;
			}
			for (const [key, child] of Object.entries(value)) {
				if (key !== "ref") collect(child, path ? `${path}.${key}` : key);
			}
		};
		collect(errors, "");
		const first = messages[0];
		if (!first) return;
		const root = first.path.split(".")[0];
		const stepByField: Record<string, Step> = {
			hotels: "hotels", inclusions: "inclusions", exclusions: "inclusions", rooms: "pricing", flights: "flights",
		};
		setCurrentStep(stepByField[root] ?? "basic");
		setFocusRequest({ path: first.path as FieldPath<IPackageDetailsForm> });
		setSubmissionErrors(messages.map(({ path, message }) => {
			const [field, index] = path.split(".");
			if (field === "rooms") return `${getValues(`rooms.${Number(index)}.name`)} price. ${message}`;
			if (field === "flights") return `Flight ${Number(index) + 1}. ${message}`;
			return message;
		}));
	};

	const validateCurrentStep = async () => {
		if (currentStep === "basic") {
			const isBasicValid = await trigger(["name", "duration", "year"]);
			if (!isBasicValid) {
				const nameValue = getValues("name");
				if (!nameValue || nameValue.trim().length < 3) {
					setFocus("name");
				} else {
					const durationValue = getValues("duration");
					if (!durationValue || durationValue.trim().length === 0) {
						setFocus("duration");
					} else {
						setFocus("year");
					}
				}
				return false;
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

	const _onSubmit = async (data: IPackageDetails) => {
		if (["saving", "unknown", "saved"].includes(saveStateRef.current.kind)) return;
		transitionSave({ kind: "saving" });
		setSubmissionErrors([]);
		attemptedDraft.current = structuredClone(getValues());
		try {
			const res = await fetch(
				data._id ? "/api/packages/update" : "/api/packages/create",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			const body = await res.json().catch(() => null) as { success?: boolean; packageId?: string; error?: string } | null;
			if (!res.ok) {
				transitionSave({
					kind: res.status === 400 ? "rejected" : "unknown",
					message: res.status === 400
						? "The package was not saved. Correct the invalid fields and save again. Your complete draft is still here."
						: `We could not confirm whether the package saved (HTTP ${res.status}). Your complete draft is still here.`,
				});
				return;
			}
			if (body?.success !== true || typeof body.packageId !== "string" || !body.packageId) {
				transitionSave({ kind: "unknown", message: "The server response did not confirm the saved package. Your complete draft is still here." });
				return;
			}
			transitionSave({ kind: "saved", packageId: body.packageId });
		} catch {
			transitionSave({ kind: "unknown", message: "The connection failed before we could confirm the save. Your complete draft is still here." });
		}
	};

	const downloadDraft = () => {
		const blob = new Blob([JSON.stringify({
			format: "mkm-package-draft",
			version: 1,
			currentDraft: getValues(),
			attemptedDraft: attemptedDraft.current,
			outcome: saveStateRef.current.kind,
		}, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "mkm-package-draft.json";
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const submit = methods.handleSubmit(_onSubmit, onInvalid);
	const saveBlocked = ["saving", "unknown", "saved"].includes(saveState.kind);

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
			<PackageBuilderHeader
				pid={packageId ?? undefined}
				onBack={goToPreviousStep}
				isFirstStep={currentStep === "basic"}
			/>

			{/* Step Navigation Header */}
			<PackageStepNavigation
				currentStep={currentStep}
				onStepChange={handleStepChange}
			/>

			<form
				className="space-y-6"
				noValidate
				onSubmit={(event) => {
					if (currentStep !== "preview" || saveBlocked) {
						event.preventDefault();
						return;
					}
					void submit(event);
				}}
			>
				{saveState.kind === "saved" && (
					<div role="status" className="rounded-lg border p-4 space-y-2">
						<p className="font-semibold">Package saved successfully.</p>
						<Link className="underline" href={`/packages/edit/${saveState.packageId}`}>View saved package</Link>
						<p><Link className="underline" href="/packages">Back to Packages</Link></p>
					</div>
				)}
				{(saveState.kind === "unknown" || saveState.kind === "rejected") && (
					<div role="alert" className="rounded-lg border border-destructive p-4 text-sm space-y-3">
						<p className="font-semibold">{saveState.message}</p>
						{saveState.kind === "unknown" && <p>Saving again is blocked because the first request may have saved. Check Packages in another tab and open the saved record if present. An empty list does not prove the save failed. Download your draft before leaving or reloading this page.</p>}
						<div className="flex gap-4 items-center">
							<Button type="button" variant="outline" onClick={downloadDraft}>Download complete draft</Button>
							<a className="underline" href={`/packages?q=${encodeURIComponent(attemptedDraft.current?.name ?? "")}`} target="_blank" rel="noopener noreferrer">Check Packages in a new tab</a>
						</div>
					</div>
				)}
				{submissionErrors.length > 0 && (
					<div role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">
						<p className="font-semibold">Correct these fields before saving.</p>
						<ul className="list-disc pl-5">{submissionErrors.map((message, index) => <li key={index}>{message}</li>)}</ul>
					</div>
				)}
				<fieldset disabled={saveState.kind === "saving" || saveState.kind === "saved"} className="space-y-6 min-w-0">
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
							savePending={saveState.kind === "saving"}
							saveBlocked={saveBlocked}
						/>
					)}
				</FormProvider>
				</fieldset>
			</form>
		</div>
	);
};

export default PackageBuilder;
