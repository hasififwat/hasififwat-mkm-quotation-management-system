import { ChevronLeft, ChevronRight, Plane, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { DatePicker } from "~/components/DatePicker";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import type { PackageDetailsForm } from "~/schema";

const MONTHS = [
	{ value: "JAN", label: "January" },
	{ value: "FEB", label: "February" },
	{ value: "MAR", label: "March" },
	{ value: "APR", label: "April" },
	{ value: "MAY", label: "May" },
	{ value: "JUN", label: "June" },
	{ value: "JUL", label: "July" },
	{ value: "AUG", label: "August" },
	{ value: "SEP", label: "September" },
	{ value: "OCT", label: "October" },
	{ value: "NOV", label: "November" },
	{ value: "DEC", label: "December" },
];

export default function FlightDetails({
	currentStep,
	goToNextStep,
	goToPreviousStep,
}: {
	currentStep: string;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}) {
	const { control } = useFormContext<PackageDetailsForm>();
	const { fields, append, remove } = useFieldArray<PackageDetailsForm>({
		control,
		name: "flights",
	});

	const handleAddFlight = () => {
		append({
			month: "",
			departure_date: "",
			departure_sector: "",
			return_date: "",
			return_sector: "",
		});
	};

	return (
		<Card hidden={currentStep !== "flights"}>
			<CardHeader>
				<CardTitle>
					<div className="flex justify-between items-center">
						<span>Flight Schedule</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleAddFlight}
							className="gap-2"
						>
							<Plus className="w-4 h-4" />
							Add Flight
						</Button>
					</div>
				</CardTitle>
				<CardDescription>
					Add flight schedules for this package. You can add multiple flight
					entries.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				{fields.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
						<Plane className="w-12 h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground mb-4">
							No flight schedules added yet
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={handleAddFlight}
							className="gap-2"
						>
							<Plus className="w-4 h-4" />
							Add Your First Flight
						</Button>
					</div>
				) : (
					fields.map((field, index) => (
						<div
							key={field.id}
							className="p-4 border rounded-lg space-y-4 bg-muted/30"
						>
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm text-muted-foreground">
									Flight #{index + 1}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => remove(index)}
									className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</div>

							{/* Hidden ID field for existing entries */}
							<Controller
								name={`flights.${index}.id`}
								control={control}
								render={({ field: idField }) => (
									<input type="hidden" {...idField} />
								)}
							/>

							{/* Month Select */}
							<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
								<Controller
									name={`flights.${index}.month`}
									control={control}
									render={({ field: monthField, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<Label>Month</Label>
											<Select
												value={monthField.value}
												onValueChange={monthField.onChange}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select month" />
												</SelectTrigger>
												<SelectContent>
													{MONTHS.map((month) => (
														<SelectItem key={month.value} value={month.value}>
															{month.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{fieldState.error && (
												<p className="text-xs text-destructive mt-1">
													{fieldState.error.message}
												</p>
											)}
										</Field>
									)}
								/>

								{/* Departure Date */}
								<Controller
									name={`flights.${index}.departure_date`}
									control={control}
									render={({ field: dateField, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<Label>Departure Date</Label>
											<DatePicker
												value={dateField.value}
												onChange={dateField.onChange}
												placeholder="Select date"
											/>
											{fieldState.error && (
												<p className="text-xs text-destructive mt-1">
													{fieldState.error.message}
												</p>
											)}
										</Field>
									)}
								/>

								{/* Departure Sector */}
								<Controller
									name={`flights.${index}.departure_sector`}
									control={control}
									render={({ field: sectorField, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<Label>Departure Sector</Label>
											<Input
												{...sectorField}
												placeholder="e.g., KUL-JED"
												className="w-full"
												maxLength={10}
											/>
											{fieldState.error && (
												<p className="text-xs text-destructive mt-1">
													{fieldState.error.message}
												</p>
											)}
										</Field>
									)}
								/>

								{/* Return Date */}
								<Controller
									name={`flights.${index}.return_date`}
									control={control}
									render={({ field: dateField, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<Label>Return Date</Label>
											<DatePicker
												value={dateField.value}
												onChange={dateField.onChange}
												placeholder="Select date"
											/>
											{fieldState.error && (
												<p className="text-xs text-destructive mt-1">
													{fieldState.error.message}
												</p>
											)}
										</Field>
									)}
								/>

								{/* Return Sector */}
								<Controller
									name={`flights.${index}.return_sector`}
									control={control}
									render={({ field: sectorField, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<Label>Return Sector</Label>
											<Input
												{...sectorField}
												placeholder="e.g., JED-KUL"
												className="w-full"
												maxLength={10}
											/>
											{fieldState.error && (
												<p className="text-xs text-destructive mt-1">
													{fieldState.error.message}
												</p>
											)}
										</Field>
									)}
								/>
							</div>
						</div>
					))
				)}
			</CardContent>

			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={goToPreviousStep} type="button">
					<ChevronLeft className="w-4 h-4 mr-2" /> Previous
				</Button>
				<Button onClick={goToNextStep} type="button">
					Next <ChevronRight className="w-4 h-4 ml-2" />
				</Button>
			</CardFooter>
		</Card>
	);
}
