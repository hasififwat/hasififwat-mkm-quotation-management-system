import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useSubmit } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { usePackageUploadContext } from "../Context/PackageUploadContext";
import {
	type ISelectedPackageFormSchema,
	selectedPackageFormSchema,
} from "../schema";

export default function SelectPackageButton() {
	const { packageData, seasonalPrices } = usePackageUploadContext();
	const packageList = packageData ?? [];

	const _form = useForm<ISelectedPackageFormSchema>({
		resolver: zodResolver(selectedPackageFormSchema),
		defaultValues: {
			year: "",
			packages: packageList.map((pkg) => ({
				name: pkg.name,
				season: pkg.season,
				flights: pkg.flights,
				selected: false,
			})),
		},
	});

	const _submit = useSubmit();

	const { handleSubmit } = _form;

	const _onSubmit = (data: ISelectedPackageFormSchema) => {
		const filteredPackages = data.packages.filter((pkg) => pkg.selected);
		const seasonalPriceMap = new Map(
			seasonalPrices.map((item) => [item.season, item.rooms]),
		);
		const postData = {
			year: data.year,
			packages: filteredPackages.map((pkg) => ({
				name: pkg.name,
				season: pkg.season,
				flights: pkg.flights,
				rooms: seasonalPriceMap.get(pkg.season) ?? [],
			})),
		};

		console.log("Submitting package data:", postData);

		_submit(postData, {
			method: "POST",
			encType: "application/json",
		});
	};

	return (
		<Dialog>
			<DialogTrigger
				render={<Button variant="outline">Select Package </Button>}
			/>

			<DialogContent className="sm:max-w-sm md:max-w-lg lg:max-w-xl ">
				<form
					onSubmit={handleSubmit(_onSubmit)}
					//hide scrollbar but allow scrolling
				>
					<DialogHeader className="border-b pb-4">
						<DialogTitle>Select Package to create</DialogTitle>
						<DialogDescription>
							Create a new package using the selected package data
						</DialogDescription>
					</DialogHeader>
					<div
						className="grid gap-4 max-h-[50vh] md:max-h-[70vh] overflow-y-auto no-scrollbar "
						style={{
							scrollbarWidth: "none",
						}}
					>
						<Controller
							name="year"
							control={_form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="package-year-select">
										Package Year
									</FieldLabel>
									<Select
										name={field.name}
										value={field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger
											id="package-year-select"
											aria-invalid={fieldState.invalid}
										>
											<SelectValue placeholder="Select" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="2026/2027">2026/2027</SelectItem>
										</SelectContent>
									</Select>
									<FieldDescription>
										Choose the year for the new package. This will help in
										organizing and categorizing your packages effectively.
									</FieldDescription>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<FieldSeparator />

						<FieldSet>
							<FieldTitle>Available Packages</FieldTitle>
							<FieldDescription>
								Select one or more packages to use as a base for your new
								package.
							</FieldDescription>
							<FieldGroup data-slot="checkbox-group">
								{packageList.map((pkg, index) => (
									<Controller
										key={`${pkg.name}-${pkg.season}-${index}`}
										name={`packages.${index}.selected`}
										control={_form.control}
										render={({ field }) => {
											return (
												<FieldLabel htmlFor={`packages.${index}.selected`}>
													<Field orientation="horizontal">
														<Checkbox
															id={`packages.${index}.selected`}
															name={`packages.${index}.selected`}
															checked={field.value}
															onCheckedChange={(checked) => {
																field.onChange(checked);
																field.onBlur();
															}}
														/>
														<FieldContent>
															<FieldTitle>{pkg.name}</FieldTitle>
															<FieldDescription>
																{pkg.season} • {pkg.flights.length} flights
																included
															</FieldDescription>
														</FieldContent>
													</Field>
												</FieldLabel>
											);
										}}
									/>
								))}
							</FieldGroup>
						</FieldSet>
					</div>

					<DialogFooter className="pt-4">
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<Button type="submit">Create Packages</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
