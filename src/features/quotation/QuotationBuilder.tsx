"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import React, { useRef, useState } from "react";
import {
	Controller,
	FormProvider,
	useFieldArray,
	useForm,
	useFormContext,
} from "react-hook-form";
import { useConvex, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchableDropdown } from "~/components/SearchableDropdown";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { SeasonBadge } from "~/components/ui/season-badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { ClientSummary } from "~/features/clients/types";
import { CreateClientModal } from "./components/CreateClientModal";
import type { ClientsListResult, QuotationPackage } from "./loader-utils";
import type { QuotationFormInput, QuotationFormValues } from "./schema";
import { quotationFormSchema } from "./schema";
import { STALE_FIELD_LABELS } from "./stale-labels";
import { beginRevisionAttempt, finishRevisionAttempt, type RevisionSource, type RevisionSaveSession, type RevisionAttempt } from "./revision-command";
import { saveRevisionAttempt } from "./save-quotation";
import { saveQuotation, type QuotationCreateAttempt } from "./save-quotation";
import { refreshQuotationSnapshot, type RefreshSnapshotResult, type RefreshSnapshotState } from "./refresh-snapshot";

type Step = "basic" | "package" | "extras";

const STEPS: { id: Step; label: string }[] = [
	{ id: "basic", label: "Client Details" },
	{ id: "package", label: "Package Selection" },
	{ id: "extras", label: "Add-ons & Discounts" },
];

type PackageOption = QuotationPackage;

type QuotationBuilderLoaderData = {
	initialData: QuotationFormValues | null;
	allPackages: PackageOption[];
	allClients: ClientsListResult;
	stale_fields?: string[];
	snapshot_version_known?: boolean;
};

type QuotationLineItemPayload = {
	name: string;
	price: number;
	pax: number;
};

const sanitizeLineItems = (
	items: QuotationFormValues["adds_ons"] | QuotationFormValues["discounts"],
): QuotationLineItemPayload[] | undefined => {
	return items?.map(({ name, price, pax }) => ({
		name,
		price,
		pax,
	}));
};

function HotelSelection({
	selectedPackage,
}: {
	selectedPackage: QuotationPackage | null;
}) {
	const { control, watch } = useFormContext<QuotationFormValues>();
	const selectedRooms = watch("selected_rooms");
	const { fields, append, remove } = useFieldArray({
		control,
		name: "selected_rooms",
	});

	const availableRooms = selectedPackage?.rooms?.filter((r) => r.enabled) || [];
	const displayedRooms = [
		...availableRooms,
		...(selectedRooms ?? [])
			.filter((saved) => !availableRooms.some((room) => room.room_type === saved.room_type))
			.map((saved) => ({ ...saved, enabled: false })),
	];

	const handleToggleRoom = (
		roomToCheck: Pick<QuotationPackage["rooms"][number], "room_type" | "price">,
		isChecked: boolean,
	) => {
		if (isChecked) {
			append({
				room_type: roomToCheck.room_type,
				price: roomToCheck.price,
				pax: 1, // Default pax
			});
		} else {
			const index = fields.findIndex(
				(f: QuotationFormValues["selected_rooms"][number]) =>
					f.room_type === roomToCheck.room_type,
			);
			if (index !== -1) {
				remove(index);
			}
		}
	};

	if (selectedPackage == null) {
		return null;
	}

	return (
		<FieldSet className="col-span-full">
			<FieldLegend variant="label">Room Selection</FieldLegend>
			<FieldDescription>
				Select the room types to include in the quotation and their respective
				pax count.
			</FieldDescription>
			<FieldGroup className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{displayedRooms.map((room) => {
					const selectedIndex = fields.findIndex(
						(f: QuotationFormValues["selected_rooms"][number]) =>
							f.room_type === room.room_type,
					);
					const isSelected = selectedIndex !== -1;

					return (
						<Card
							key={room.room_type}
							className={`
                relative flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
									isSelected
										? "border-primary bg-primary/5 ring-2 ring-primary/20"
										: "border-muted hover:border-muted-foreground/50"
								}
              `}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-3">
									<Checkbox
										id={`room-${room.room_type}`}
										checked={isSelected}
										onCheckedChange={(checked) =>
											handleToggleRoom(room, checked === true)
										}
										onClick={(e) => e.stopPropagation()}
									/>
									<div>
										<label
											htmlFor={`room-${room.room_type}`}
											className="font-semibold cursor-pointer block"
										>
											{room.room_type}
										</label>
										<span className="text-xs text-muted-foreground">
											RM {room.price.toLocaleString("en-MY")}
										</span>
										{!room.enabled && (
											<p className="text-xs text-amber-700 dark:text-amber-400">
												Unavailable. Keep this saved room and price, or remove it.
												To replace it, remove it and select an available room.
											</p>
										)}
										{isSelected && selectedRooms?.[selectedIndex]?.price !== room.price && (
											<p className="text-xs text-amber-700">
												Entered price RM {selectedRooms?.[selectedIndex]?.price.toLocaleString("en-MY")} retained.
												Remove and select this room again to use the current price.
											</p>
										)}
									</div>
								</div>
							</div>
							{!room.enabled && (
								<Button type="button" variant="outline" size="sm" onClick={() => remove(selectedIndex)} onKeyDown={(event) => event.stopPropagation()}>
									Remove {room.room_type}
								</Button>
							)}

							<div className="pt-2 ">
								{selectedIndex !== -1 && (
									<Controller
										control={control}
										name={`selected_rooms.${selectedIndex}.pax`}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel
													htmlFor={`pax-${room.room_type}`}
													className="text-xs"
												>
													Pax Count
												</FieldLabel>
												<Input
													{...field}
													id={`pax-${room.room_type}`}
													type="number"
													min={1}
													className="h-8 bg-background"
													placeholder="Pax"
													onClick={(e) => e.stopPropagation()}
													onChange={(e) =>
														field.onChange(Number(e.target.value))
													}
													disabled={!isSelected}
													aria-invalid={fieldState.invalid}
												/>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
								)}
								{isSelected && (
									<p className="mt-2 text-xs text-muted-foreground">
										Room total RM {((selectedRooms?.[selectedIndex]?.price ?? 0) * (selectedRooms?.[selectedIndex]?.pax ?? 0)).toLocaleString("en-MY")}
									</p>
								)}
							</div>
						</Card>
					);
				})}
			</FieldGroup>
			{fields.length === 0 && (
				<p className="text-sm text-destructive ">
					* Please select at least one room type.
				</p>
			)}
		</FieldSet>
	);
}

