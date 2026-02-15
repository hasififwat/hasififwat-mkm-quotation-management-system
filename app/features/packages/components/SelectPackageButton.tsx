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
import type { IPackageData } from "~/hooks/useExtractPackage";
import {
	type ISelectedPackageFormSchema,
	selectedPackageFormSchema,
} from "../schema";

export default function SelectPackageButton({
	packageList,
}: {
	packageList: IPackageData[];
}) {
	const _form = useForm<ISelectedPackageFormSchema>({
		resolver: zodResolver(selectedPackageFormSchema),
		defaultValues: {
			season: "",
			packages: packageList.map((pkg) => ({
				name: pkg.name,
				flights: pkg.flights,
				selected: false,
			})),
		},
	});

	const submit = useSubmit();

	const { handleSubmit } = _form;

	const _onSubmit = (data: ISelectedPackageFormSchema) => {
		const filteredPackages = data.packages.filter((pkg) => pkg.selected);
		const _postData = {
			...data,
			season: data.season,
			packages: filteredPackages,
		};

		console.log("Submitting package data:", _postData);

		submit(data, {
			method: "POST",
			encType: "application/json",
		});
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Select Package </Button>
			</DialogTrigger>
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
							name="season"
							control={_form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="package-season-select">
										Package Season
									</FieldLabel>
									<Select
										name={field.name}
										value={field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger
											id="package-season-select"
											aria-invalid={fieldState.invalid}
										>
											<SelectValue placeholder="Select" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="2026/2027">2026/2027</SelectItem>
										</SelectContent>
									</Select>
									<FieldDescription>
										Choose the season for the new package. This will help in
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
										key={pkg.name}
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
																{pkg.flights.length} flights included
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
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button type="submit">Create Packages</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
