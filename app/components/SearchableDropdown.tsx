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
	value: string | number;
	optionValueKey?: string;
	optionsLabelKey?: string;
	disabled?: boolean;
	placeholder?: string;
	options: DropdownOption[];
	handleSelect?: (value: string | number) => void;
	renderOption?: (option: DropdownOption) => React.ReactNode;
	renderSelected?: (option: DropdownOption | undefined) => React.ReactNode;
}) {
	console.log("SearchableDropdown propValue:", propValue);
	const [open, setOpen] = React.useState(false);
	const [value, setValue] = React.useState(propValue);

	React.useEffect(() => {
		setValue(propValue);
	}, [propValue]);

	const selectedOption = options.find((option) => option.value === value);

	const onSelect = (selectedValue: string | number) => {
		setValue(selectedValue as string);
		if (handleSelect) {
			handleSelect(selectedValue);
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
					{value
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
									key={option[optionValueKey as keyof typeof option]}
									value={
										option[optionValueKey as keyof typeof option] as string
									}
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
											value === option[optionValueKey as keyof typeof option]
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
