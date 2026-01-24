import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
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

export function SearchableDropdown({
  options,
  placeholder = "Select options...",
  optionValueKey = "value",
  optionsLabelKey = "name",
  handleSelect,
}: {
  optionValueKey?: string;
  optionsLabelKey?: string;
  placeholder?: string;
  options: {
    id: string;
    name: string;
    value: string | number;
  }[];
  handleSelect?: (value: string | number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

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
        >
          {value
            ? options.find((option) => option.value === value)[optionsLabelKey]
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}`}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option[optionValueKey]}
                  value={option[optionValueKey] as string}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? "" : currentValue);
                  }}
                >
                  {option[optionsLabelKey]}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === option[optionValueKey]
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
