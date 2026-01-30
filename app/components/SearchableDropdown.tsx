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
  value: propValue,
  handleSelect,
}: {
  value: string | number;
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
  console.log("SearchableDropdown propValue:", propValue);
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(propValue);

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
            ? options.find((option) => option.value === value)?.[
                optionsLabelKey as keyof (typeof options)[0]
              ]
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
                  key={option[optionValueKey as keyof typeof option]}
                  value={
                    option[optionValueKey as keyof typeof option] as string
                  }
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? "" : currentValue);
                  }}
                >
                  {option[optionsLabelKey as keyof typeof option]}
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
