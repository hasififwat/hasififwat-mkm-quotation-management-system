import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DropdownOption = {
	id: string;
	name: string;
	value: string | number;
	[key: string]: string | number | boolean | string[] | undefined;
};

export function SearchableDropdown({
	options,
	placeholder = "Select options...",
	optionValueKey = "value",
	optionsLabelKey = "name",
	disabled = false,
	value: propValue,
	handleSelect,
	renderOption,
	renderSelected,
}: {
	value?: string | number | null;
	optionValueKey?: string;
	optionsLabelKey?: string;
	disabled?: boolean;
	placeholder?: string;
	options: DropdownOption[];
	handleSelect?: (value: string | number) => void;
	renderOption?: (option: DropdownOption) => React.ReactNode;
	renderSelected?: (option: DropdownOption | undefined) => React.ReactNode;
}) {
	const getOptionValue = React.useCallback(
		(option: DropdownOption) =>
			option[optionValueKey as keyof DropdownOption] as
				| string
				| number
				| undefined,
		[optionValueKey],
	);

	const normalizeValue = React.useCallback(
		(value: string | number | null | undefined) =>
			value == null ? "" : String(value),
		[],
	);

	const [open, setOpen] = React.useState(false);
	const [value, setValue] = React.useState(() => normalizeValue(propValue));

	React.useEffect(() => {
		setValue(normalizeValue(propValue));
	}, [propValue, normalizeValue]);

	const selectedOption = options.find(
		(option) => normalizeValue(getOptionValue(option)) === value,
	);

	const onSelect = (selectedValue: string) => {
		setValue(selectedValue);
		if (handleSelect) {
			const matchedOption = options.find(
				(option) => normalizeValue(getOptionValue(option)) === selectedValue,
			);
			handleSelect(
				(matchedOption ? getOptionValue(matchedOption) : selectedValue) ?? "",
			);
		}
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="justify-between"
					disabled={disabled}
				>
					{value && selectedOption
						? renderSelected
							? renderSelected(selectedOption)
							: selectedOption?.[optionsLabelKey as keyof DropdownOption]
						: placeholder}
					<ChevronsUpDown className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0">
				<Command>
					<CommandInput
						placeholder={`Search ${placeholder.toLowerCase()}`}
						className="h-9"
						disabled={disabled}
					/>
					<CommandList>
						<CommandEmpty>No options found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={normalizeValue(getOptionValue(option))}
									value={normalizeValue(getOptionValue(option))}
									onSelect={(currentValue) => {
										onSelect(currentValue === value ? "" : currentValue);
									}}
								>
									{renderOption
										? renderOption(option)
										: option[optionsLabelKey as keyof typeof option]}
									<Check
										className={cn(
											"ml-auto",
											value === normalizeValue(getOptionValue(option))
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
