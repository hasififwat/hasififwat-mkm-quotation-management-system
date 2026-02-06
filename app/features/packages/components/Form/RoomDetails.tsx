import { ChevronLeft, ChevronRight } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Field } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { PackageDetailsForm } from "~/schema";

export default function RoomDetails({
	currentStep,
	goToNextStep,
	goToPreviousStep,
	renderCardHeader,
}: {
	currentStep: string;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	renderCardHeader: (
		title: string,
		description: string,
		settingKey: "rooms",
	) => React.ReactNode;
}) {
	const { control } = useFormContext<PackageDetailsForm>();
	const { fields } = useFieldArray<PackageDetailsForm>({
		control,
		name: "rooms", // Matches your schema key
	});

	return (
		<Card hidden={currentStep !== "pricing"}>
			{renderCardHeader(
				"Pricing (RM)",
				"Enable room types and set per-person rates.",
				"rooms",
			)}
			<CardContent className="space-y-3">
				{fields.map((field, index) => {
					return (
						<div key={field.id}>
							{/* We wrap the whole row in the "Enabled" controller logic */}
							<Controller
								name={`rooms.${index}.enabled`}
								control={control}
								render={({ field: enabledField, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<div
											className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
												enabledField.value
													? "bg-background"
													: "bg-muted/30 opacity-60"
											}`}
										>
											<input
												type="hidden"
												name={`rooms.${index}.enabled`}
												value={enabledField.value ? "true" : "false"}
											/>
											<input
												type="hidden"
												name={`rooms.${index}.id`}
												value={field.id}
											/>
											{/* TOGGLE BUTTON */}
											<button
												type="button"
												// 2. Simply toggle the boolean value
												onClick={() =>
													enabledField.onChange(!enabledField.value)
												}
												className="flex items-center gap-3 cursor-pointer flex-1 text-left"
											>
												<span
													className={`w-2 h-2 rounded-full transition-colors ${
														enabledField.value
															? "bg-green-500 animate-pulse"
															: "bg-muted-foreground/30"
													}`}
												/>
												<span className="font-medium capitalize">
													{field.room_type}
												</span>
											</button>

											{/* PRICE INPUT */}
											{enabledField.value && (
												<Controller
													name={`rooms.${index}.price`}
													control={control}
													render={({ field: priceField }) => (
														<div className="w-full max-w-[140px]">
															<Input
																{...priceField}
																value={priceField.value as number}
																type="number"
																placeholder="0.00"
																className="h-9 text-right"
															/>
														</div>
													)}
												/>
											)}
										</div>
									</Field>
								)}
							/>
						</div>
					);
				})}
			</CardContent>

			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={goToPreviousStep}>
					<ChevronLeft className="w-4 h-4 mr-2" /> Previous
				</Button>
				<Button onClick={goToNextStep}>
					Next <ChevronRight className="w-4 h-4 ml-2" />
				</Button>
			</CardFooter>
		</Card>
	);
}
