import { ChevronRight } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { TreeSelect } from "~/components/ui/tree-select";
import type { IPackageDetails } from "../../schema";

const MEAL_OPTIONS = [
	{
		label: "FULLBOARD",
		value: "FULLBOARD",
		nodes: [
			{ label: "BREAKFAST", value: "BREAKFAST" },
			{ label: "LUNCH", value: "LUNCH" },
			{ label: "DINNER", value: "DINNER" },
		],
	},
] as const;

export default function HotelDetails({
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
		stepKey: string,
	) => React.ReactNode;
}) {
	const { control, setValue, watch } = useFormContext<IPackageDetails>();
	const { fields } = useFieldArray({
		control,
		name: "hotels",
	});
	const hotelsState = watch("hotels");

	return (
		<div hidden={currentStep !== "hotels"} className="space-y-4">
			<Card>
				{renderCardHeader(
					"Hotels & Meals",
					"Select hotels for each city and specify included meals.",
					"hotels",
				)}
				<CardContent className="grid grid-cols-1 gap-4">
					{fields.map((hotel, index) => {
						const hotelData = hotelsState?.[index] ?? hotel;
						const hotelLabel =
							hotelData.hotel_type?.charAt(0).toUpperCase() +
							hotelData.hotel_type?.slice(1);

						return (
							<Card
								key={hotel.id}
								className={`transition-all duration-200  ${
									hotelData.enabled
										? "py-4" // Active styles
										: "py-2 opacity-60 " // Inactive styles
								}`}
							>
								{/* --- TOGGLE HEADER --- */}
								<CardHeader
									className="cursor-pointer select-none py-0 gap-0"
									onClick={() => {
										setValue(`hotels.${index}.enabled`, !hotelData.enabled, {
											shouldDirty: true,
											shouldValidate: true,
										});
									}}
								>
									<div className="flex items-center justify-between">
										<CardTitle className="text-base font-semibold">
											Hotel {hotelLabel}
										</CardTitle>
										<span
											className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
												hotelData.enabled
													? "bg-primary text-primary-foreground"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{hotelData.enabled ? "Enabled" : "Disabled"}
										</span>
									</div>
								</CardHeader>

								{/* --- FORM CONTENT (Only show if enabled) --- */}
								{hotelData.enabled && (
									<CardContent className="space-y-4 animate-in slide-in-from-top-1 fade-in duration-200 ">
										<Controller
											name={`hotels.${index}.name`}
											control={control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel htmlFor={`hotels.${index}.name`}>
														Hotel Name
													</FieldLabel>
													<Input
														{...field}
														id={`hotels.${index}.name`}
														aria-invalid={fieldState.invalid}
														placeholder={
															hotelData.placeholder ||
															`Enter ${hotelLabel} hotel name...`
														}
														autoComplete="off"
													/>
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>

										<Controller
											name={`hotels.${index}.meals`}
											control={control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel htmlFor={`hotels.${index}.meals`}>
														Meals (comma separated)
													</FieldLabel>
													<div>
														<TreeSelect
															options={MEAL_OPTIONS}
															value={(field.value ?? []) as string[]}
															onChange={field.onChange}
															placeholder="Select meals included..."
														/>
													</div>
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>
									</CardContent>
								)}
							</Card>
						);
					})}
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button variant="ghost" type="button" onClick={goToPreviousStep}>
						Previous
					</Button>
					<Button type="button" onClick={goToNextStep}>
						Next <ChevronRight className="w-4 h-4 ml-2" />
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
