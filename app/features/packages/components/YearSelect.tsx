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
						<SelectItem value="2025/2026">2025/2026</SelectItem>
						<SelectItem value="2026/2027">2026/2027</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
			<FieldDescription>Select your Umrah year.</FieldDescription>
		</Field>
	);
}
