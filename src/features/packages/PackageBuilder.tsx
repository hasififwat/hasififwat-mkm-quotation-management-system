"use client";

import { isPackageEditConflict } from "~/domain/package-edit-conflict";
import { isPackageReferenceConflict } from "~/domain/package-reference-conflict";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FormProvider, useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
	| { kind: "rejected" | "unknown" | "conflict"; message: string };

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

const PackageStepNavigation = ({
	currentIndex,
	open,
	onOpenChange,
	onStepChange,
}: {
	currentIndex: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStepChange: (step: Step) => void;
}) => (
	<Collapsible
		open={open}
		onOpenChange={onOpenChange}
		className="min-w-0 rounded-lg border bg-card @min-[52rem]:sticky @min-[52rem]:top-20 @min-[52rem]:col-start-2 @min-[52rem]:row-start-1 @min-[52rem]:self-start @min-[52rem]:rounded-xl @min-[52rem]:bg-sidebar @min-[52rem]:shadow-xs"
	>
		<CollapsibleTrigger className="group flex min-h-11 w-full min-w-0 items-center gap-2 rounded-[inherit] px-3 py-2 text-left text-sm font-semibold hover:bg-accent @min-[52rem]:hidden">
			<span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-xs">
				{currentIndex + 1}
			</span>
			<span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
				<span className="min-w-0 wrap-anywhere">{STEPS[currentIndex].label}</span>
				<span className="whitespace-nowrap text-xs text-muted-foreground">
					Step {currentIndex + 1} of {STEPS.length}
				</span>
			</span>
			<ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180" />
		</CollapsibleTrigger>
		<CollapsibleContent asChild forceMount>
			<nav
				aria-label="Package steps"
				className="min-w-0 p-3 @max-[52rem]:data-[state=closed]:hidden @max-[52rem]:border-t"
			>
				<div className="mb-3 hidden items-center justify-between gap-2 px-2 text-sm @min-[52rem]:flex">
					<span className="font-semibold">Package steps</span>
					<span className="text-xs text-muted-foreground">{currentIndex + 1} of {STEPS.length}</span>
				</div>
				<ol className="min-w-0 space-y-1">
					{STEPS.map((step, index) => (
						<li key={step.id} className="min-w-0">
							<button
								type="button"
								aria-current={currentIndex === index ? "step" : undefined}
								onClick={() => onStepChange(step.id)}
								className="group flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm leading-tight font-medium hover:bg-muted aria-[current=step]:bg-accent aria-[current=step]:font-semibold aria-[current=step]:text-accent-foreground"
							>
								<span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-xs group-aria-[current=step]:border-primary group-aria-[current=step]:bg-primary group-aria-[current=step]:text-primary-foreground">
									{index + 1}
								</span>
								<span className="min-w-0 wrap-anywhere">{step.label}</span>
							</button>
						</li>
					))}
				</ol>
			</nav>
		</CollapsibleContent>
	</Collapsible>
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
	const [attemptedDraft, setAttemptedDraft] = useState<IPackageDetailsForm | null>(null);
	const transitionSave = (state: SaveState) => {
		saveStateRef.current = state;
		setSaveState(state);
	};
	const [baseline] = useState(() => structuredClone(initialData));
	const packageId = baseline._id || null;

	const methods = useForm<IPackageDetailsForm, unknown, IPackageDetails>({
		resolver: zodResolver(packageSchema),
		defaultValues: baseline,
		mode: "onChange",
		shouldFocusError: false,
	});

	const { setValue, getValues, trigger, setFocus } = methods;

	const [currentStep, setCurrentStep] = useState<Step>("basic");
	const [stepsOpen, setStepsOpen] = useState(false);
	const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
	const formRef = useRef<HTMLFormElement>(null);

	const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);
	const [focusRequest, setFocusRequest] = useState<{ path: FieldPath<IPackageDetailsForm> } | null>(null);
	const saveConfirmationRef = useRef<HTMLDivElement>(null);
	const savedPackageLinkRef = useRef<HTMLAnchorElement>(null);

	useEffect(() => {
		if (focusRequest) {
			setFocus(focusRequest.path);
		}
	}, [focusRequest, setFocus]);

	useEffect(() => {
		const activeElement = document.activeElement;
		if (saveState.kind === "saved" && (activeElement === document.body || activeElement === formRef.current)) {
			savedPackageLinkRef.current?.focus({ preventScroll: true });
			saveConfirmationRef.current?.scrollIntoView({ block: "nearest" });
		}
	}, [saveState.kind]);

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
						formRef.current?.querySelector<HTMLButtonElement>("#year")?.focus();
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

	const navigateToStep = (step: Step) => {
		flushSync(() => {
			setCurrentStep(step);
			setStepsOpen(false);
		});
		const form = formRef.current;
		if (!form) return;

		form.focus({ preventScroll: true });
		const top = form.getBoundingClientRect().top;
		const scrollMargin = Number.parseFloat(getComputedStyle(form).scrollMarginTop);
		if (top < scrollMargin || top >= window.innerHeight) {
			form.scrollIntoView({ block: "start" });
		}
	};

	const goToNextStep = async () => {
		const isCurrentStepValid = await validateCurrentStep();
		if (!isCurrentStepValid) {
			return;
		}

		if (currentIndex < STEPS.length - 1) {
			navigateToStep(STEPS[currentIndex + 1].id);
		}
	};

	const goToPreviousStep = () => {
		if (currentIndex > 0) {
			navigateToStep(STEPS[currentIndex - 1].id);
		}
	};

	const handleStepChange = async (nextStep: Step) => {
		const nextIndex = STEPS.findIndex((step) => step.id === nextStep);

		if (nextIndex > currentIndex) {
			const isCurrentStepValid = await validateCurrentStep();
			if (!isCurrentStepValid) {
				return;
			}
		}

		navigateToStep(nextStep);
	};

	const _onSubmit = async (data: IPackageDetails) => {
		if (["saving", "unknown", "saved", "conflict"].includes(saveStateRef.current.kind)) return;
		transitionSave({ kind: "saving" });
		setSubmissionErrors([]);
		setAttemptedDraft(structuredClone(getValues()));
		try {
			const res = await fetch(
				data._id ? "/api/packages/update" : "/api/packages/create",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...data, _id: baseline._id, editToken: baseline.editToken }),
				},
			);
			const body = await res.json().catch(() => null) as { success?: boolean; packageId?: string; error?: string; code?: string; message?: string } | null;
			if (!res.ok) {
				if (res.status === 409 && isPackageEditConflict(body)) {
					transitionSave({ kind: "conflict", message: body.message });
					return;
				}
				transitionSave({
					kind: res.status === 400 ? "rejected" : "unknown",
					message: res.status === 400
						? isPackageReferenceConflict(body)
							? body.message
							: "The package was not saved. Correct the invalid fields and save again. Your complete draft is still here."
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
			attemptedDraft,
			outcome: saveStateRef.current.kind,
		}, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "mkm-package-draft.json";
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const saveBlocked = ["saving", "unknown", "saved", "conflict"].includes(saveState.kind);

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
		<div className="workspace-page max-w-6xl animate-slideIn">
			<div className="@container min-w-0">
				<div className="grid min-w-0 grid-cols-1 gap-3 @min-[52rem]:grid-cols-[minmax(0,1fr)_14rem] @min-[52rem]:gap-6">
					<PackageStepNavigation
						currentIndex={currentIndex}
						open={stepsOpen}
						onOpenChange={setStepsOpen}
						onStepChange={handleStepChange}
					/>

					<form
						ref={formRef}
						tabIndex={-1}
						aria-label={STEPS[currentIndex].label}
						className="flex min-w-0 scroll-mt-32 flex-col gap-6 @min-[52rem]:col-start-1 @min-[52rem]:row-start-1 @min-[52rem]:scroll-mt-20"
						noValidate
						onSubmit={(event) => {
							if (currentStep !== "preview" || saveBlocked) {
								event.preventDefault();
								return;
							}
							return methods.handleSubmit(_onSubmit, onInvalid)(event);
						}}
					>
						{(saveState.kind === "unknown" || saveState.kind === "rejected" || saveState.kind === "conflict") && (
							<div role="alert" className="rounded-lg border border-destructive p-4 text-sm space-y-3">
								<p className="font-semibold">{saveState.message}</p>
								{saveState.kind === "conflict" && <Link className="underline" href={`/packages/edit/${packageId}`} target="_blank" rel="noopener noreferrer">Open latest package in another tab</Link>}
								{saveState.kind === "unknown" && <p>Saving again is blocked because the first request may have saved. Check Packages in another tab and open the saved record if present. An empty list does not prove the save failed. Download your draft before leaving or reloading this page.</p>}
								<div className="flex gap-4 items-center">
									<Button type="button" variant="outline" onClick={downloadDraft}>Download complete draft</Button>
									<a className="underline" href={`/packages?q=${encodeURIComponent(attemptedDraft?.name ?? "")}`} target="_blank" rel="noopener noreferrer">Check Packages in a new tab</a>
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
						<div
							ref={saveConfirmationRef}
							className={saveState.kind === "saved"
								? "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-card-foreground"
								: "sr-only"}
						>
							<p role="status" aria-atomic="true" className="text-sm font-semibold">
								{saveState.kind === "saved" ? "Package saved successfully." : ""}
							</p>
							{saveState.kind === "saved" && (
								<div className="flex flex-wrap items-center gap-2">
									<Button asChild size="sm">
										<a ref={savedPackageLinkRef} href={`/packages/edit/${saveState.packageId}`}>View saved package</a>
									</Button>
									<Button asChild size="sm" variant="outline">
										<Link href="/packages">Back to Packages</Link>
									</Button>
								</div>
							)}
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default PackageBuilder;
