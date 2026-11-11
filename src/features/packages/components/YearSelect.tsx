"use client";

import { SELECTABLE_UMRAH_YEARS } from "~/domain/umrah-years";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type UmrahYearSelectProps = {
	name?: string;
	value?: string;
	onChange?: (value: string) => void;
	id?: string;
	invalid?: boolean;
};

export function UmrahYearSelect({
	name,
	value,
	onChange,
	id = "year",
	invalid = false,
}: UmrahYearSelectProps) {
	return (
		<Field className="w-full" data-invalid={invalid}>
			<FieldLabel htmlFor={id}>Umrah Year</FieldLabel>
			<Select name={name} value={value} onValueChange={onChange}>
				<SelectTrigger id={id} aria-invalid={invalid}>
					<SelectValue placeholder="Choose Umrah year" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{SELECTABLE_UMRAH_YEARS.map(year => (
							<SelectItem key={year} value={year}>{year}</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<FieldDescription>Select your Umrah year.</FieldDescription>
		</Field>
	);
}
