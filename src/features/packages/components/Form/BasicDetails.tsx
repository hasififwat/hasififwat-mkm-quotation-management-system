"use client";

import { ChevronRight } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { IPackageDetailsForm } from "../../schema";
import { UmrahYearSelect } from "../YearSelect";

export default function BasicDetails({
	currentStep,

	goToNextStep,
}: {
	currentStep: string;

	goToNextStep: () => void;
}) {
	const { control } = useFormContext<IPackageDetailsForm>();
	return (
		<Card hidden={currentStep !== "basic"} className="gap-0 overflow-clip py-0">
			<CardHeader className="gap-1 border-b px-4 pt-5 [.border-b]:bg-muted/35 [.border-b]:pb-5 sm:px-6">
				<CardTitle className="leading-5 tracking-tight">Basic Details</CardTitle>
				<CardDescription>
					Package name, duration, and transportation information.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid grid-cols-1 gap-4 p-4 sm:px-6 sm:py-5">
				<Controller
					name="name"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								{...field}
								id="name"
								aria-invalid={fieldState.invalid}
								placeholder="e.g. UMJ STANDARD 2026"
								autoComplete="off"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="duration"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="duration">Duration</FieldLabel>
							<Input
								{...field}
								id="duration"
								aria-invalid={fieldState.invalid}
								placeholder="e.g. 12 HARI 10 MALAM"
								autoComplete="off"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="year"
					control={control}
					render={({ field, fieldState }) => (
						<Field>
							<UmrahYearSelect
								name={field.name}
								value={field.value}
								onChange={field.onChange}
								id="year"
								invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="transport"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="transport">Transportation</FieldLabel>
							<Input
								{...field}
								id="transport"
								aria-invalid={fieldState.invalid}
								placeholder="e.g. Flight + Bus"
								autoComplete="off"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</CardContent>
			<CardFooter className="justify-between gap-3 border-t bg-muted/35 px-4 pb-3.5 [.border-t]:pt-3.5 sm:px-6">
				<Link href="/packages" className="text-sm text-muted-foreground">
					<Button variant="ghost" type="button">
						Cancel
					</Button>
				</Link>

				<Button type="button" onClick={goToNextStep}>
					Next <ChevronRight className="w-4 h-4 ml-2" />
				</Button>
			</CardFooter>
		</Card>
	);
}
