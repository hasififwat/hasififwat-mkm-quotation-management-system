import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import React, { useState } from "react";
import {
	Controller,
	FormProvider,
	useFieldArray,
	useForm,
	useFormContext,
} from "react-hook-form";
import {
	useLoaderData,
	useParams,
	useRouteLoaderData,
	useSubmit,
} from "react-router";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { PackageDetails, RoomType } from "~/schema";
import { CreateClientModal } from "./components/CreateClientModal";
import type { QuotationFormValues } from "./schema";
import { quotationFormSchema } from "./schema";

type Step = "basic" | "package" | "extras";

const STEPS: { id: Step; label: string }[] = [
	{ id: "basic", label: "Client Details" },
	{ id: "package", label: "Package Selection" },
	{ id: "extras", label: "Add-ons & Discounts" },
];

function HotelSelection({
	selectedPackage,
}: {
	selectedPackage: PackageDetails | null;
}) {
	const { control } = useFormContext<QuotationFormValues>();
	// We use useFieldArray to manage the selected_rooms array
	const { fields, append, remove } = useFieldArray({
		control,
		name: "selected_rooms",
	});

	const availableRooms = selectedPackage?.rooms?.filter((r) => r.enabled) || [];

	const handleToggleRoom = (roomToCheck: RoomType, isChecked: boolean) => {
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
				{availableRooms.map((room) => {
					// Check if this room is already selected
					const selectedIndex = fields.findIndex(
						(f: any) => f.room_type === room.room_type,
					);
					const isSelected = selectedIndex !== -1;

					return (
						<Card
							key={room.room_type}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									// handleToggleRoom(room as RoomType, !isSelected);
								}
							}}
							tabIndex={0}
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
											handleToggleRoom(room as RoomType, checked === true)
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
									</div>
								</div>
							</div>

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
											{...field}
											id={`addon-price-${index}`}
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
											{...field}
											id={`discount-price-${index}`}
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
	selectedPackage: PackageDetails | null;
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
								<SelectItem key={flight.id} value={flight.id as string}>
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

export default function QuotationBuilder() {
	const { initialData, allPackages, allClients } = useLoaderData();
	const { profile } = useRouteLoaderData("routes/_protected");
	const { qid } = useParams();
	const submit = useSubmit();
	const [currentStep, setCurrentStep] = useState<Step>("basic");

	// Track selected package state
	const [selectedPackage, setSelectedPackage] = useState<PackageDetails | null>(
		initialData?.package_id
			? allPackages.find((p: any) => p.id === initialData.package_id) || null
			: null,
	);

	const methods = useForm<any>({
		resolver: zodResolver(quotationFormSchema),
		defaultValues: initialData ?? {
			pic_name: profile.full_name || "",
			branch: profile.branch || "",
		},
		mode: "onChange",
	});

	const { setValue, getValues, handleSubmit, trigger } = methods;

	const option = allPackages.map((pkg: PackageDetails) => ({
		id: pkg.id,
		name: pkg.name,
		value: pkg.id,
	}));

	const clientOptions = allClients.map((client: any) => ({
		id: client.id,
		name: client.name || client.full_name || client.email,
		value: client.id,
	}));

	const goNext = async () => {
		let isValid = false;
		if (currentStep === "basic") {
			isValid = await trigger(["pic_name", "branch", "client_id"]);
			if (isValid) setCurrentStep("package");
		} else if (currentStep === "package") {
			isValid = await trigger(["package_id", "selected_rooms"]);
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
			const isPackageValid = await trigger(["package_id", "selected_rooms"]);
			if (!isPackageValid) return;
		}

		setCurrentStep(targetStep);
	};

	const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

	const onSubmit = (data: any) => {
		submit(data, { method: "post", encType: "application/json" });
	};

	return (
		<div className="col-span-12 py-6 mx-2 sm:mx-4 lg:w-185 lg:mx-auto space-y-6 animate-slideIn">
			<div>
				<h2 className="text-xl md:text-2xl font-bold tracking-tight">
					{qid ? "Edit Quotation" : "Create Quotation"}
				</h2>
				<p className="text-slate-500 text-xs md:text-sm">
					Follow the steps to generate a quotation.
				</p>
			</div>

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
			<form
				id="quotation-form"
				className="mx-auto lg:mx-0"
				onSubmit={handleSubmit(onSubmit)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						if (currentStep !== "extras") {
							goNext();
						}
					}
				}}
			>
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
													onSuccess={(clientId) => {
														field.onChange(clientId);
													}}
												/>
											</div>
											<SearchableDropdown
												options={clientOptions}
												placeholder="Select a client"
												optionValueKey="id"
												optionsLabelKey="name"
												value={field.value}
												disabled={qid != null} // Disable client change when editing existing quotation
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
												handleSelect={(selectedId) => {
													const selectedPkg = allPackages.find(
														(pkg: PackageDetails) => pkg.id === selectedId,
													);

													if (selectedPkg) {
														setSelectedPackage(selectedPkg);
														field.onChange(selectedId);
														// Reset selected rooms when package changes
														setValue("selected_rooms", []);
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

							<Button
								type="button"
								className={`gap-2  ${currentStep === "extras" ? "hidden" : ""}`}
								onClick={goNext}
							>
								Next
							</Button>
							<Button
								type="submit"
								className={`gap-2  ${currentStep !== "extras" ? "hidden" : ""}`}
								hidden={currentStep !== "extras"}
							>
								<Save className="w-4 h-4" />
								Save
							</Button>
						</CardFooter>
					</Card>
				</FormProvider>
			</form>
		</div>
	);
}