function AddOnSection() {
	const { control } = useFormContext<QuotationFormValues>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "adds_ons",
	});

	return (
		<div className="col-span-full space-y-4">
			<div className="flex flex-col sm:flex-row  gap-2 items-center justify-between">
				<div className="space-y-0.5">
					<FieldLegend variant="label">Add-ons</FieldLegend>
					<FieldDescription>
						Add extra items or services to the quotation.
					</FieldDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => append({ name: "", price: 0, pax: 1 })}
					className="gap-2 w-full sm:w-auto"
				>
					<Plus className="h-4 w-4" />
					Add Item
				</Button>
			</div>

			<div className="space-y-4">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="grid grid-cols-12 gap-3 items-start animate-in fade-in slide-in-from-top-2 p-3 border rounded-lg lg:border-0 lg:p-0"
					>
						<div className="col-span-12 lg:col-span-6">
							<Controller
								control={control}
								name={`adds_ons.${index}.name`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`addon-name-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Description
										</FieldLabel>
										<Input
											{...field}
											id={`addon-name-${index}`}
											placeholder="e.g. Extra Bed, Wheelchair"
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div className="col-span-6 lg:col-span-3">
							<Controller
								control={control}
								name={`adds_ons.${index}.price`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`addon-price-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Price (RM)
										</FieldLabel>
										<Input
											type="number"
											min={0}
											step={0.01}
											{...field}
											id={`addon-price-${index}`}
											value={Number.isNaN(field.value) ? "" : field.value}
											onChange={(e) => field.onChange(e.currentTarget.valueAsNumber)}
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div className="col-span-4 lg:col-span-2">
							<Controller
								control={control}
								name={`adds_ons.${index}.pax`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`addon-pax-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Pax
										</FieldLabel>
										<Input
											type="number"
											min={1}
											{...field}
											id={`addon-pax-${index}`}
											onChange={(e) => field.onChange(Number(e.target.value))}
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div
							className={`col-span-2 lg:col-span-1 flex justify-center items-end h-full lg:items-start ${
								index === 0 ? "lg:pt-6" : ""
							}`}
						>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive/90 h-9 w-9 mt-6 lg:mt-0"
								onClick={() => remove(index)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}

				{fields.length === 0 && (
					<div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
						No add-ons added yet
					</div>
				)}
			</div>
		</div>
	);
}

function DiscountSection() {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "discounts",
	});

	return (
		<div className="col-span-full space-y-4">
			<div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
				<div className="space-y-0.5">
					<FieldLegend variant="label">Discounts</FieldLegend>
					<FieldDescription>Add discounts to the quotation.</FieldDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => append({ name: "", price: 0, pax: 1 })}
					className="gap-2 w-full sm:w-auto"
				>
					<Plus className="h-4 w-4" />
					Add Discount
				</Button>
			</div>

			<div className="space-y-4">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="grid grid-cols-12 gap-3 items-start animate-in fade-in slide-in-from-top-2 p-3 border rounded-lg lg:border-0 lg:p-0"
					>
						<div className="col-span-12 lg:col-span-6">
							<Controller
								control={control}
								name={`discounts.${index}.name`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`discount-name-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Description
										</FieldLabel>
										<Input
											{...field}
											id={`discount-name-${index}`}
											placeholder="e.g. Seasonal Discount, Member Discount"
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div className="col-span-6 lg:col-span-3">
							<Controller
								control={control}
								name={`discounts.${index}.price`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`discount-price-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Amount (RM)
										</FieldLabel>
										<Input
											type="number"
											min={0}
											step={0.01}
											{...field}
											id={`discount-price-${index}`}
											value={Number.isNaN(field.value) ? "" : field.value}
											onChange={(e) => field.onChange(e.currentTarget.valueAsNumber)}
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div className="col-span-4 lg:col-span-2">
							<Controller
								control={control}
								name={`discounts.${index}.pax`}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel
											htmlFor={`discount-pax-${index}`}
											className={index === 0 ? "" : "lg:sr-only"}
										>
											Pax
										</FieldLabel>
										<Input
											type="number"
											min={1}
											{...field}
											id={`discount-pax-${index}`}
											onChange={(e) => field.onChange(Number(e.target.value))}
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div
							className={`col-span-2 lg:col-span-1 flex justify-center items-end h-full lg:items-start ${
								index === 0 ? "lg:pt-6" : ""
							}`}
						>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive/90 h-9 w-9 mt-6 lg:mt-0"
								onClick={() => remove(index)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}

				{fields.length === 0 && (
					<div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
						No discounts added yet
					</div>
				)}
			</div>
		</div>
	);
}

function FlightSelection({
	selectedPackage,
}: {
	selectedPackage: QuotationPackage | null;
}) {
	const { control } = useFormContext<QuotationFormValues>();

	if (!selectedPackage) {
		return null;
	}

	return (
		<Controller
			name="flight_id"
			control={control}
			render={({ field, fieldState }) => (
				<Field data-invalid={fieldState.invalid}>
					<FieldLabel htmlFor="flight_id">Flight Selection</FieldLabel>
					<Select
						name={field.name}
						value={field.value}
						onValueChange={field.onChange}
					>
						<SelectTrigger id="flight_id" aria-invalid={fieldState.invalid}>
							<SelectValue placeholder="Select" />
						</SelectTrigger>
						<SelectContent>
							{selectedPackage.flights?.map((flight) => (
								<SelectItem key={String(flight._id)} value={String(flight._id)}>
									{flight.departure_date} ({flight.departure_sector} ) -{" "}
									{flight.return_date} ({flight.return_sector})
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
				</Field>
			)}
		/>
	);
}

export default function QuotationBuilder({
	initialData,
	initialClientId,
	allPackages,
	allClients,
	qid,
	stale_fields = [],
	snapshot_version_known = false,
	revisionEnabled = false,
	revisionActor,
	revisionSource,
}: {
	initialData: QuotationFormValues | null;
	initialClientId?: string;
	allPackages: QuotationBuilderLoaderData["allPackages"];
	allClients: QuotationBuilderLoaderData["allClients"];
	qid?: string;
	stale_fields?: string[];
	snapshot_version_known?: boolean;
	revisionEnabled?: boolean;
	revisionActor?: string;
	revisionSource?: RevisionSource;
}) {
	const router = useRouter();
	const [revisionSession, setRevisionSession] = useState<RevisionSaveSession>({kind: "editing"});
	const revisionFlight = useRef(false);
	const [selectionMode, setSelectionMode] = useState<"retain" | "replace">(revisionSource ? "retain" : "replace");
	const [catalogReview, setCatalogReview] = useState<QuotationPackage[] | null>(null);
	const [reviewPackageId, setReviewPackageId] = useState("");
	const [staleCurrentId, setStaleCurrentId] = useState<string | null>(null);
	const revisionLocked = revisionSession.kind === "pending" || revisionSession.kind === "uncertain" || revisionSession.kind === "saved";
	const convex = useConvex();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isReviewing, setIsReviewing] = useState(false);
	const [packageOptions, setPackageOptions] = useState(allPackages);
	const [saveError, setSaveError] = useState<{ message: string; conflict: boolean } | null>(null);
	const [reviewNotice, setReviewNotice] = useState("");
	const [refreshState, setRefreshState] = useState<RefreshSnapshotState>({ status: "idle" });
	const refreshRequest = useRef<Promise<RefreshSnapshotResult> | null>(null);
	const createAttempt = useRef<QuotationCreateAttempt | null>(null);

	const handleRefreshSnapshot = async () => {
		if (!qid || refreshRequest.current) return;
		const pending = refreshQuotationSnapshot(qid);
		refreshRequest.current = pending;
		setRefreshState({ status: "pending" });
		try {
			const result = await pending;
			setRefreshState(result);
			if (result.status === "success") router.refresh();
		} finally {
			refreshRequest.current = null;
		}
	};

	const profile = useQuery(api.profiles.getMyProfile);
	const [currentStep, setCurrentStep] = useState<Step>("basic");
	const [inlineClients, setInlineClients] = useState<Record<string, ClientSummary>>(
		{},
	);

	// Track selected package state
	const [selectedPackage, setSelectedPackage] =
		useState<QuotationPackage | null>(
			initialData?.package_id
				? allPackages.find(
						(pkg) => String(pkg._id) === initialData.package_id,
					) || null
				: null,
		);

	const methods = useForm<QuotationFormInput, unknown, QuotationFormValues>({
		resolver: zodResolver(quotationFormSchema),
		defaultValues: initialData ?? {
			pic_name: profile?.full_name || "",
			branch: profile?.branch || "",
			client_id: initialClientId ?? "",
		},
		mode: "onChange",
	});

	const { setValue, handleSubmit, trigger } = methods;

	const option = packageOptions.map((pkg) => ({
		id: String(pkg._id),
		name: pkg.name,
		value: String(pkg._id),
		season: pkg.season,
	}));

	const clientsById = new Map<string, ClientSummary>(
		allClients.map((client) => [client.id, client]),
	);
	if (revisionSource) clientsById.set(revisionSource.client_id, {
		id: revisionSource.client_id, name: revisionSource.saved_document.client_name,
	});
	for (const client of Object.values(inlineClients)) {
		clientsById.set(client.id, client);
	}
	const clientOptions = Array.from(clientsById.values(), (client) => ({
		id: client.id,
		name: client.name || "Unnamed Client",
		value: client.id,
	}));

	const goNext = async () => {
		let isValid = false;
		if (currentStep === "basic") {
			isValid = await trigger(["pic_name", "branch", "client_id"]);
			if (isValid) setCurrentStep("package");
		} else if (currentStep === "package") {
			isValid = await trigger(["package_id", "selected_rooms", "flight_id"]);
			if (isValid) setCurrentStep("extras");
		}
	};

	const goBack = () => {
		if (currentStep === "package") setCurrentStep("basic");
		if (currentStep === "extras") setCurrentStep("package");
	};

	const handleStepClick = async (targetStep: Step) => {
		const targetIndex = STEPS.findIndex((s) => s.id === targetStep);
		const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

		if (targetIndex === currentIndex) return;

		if (targetIndex < currentIndex) {
			setCurrentStep(targetStep);
			return;
		}

		if (targetIndex > 0) {
			const isBasicValid = await trigger(["pic_name", "branch", "client_id"]);
			if (!isBasicValid) return;
		}

		if (targetIndex > 1) {
			const isPackageValid = await trigger(["package_id", "selected_rooms", "flight_id"]);
			if (!isPackageValid) return;
		}

		setCurrentStep(targetStep);
	};

	const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

	const reviewLatestPackage = async () => {
		setIsReviewing(true);
		try {
			const latestPackages = await convex.query(api.packages.listWithRooms, {});
			const latest = latestPackages.find((pkg) => String(pkg._id) === methods.getValues("package_id"));
			if (revisionEnabled) {
				setCatalogReview(latestPackages);
				setReviewPackageId(latest ? String(latest._id) : "");
				setReviewNotice("Review current catalog details, then explicitly choose Use reviewed selection. Opening this review does not change your saved selection or entered values.");
				return;
			}
			setPackageOptions(latestPackages);
			setSelectedPackage(latest ?? null);
			setCurrentStep("package");
			if (!latest) {
				setValue("package_id", "");
				setValue("flight_id", "");
				setValue("selected_rooms", []);
				setReviewNotice("The selected package is no longer available. Choose another package. Your client details, notes, add-ons, and discounts are retained.");
			} else {
				const rooms = methods.getValues("selected_rooms") ?? [];
				const available = rooms.filter((room) => latest.rooms.some((option) => option.enabled && option.room_type === room.room_type));
				const removedRooms = rooms.filter((room) => !available.includes(room)).map((room) => room.room_type);
				setValue("selected_rooms", available);
				const flightRemoved = !latest.flights.some((flight) => String(flight._id) === methods.getValues("flight_id"));
				if (flightRemoved) setValue("flight_id", "");
				setReviewNotice(`Review the latest itinerary and room prices below. Your entered prices and other draft details are retained.${removedRooms.length > 0 ? ` Unavailable rooms removed: ${removedRooms.join(", ")}. Select replacements before saving.` : ""}${flightRemoved ? " The selected flight is no longer available and has been cleared. Choose another flight." : ""}`);
			}
			setSaveError(null);
		} catch {
			setSaveError({ message: "Could not load the latest package. Your draft is retained. Try reviewing again.", conflict: true });
		} finally {
			setIsReviewing(false);
		}
	};

	const commitRevision = async (attempt: RevisionAttempt, recovering = false) => {
		if (revisionFlight.current) return;
		revisionFlight.current = true;
		setRevisionSession({kind: "pending", attempt});
		try {
			const result = await saveRevisionAttempt(attempt);
			setRevisionSession(finishRevisionAttempt(attempt, result, recovering));
			if (result.kind === "rejected") {
				if (result.conflict === "stale" && qid) {
					try { const current = await convex.query(api.quotations.getQuotationFullDetails, {target_quotation_id: qid}); setStaleCurrentId(current?.revision_context.current_revision_id ?? null); } catch {}
				}
			} else if (result.kind === "saved") {
				router.push(`/quotations/review/${encodeURIComponent(result.id)}?saved=1`);
			}
		} finally { revisionFlight.current = false; }
	};

	const useReviewedSelection = () => {
		const pkg = catalogReview?.find(value => String(value._id) === reviewPackageId);
		if (!pkg || !catalogReview) return;
		const currentRooms = methods.getValues("selected_rooms") ?? [];
		const samePackage = methods.getValues("package_id") === String(pkg._id);
		setPackageOptions(catalogReview);
		setSelectedPackage(pkg);
		setValue("package_id", String(pkg._id));
		setValue("selected_rooms", samePackage ? currentRooms.filter(room => pkg.rooms.some(option => option.enabled && option.room_type === room.room_type)) : []);
		if (!samePackage || !pkg.flights.some(flight => String(flight._id) === methods.getValues("flight_id"))) setValue("flight_id", "");
		setSelectionMode("replace");
		setCatalogReview(null);
		setCurrentStep("package");
		setReviewNotice("Reviewed catalog selected for this draft. Check the flight, room quantities and entered prices. Save creates a new draft revision; earlier revisions stay unchanged.");
	};

	const onSubmit = async (data: QuotationFormValues) => {
		if (revisionEnabled) {
			if (revisionLocked || revisionFlight.current) return;
			try {
				const attempt = beginRevisionAttempt(data, revisionSource, selectionMode === "retain" ? {mode: "retain"} : {mode: "replace", catalog: selectedPackage}, crypto.randomUUID(), revisionActor ?? "");
				await commitRevision(attempt);
			} catch (error) { setRevisionSession({kind: "rejected", message: error instanceof Error ? error.message : "Your draft is retained. Review its details before saving."}); }
			return;
		}
		if (!qid && !createAttempt.current) {
			createAttempt.current = { requestKey: crypto.randomUUID() };
		}
		const basePayload = {
			pic_name: data.pic_name ?? "",
			branch: data.branch ?? "",
			client_id: data.client_id,
			package_id: data.package_id,
			flight_id: data.flight_id,
			notes: data.notes ?? "",
			status: data.status,
			selected_rooms: data.selected_rooms,
			adds_ons: sanitizeLineItems(data.adds_ons) ?? [],
			discounts: sanitizeLineItems(data.discounts) ?? [],
		};
		const payload = qid ? { ...basePayload, id: data.id ?? qid } : {
			...basePayload,
			request_key: createAttempt.current?.requestKey,
			reviewed_context: selectedPackage?.creation_context,
		};

		setIsSubmitting(true);
		setSaveError(null);
		try {
			const result = await saveQuotation(payload, qid);
			if (!result.ok) {
				setSaveError({ message: result.message, conflict: !qid && result.selectionConflict === true });
				return;
			}
			router.push(`/quotations/review/${encodeURIComponent(result.id)}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 lg:mx-auto space-y-6 animate-slideIn">
			<div className="flex items-center gap-4">
				<Link href="/quotations" className="text-sm text-muted-foreground">
					<Button variant="ghost" size="icon">
						<ChevronLeft className="w-5 h-5" />
					</Button>
				</Link>
				<h2 className="text-xl md:text-2xl font-bold tracking-tight">
					{qid ? "Edit Quotation" : "Create Quotation"}
				</h2>
			</div>

			{revisionEnabled && <p className="rounded-lg border bg-muted p-4 text-sm">{revisionSource ? `Editing ${revisionSource.reference_number}. ` : ""}Every intentional Save creates a new draft revision, including an unchanged save. Earlier revisions and issued PDFs stay unchanged. Cancel creates no revision.</p>}
			{revisionSession.kind === "uncertain" || revisionSession.kind === "rejected" ? <div role="alert" className="space-y-3 rounded-lg border border-destructive p-4 text-sm"><p>{revisionSession.message}</p>
				{revisionSession.kind === "uncertain" && <Button type="button" onClick={() => { if (revisionSession.kind === "uncertain") void commitRevision(revisionSession.attempt, true); }}>Retry this save</Button>}
				{revisionSession.kind === "rejected" && revisionSession.conflict === "selection" && <Button type="button" variant="outline" onClick={reviewLatestPackage}>Review latest package</Button>}
				{revisionSession.kind === "rejected" && revisionSession.conflict === "stale" && qid && <Link className="block underline" target="_blank" rel="noopener noreferrer" href={staleCurrentId ? `/quotations/review/${staleCurrentId}` : `/quotations/${qid}/history`}>View current revision in a new tab</Link>}
				<Link className="block underline" target="_blank" rel="noopener noreferrer" href="/">Open sign-in in a new tab</Link>
			</div> : null}
			{catalogReview && <section aria-label="Review catalog replacement" className="space-y-4 rounded-lg border p-4">
				<h3 className="font-semibold">Review catalog replacement</h3><p className="text-sm">The saved selection is retained until you explicitly use a reviewed selection.</p>
				<label className="block text-sm">Current catalog package<select className="mt-1 block w-full rounded border bg-background p-2" value={reviewPackageId} onChange={event => setReviewPackageId(event.target.value)}><option value="">Choose a package</option>{catalogReview.map(pkg => <option key={String(pkg._id)} value={String(pkg._id)}>{pkg.name}</option>)}</select></label>
				{catalogReview.filter(pkg => String(pkg._id) === reviewPackageId).map(pkg => <div key={String(pkg._id)} className="space-y-2 text-sm"><p>{pkg.name} · {pkg.duration}</p>{pkg.flights.map(flight => <p key={String(flight._id)}>{flight.departure_date} {flight.departure_sector} to {flight.return_date} {flight.return_sector}</p>)}{pkg.rooms.filter(room => room.enabled).map(room => <p key={room.room_type}>{room.room_type} · Catalog RM {room.price.toFixed(2)}</p>)}</div>)}
				<div className="flex flex-wrap gap-3"><Button type="button" disabled={!reviewPackageId || revisionLocked} onClick={useReviewedSelection}>Use reviewed selection</Button><Button type="button" variant="outline" onClick={() => setCatalogReview(null)}>Cancel replacement review</Button></div>
			</section>}
			{saveError && (
				<div role="alert" className="space-y-3 rounded-lg border border-destructive bg-destructive/5 p-4 text-sm">
					<p>{saveError.message}{saveError.conflict && " No quotation was saved. Your draft is retained."}</p>
					{saveError.conflict && (
						<Button type="button" variant="outline" onClick={reviewLatestPackage} disabled={isReviewing}>
							{isReviewing ? "Loading latest package..." : "Review latest package"}
						</Button>
					)}
					{!saveError.conflict && (
						<Link href="/quotations" target="_blank" rel="noopener noreferrer" className="inline-block underline">
							Check Quotations in a new tab
						</Link>
					)}
				</div>
			)}
			{reviewNotice && <p role="status" className="rounded-lg border bg-muted p-4 text-sm">{reviewNotice}</p>}

			{/* Step Navigation Header */}
			<Card>
				<CardContent>
					<div className="flex items-center justify-between">
						{STEPS.map((step, index) => (
							<React.Fragment key={step.id}>
								<button
									type="button"
									onClick={() => handleStepClick(step.id)}
									className={`flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed hover:opacity-80 ${
										index <= currentStepIndex
											? "text-primary font-semibold"
											: "text-muted-foreground"
									}`}
								>
									<div
										className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
											index <= currentStepIndex
												? "border-primary bg-primary text-primary-foreground"
												: "border-muted-foreground"
										}`}
									>
										<span className="text-sm">{index + 1}</span>
									</div>
									<span className="hidden lg:inline text-sm">{step.label}</span>
								</button>
								{index < STEPS.length - 1 && (
									<Separator
										className={`flex-1 mx-2 ${index < currentStepIndex ? "bg-primary" : ""}`}
									/>
								)}
							</React.Fragment>
						))}
					</div>
				</CardContent>
			</Card>
			{!revisionEnabled && qid && stale_fields.length > 0 && (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					<span className="mt-0.5 text-base">⚠</span>
					<div className="flex-1">
						<p className="font-medium">Verify this quotation&apos;s saved details.</p>
						<p className="text-amber-700 mt-0.5">
							Details requiring verification:{" "}
							<span className="font-medium">
								{stale_fields.map(f => STALE_FIELD_LABELS[f] ?? f).join(", ")}
							</span>.
							The PDF uses saved snapshot values where available.
						</p>
					</div>
					<button
						type="button"
						className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
						disabled={refreshState.status === "pending"}
						aria-busy={refreshState.status === "pending"}
						onClick={handleRefreshSnapshot}
					>
						{refreshState.status === "pending" ? "Refreshing snapshot..." : "Refresh snapshot"}
					</button>
				</div>
			)}

			{!revisionEnabled && qid && refreshState.status !== "idle" && (
				<div
					role={refreshState.status === "failure" || refreshState.status === "uncertain" ? "alert" : "status"}
					className="rounded-lg border bg-muted p-4 text-sm space-y-2"
				>
					<p>
						{refreshState.status === "pending"
							? "Refreshing the saved snapshot. Your entries are kept on this page."
							: refreshState.status === "success"
								? "Snapshot refreshed. Existing quoted prices, passenger counts, add-ons, discounts, and totals were kept."
								: refreshState.message}
					</p>
					{refreshState.status !== "pending" && (
						<p>
							<Link href={`/quotations/review/${qid}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">
								View saved quotation (opens in a new tab)
							</Link>
							{" "}to verify its details. Unsaved entries on this page are not included.
						</p>
					)}
				</div>
			)}

			{!revisionEnabled && qid && !snapshot_version_known && (
				<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
					<span>🕐</span>
					Some saved snapshot values are unavailable. Verify the current details.
				</div>
			)}

			<form
				id="quotation-form"
				className="mx-auto lg:mx-0"
				onSubmit={(event) => {
					void handleSubmit(onSubmit, (errors) => {
						if (errors.pic_name || errors.branch || errors.client_id) setCurrentStep("basic");
						else if (errors.package_id || errors.flight_id || errors.selected_rooms) setCurrentStep("package");
						else if (errors.adds_ons || errors.discounts) setCurrentStep("extras");
					})(event);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						if (currentStep !== "extras") {
							goNext();
						}
					}
				}}
			>
				<fieldset disabled={revisionLocked || isSubmitting} className="min-w-0">
				<FormProvider {...methods}>
					<Card>
						<CardHeader>
							<CardTitle>{STEPS[currentStepIndex].label}</CardTitle>
							<CardDescription>
								{currentStep === "basic" &&
									"Enter the client and person in charge details."}
								{currentStep === "package" &&
									"Select a travel package and room configuration."}
								{currentStep === "extras" &&
									"Add optional items and discounts."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Step 1: Basic Details */}
							<div
								className={
									currentStep === "basic"
										? "grid grid-cols-1 md:grid-cols-2 gap-4"
										: "hidden"
								}
							>
								{/* PIC Name */}
								<Controller
									name="pic_name"
									control={methods.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="pic_name">PIC Name</FieldLabel>
											<Input
												{...field}
												id="pic_name"
												aria-invalid={fieldState.invalid}
												placeholder="Enter PIC Name"
												autoComplete="off"
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<Controller
									name="branch"
									control={methods.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="branch">Branch</FieldLabel>
											<Input
												{...field}
												id="branch"
												aria-invalid={fieldState.invalid}
												placeholder="Enter Branch"
												autoComplete="off"
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								{/* Client Name */}
								<Controller
									name="client_id"
									control={methods.control}
									render={({ field, fieldState }) => (
										<Field
											data-invalid={fieldState.invalid}
											className="col-span-full"
										>
											<div className="flex items-center justify-between">
												<FieldLabel htmlFor="client_id">Client Name</FieldLabel>
												<CreateClientModal
													onSuccess={(client) => {
														setInlineClients((clients) => ({
															...clients,
															[client.id]: client,
														}));
														field.onChange(client.id);
													}}
												/>
											</div>
											<SearchableDropdown
												options={clientOptions}
												placeholder="Select a client"
												optionValueKey="id"
												optionsLabelKey="name"
												value={field.value}
												handleSelect={(selectedId) => {
													field.onChange(selectedId);
												}}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								{/* Notes */}
								<Controller
									name="notes"
									control={methods.control}
									render={({ field, fieldState }) => (
										<Field
											data-invalid={fieldState.invalid}
											className="col-span-full"
										>
											<FieldLabel htmlFor="notes">Notes</FieldLabel>
											<Input
												{...field}
												id="notes"
												aria-invalid={fieldState.invalid}
												placeholder="Optional notes"
												autoComplete="off"
											/>
										</Field>
									)}
								/>
							</div>

							{/* Step 2: Package Selection */}
							<div
								className={currentStep === "package" ? "space-y-6" : "hidden"}
							>
								{selectionMode === "retain" && revisionSource ? <div className="space-y-4">
									<p className="font-medium">Retained saved selection</p><p>{revisionSource.saved_document.package_snapshot?.name || "Package not recorded"}</p>
									<p className="text-sm">{revisionSource.saved_document.flight_snapshot ? `${revisionSource.saved_document.flight_snapshot.departure_date} ${revisionSource.saved_document.flight_snapshot.departure_sector} to ${revisionSource.saved_document.flight_snapshot.return_date} ${revisionSource.saved_document.flight_snapshot.return_sector}` : "Flight details not recorded"}</p>
									{revisionSource.selected_rooms.map((room, index) => <div key={room.source_item_id} className="grid grid-cols-1 gap-3 rounded border p-3 sm:grid-cols-3"><p>{room.room_type}</p><Controller name={`selected_rooms.${index}.price`} control={methods.control} render={({field, fieldState}) => <Field><FieldLabel htmlFor={`saved-price-${index}`}>Price (RM)</FieldLabel><Input id={`saved-price-${index}`} type="number" min="0" step="0.01" value={field.value} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))} />{fieldState.error && <FieldError errors={[fieldState.error]} />}</Field>} /><Controller name={`selected_rooms.${index}.pax`} control={methods.control} render={({field, fieldState}) => <Field><FieldLabel htmlFor={`saved-pax-${index}`}>Passengers</FieldLabel><Input id={`saved-pax-${index}`} type="number" min="1" step="1" value={field.value} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))} />{fieldState.error && <FieldError errors={[fieldState.error]} />}</Field>} /></div>)}
									<Button type="button" variant="outline" onClick={reviewLatestPackage} disabled={isReviewing}>{isReviewing ? "Loading catalog..." : "Review catalog to replace selection"}</Button>
								</div> : <>
								<Controller
									name="package_id"
									control={methods.control}
									render={({ field, fieldState }) => (
										<Field
											data-invalid={fieldState.invalid}
											className="col-span-full"
										>
											<FieldLabel htmlFor="package_id">
												Select Package
											</FieldLabel>

											<SearchableDropdown
												options={option}
												placeholder="Select a package"
												optionValueKey="id"
												optionsLabelKey="name"
												value={field.value}
												renderOption={(pkgOption) => (
													<div className="flex items-center justify-between w-full gap-2">
														<span className="truncate">{pkgOption.name}</span>
														<SeasonBadge
															season={String(pkgOption.season ?? "")}
														/>
													</div>
												)}
												renderSelected={(pkgOption) => (
													<div className="flex items-center justify-between w-full gap-2">
														<span className="truncate">
															{pkgOption?.name ?? "Select a package"}
														</span>
														<SeasonBadge
															season={String(pkgOption?.season ?? "")}
														/>
													</div>
												)}
												handleSelect={(selectedId) => {
													const selectedPkg = packageOptions.find(
														(pkg) => String(pkg._id) === selectedId,
													);

													if (selectedPkg) {
														setSelectedPackage(selectedPkg);
														field.onChange(selectedId);
														// Reset selected rooms and flight when package changes
														setValue("selected_rooms", []);
														setValue("flight_id", "");
													}
												}}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<FlightSelection selectedPackage={selectedPackage} />

								<HotelSelection selectedPackage={selectedPackage} />
								{revisionEnabled && <Button type="button" variant="outline" onClick={reviewLatestPackage} disabled={isReviewing}>Review latest catalog</Button>}
								</>}
							</div>

							{/* Step 3: Add-ons & Discounts */}
							<div
								className={currentStep === "extras" ? "space-y-8" : "hidden"}
							>
								<AddOnSection />
								<Separator />
								<DiscountSection />
							</div>
						</CardContent>


						<CardFooter className="flex justify-between border-t p-6">
							<Button
								type="button"
								variant="outline"
								onClick={goBack}
								disabled={currentStep === "basic"}
							>
								<ChevronLeft className="w-4 h-4 mr-2" />
								Previous
							</Button>

							{/* {currentStep !== "extras" ? (
              
              ) : (
                
              )} */}

							<div className="flex flex-wrap gap-2">
								<Link className="self-center px-2 text-sm underline" href={qid ? `/quotations/review/${qid}` : "/quotations"}>Cancel</Link>
								<Button
									type="button"
									variant="outline"
									className={`gap-2  ${currentStep === "extras" ? "hidden" : ""}`}
									onClick={goNext}
								>
									Next
								</Button>
								<Button
									type="submit"
									className={`gap-2  ${currentStep !== "extras" && !qid ? "hidden" : ""}`}
									hidden={currentStep !== "extras" && !qid}
									disabled={isSubmitting || revisionLocked}
								>
									{isSubmitting || revisionSession.kind === "pending" ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
												/>
											</svg>
											Saving...
										</>
									) : (
										<>
											<Save className="w-4 h-4" />
											{revisionEnabled ? "Save new revision" : "Save"}
										</>
									)}
								</Button>
							</div>
						</CardFooter>
					</Card>
				</FormProvider>
				</fieldset>
			</form>
		</div>
	);
}
